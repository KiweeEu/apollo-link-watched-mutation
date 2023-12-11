import {
  type ApolloCache,
  ApolloLink,
  type FetchResult,
} from "@apollo/client/core";
import type { ExecutionResult } from "graphql";
import { CacheManager } from "./cache-manager";

export class WatchedMutationLink extends ApolloLink {
  readonly cache: CacheManager;
  debug?: boolean | number;
  readOnly?: boolean | number;

  constructor(
    cache: ApolloCache<any>,
    mutationOrSubscriptionToQueryResolverMap: MutationOrSubscriptionToQueryResolverMap,
    debug?: boolean | number,
    readOnly?: boolean | number
  );
}

export default WatchedMutationLink;

interface Query<TData = any, TVariables = any> {
  name: string;
  variables?: TVariables;
  result: TData;
}

interface Mutation<
  TData = any,
  TVariables = any,
  TContext = any,
  TExtensions = any
> {
  name: string;
  variables?: TVariables;
  result: FetchResult<TData, TContext, TExtensions>;
}

interface Subscription<TData = any, TVariables = any, TExtensions = any> {
  name: string;
  variables?: TVariables;
  result: ExecutionResult<TData, TExtensions>;
}

export interface MutationCallbackArgs<
  TQueryData = any,
  TQueryVariables = any,
  TMutationData = any,
  TMutationVariables = any,
  TMutationContext = any,
  TMutationExtensions = any
> {
  mutation: Mutation<
    TMutationData,
    TMutationVariables,
    TMutationContext,
    TMutationExtensions
  >;
  query: Query<TQueryData, TQueryVariables>;
}

export interface SubscriptionCallbackArgs<
  TQueryData = any,
  TQueryVariables = any,
  TSubscriptionData = any,
  TSubscriptionVariables = any,
  TSubscriptionExtensions = any
> {
  subscription: Subscription<
    TSubscriptionData,
    TSubscriptionVariables,
    TSubscriptionExtensions
  >;
  query: Query<TQueryData, TQueryVariables>;
}

export type MutationCallback<
  TQueryData = any,
  TQueryVariables = any,
  TMutationData = any,
  TMutationVariables = any,
  TMutationContext = any,
  TMutationExtensions = any
> = (
  args: MutationCallbackArgs<
    TQueryData,
    TQueryVariables,
    TMutationData,
    TMutationVariables,
    TMutationContext,
    TMutationExtensions
  >
) => TQueryData | null | undefined;

export type SubscriptionCallback<
  TQueryData = any,
  TQueryVariables = any,
  TSubscriptionData = any,
  TSubscriptionVariables = any,
  TSubscriptionExtensions = any
> = (
  args: SubscriptionCallbackArgs<
    TQueryData,
    TQueryVariables,
    TSubscriptionData,
    TSubscriptionVariables,
    TSubscriptionExtensions
  >
) => TQueryData | null | undefined;

export interface MutationOrSubscriptionToQueryResolverMap {
  [mutationOrSubscription: string]: {
    [query: string]: MutationCallback | SubscriptionCallback;
  };
}
