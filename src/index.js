import { ApolloLink } from '@apollo/client/core';
import { getMainDefinition } from '@apollo/client/utilities';
import { assertPreconditions } from './validation';
import {
  isSuccessfulQuery,
  isMutation,
  isSuccessfulMutation,
  isFailedMutation,
  isSuccessfulSubscription,
  isOptimistic,
  getQueryName
} from './utils';
import { createCacheManager } from './cache-manager';
import { createQueryKeyManager } from './queries-to-update-manager';
import { createMutationsAndSubscriptionsManager } from './mutations-and-subscriptions-to-update-manager';
import { createInflightRequestManager } from './inflight-request-manager';


export class WatchedMutationLink extends ApolloLink {
  /**
   * @param cache - cache used w/ apollo-client
   * @param mutationOrSubscriptionToQueryResolverMap - map of mutations/subscriptions -> map of queries -> callbacks for updating the cache
   * @param debug - flag for debug logging, will log if truthy
   * @param readOnly - flag for telling this link never to write to the cache but otherwise operate as normal
   */
  constructor(cache, mutationOrSubscriptionToQueryResolverMap, debug = 0, readOnly = 0) {
    assertPreconditions(cache, mutationOrSubscriptionToQueryResolverMap);
    super();

    this.cache = createCacheManager(cache, debug, readOnly);
    this.debug = debug;
    this.readOnly = readOnly;
    this.mutationAndSubscriptionManager = createMutationsAndSubscriptionsManager(mutationOrSubscriptionToQueryResolverMap);
    this.queryManager = createQueryKeyManager();
    this.inflightOptimisticRequests = createInflightRequestManager();
    this.debugLog({
      message: 'Success --- Constructed our link',
      watchedMutationsAndSubscriptions: this.mutationAndSubscriptionManager.getMutationOrSubscriptionNames()
    });
  }

  debugLog = payload => this.debug && window.console.log(payload);
  isQueryRelated = operationName => {
    const registeredQueryNames = this.mutationAndSubscriptionManager.getAllRegisteredQueryNames();
    return registeredQueryNames.some(queryName => queryName === operationName || false);
  }
  addRelatedQuery = (queryName, operation) => {
    this.queryManager.addQuery(queryName, this.cache.createKey(operation));
  }
  removeRelatedQuery = (queryName, queryKey) => {
    this.queryManager.removeQuery(queryName, queryKey);
  }
  getCachedQueryKeysToUpdate = mutationOrSubscriptionName => {
    // gets all the unique Query + QueryVariable cache keys used by the apollo-cache
    const relevantQueryNames = this.mutationAndSubscriptionManager.getRegisteredQueryNames(mutationOrSubscriptionName);
    const relevantQueryKeys = relevantQueryNames.reduce((queryCacheKeyList, queryName) => {
      const relevantQueryCacheKeys = this.queryManager.getQueryKeysToUpdate(queryName);
      return [
        ...queryCacheKeyList,
        ...relevantQueryCacheKeys
      ];
    }, []);
    return relevantQueryKeys;
  }

