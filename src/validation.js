const validateCache = cache => {
  if (!cache || !cache.readQuery || !cache.writeQuery) {
    throw new TypeError('WatchedMutationLink requires a cache with a readQuery and writeQuery interface');
  }
};

const validateMutationOrSubscriptionToQueryToResolverMap = map => {
  if (!map || typeof map !== 'object') {
    throw new TypeError('WatchedMutationLink requires a valid mutation/subscription -> query -> updateFn map');
  }
  const mutationOrSubscriptionKeys = Object.keys(map);
  const invalidMutationOrSubscriptionKeys = mutationOrSubscriptionKeys.filter(name => typeof name !== 'string');
  if (invalidMutationOrSubscriptionKeys.length) {
    throw new TypeError('WatchedMutationLink requires valid MutationNames/SubscriptionNames as keys in the mutation/subscription map provided');
  }
  const queryKeys = mutationOrSubscriptionKeys.reduce((keyList, key) => {
    const queryMap = map[key];
    if (typeof queryMap !== 'object') {
      throw new TypeError('WatchedMutationLink requires a valid mutation/subscription -> query -> updateFn map');
    }
    return [...keyList, ...(Object.keys(queryMap))];
  }, []);
  const invalidQueryKeys = queryKeys.filter(name => typeof name !== 'string');
  if (invalidQueryKeys.length) {
    throw new TypeError('WatchedMutationLink requires valid QueryNames as keys in the query map provided');
  }
  const updateFns = mutationOrSubscriptionKeys.reduce((updateFnList, key) => {
    return [...updateFnList, ...(Object.values(map[key]))];
  }, []);
  const invalidUpdateFns = updateFns.filter(fn => typeof fn !== 'function');
  if (invalidUpdateFns.length) {
    throw new TypeError('WatchedMutationLink requires valid functions as values in the resolver -> query map provided');
  }
};

export const assertPreconditions = (cache, map) => {
  validateCache(cache);
  validateMutationOrSubscriptionToQueryToResolverMap(map);
}
