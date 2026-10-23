import test from 'node:test';
import assert from 'node:assert/strict';
import {securityReporter} from '../supabase/functions/_shared/security-events.js';
import {instrument} from '../supabase/functions/_shared/operational-metrics.js';

test('failed authorization is observable without identity, input or DB writes',async()=>{
 const events=[];let writes=0;
 const handler=instrument(async()=>new Response(null,{status:401}),{record:()=>writes++,reportSecurity:securityReporter({write:e=>events.push(e)})});
 await handler(new Request('https://test/api/catalog/igdb/games?search=PRIVATE_TITLE',{headers:{Authorization:'Bearer PRIVATE_TOKEN','x-forwarded-for':'192.0.2.123'}}));
 assert.equal(writes,0);assert.equal(events.length,1);assert.equal(events[0].category,'unauthorized');assert.equal(events[0].route,'igdb');
 assert.doesNotMatch(JSON.stringify(events),/PRIVATE_TITLE|PRIVATE_TOKEN|192\.0\.2\.123|Authorization|search/);
});
test('floods are sampled, route labels stay fixed and response categories remain distinct',()=>{
 const events=[];let now=0;
 const report=securityReporter({write:e=>events.push(e),clock:()=>now});
 for(let i=0;i<10000;i++)report({p_service:'PRIVATE_SERVICE',p_route:'private/'+i,p_status:403,p_elapsed:Infinity});
 assert.equal(events.length,1);assert.equal(events[0].route,'other');assert.equal(events[0].service,'native-api');assert.equal(events[0].elapsed_ms,0);
 report({p_status:429});report({p_status:503});report({p_status:502});report({p_status:200});
 assert.equal(events.length,3);
 now=60000;report({p_route:'other',p_status:403});
 assert.equal(events.length,4);assert.equal(events[3].suppressed_previous,9999);
 assert.doesNotMatch(JSON.stringify(events),/PRIVATE_SERVICE|private\//);
});
test('unexpected exceptions return a safe error and preserve security telemetry',async()=>{
 const events=[];
 const response=await instrument(async()=>{throw Error('secret SQL /srv/app.ts');},{record:()=>{throw Error('DB write not expected');},reportSecurity:securityReporter({write:e=>events.push(e)})})(new Request('https://test/api/media/upload'));
 assert.equal(response.status,500);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.doesNotMatch(await response.text(),/secret|SQL|\/srv/);assert.equal(events[0].category,'server_error');
});
test('failed telemetry cannot change an application response; preflight and health stay quiet',async()=>{
 const response=await instrument(async()=>new Response('denied',{status:403}),{reportSecurity:()=>{throw Error('logger failed');}})(new Request('https://test/api/media/upload'));
 assert.equal(await response.text(),'denied');
 let events=0;
 for(const request of [new Request('https://test/health'),new Request('https://test/api/media/upload',{method:'OPTIONS'})]){
  await instrument(async()=>new Response(null,{status:500}),{reportSecurity:()=>events++})(request);
 }
 assert.equal(events,0);
});
