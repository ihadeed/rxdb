/**
 * pouchdb allows to easily replicate database across devices.
 * This behaviour is tested here
 * @link https://pouchdb.com/guides/replication.html
 */

import assert from 'assert';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import * as RxDB from '../../dist/lib/index';

import {
    Observable
} from 'rxjs/Observable';

let request;
let SpawnServer;
if (config.platform.isNode()) {
    SpawnServer = require('../helper/spawn-server');
    request = require('request-promise');
    RxDB.PouchDB.plugin(require('pouchdb-adapter-http'));
}

describe('replication.test.js', () => {
    if (!config.platform.isNode()) return;

    describe('spawnServer.js', () => {
        it('spawn and reach a server', async () => {
            let path = await SpawnServer.spawn();
            path = path.split('/');
            path.pop();
            path.pop();
            path = path.join('/');
            const res = await request(path);
            const json = JSON.parse(res);
            assert.equal(typeof json.uuid, 'string');
        });
        it('spawn again', async () => {
            let path = await SpawnServer.spawn();
            path = path.split('/');
            path.pop();
            path.pop();
            path = path.join('/');
            const res = await request(path);
            const json = JSON.parse(res);
            assert.equal(typeof json.uuid, 'string');
        });
    });
    describe('test pouch-sync to ensure nothing broke', () => {
        describe('positive', () => {
            it('sync two collections over server', async function() {
                const serverURL = await SpawnServer.spawn();
                const c = await humansCollection.create(0);
                const c2 = await humansCollection.create(0);

                const pw8 = AsyncTestUtil.waitResolveable(1000);
                c.pouch.sync(serverURL, {
                    live: true
                }).on('error', function(err) {
                    console.log('error:');
                    console.log(JSON.stringify(err));
                    throw new Error(err);
                });
                c2.pouch.sync(serverURL, {
                    live: true
                });
                let count = 0;
                c2.pouch.changes({
                    since: 'now',
                    live: true,
                    include_docs: true
                }).on('change', () => {
                    count++;
                    if (count === 2) pw8.resolve();
                });

                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c2.find().exec();
                    return docs.length === 1;
                });
                const docs = await c2.find().exec();
                assert.equal(docs.length, 1);

                assert.equal(docs[0].get('firstName'), obj.firstName);

                c.database.destroy();
                c2.database.destroy();
            });
            it('Observable.fromEvent should fire on sync-change', async () => {
                const serverURL = await SpawnServer.spawn();
                const c = await humansCollection.create(0, null, false);
                const c2 = await humansCollection.create(0, null, false);
                const pw8 = AsyncTestUtil.waitResolveable(1400);
                c.pouch.sync(serverURL, {
                    live: true
                });
                c2.pouch.sync(serverURL, {
                    live: true
                });

                const e1 = [];
                const pouch$ = Observable
                    .fromEvent(c.pouch.changes({
                        since: 'now',
                        live: true,
                        include_docs: true
                    }), 'change')
                    .filter(e => !e.id.startsWith('_'))
                    .subscribe(e => e1.push(e));
                const e2 = [];
                const pouch2$ = Observable
                    .fromEvent(c2.pouch.changes({
                        since: 'now',
                        live: true,
                        include_docs: true
                    }), 'change')
                    .filter(e => !e.id.startsWith('_'))
                    .subscribe(e => e2.push(e));

                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;

                await AsyncTestUtil.waitUntil(() => e1.length === 1);
                await AsyncTestUtil.waitUntil(() => e2.length === 1);
                assert.equal(e1.length, e2.length);

                pouch$.unsubscribe();
                pouch2$.unsubscribe();
                c.database.destroy();
                c2.database.destroy();
            });
        });
    });
    describe('sync-directions', () => {
        describe('positive', () => {
            it('push-only-sync', async () => {
                const c = await humansCollection.create(10, null, false);
                const c2 = await humansCollection.create(10, null, false);

                c.sync({
                    remote: c2.pouch,
                    waitForLeadership: false,
                    direction: {
                        pull: false,
                        push: true
                    }
                });

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c2.find().exec();
                    return docs.length === 20;
                });
                await util.promiseWait(10);
                const nonSyncedDocs = await c.find().exec();
                assert.equal(nonSyncedDocs.length, 10);

                await c.database.destroy();
                await c2.database.destroy();
            });
            it('pull-only-sync', async () => {
                const c = await humansCollection.create(10, null, false);
                const c2 = await humansCollection.create(10, null, false);
                c.sync({
                    remote: c2.pouch,
                    waitForLeadership: false,
                    direction: {
                        pull: true,
                        push: false
                    }
                });
                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === 20;
                });
                await util.promiseWait(10);
                const nonSyncedDocs = await c2.find().exec();
                assert.equal(nonSyncedDocs.length, 10);

                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('negative', () => {
            it('should not allow non-way-sync', async () => {
                const c = await humansCollection.create(0);
                const c2 = await humansCollection.create(10, null, false);
                await AsyncTestUtil.assertThrows(
                    () => c.sync({
                        remote: c2.pouch,
                        direction: {
                            push: false,
                            pull: false
                        }
                    }),
                    Error,
                    'direction'
                );
                c.database.destroy();
            });
        });
    });
    describe('query-based sync', () => {
        describe('positive', () => {
            it('should only sync documents that match the query', async () => {
                const c = await humansCollection.create(0, null, false);
                const c2 = await humansCollection.create(10, null, false);
                const query = c.find().where('firstName').eq('foobar');

                const matchingDoc = schemaObjects.human();
                matchingDoc.firstName = 'foobar';
                await c2.insert(matchingDoc);

                c.sync({
                    remote: c2.pouch,
                    waitForLeadership: false,
                    query: query
                });

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === 1;
                });
                await util.promiseWait(10);
                const docs = await c.find().exec();
                assert.equal(docs.length, 1);
                assert.equal(docs[0].firstName, 'foobar');

                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('negative', () => {
            it('should not allow queries from other collection', async () => {
                const c = await humansCollection.create(0, null, false);
                const c2 = await humansCollection.create(10, null, false);
                const otherCollection = await humansCollection.create(0, null, false);

                const query = otherCollection.find().where('firstName').eq('foobar');
                await AsyncTestUtil.assertThrows(
                    () => c.sync({
                        remote: c2.pouch,
                        query
                    }),
                    Error,
                    'same'
                );

                c.database.destroy();
                c2.database.destroy();
                otherCollection.database.destroy();
            });
        });
    });

    describe('RxReplicationState', () => {
        describe('change$', () => {
            it('should emit change-events', async () => {
                const c = await humansCollection.create(0);
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: false
                });
                const emited = [];
                repState.change$.subscribe(cE => emited.push(cE));
                await AsyncTestUtil.waitUntil(() => emited.length >= 2);
                await c2.insert(schemaObjects.human());
                await AsyncTestUtil.waitUntil(() => emited.length >= 3);

                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('active$', () => {
            it('should be active', async () => {
                const c = await humansCollection.create();
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: false
                });
                const emited = [];
                repState.active$.subscribe(cE => emited.push(cE));
                await AsyncTestUtil.waitUntil(() => emited.pop() === true);

                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('complete$', () => {
            it('should always be false on live-replication', async () => {
                const c = await humansCollection.create();
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: false
                });
                const beFalse = await repState.complete$.first().toPromise();
                assert.equal(beFalse, false);

                c.database.destroy();
                c2.database.destroy();
            });
            it('should emit true on non-live-replication when done', async () => {
                const c = await humansCollection.create(10);
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: true,
                    direction: {
                        pull: true,
                        push: true
                    },
                    options: {
                        live: false,
                        retry: true
                    }
                });

                const emited = [];
                const sub = repState.complete$.subscribe(ev => emited.push(ev));
                await AsyncTestUtil.waitUntil(() => {
                    const lastEv = emited[emited.length - 1];
                    let ret = false;
                    try {
                        if (
                            lastEv.push.ok === true &&
                            lastEv.pull.ok === true
                        ) ret = true;
                    } catch (e) {}
                    return ret;
                });
                sub.unsubscribe();
                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('docs$', () => {
            it('should emit one event per doc', async () => {
                const c = await humansCollection.create(0);
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: false
                });
                const emitedDocs = [];
                repState.docs$.subscribe(doc => emitedDocs.push(doc));

                await AsyncTestUtil.waitUntil(() => emitedDocs.length === 10);
                emitedDocs.forEach(doc => assert.ok(doc.firstName));

                c.database.destroy();
                c2.database.destroy();
            });
        });
    });

    describe('events', () => {
        describe('positive', () => {
            it('collection: should get an event when a doc syncs', async () => {
                const syncC = await humansCollection.create(0);
                const syncPouch = syncC.pouch;

                const c = await humansCollection.create(0, 'colsource' + util.randomCouchString(5));
                const c2 = await humansCollection.create(0, 'colsync' + util.randomCouchString(5));
                c.sync({
                    remote: syncPouch
                });
                c2.sync({
                    remote: syncPouch
                });

                const pw8 = AsyncTestUtil.waitResolveable(1700);
                const events = [];
                c2.$.subscribe(e => {
                    events.push(e);
                    pw8.resolve();
                });

                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;
                await AsyncTestUtil.waitUntil(() => events.length === 1);
                assert.equal(events[0].constructor.name, 'RxChangeEvent');

                syncC.database.destroy();
                c.database.destroy();
                c2.database.destroy();
            });

            it('query: should re-find when a docs syncs', async () => {
                const syncC = await humansCollection.create(0);
                const syncPouch = syncC.pouch;

                const c = await humansCollection.create(0, 'colsource' + util.randomCouchString(5));
                const c2 = await humansCollection.create(0, 'colsync' + util.randomCouchString(5));
                c.sync({
                    remote: syncPouch
                });
                c2.sync({
                    remote: syncPouch
                });

                const pw8 = AsyncTestUtil.waitResolveable(10000);
                const results = [];
                c2.find().$.subscribe(res => {
                    results.push(res);
                    if (results.length === 2) pw8.resolve();
                });
                assert.equal(results.length, 0);
                await util.promiseWait(5);


                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;

                assert.equal(results.length, 2);

                syncC.database.destroy();
                c.database.destroy();
                c2.database.destroy();
            });
            it('document: should change field when doc saves', async () => {
                const syncC = await humansCollection.create(0);
                const syncPouch = syncC.pouch;

                const c = await humansCollection.create(0, 'colsource' + util.randomCouchString(5));
                const c2 = await humansCollection.create(0, 'colsync' + util.randomCouchString(5));
                c.sync({
                    remote: syncPouch
                });
                c2.sync({
                    remote: syncPouch
                });

                // insert and w8 for sync
                let pw8 = AsyncTestUtil.waitResolveable(1400);
                let results = null;
                c2.find().$.subscribe(res => {
                    results = res;
                    if (results && results.length > 0) pw8.resolve();
                });
                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;

                const doc = await c.findOne().exec();
                const doc2 = await c2.findOne().exec();

                // update and w8 for sync
                let lastValue = null;
                pw8 = AsyncTestUtil.waitResolveable(1400);
                doc2
                    .get$('firstName')
                    .subscribe(newValue => {
                        lastValue = newValue;
                        if (lastValue === 'foobar') pw8.resolve();
                    });
                doc.set('firstName', 'foobar');
                await doc.save();

                await pw8.promise;
                assert.equal(lastValue, 'foobar');

                syncC.database.destroy();
                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('negative', () => {});
    });
});
