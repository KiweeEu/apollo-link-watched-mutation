"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createMutationsManager = void 0;
const createMutationsManager = mutationQueryResolverMap => {
  const getMutationNames = () => Object.keys(mutationQueryResolverMap);
  const getRegisteredQueryNames = mutationName => {
    return Object.keys(mutationQueryResolverMap[mutationName] || {});
  };
  const getAllRegisteredQueryNames = () => {
    return getMutationNames().reduce((queryNames, mutationName) => {
      queryNames.push(...getRegisteredQueryNames(mutationName));
      return queryNames;
    }, []);
  };
  return {
    isWatched: mutationName => mutationQueryResolverMap.hasOwnProperty(mutationName),
    getMutationNames,
    getRegisteredQueryNames,
    getAllRegisteredQueryNames,
    getUpdateFn: (mutationName, queryName) => mutationQueryResolverMap[mutationName][queryName] || (() => {})
  };
};
exports.createMutationsManager = createMutationsManager;