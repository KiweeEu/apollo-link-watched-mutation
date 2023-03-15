"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assertPreconditions = void 0;
const validateCache = cache => {
  if (!cache || !cache.readQuery || !cache.writeQuery) {
    throw new TypeError('WatchedMutationLink requires a cache with a readQuery and writeQuery interface');
  }
};
const validateMutationQueryResolverMap = map => {
  if (!map || typeof map !== 'object') {
    throw new TypeError('WatchedMutationLink requires a valid mutation -> query -> updateFn map');
  }
  const mutationKeys = Object.keys(map);
  const invalidMutationKeys = mutationKeys.filter(name => typeof name !== 'string');
  if (invalidMutationKeys.length) {
    throw new TypeError('WatchedMutationLink requires valid MutationNames as keys in the mutation map provided');
  }
  const queryKeys = mutationKeys.reduce((keyList, key) => {
    const queryMap = map[key];
    if (typeof queryMap !== 'object') {
      throw new TypeError('WatchedMutationLink requires a valid mutation -> query -> updateFn map');
    }
    return [...keyList, ...Object.keys(queryMap)];
  }, []);
  const invalidQueryKeys = queryKeys.filter(name => typeof name !== 'string');
  if (invalidQueryKeys.length) {
    throw new TypeError('WatchedMutationLink requires valid QueryNames as keys in the query map provided');
  }
  const updateFns = mutationKeys.reduce((updateFnList, key) => {
    return [...updateFnList, ...Object.values(map[key])];
  }, []);
  const invalidUpdateFns = updateFns.filter(fn => typeof fn !== 'function');
  if (invalidUpdateFns.length) {
    throw new TypeError('WatchedMutationLink requires valid functions as values in the resolver -> query map provided');
  }
};
const assertPreconditions = (cache, map) => {
  validateCache(cache);
  validateMutationQueryResolverMap(map);
};
exports.assertPreconditions = assertPreconditions;