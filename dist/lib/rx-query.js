'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxQuery = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;
exports.isInstanceOf = isInstanceOf;

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

var _mquery = require('./mquery/mquery');

var _mquery2 = _interopRequireDefault(_mquery);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _queryChangeDetector = require('./query-change-detector');

var _queryChangeDetector2 = _interopRequireDefault(_queryChangeDetector);

var _rxError = require('./rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _hooks = require('./hooks');

var _merge = require('rxjs/observable/merge');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

var _mergeMap = require('rxjs/operators/mergeMap');

var _filter = require('rxjs/operators/filter');

var _map = require('rxjs/operators/map');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _queryCount = 0;
var newQueryID = function newQueryID() {
    return ++_queryCount;
};

var RxQuery = exports.RxQuery = function () {
    function RxQuery(op, queryObj, collection) {
        (0, _classCallCheck3['default'])(this, RxQuery);

        this.op = op;
        this.collection = collection;
        this.id = newQueryID();

        if (!queryObj) queryObj = this._defaultQuery();

        this.mquery = new _mquery2['default'](queryObj);

        this._queryChangeDetector = _queryChangeDetector2['default'].create(this);
        this._resultsData = null;
        this._results$ = new _BehaviorSubject.BehaviorSubject(null);
        this._latestChangeEvent = -1;
        this._runningPromise = Promise.resolve(true);

        /**
         * if this is true, the results-state is not equal to the database
         * which means that the query must run against the database again
         * @type {Boolean}
         */
        this._mustReExec = true;

        /**
         * counts how often the execution on the whole db was done
         * (used for tests and debugging)
         * @type {Number}
         */
        this._execOverDatabaseCount = 0;
    }

    (0, _createClass3['default'])(RxQuery, [{
        key: '_defaultQuery',
        value: function _defaultQuery() {
            return (0, _defineProperty3['default'])({}, this.collection.schema.primaryPath, {});
        }

        // returns a clone of this RxQuery

    }, {
        key: '_clone',
        value: function _clone() {
            var cloned = new RxQuery(this.op, this._defaultQuery(), this.collection);
            cloned.mquery = this.mquery.clone();
            return cloned;
        }

        /**
         * run this query through the QueryCache
         * @return {RxQuery} can be this or another query with the equal state
         */

    }, {
        key: '_tunnelQueryCache',
        value: function _tunnelQueryCache() {
            return this.collection._queryCache.getByQuery(this);
        }
    }, {
        key: 'toString',
        value: function toString() {
            if (!this.stringRep) {
                var stringObj = util.sortObject({
                    op: this.op,
                    options: this.mquery.options,
                    _conditions: this.mquery._conditions,
                    _path: this.mquery._path,
                    _fields: this.mquery._fields
                }, true);

                this.stringRep = JSON.stringify(stringObj, util.stringifyFilter);
            }
            return this.stringRep;
        }

        /**
         * ensures that the results of this query is equal to the results which a query over the database would give
         * @return {Promise<boolean>} true if results have changed
         */

    }, {
        key: '_ensureEqual',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
                var ret, resolve, missedChangeEvents, runChangeEvents, changeResult, latestAfter, newResultData;
                return _regenerator2['default'].wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (!(this._latestChangeEvent >= this.collection._changeEventBuffer.counter)) {
                                    _context.next = 2;
                                    break;
                                }

                                return _context.abrupt('return', false);

                            case 2:
                                ret = false;

                                // make sure it does not run in parallel

                                _context.next = 5;
                                return this._runningPromise;

                            case 5:

                                // console.log('_ensureEqual(' + this.toString() + ') '+ this._mustReExec);

                                resolve = void 0;

                                this._runningPromise = new Promise(function (res) {
                                    resolve = res;
                                });

                                if (this._mustReExec) {
                                    _context.next = 21;
                                    break;
                                }

                                missedChangeEvents = this.collection._changeEventBuffer.getFrom(this._latestChangeEvent + 1);

                                if (!(missedChangeEvents === null)) {
                                    _context.next = 13;
                                    break;
                                }

                                // out of bounds -> reExec
                                this._mustReExec = true;
                                _context.next = 21;
                                break;

                            case 13:
                                // console.dir(missedChangeEvents);
                                this._latestChangeEvent = this.collection._changeEventBuffer.counter;
                                runChangeEvents = this.collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);
                                changeResult = this._queryChangeDetector.runChangeDetection(runChangeEvents);

                                if (!Array.isArray(changeResult) && changeResult) this._mustReExec = true;

                                if (!(Array.isArray(changeResult) && !(0, _deepEqual2['default'])(changeResult, this._resultsData))) {
                                    _context.next = 21;
                                    break;
                                }

                                ret = true;
                                _context.next = 21;
                                return this._setResultData(changeResult);

                            case 21:
                                if (!this._mustReExec) {
                                    _context.next = 31;
                                    break;
                                }

                                // counter can change while _execOverDatabase() is running
                                latestAfter = this.collection._changeEventBuffer.counter;
                                _context.next = 25;
                                return this._execOverDatabase();

                            case 25:
                                newResultData = _context.sent;

                                this._latestChangeEvent = latestAfter;

                                if ((0, _deepEqual2['default'])(newResultData, this._resultsData)) {
                                    _context.next = 31;
                                    break;
                                }

                                ret = true;
                                _context.next = 31;
                                return this._setResultData(newResultData);

                            case 31:

                                // console.log('_ensureEqual DONE (' + this.toString() + ')');

                                resolve(true);
                                return _context.abrupt('return', ret);

                            case 33:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function _ensureEqual() {
                return _ref2.apply(this, arguments);
            }

            return _ensureEqual;
        }()
    }, {
        key: '_setResultData',
        value: function _setResultData(newResultData) {
            var _this = this;

            this._resultsData = newResultData;
            return this.collection._createDocuments(this._resultsData).then(function (newResults) {
                return _this._results$.next(newResults);
            });
        }

        /**
         * executes the query on the database
         * @return {Promise<{}[]>} results-array with document-data
         */

    }, {
        key: '_execOverDatabase',
        value: function _execOverDatabase() {
            var _this2 = this;

            this._execOverDatabaseCount++;

            var docsPromise = void 0;
            switch (this.op) {
                case 'find':
                    docsPromise = this.collection._pouchFind(this);
                    break;
                case 'findOne':
                    docsPromise = this.collection._pouchFind(this, 1);
                    break;
                default:
                    throw new Error('RxQuery.exec(): op (' + this.op + ') not known');
            }

            return docsPromise.then(function (docsData) {
                _this2._mustReExec = false;
                return docsData;
            });
        }
    }, {
        key: 'toJSON',
        value: function toJSON() {
            if (this._toJSON) return this._toJSON;

            var primPath = this.collection.schema.primaryPath;

            var json = {
                selector: this.mquery._conditions
            };

            var options = this.mquery._optionsForExec();

            // sort
            if (options.sort) {
                var sortArray = [];
                Object.keys(options.sort).map(function (fieldName) {
                    var dirInt = options.sort[fieldName];
                    var dir = 'asc';
                    if (dirInt === -1) dir = 'desc';
                    var pushMe = {};
                    // TODO run primary-swap somewhere else
                    if (fieldName === primPath) fieldName = '_id';

                    pushMe[fieldName] = dir;
                    sortArray.push(pushMe);
                });
                json.sort = sortArray;
            } else {
                // sort by primaryKey as default
                // (always use _id because there is no primary-swap on json.sort)
                json.sort = [{
                    _id: 'asc'
                }];
            }

            if (options.limit) {
                if (typeof options.limit !== 'number') throw new TypeError('limit() must get a number');
                json.limit = options.limit;
            }

            if (options.skip) {
                if (typeof options.skip !== 'number') throw new TypeError('skip() must get a number');
                json.skip = options.skip;
            }

            // add not-query to _id to prevend the grabbing of '_design..' docs
            // this is not the best solution because it prevents the usage of a 'language'-field
            if (!json.selector.language) json.selector.language = {};
            json.selector.language.$ne = 'query';

            // strip empty selectors
            Object.entries(json.selector).filter(function (entry) {
                return (0, _typeof3['default'])(entry[1]) === 'object';
            }).filter(function (entry) {
                return entry[1] !== null;
            }).filter(function (entry) {
                return !Array.isArray(entry[1]);
            }).filter(function (entry) {
                return Object.keys(entry[1]).length === 0;
            }).forEach(function (entry) {
                return delete json.selector[entry[0]];
            });

            // primary swap
            if (primPath !== '_id' && json.selector[primPath]) {
                // selector
                json.selector._id = json.selector[primPath];
                delete json.selector[primPath];
            }

            this._toJSON = json;
            return this._toJSON;
        }
    }, {
        key: 'keyCompress',


        /**
         * get the key-compression version of this query
         * @return {{selector: {}, sort: []}} compressedQuery
         */
        value: function keyCompress() {
            if (!this.collection.schema.doKeyCompression()) return this.toJSON();else {
                if (!this._keyCompress) {
                    this._keyCompress = this.collection._keyCompressor.compressQuery(this.toJSON());
                }
                return this._keyCompress;
            }
        }

        /**
         * deletes all found documents
         * @return {Promise(RxDocument|RxDocument[])} promise with deleted documents
         */

    }, {
        key: 'remove',
        value: function remove() {
            var ret = void 0;
            return this.exec().then(function (docs) {
                ret = docs;
                if (Array.isArray(docs)) return Promise.all(docs.map(function (doc) {
                    return doc.remove();
                }));else return docs.remove();
            }).then(function () {
                return ret;
            });
        }

        /**
         * updates all found documents
         * @overwritten by plugin (optinal)
         * @param  {object} updateObj
         * @return {Promise(RxDocument|RxDocument[])} promise with updated documents
         */

    }, {
        key: 'update',
        value: function update() {
            throw _rxError2['default'].pluginMissing('update');
        }

        /**
         * execute the query
         * @return {Promise<RxDocument|RxDocument[]>} found documents
         */

    }, {
        key: 'exec',
        value: function exec() {
            return this.$.first().toPromise();
        }

        /**
         * regex cannot run on primary _id
         * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
         */

    }, {
        key: 'regex',
        value: function regex(params) {
            var clonedThis = this._clone();

            if (this.mquery._path === this.collection.schema.primaryPath) throw new Error('You cannot use .regex() on the primary field \'' + this.mquery._path + '\'');

            clonedThis.mquery.regex(params);
            return clonedThis._tunnelQueryCache();
        }
    }, {
        key: 'sort',


        /**
         * make sure it searches index because of pouchdb-find bug
         * @link https://github.com/nolanlawson/pouchdb-find/issues/204
         */
        value: function sort(params) {
            var throwNotInSchema = function throwNotInSchema(key) {
                throw new Error('RxQuery.sort(' + key + ') does not work because ' + key + ' is not defined in the schema');
            };
            var clonedThis = this._clone();

            // workarround because sort wont work on unused keys
            if ((typeof params === 'undefined' ? 'undefined' : (0, _typeof3['default'])(params)) !== 'object') {
                var checkParam = params.charAt(0) === '-' ? params.substring(1) : params;
                if (!clonedThis.mquery._conditions[checkParam]) {
                    var schemaObj = clonedThis.collection.schema.getSchemaByObjectPath(checkParam);
                    if (!schemaObj) throwNotInSchema(checkParam);

                    if (schemaObj.type === 'integer')
                        // TODO change back to -Infinity when issue resolved
                        // @link https://github.com/pouchdb/pouchdb/issues/6454
                        clonedThis.mquery.where(checkParam).gt(-9999999999999999999999999999); // -Infinity does not work since pouchdb 6.2.0
                    else clonedThis.mquery.where(checkParam).gt(null);
                }
            } else {
                Object.keys(params).filter(function (k) {
                    return !clonedThis.mquery._conditions[k] || !clonedThis.mquery._conditions[k].$gt;
                }).forEach(function (k) {
                    var schemaObj = clonedThis.collection.schema.getSchemaByObjectPath(k);
                    if (!schemaObj) throwNotInSchema(k);

                    if (schemaObj.type === 'integer')
                        // TODO change back to -Infinity when issue resolved
                        // @link https://github.com/pouchdb/pouchdb/issues/6454
                        clonedThis.mquery.where(k).gt(-9999999999999999999999999999); // -Infinity does not work since pouchdb 6.2.0

                    else clonedThis.mquery.where(k).gt(null);
                });
            }
            clonedThis.mquery.sort(params);
            return clonedThis._tunnelQueryCache();
        }
    }, {
        key: 'limit',
        value: function limit(amount) {
            if (this.op === 'findOne') throw new Error('.limit() cannot be called on .findOne()');else {
                var clonedThis = this._clone();
                clonedThis.mquery.limit(amount);
                return clonedThis._tunnelQueryCache();
            }
        }
    }, {
        key: '$',
        get: function get() {
            var _this3 = this;

            if (!this._$) {
                var res$ = this._results$.pipe((0, _mergeMap.mergeMap)(function (results) {
                    return _this3._ensureEqual().then(function (hasChanged) {
                        if (hasChanged) return 'WAITFORNEXTEMIT';else return results;
                    });
                }), (0, _filter.filter)(function (results) {
                    return results !== 'WAITFORNEXTEMIT';
                })).asObservable();

                var changeEvents$ = this.collection.$.pipe((0, _filter.filter)(function (cEvent) {
                    return ['INSERT', 'UPDATE', 'REMOVE'].includes(cEvent.data.op);
                }), (0, _mergeMap.mergeMap)((0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2() {
                    return _regenerator2['default'].wrap(function _callee2$(_context2) {
                        while (1) {
                            switch (_context2.prev = _context2.next) {
                                case 0:
                                    return _context2.abrupt('return', _this3._ensureEqual());

                                case 1:
                                case 'end':
                                    return _context2.stop();
                            }
                        }
                    }, _callee2, _this3);
                }))), (0, _filter.filter)(function () {
                    return false;
                }));
                this._$ = (0, _merge.merge)(res$, changeEvents$).pipe((0, _filter.filter)(function (x) {
                    return x !== null;
                }), (0, _map.map)(function (results) {
                    if (_this3.op !== 'findOne') return results;else if (results.length === 0) return null;else return results[0];
                }));
            }
            return this._$;
        }
    }]);
    return RxQuery;
}();

