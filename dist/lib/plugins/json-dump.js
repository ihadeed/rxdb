'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.prototypes = exports.rxdb = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _util = require('../util');

var util = _interopRequireWildcard(_util);

var _rxQuery = require('../rx-query');

var _rxQuery2 = _interopRequireDefault(_rxQuery);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var dumpRxDatabase = function () {
    var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
        var _this = this;

        var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
        var collections = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var json, useCollections;
        return _regenerator2['default'].wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        json = {
                            name: this.name,
                            instanceToken: this.token,
                            encrypted: false,
                            passwordHash: null,
                            collections: []
                        };


                        if (this.password) {
                            json.passwordHash = util.hash(this.password);
                            if (decrypted) json.encrypted = false;else json.encrypted = true;
                        }

                        useCollections = Object.keys(this.collections).filter(function (colName) {
                            return !collections || collections.includes(colName);
                        }).filter(function (colName) {
                            return colName.charAt(0) !== '_';
                        }).map(function (colName) {
                            return _this.collections[colName];
                        });
                        _context.next = 5;
                        return Promise.all(useCollections.map(function (col) {
                            return col.dump(decrypted);
                        }));

                    case 5:
                        json.collections = _context.sent;
                        return _context.abrupt('return', json);

                    case 7:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function dumpRxDatabase() {
        return _ref.apply(this, arguments);
    };
}(); /**
      * this plugin adds the json export/import capabilities to RxDB
      */


var importDumpRxDatabase = function () {
    var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2(dump) {
        var _this2 = this;

        var missingCollections;
        return _regenerator2['default'].wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        /**
                         * collections must be created before the import
                         * because we do not know about the other collection-settings here
                         */
                        missingCollections = dump.collections.filter(function (col) {
                            return !_this2.collections[col.name];
                        }).map(function (col) {
                            return col.name;
                        });

                        if (!(missingCollections.length > 0)) {
                            _context2.next = 3;
                            break;
                        }

                        throw _rxError2['default'].newRxError('You must create the collections before you can import their data', {
                            missingCollections: missingCollections
                        });

                    case 3:
                        return _context2.abrupt('return', Promise.all(dump.collections.map(function (colDump) {
                            return _this2.collections[colDump.name].importDump(colDump);
                        })));

                    case 4:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function importDumpRxDatabase(_x3) {
        return _ref2.apply(this, arguments);
    };
}();

var dumpRxCollection = function () {
    var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3() {
        var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
        var encrypted, json, query, docs;
        return _regenerator2['default'].wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        encrypted = !decrypted;
                        json = {
                            name: this.name,
                            schemaHash: this.schema.hash,
                            encrypted: false,
                            passwordHash: null,
                            docs: []
                        };


                        if (this.database.password && encrypted) {
                            json.passwordHash = util.hash(this.database.password);
                            json.encrypted = true;
                        }

                        query = _rxQuery2['default'].create('find', {}, this);
                        _context3.next = 6;
                        return this._pouchFind(query, null, encrypted);

                    case 6:
                        docs = _context3.sent;

                        json.docs = docs.map(function (docData) {
                            delete docData._rev;
                            return docData;
                        });
                        return _context3.abrupt('return', json);

                    case 9:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, _callee3, this);
    }));

    return function dumpRxCollection() {
        return _ref3.apply(this, arguments);
    };
}();

var importDumpRxCollection = function () {
    var _ref4 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4(exportedJSON) {
        var _this3 = this;

        var importFns;
        return _regenerator2['default'].wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        if (!(exportedJSON.schemaHash !== this.schema.hash)) {
                            _context4.next = 2;
                            break;
                        }

                        throw new Error('the imported json relies on a different schema');

                    case 2:
                        if (!(exportedJSON.encrypted && exportedJSON.passwordHash !== util.hash(this.database.password))) {
                            _context4.next = 4;
                            break;
                        }

                        throw new Error('json.passwordHash does not match the own');

                    case 4:
                        importFns = exportedJSON.docs
                        // decrypt
                        .map(function (doc) {
                            return _this3._crypter.decrypt(doc);
                        })
                        // validate schema
                        .map(function (doc) {
                            return _this3.schema.validate(doc);
                        })
                        // import
                        .map(function (doc) {
                            return _this3._pouchPut(doc);
                        });
                        return _context4.abrupt('return', Promise.all(importFns));

                    case 6:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this);
    }));

    return function importDumpRxCollection(_x5) {
        return _ref4.apply(this, arguments);
    };
}();

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    RxDatabase: function RxDatabase(proto) {
        proto.dump = dumpRxDatabase;
        proto.importDump = importDumpRxDatabase;
    },
    RxCollection: function RxCollection(proto) {
        proto.dump = dumpRxCollection;
        proto.importDump = importDumpRxCollection;
    }
};

var overwritable = exports.overwritable = {};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};
