export const createCacheManager = (cache, debug, readOnly) => {
  return {
    createKey: operation => ({ query: operation.query, variables: operation.variables }),
    performTransaction: writeFn => {
      if (cache.performTransaction) {
        return cache.performTransaction(writeFn);
      } else {
        return writeFn(cache);
      }
    },
    read: query => {
      try {
        return cache.readQuery(query);
      } catch (error) {
        if (debug) {
          window.console.log({
            message: 'Error --- Unable to read from cache',
            cacheKey: query,
            error
          });
        }
      }
    },
    write: (query, data) => {
      if (readOnly) {
        if (debug) {
          window.console.log({
            message: 'ReadOnly --- this link will NOT write to the cache but it would have attempted to',
            cacheKey: query,
            data
          });
        }
        return;
      }
      try {
        cache.writeQuery({ ...query, data });
        if (debug) {
          window.console.log({
            message: 'Success --- Updated the cache upon a mutation/subscription',
            cacheKey: query,
            data
          });
        }
      } catch (error) {
        if (debug) {
          window.console.log({
            message: 'Error --- Unable to write to the cache',
            cacheKey: query,
            data,
            error
          });
        }
      }
    }
  };
};
