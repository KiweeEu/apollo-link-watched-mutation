# apollo-link-watched-mutation ![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)

A Link interface for providing default cache updates based on { mutation/subscription : query } relationships

This is a maintained fork of [afafafafafaf/apollo-link-watched-mutation](https://github.com/afafafafafaf/apollo-link-watched-mutation).

## Setup

```bash
npm i @kiwee/apollo-link-watched-mutation
```

(peer dependencies)
```bash
# works with @apollo/client 3 and graphql 14, 15, 16
npm i @apollo/client graphql
```

## Why does this package exist?

### Background

Easy [client-side caching](https://www.apollographql.com/docs/react/basics/caching.html) is one of the many reasons the [Apollo Client](https://www.apollographql.com/docs/react/) has gained so much popularity.

One of the best features of the apollo-client is the idea of automatic cache updates. Since the apollo-client handles your networking for you, it can inspect traffic and update its cache in-place if it ever sees an updated version of a cached value in a response.

However, there are scenarios (e.g. item creation, deletion, filtered lists, etc.) where an in-place update may **not** be sufficient.

Now, Apollo also offers some ways around this, notably in the form of an [update variable](https://www.apollographql.com/docs/react/features/caching.html#updating-the-cache-after-a-mutation), which provides direct-access to the apollo-cache.

However, this update variable doesn't scale very well (in terms of developer maintainability) in a couple scenarios.
1. As the number of queries to update grows, you need knowledge of all of their cache keys in order to keep them updated. In the case of variable lists which aren't predefined, this means you also need to store all of their variables in order to read and update their cached values.
2. As the number of places where you call the same or similar mutations/subscriptions grows, you need to replicate or find a good general pattern to recreate all of the cacheKey storing and updating logic described above.
3. You need to, to some extent, embed this logic inside your components, conflating your view with your caching layer even though you could declare the caching behavior you want on start-up.
```javascript
// This update becomes a lot more complex if...
// 1. we have a variable # of cached filtered lists of todos based off status and other variables (instead of one predetermined list to update)
// 2. we need to conditionally add or remove todos based off these variables  (instead of always adding to the list)
update: (proxy, { data: { createTodo } }) => {
      const data = proxy.readQuery({
        query: TodoAppQuery,
        variables: { status: 'IN_PROGRESS' }
      });
      data.todos.push(createTodo);
      proxy.writeQuery({ query: TodoAppQuery, data });
},
```

### The Link pattern for default cache updates

With [Apollo-Client 2.0](https://dev-blog.apollodata.com/apollo-client-2-0-5c8d0affcec7) the Apollo team introduced the idea of [Apollo Links](https://www.apollographql.com/docs/link/) which provides a configurable way to compose your network stack. Apollo Links have access to the same network traffic that made Watched Queries possible and that means we can watch that same traffic and provide additional default update behavior to our cache.

```javascript
new WatchedMutationLink(
  cache, // whatever is passed to the apollo-client
  {
    SaveTodo: {
      TodoList: ({ mutation, query }) => { /* */ }
    }
    SavedTodos: {
      TodoList: ({ subscription, query }) => { /* */ }
    }
  }
)
```
By adding this WatchedMutationLink to our networking stack, the exported apollo-client would invoke the callback provided for each cached query named *TodoList* whenever a successful mutation named *SaveTodo* is received, as well as the callback for each subscription named *SavedTodos*. If the WatchedMutationLink receives an updated form of the cached data from the callback, it will write that updated data to the cache.

By monitoring networking traffic, the Link figures out when you may want to update your cache based off a mutation/subscription and query and you determine how it should update all in one place.

## Example usage

NOTE: the examples haven't been updated to the newest version of the package.

The WatchedMutationLink below would manage any # of cached *TodoList*s after any successful *SaveTodo* mutation (including optimistic mutations & any reversions due to an error) by determining whether or not the mutatedTodo remains relevant on the list and updating the cache if necessary.
```graphql
query TodoList($status: String) {
  todoList(status: $status) {
    id
    name
    status
  }
}
mutation SaveTodo(
  $id: String
  $status: String
) {
  saveTodo(
    id: $id
    status: $status
  ) {
    id
    name
    status
  }
}
```

```javascript
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';
import WatchedMutationLink from 'apollo-link-watched-mutation';

const cache = new InMemoryCache();
const link = ApolloLink.from([
  new WatchedMutationLink(cache, {
    SaveTodo: {
      TodoList: ({ mutation, query }) => {
        const mutatedTodoId = mutation.variables.id;
        const updatedTodo = mutation.result.data.saveTodo;
        const cachedTodos = query.result.todos.items;
        const isTodoIncluded = cachedTodos.some(todos => todos.id === mutatedTodoId);
        const shouldTodoBeIncluded = !query.variables || !query.variables.status || query.variables.status.includes(updatedTodo.status);

        let updatedItems = null;
        if (isTodoIncluded && !shouldTodoBeIncluded) {
          // if the mutatedTodo is found in the cached list and it should not be there after the mutation, remove it
          updatedItems = cachedTodos.filter(todo => todo.id !== mutatedTodoId);
        } else if (!isTodoIncluded && shouldTodoBeIncluded) {
          // if the mutatedTodo is not found in the cached list and it should be there after the mutation, add it
          updatedItems = [updatedTodo, ...cachedTodos];
        }
        // else an in-place update is already sufficient so no update is necessary
        if (updatedItems) {
          // immutably return query.result with updated items
          return {
            ...query.result,
            todos: {
              ...query.result.todos,
              items: updatedItems,
            },
          };
        }
      }
    }
  }),
]);
const client = new ApolloClient({ link, cache });
export default client;
```

## Tests

```bash
npm test
```

