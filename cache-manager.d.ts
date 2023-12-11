import type { ApolloCache, DocumentNode, Operation } from "@apollo/client/core";

type WriteFunction<T> = (cache: ApolloCache<any>) => T;

interface QueryKey {
  query: DocumentNode;
  variables?: Record<string, any>;
}

interface CacheManager {
  createKey(operation: Operation): QueryKey;
  performTransaction<T = any>(writeFn: WriteFunction<T>): T;
  read<T = any>(query: QueryKey): T;
  write<T = any>(query: QueryKey, data: T): void;
}

export function createCacheManager(
  cache: ApolloCache<any>,
  debug?: boolean | number,
  readOnly?: boolean | number
): CacheManager;
