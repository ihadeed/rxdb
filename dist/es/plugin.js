/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */
import RxSchema from './rx-schema';
import Crypter from './crypter';
import RxDocument from './rx-document';
import RxQuery from './rx-query';
import RxCollection from './rx-collection';
import RxDatabase from './rx-database';
import PouchDB from './pouch-db';

import overwritable from './overwritable';
import { HOOKS } from './hooks';

/**
 * prototypes that can be manipulated with a plugin
 * @type {Object}
 */
var PROTOTYPES = {
    RxSchema: RxSchema.RxSchema.prototype,
    Crypter: Crypter.Crypter.prototype,
    RxDocument: RxDocument.RxDocument.prototype,
    RxQuery: RxQuery.RxQuery.prototype,
    RxCollection: RxCollection.RxCollection.prototype,
    RxDatabase: RxDatabase.RxDatabase.prototype
};

export function addPlugin(plugin) {
    if (!plugin.rxdb) {
        // pouchdb-plugin
        if (typeof plugin === 'object' && plugin['default']) plugin = plugin['default'];
        PouchDB.plugin(plugin);
    }

    // prototype-overwrites
    if (plugin.prototypes) {
        Object.entries(plugin.prototypes).forEach(function (entry) {
            var name = entry[0];
            var fun = entry[1];
            fun(PROTOTYPES[name]);
        });
    }
    // overwritable-overwrites
    if (plugin.overwritable) {
        Object.entries(plugin.overwritable).forEach(function (entry) {
            var name = entry[0];
            var fun = entry[1];
            overwritable[name] = fun;
        });
    }
    // extend-hooks
    if (plugin.hooks) {
        Object.entries(plugin.hooks).forEach(function (entry) {
            var name = entry[0];
            var fun = entry[1];
            HOOKS[name].push(fun);
        });
    }
}

export default {
    addPlugin: addPlugin,
    overwritable: overwritable
};