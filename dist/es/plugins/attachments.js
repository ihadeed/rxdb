import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';

var resyncRxDocument = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(doc) {
        var docData, data, changeEvent;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return doc.collection.pouch.get(doc.primary);

                    case 2:
                        docData = _context.sent;
                        data = doc.collection._handleFromPouch(docData);
                        changeEvent = RxChangeEvent.create('UPDATE', doc.collection.database, doc.collection, doc, data);

                        doc.$emit(changeEvent);

                    case 6:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function resyncRxDocument(_x) {
        return _ref.apply(this, arguments);
    };
}();

import IdleQueue from 'custom-idle-queue';
import RxChangeEvent from './../rx-change-event';
import * as util from './../util';

/**
 * to not have update-conflicts,
 * we use atomic inserts (per document) on putAttachment()
 * @type {WeakMap}
 */
var ATTACHMENT_ATOMIC_QUEUES = new WeakMap();

function ensureSchemaSupportsAttachments(doc) {
    var schemaJson = doc.collection.schema.jsonID;
    if (!schemaJson.attachments) throw new Error('to use attachments, please define this in your schema');
}

export var blobBufferUtil = {
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     * @param  {string} data
     * @param  {string} type
     * @return {Blob|Buffer}
     */
    createBlobBuffer: function createBlobBuffer(data, type) {
        var blobBuffer = void 0;
        try {
            // for browsers
            blobBuffer = new Blob([data], {
                type: type
            });
        } catch (e) {
            // for node
            blobBuffer = new Buffer(data, {
                type: type
            });
        }
        return blobBuffer;
    },
    toString: function toString(blobBuffer) {
        if (blobBuffer instanceof Buffer) {
            // node
            return util.nextTick().then(function () {
                return blobBuffer.toString();
            });
        }
        return new Promise(function (res) {
            // browsers
            var reader = new FileReader();
            reader.addEventListener('loadend', function (e) {
                var text = e.target.result;
                res(text);
            });
            reader.readAsText(blobBuffer);
        });
    }
};

var _assignMethodsToAttachment = function _assignMethodsToAttachment(attachment) {
    Object.entries(attachment.doc.collection._attachments).forEach(function (entry) {
        var funName = entry[0];
        var fun = entry[1];
        attachment.__defineGetter__(funName, function () {
            return fun.bind(attachment);
        });
    });
};

/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */
export var RxAttachment = function () {
    function RxAttachment(_ref2) {
        var doc = _ref2.doc,
            id = _ref2.id,
            type = _ref2.type,
            length = _ref2.length,
            digest = _ref2.digest,
            rev = _ref2.rev;

        _classCallCheck(this, RxAttachment);

        this.doc = doc;
        this.id = id;
        this.type = type;
        this.length = length;
        this.digest = digest;
        this.rev = rev;

        _assignMethodsToAttachment(this);
    }

    RxAttachment.prototype.remove = function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            _context2.next = 2;
                            return this.doc.collection.pouch.removeAttachment(this.doc.primary, this.id, this.doc._data._rev);

                        case 2:
                            _context2.next = 4;
                            return resyncRxDocument(this.doc);

                        case 4:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));

        function remove() {
            return _ref3.apply(this, arguments);
        }

        return remove;
    }();

    /**
     * returns the data for the attachment
     * @return {Promise<Buffer|Blob>}
     */


    RxAttachment.prototype.getData = function () {
        var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
            var data, dataString;
            return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            _context3.next = 2;
                            return this.doc.collection.pouch.getAttachment(this.doc.primary, this.id);

                        case 2:
                            data = _context3.sent;

                            if (!shouldEncrypt(this.doc)) {
                                _context3.next = 8;
                                break;
                            }

                            _context3.next = 6;
                            return blobBufferUtil.toString(data);

                        case 6:
                            dataString = _context3.sent;

                            data = blobBufferUtil.createBlobBuffer(this.doc.collection._crypter._decryptValue(dataString), this.type);

                        case 8:
                            return _context3.abrupt('return', data);

                        case 9:
                        case 'end':
                            return _context3.stop();
                    }
                }
            }, _callee3, this);
        }));

        function getData() {
            return _ref4.apply(this, arguments);
        }

        return getData;
    }();

    RxAttachment.prototype.getStringData = function () {
        var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
            var bufferBlob;
            return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            _context4.next = 2;
                            return this.getData();

                        case 2:
                            bufferBlob = _context4.sent;
                            _context4.next = 5;
                            return blobBufferUtil.toString(bufferBlob);

                        case 5:
                            return _context4.abrupt('return', _context4.sent);

                        case 6:
                        case 'end':
                            return _context4.stop();
                    }
                }
            }, _callee4, this);
        }));

        function getStringData() {
            return _ref5.apply(this, arguments);
        }

        return getStringData;
    }();

    return RxAttachment;
}();

