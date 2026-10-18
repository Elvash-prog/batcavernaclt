import assert from 'node:assert/strict';
import {readLimitedJson,BodyLimitError,secretMatches,allowedPushEndpoint} from '../supabase/functions/_shared/request-security.js';
let checks=0;
function ok(value){assert(value);checks++;}
const req=(body,headers={})=>new Request('https://test.invalid',{method:'POST',body,headers,duplex:'half'});
assert.deepEqual(await readLimitedJson(req('{"ok":true}'),20),{ok:true});checks++;
await assert.rejects(()=>readLimitedJson(req('x'.repeat(21)),20),BodyLimitError);checks++;
await assert.rejects(()=>readLimitedJson(req('{}',{'content-length':'200'}),20),BodyLimitError);checks++;
await assert.rejects(()=>readLimitedJson(req('{'),20),SyntaxError);checks++;
let cancelled=false;const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(10));c.enqueue(new Uint8Array(11));},cancel(){cancelled=true;}});
await assert.rejects(()=>readLimitedJson(req(stream),20),BodyLimitError);checks++;ok(cancelled);
ok(!await secretMatches('', 'anything'));ok(!await secretMatches('secret',''));ok(!await secretMatches('secret','wrong'));ok(await secretMatches('secret','secret'));ok(!await secretMatches('secret','x'.repeat(4097)));
for(const u of ['https://fcm.googleapis.com/fcm/send/id','https://updates.push.services.mozilla.com/wpush/v2/id','https://web.push.apple.com/id','https://wns.notify.windows.com/id'])ok(allowedPushEndpoint(u));
for(const u of ['http://fcm.googleapis.com/id','https://127.0.0.1/id','https://localhost/id','https://169.254.169.254/','https://fcm.googleapis.com.evil.test/id','https://evil.test@fcm.googleapis.com/id','https://fcm.googleapis.com:444/id','https://fcm.googleapis.com/id#fragment','file:///etc/passwd'])ok(!allowedPushEndpoint(u));
console.log(`${checks} request, secret and push destination security checks passed`);
