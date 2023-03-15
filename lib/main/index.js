"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.WatchedMutationLink = void 0;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _client = require("@apollo/client");
var _utilities = require("@apollo/client/utilities");
var _validation = require("./validation");
var _utils = require("./utils");
var _cacheManager = require("./cache-manager");
var _queriesToUpdateManager = require("./queries-to-update-manager");
var _mutationsToUpdateManager = require("./mutations-to-update-manager");
var _inflightRequestManager = require("./inflight-request-manager");
class WatchedMutationLink extends _client.ApolloLink {
  constructor(cache, mutationQueryResolverMap) {
    let debug = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    let readOnly = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    (0, _validation.assertPreconditions)(cache, mutationQueryResolverMap);
    super();
    (0, _defineProperty2.default)(this, "debugLog", payload => this.debug && window.console.log(payload));
    (0, _defineProperty2.default)(this, "isQueryRelated", operationName => {
      const registeredQueryNames = this.mutationManager.getAllRegisteredQueryNames();
      return registeredQueryNames.some(queryName => queryName === operationName || false);
    });
    (0, _defineProperty2.default)(this, "addRelatedQuery", (queryName, operation) => {
      this.queryManager.addQuery(queryName, this.cache.createKey(operation));
    });
    (0, _defineProperty2.default)(this, "removeRelatedQuery", (queryName, queryKey) => {
      this.queryManager.removeQuery(queryName, queryKey);
    });
    (0, _defineProperty2.default)(this, "getCachedQueryKeysToUpdate", mutationName => {
      const relevantQueryNames = this.mutationManager.getRegisteredQueryNames(mutationName);
      const relevantQueryKeys = relevantQueryNames.reduce((queryCacheKeyList, queryName) => {
        const relevantQueryCacheKeys = this.queryManager.getQueryKeysToUpdate(queryName);
        return [...queryCacheKeyList, ...relevantQueryCacheKeys];
      }, []);
      return relevantQueryKeys;
    });
    (0, _defineProperty2.default)(this, "getUpdateAfterMutation", (mutationOperation, mutationData, queryKey) => {
      const queryName = (0, _utils.getQueryName)(queryKey.query);
      const cachedQueryData = this.cache.read(queryKey);
      if (!cachedQueryData) {
        this.removeRelatedQuery(queryName, queryKey);
        return;
      }
      const mutationName = (0, _utils.getQueryName)(mutationOperation.query);
      const updateQueryCb = this.mutationManager.getUpdateFn(mutationName, queryName);
      const updatedData = updateQueryCb({
        mutation: {
          name: mutationName,
          variables: mutationOperation.variables,
          result: mutationData
        },
        query: {
          name: queryName,
          variables: queryKey.variables,
          result: cachedQueryData
        }
      });
      if (updatedData !== null && updatedData !== undefined) {
        return {
          queryKey,
          updatedData
        };
      }
    });
    (0, _defineProperty2.default)(this, "updateQueriesAfterMutation", (operation, operationName, result) => {
      const cachedQueryToUpdateKeys = this.getCachedQueryKeysToUpdate(operationName);
      const itemsToWrite = cachedQueryToUpdateKeys.reduce((items, queryKey) => {
        this.debugLog({
          message: 'Found a cached query related to this successful mutation, this Link will invoke the associated callback',
          mutationName: operationName
        });
        const resultToWrite = this.getUpdateAfterMutation(operation, result, queryKey);
        if (resultToWrite) {
          items.push(resultToWrite);
        } else {
          this.debugLog({
            message: 'We did NOT receive anything new to write to the cache so we will not do anything',
            cacheKey: queryKey
          });
        }
        return items;
      }, []);
      this.cache.performTransaction(() => {
        itemsToWrite.forEach(data => this.cache.write(data.queryKey, data.updatedData));
      });
    });
    (0, _defineProperty2.default)(this, "addOptimisticRequest", operationName => {
      const cachedQueryToUpdateKeys = this.getCachedQueryKeysToUpdate(operationName);
      cachedQueryToUpdateKeys.forEach(queryKey => {
        const currentCachedState = this.cache.read(queryKey);
        this.inflightOptimisticRequests.set(queryKey, currentCachedState);
        this.debugLog({
          message: 'Added a cached optimistic query in case we need to revert it after an optimistic error',
          mutationName: operationName
        });
      });
    });
    (0, _defineProperty2.default)(this, "clearOptimisticRequest", queryKey => {
      this.inflightOptimisticRequests.set(queryKey, null);
      this.debugLog({
        message: 'Cleared a cached optimistic query'
      });
    });
    (0, _defineProperty2.default)(this, "revertOptimisticRequest", operationName => {
      const cachedQueryToUpdateKeys = this.getCachedQueryKeysToUpdate(operationName);
      cachedQueryToUpdateKeys.forEach(queryKey => {
        const previousCachedState = this.inflightOptimisticRequests.getBeforeState(queryKey);
        if (previousCachedState) {
          this.cache.write(queryKey, previousCachedState);
          this.debugLog({
            message: 'Reverted an optimistic request after an error',
            afterRevert: previousCachedState,
            mutationName: operationName
          });
        }
        this.clearOptimisticRequest(queryKey);
      });
    });
    this.cache = (0, _cacheManager.createCacheManager)(cache, debug, readOnly);
    this.debug = debug;
    this.readOnly = readOnly;
    this.mutationManager = (0, _mutationsToUpdateManager.createMutationsManager)(mutationQueryResolverMap);
    this.queryManager = (0, _queriesToUpdateManager.createQueryKeyManager)();
    this.inflightOptimisticRequests = (0, _inflightRequestManager.createInflightRequestManager)();
    this.debugLog({
      message: 'Success --- Constructed our link',
      watchedMutations: this.mutationManager.getMutationNames()
    });
  }
  request(operation, forward) {
    const observer = forward(operation);
    const definition = (0, _utilities.getMainDefinition)(operation.query);
    const operationName = definition && definition.name && definition.name.value || '';
    const context = operation.getContext();
    if ((0, _utils.isOptimistic)(context) && this.mutationManager.isWatched(operationName)) {
      this.addOptimisticRequest(operationName);
      this.updateQueriesAfterMutation(operation, operationName, {
        data: context.optimisticResponse
      });
    }
    return observer.map(result => {
      if ((0, _utils.isSuccessfulQuery)(definition.operation, result) && this.isQueryRelated(operationName)) {
        this.debugLog({
          message: 'Found a successful query related to a watched mutation',
          relatedQueryName: operationName
        });
        this.addRelatedQuery(operationName, operation);
      } else if ((0, _utils.isSuccessfulMutation)(definition.operation, result) && this.mutationManager.isWatched(operationName)) {
        if ((0, _utils.isOptimistic)(context)) {
          this.clearOptimisticRequest(operationName);
        } else {
          this.updateQueriesAfterMutation(operation, operationName, result);
        }
      } else if ((0, _utils.isFailedMutation)(definition.operation, result) && this.mutationManager.isWatched(operationName) && (0, _utils.isOptimistic)(context)) {
        this.revertOptimisticRequest(operationName);
      }
      return result;
    });
  }
}
exports.WatchedMutationLink = WatchedMutationLink;
var _default = WatchedMutationLink;
exports.default = _default;