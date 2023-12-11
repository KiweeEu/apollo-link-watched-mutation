export const createMutationsAndSubscriptionsManager = mutationOrSubscriptionToQueryResolverMap => {
  // used to look up mutations/subscriptions to watch, what queries each mutation/subscription is related to, and what callbacks to call for each query

  const getMutationOrSubscriptionNames = () => Object.keys(mutationOrSubscriptionToQueryResolverMap);
  const getRegisteredQueryNames = mutationOrSubscriptionName => {
    return Object.keys(mutationOrSubscriptionToQueryResolverMap[mutationOrSubscriptionName] || {})
  };
  const getAllRegisteredQueryNames = () => {
    // across all watched mutations/subscriptions
    return getMutationOrSubscriptionNames().reduce((queryNames, mutationOrSubscriptionName) => {
      queryNames.push(...getRegisteredQueryNames(mutationOrSubscriptionName));
      return queryNames;
    }, []);
  };

  return {
    isWatched: mutationOrSubscriptionName => mutationOrSubscriptionToQueryResolverMap.hasOwnProperty(mutationOrSubscriptionName),
    getMutationOrSubscriptionNames,
    getRegisteredQueryNames,
    getAllRegisteredQueryNames,
    getUpdateFn: (mutationOrSubscriptionName, queryName) => mutationOrSubscriptionToQueryResolverMap[mutationOrSubscriptionName][queryName] || (() => {})
  };
};