/**
 * tunnel the proto-functions of mquery to RxQuery
 * @param  {any} rxQueryProto    [description]
 * @param  {string[]} mQueryProtoKeys [description]
 * @return {void}                 [description]
 */


var protoMerge = function protoMerge(rxQueryProto, mQueryProtoKeys) {
    mQueryProtoKeys.filter(function (attrName) {
        return !attrName.startsWith('_');
    }).filter(function (attrName) {
        return !rxQueryProto[attrName];
    }).forEach(function (attrName) {
        rxQueryProto[attrName] = function (p1) {
            var clonedThis = this._clone();
            clonedThis.mquery[attrName](p1);
            return clonedThis._tunnelQueryCache();
        };
    });
};

var protoMerged = false;
function create(op, queryObj, collection) {
    if (queryObj && (typeof queryObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(queryObj)) !== 'object') throw new TypeError('query must be an object');
    if (Array.isArray(queryObj)) throw new TypeError('query cannot be an array');

    var ret = new RxQuery(op, queryObj, collection);

    if (!protoMerged) {
        protoMerged = true;
        protoMerge(Object.getPrototypeOf(ret), Object.getOwnPropertyNames(ret.mquery.__proto__));
    }

    (0, _hooks.runPluginHooks)('createRxQuery', ret);
    return ret;
}

function isInstanceOf(obj) {
    return obj instanceof RxQuery;
}

exports['default'] = {
    create: create,
    RxQuery: RxQuery,
    isInstanceOf: isInstanceOf
};
