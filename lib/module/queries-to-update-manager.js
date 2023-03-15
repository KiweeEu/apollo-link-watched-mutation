"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createQueryKeyManager = void 0;
const createQueryKeyManager = () => {
  const queriesToUpdate = {};
  const getQueryKeysToUpdate = queryName => queriesToUpdate[queryName] || [];
  return {
    addQuery: (queryName, queryKey) => {
      const existingQueryKeys = getQueryKeysToUpdate(queryName);
      if (!existingQueryKeys.some(key => JSON.stringify(key) === JSON.stringify(queryKey))) {
        queriesToUpdate[queryName] = [...getQueryKeysToUpdate(queryName), queryKey];
      }
    },
    removeQuery: (queryName, queryKey) => {
      queriesToUpdate[queryName] = getQueryKeysToUpdate(queryName).filter(key => JSON.stringify(key) !== JSON.stringify(queryKey));
    },
    hasQueryToUpdate: queryName => getQueryKeysToUpdate(queryName).length > 0,
    getQueryKeysToUpdate
  };
};
exports.createQueryKeyManager = createQueryKeyManager;