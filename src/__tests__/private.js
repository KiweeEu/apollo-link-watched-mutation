import { gql } from "@apollo/client/core";

export const sampleQuery = gql`
    query TodoList($status: String) {
        todoList(status: $status) {
            id
            name
            status
        }
    }
`;

export const sampleSuccessfulQueryResponse = {
  data: {
    todoList: [
      { id: '1', name: 'Get groceries', status: 'IN_PROGRESS' },
      { id: '2', name: 'Take car in for service', status: 'DONE' }
    ]
  }
};

export const sampleErrorQueryResponse = {
  data: null,
  errors: [{ message: 'Everything went wrong' }]
};

export const sampleMutation = gql`
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
`;

export const sampleSuccessfulMutationResponse = {
  data: {
    saveTodo: {
      id: '1',
      name: 'Get groceries',
      status: 'DONE'
    }
  }
};

export const sampleErrorMutationResponse = {
  data: null,
  errors: [{ message: 'Oops forgot to implement' }]
};

export const sampleSubscription = gql`
    subscription SavedTodos {
        savedTodos {
            id
            name
            status
        }
    }
`;

export const sampleSuccessfulSubscriptionResponse = {
  data: {
    SavedTodos: {
      id: '1',
      name: 'Get groceries',
      status: 'DONE'
    }
  }
};

export const sampleErrorSubscriptionResponse = {
  data: null,
  errors: [{ message: 'Oops forgot to implement' }]
};


export const query = {
  query: sampleQuery,
  variables: { status: 'DONE' }
};
export const mutation = {
  query: sampleMutation,
  variables: { id: 'todo_1', status: 'IN_PROGRESS' }
};
export const subscription = {
  query: sampleSubscription
};
export const createCache = () => {
  const data = {};

  const cache = {
    readQuery: k => data[k],
    writeQuery: (k, v,) => {
      data[k] = v;
    }
  };
  return {
    ...cache,
    performTransaction: writeFn => {
      writeFn(cache);
    }
  };
};