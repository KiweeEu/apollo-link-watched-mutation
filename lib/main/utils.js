"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSuccessfulQuery = exports.isSuccessfulMutation = exports.isSuccessful = exports.isQuery = exports.isOptimistic = exports.isMutation = exports.isFailedMutation = exports.getQueryName = void 0;
var _utilities = require("@apollo/client/utilities");
const isQuery = operation => operation === 'query';
exports.isQuery = isQuery;
const isMutation = operation => operation === 'mutation';
exports.isMutation = isMutation;
const isSuccessful = result => !(0, _utilities.graphQLResultHasError)(result);
exports.isSuccessful = isSuccessful;
const isSuccessfulQuery = (operation, result) => isQuery(operation) && isSuccessful(result);
exports.isSuccessfulQuery = isSuccessfulQuery;
const isSuccessfulMutation = (operation, result) => isMutation(operation) && isSuccessful(result);
exports.isSuccessfulMutation = isSuccessfulMutation;
const isFailedMutation = (operation, result) => isMutation(operation) && !isSuccessful(result);
exports.isFailedMutation = isFailedMutation;
const isOptimistic = context => !!context.optimisticResponse;
exports.isOptimistic = isOptimistic;
const getQueryName = query => {
  const queryDefinition = (0, _utilities.getMainDefinition)(query);
  return queryDefinition && queryDefinition.name && queryDefinition.name.value || '';
};
exports.getQueryName = getQueryName;