  getUpdateAfterMutationOrSubscription = (mutationOrSubscriptionOperation, mutationOrSubscriptionData, queryKey, operationIsMutation) => {
    const queryName = getQueryName(queryKey.query);
    const cachedQueryData = this.cache.read(queryKey);
    if (!cachedQueryData) {
      // we failed reading from the cache so there's nothing to update
      // probably it was invalidated outside of this link, we should remove it from our queries to update
      this.removeRelatedQuery(queryName, queryKey);
      return;
    }
    const mutationOrSubscriptionName = getQueryName(mutationOrSubscriptionOperation.query);
    const updateQueryCb = this.mutationAndSubscriptionManager.getUpdateFn(mutationOrSubscriptionName, queryName);
    const cbData = operationIsMutation ? {
      mutation: {
        name: mutationOrSubscriptionName,
        variables: mutationOrSubscriptionOperation.variables,
        result: mutationOrSubscriptionData
      },
      query: {
        name: queryName,
        variables: queryKey.variables,
        result: cachedQueryData
      }
    } : {
      subscription: {
        name: mutationOrSubscriptionName,
        variables: mutationOrSubscriptionOperation.variables,
        result: mutationOrSubscriptionData
      },
      query: {
        name: queryName,
        variables: queryKey.variables,
        result: cachedQueryData
      }
    };
    const updatedData = updateQueryCb(cbData);
    if (updatedData !== null && updatedData !== undefined) {
      return { queryKey, updatedData };
    }
  }
  updateQueriesAfterMutationOrSubscription = (operation, operationName, result, operationIsMutation) => {
    const cachedQueryToUpdateKeys = this.getCachedQueryKeysToUpdate(operationName);
    const itemsToWrite = cachedQueryToUpdateKeys.reduce((items, queryKey) => {
      this.debugLog(operationIsMutation ? {
        message: 'Found a cached query related to this successful mutation, this Link will invoke the associated callback',
        mutationName: operationName
      } : {
        message: 'Found a cached query related to this successful subscription, this Link will invoke the associated callback',
        subscriptionName: operationName
      });
      const resultToWrite = this.getUpdateAfterMutationOrSubscription(operation, result, queryKey, operationIsMutation);
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
  }

  addOptimisticRequest = (operationName) => {
    const cachedQueryToUpdateKeys = this.getCachedQueryKeysToUpdate(operationName);
    cachedQueryToUpdateKeys.forEach(queryKey => {
      const currentCachedState = this.cache.read(queryKey);
      this.inflightOptimisticRequests.set(queryKey, currentCachedState);
      this.debugLog({
        message: 'Added a cached optimistic query in case we need to revert it after an optimistic error',
        mutationName: operationName
      });
    });
  }
  clearOptimisticRequest = queryKey => {
    this.inflightOptimisticRequests.set(queryKey, null);
    this.debugLog({ message: 'Cleared a cached optimistic query' });
  }
  revertOptimisticRequest = (operationName) => {
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
  }

  request(operation, forward) {
    const observer = forward(operation);
    const definition = getMainDefinition(operation.query);
    const operationName = (definition && definition.name && definition.name.value) || '';
    const context = operation.getContext();

    if (isMutation(definition.operation) && isOptimistic(context) && this.mutationAndSubscriptionManager.isWatched(operationName)) {
      this.addOptimisticRequest(operationName);
      this.updateQueriesAfterMutationOrSubscription(operation, operationName, { data: context.optimisticResponse }, true);
    }

    return observer.map(result => {
      if (isSuccessfulQuery(definition.operation, result) && this.isQueryRelated(operationName)) {
        // for every successful query, if any watched mutations/subscriptions care about it, store the cacheKey to update it later
        this.debugLog({ message: 'Found a successful query related to a watched mutation/subscription', relatedQueryName: operationName });
        this.addRelatedQuery(operationName, operation);
      } else if (isSuccessfulMutation(definition.operation, result) && this.mutationAndSubscriptionManager.isWatched(operationName)) {
        if (isOptimistic(context)) {
          this.clearOptimisticRequest(operationName);
        } else {
          // for every successful mutation, look up the cachedQueryKeys the mutation cares about, and invoke the update callback for each one
          this.updateQueriesAfterMutationOrSubscription(operation, operationName, result, true);
        }
      } else if (isSuccessfulSubscription(definition.operation, result) && this.mutationAndSubscriptionManager.isWatched(operationName)) {
        // for every successful subscription, look up the cachedQueryKeys the subscription cares about, and invoke the update callback for each one
        this.updateQueriesAfterMutationOrSubscription(operation, operationName, result, false);
      } else if (
        isFailedMutation(definition.operation, result) &&
        this.mutationAndSubscriptionManager.isWatched(operationName) &&
        isOptimistic(context)
      ) {
        this.revertOptimisticRequest(operationName);
      }
      return result;
    });
  }
}

export default WatchedMutationLink;
