import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../src/batch-operation.js',import.meta.url),'utf8'),context);
const {create}=context.window.BatBatchOperation;
const items=[1,2,3,4,5].map(id=>({id,nome:'Título '+id}));
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('stopping waits for the current item and continuing never repeats successes',async()=>{
 const gate=defer(),calls=[];
 const queue=create({items:items.slice(0,3),perform:async item=>{calls.push(item.id);if(item.id===1)await gate.promise;}});
 const run=queue.run();await tick();queue.stop();
 assert.equal(queue.snapshot().busy,true);gate.resolve();await run;
 assert.equal(queue.snapshot().success,1);assert.equal(queue.snapshot().pending,2);
 await queue.run();assert.deepEqual(calls,[1,2,3]);assert.equal(queue.snapshot().success,3);
});
test('retrying failures does not resend confirmed items',async()=>{
 const calls=[],failed=new Set([2,4]);
 const queue=create({items,perform:async item=>{calls.push(item.id);if(failed.has(item.id))throw Error('offline');}});
 await queue.run();assert.equal(queue.snapshot().success,3);assert.equal(queue.snapshot().failed,2);
 failed.clear();await queue.run('failed');
 assert.deepEqual(calls,[1,2,3,4,5,2,4]);assert.equal(queue.snapshot().success,5);assert.equal(queue.snapshot().failed,0);
});
test('parallel cover workers stop before scheduling more items',async()=>{
 const gate=defer(),calls=[];let active=0,max=0;
 const queue=create({items,concurrency:2,perform:async item=>{calls.push(item.id);active++;max=Math.max(max,active);await gate.promise;active--;}});
 const run=queue.run();await tick();queue.stop();gate.resolve();await run;
 assert.deepEqual(calls,[1,2]);assert.equal(max,2);assert.equal(queue.snapshot().pending,3);
 await queue.run();assert.deepEqual(calls,[1,2,3,4,5]);
});
test('duplicate run requests share the active operation',async()=>{
 const gate=defer();let calls=0;
 const queue=create({items:items.slice(0,1),perform:async()=>{calls++;await gate.promise;}});
 const a=queue.run(),b=queue.run();assert.equal(a,b);await tick();assert.equal(calls,1);gate.resolve();await a;
});
test('account change blocks remaining work and subsequent retry',async()=>{
 let owner='first';const gate=defer(),calls=[];
 const queue=create({items,allowed:()=>owner==='first',perform:async item=>{calls.push(item.id);await gate.promise;}});
 const run=queue.run();await tick();owner='second';gate.resolve();await run;
 assert.deepEqual(calls,[1]);assert.equal(queue.snapshot().blocked,true);assert.equal(queue.snapshot().pending,4);
 await queue.run();await queue.run('failed');assert.deepEqual(calls,[1]);
});
test('failure retries and pending continuation stay separate after interruption',async()=>{
 const gate=defer(),calls=[];let fail=true;
 const queue=create({items:items.slice(0,3),perform:async item=>{calls.push(item.id);if(item.id===1&&fail)throw Error('failed');if(item.id===2)await gate.promise;}});
 const run=queue.run();await tick();queue.stop();gate.resolve();await run;
 assert.equal(queue.snapshot().failed,1);assert.equal(queue.snapshot().pending,1);
 fail=false;await queue.run('failed');assert.deepEqual(calls,[1,2,1]);assert.equal(queue.snapshot().pending,1);
 await queue.run();assert.deepEqual(calls,[1,2,1,3]);
});