RxAttachment.fromPouchDocument = function (id, pouchDocAttachment, rxDocument) {
    return new RxAttachment({
        doc: rxDocument,
        id: id,
        type: pouchDocAttachment.content_type,
        length: pouchDocAttachment.length,
        digest: pouchDocAttachment.digest,
        rev: pouchDocAttachment.revpos
    });
};

export function getAtomicQueueOfDocument(doc) {
    if (!ATTACHMENT_ATOMIC_QUEUES.has(doc)) ATTACHMENT_ATOMIC_QUEUES.set(doc, new IdleQueue());
    return ATTACHMENT_ATOMIC_QUEUES.get(doc);
};

function shouldEncrypt(doc) {
    return !!doc.collection.schema.jsonID.attachments.encrypted;
}

export var putAttachment = function () {
    var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(_ref7) {
        var _this = this;

        var id = _ref7.id,
            data = _ref7.data,
            _ref7$type = _ref7.type,
            type = _ref7$type === undefined ? 'text/plain' : _ref7$type;
        var queue, blobBuffer, ret;
        return _regeneratorRuntime.wrap(function _callee6$(_context6) {
            while (1) {
                switch (_context6.prev = _context6.next) {
                    case 0:
                        ensureSchemaSupportsAttachments(this);
                        queue = getAtomicQueueOfDocument(this);


                        if (shouldEncrypt(this)) data = this.collection._crypter._encryptValue(data);

                        blobBuffer = blobBufferUtil.createBlobBuffer(data, type);
                        _context6.next = 6;
                        return queue.requestIdlePromise();

                    case 6:
                        _context6.next = 8;
                        return queue.wrapCall(_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
                            var docData, attachmentData, attachment;
                            return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                                while (1) {
                                    switch (_context5.prev = _context5.next) {
                                        case 0:
                                            _context5.next = 2;
                                            return _this.collection.pouch.putAttachment(_this.primary, id, _this._data._rev, blobBuffer, type);

                                        case 2:
                                            _context5.next = 4;
                                            return _this.collection.pouch.get(_this.primary);

                                        case 4:
                                            docData = _context5.sent;
                                            attachmentData = docData._attachments[id];
                                            attachment = RxAttachment.fromPouchDocument(id, attachmentData, _this);


                                            _this._data._rev = docData._rev;
                                            _this._data._attachments = docData._attachments;

                                            _context5.next = 11;
                                            return resyncRxDocument(_this);

                                        case 11:
                                            return _context5.abrupt('return', attachment);

                                        case 12:
                                        case 'end':
                                            return _context5.stop();
                                    }
                                }
                            }, _callee5, _this);
                        })));

                    case 8:
                        ret = _context6.sent;
                        return _context6.abrupt('return', ret);

                    case 10:
                    case 'end':
                        return _context6.stop();
                }
            }
        }, _callee6, this);
    }));

    return function putAttachment(_x2) {
        return _ref6.apply(this, arguments);
    };
}();;

/**
 * get an attachment of the document by its id
 * @param  {string} id
 * @return {RxAttachment}
 */
