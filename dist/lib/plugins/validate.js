'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.hooks = exports.prototypes = exports.rxdb = undefined;

var _isMyJsonValid = require('is-my-json-valid');

var _isMyJsonValid2 = _interopRequireDefault(_isMyJsonValid);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _util = require('../util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 * @type {Object<string, any>}
 */
var validatorsCache = {};

/**
 * returns the parsed validator from is-my-json-valid
 * @param {string} [schemaPath=''] if given, the schema for the sub-path is used
 * @
 */
/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
var _getValidator = function _getValidator() {
    var schemaPath = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    var hash = this.hash;
    if (!validatorsCache[hash]) validatorsCache[hash] = {};
    var validatorsOfHash = validatorsCache[hash];
    if (!validatorsOfHash[schemaPath]) {
        var schemaPart = schemaPath === '' ? this.jsonID : this.getSchemaByObjectPath(schemaPath);
        if (!schemaPart) {
            throw _rxError2['default'].newRxError('Sub-schema not found, does the schemaPath exists in your schema?', {
                schemaPath: schemaPath
            });
        }
        validatorsOfHash[schemaPath] = (0, _isMyJsonValid2['default'])(schemaPart);
    }
    return validatorsOfHash[schemaPath];
};

/**
 * validates the given object against the schema
 * @param  {any} obj
 * @param  {String} [schemaPath=''] if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 * @return {any} obj if validation successful
 */
var validate = function validate(obj) {
    var schemaPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var useValidator = this._getValidator(schemaPath);
    var isValid = useValidator(obj);
    if (isValid) return obj;else {
        throw _rxError2['default'].newRxError('object does not match schema', {
            errors: useValidator.errors,
            schemaPath: schemaPath,
            obj: obj,
            schema: this.jsonID
        });
    };
};

var runAfterSchemaCreated = function runAfterSchemaCreated(rxSchema) {
    // pre-generate the isMyJsonValid-validator from the schema
    util.requestIdleCallbackIfAvailable(function () {
        rxSchema._getValidator();
    });
};

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     * @param {[type]} prototype of RxSchema
     */
    RxSchema: function RxSchema(proto) {
        proto._getValidator = _getValidator;
        proto.validate = validate;
    }
};
var hooks = exports.hooks = {
    createRxSchema: runAfterSchemaCreated
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    hooks: hooks
};
