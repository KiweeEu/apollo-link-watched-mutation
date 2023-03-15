"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCacheManager = void 0;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const createCacheManager = (cache, debug, readOnly) => {
  return {
    createKey: operation => ({
      query: operation.query,
      variables: operation.variables
    }),
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
        cache.writeQuery(_objectSpread(_objectSpread({}, query), {}, {
          data
        }));
        if (debug) {
          window.console.log({
            message: 'Success --- Updated the cache upon a mutation',
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
exports.createCacheManager = createCacheManager;