export function getAttachment(id) {
    ensureSchemaSupportsAttachments(this);
    var docData = this._dataSync$.getValue();
    if (!docData._attachments || !docData._attachments[id]) return null;

    var attachmentData = docData._attachments[id];
    var attachment = RxAttachment.fromPouchDocument(id, attachmentData, this);
    return attachment;
};

/**
 * returns all attachments of the document
 * @return {RxAttachment[]}
 */
export function allAttachments() {
    var _this2 = this;

    ensureSchemaSupportsAttachments(this);
    var docData = this._dataSync$.getValue();
    return Object.keys(docData._attachments).map(function (id) {
        return RxAttachment.fromPouchDocument(id, docData._attachments[id], _this2);
    });
};

export var preMigrateDocument = function () {
    var _ref9 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(action) {
        return _regeneratorRuntime.wrap(function _callee7$(_context7) {
            while (1) {
                switch (_context7.prev = _context7.next) {
                    case 0:
                        delete action.migrated._attachments;
                        return _context7.abrupt('return', action);

                    case 2:
                    case 'end':
                        return _context7.stop();
                }
            }
        }, _callee7, this);
    }));

    return function preMigrateDocument(_x3) {
        return _ref9.apply(this, arguments);
    };
}();

export var postMigrateDocument = function () {
    var _ref10 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(action) {
        var primaryPath, attachments, id, stubData, primary, data, res;
        return _regeneratorRuntime.wrap(function _callee8$(_context8) {
            while (1) {
                switch (_context8.prev = _context8.next) {
                    case 0:
                        primaryPath = action.oldCollection.schema.primaryPath;
                        attachments = action.doc._attachments;

                        if (attachments) {
                            _context8.next = 4;
                            break;
                        }

                        return _context8.abrupt('return', action);

                    case 4:
                        _context8.t0 = _regeneratorRuntime.keys(attachments);

                    case 5:
                        if ((_context8.t1 = _context8.t0()).done) {
                            _context8.next = 21;
                            break;
                        }

                        id = _context8.t1.value;
                        stubData = attachments[id];
                        primary = action.doc[primaryPath];
                        _context8.next = 11;
                        return action.oldCollection.pouchdb.getAttachment(primary, id);

                    case 11:
                        data = _context8.sent;
                        _context8.next = 14;
                        return blobBufferUtil.toString(data);

                    case 14:
                        data = _context8.sent;
                        _context8.next = 17;
                        return action.newestCollection.pouch.putAttachment(primary, id, action.res.rev, blobBufferUtil.createBlobBuffer(data, stubData.content_type), stubData.content_type);

                    case 17:
                        res = _context8.sent;

                        action.res = res;
                        _context8.next = 5;
                        break;

                    case 21:
                    case 'end':
                        return _context8.stop();
                }
            }
        }, _callee8, this);
    }));

    return function postMigrateDocument(_x4) {
        return _ref10.apply(this, arguments);
    };
}();

export var rxdb = true;
export var prototypes = {
    RxDocument: function RxDocument(proto) {
        proto.putAttachment = putAttachment;
        proto.getAttachment = getAttachment;
        proto.allAttachments = allAttachments;
        Object.defineProperty(proto, 'allAttachments$', {
            get: function allAttachments$() {
                var _this3 = this;

                return this._dataSync$.map(function (data) {
                    if (!data._attachments) return {};
                    return data._attachments;
                }).map(function (attachmentsData) {
                    return Object.entries(attachmentsData);
                }).map(function (entries) {
                    return entries.map(function (entry) {
                        var id = entry[0];
                        var attachmentData = entry[1];
                        return RxAttachment.fromPouchDocument(id, attachmentData, _this3);
                    });
                });
            }
        });
    }
};
export var overwritable = {};
export var hooks = {
    preMigrateDocument: preMigrateDocument,
    postMigrateDocument: postMigrateDocument
};

export default {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable,
    hooks: hooks,
    blobBufferUtil: blobBufferUtil
};