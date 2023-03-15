"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createInflightRequestManager = void 0;
const createInflightRequestManager = () => {
  const inflightRequests = {};
  return {
    getBeforeState: queryKey => inflightRequests[JSON.stringify(queryKey)],
    set: (queryKey, result) => {
      inflightRequests[JSON.stringify(queryKey)] = result;
    }
  };
};
exports.createInflightRequestManager = createInflightRequestManager;