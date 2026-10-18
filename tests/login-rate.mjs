import assert from 'node:assert/strict';
import {loginRateKeys,checkLoginRate} from '../supabase/functions/_shared/login-rate.js';
const req=ip=>new Request('https://test.invalid',{headers:ip?{'x-forwarded-for':ip}:{}});
const a=await loginRateKeys(req('192.0.2.1'),'Example','synthetic-secret'),b=await loginRateKeys(req('192.0.2.2'),'example','synthetic-secret');
assert.equal(a.length,4);assert(a.every(k=>/^[a-f0-9]{64}$/.test(k)));assert.equal(a[0],b[0]);assert.notEqual(a[1],b[1]);assert.notEqual(a[2],b[2]);assert.equal(a[3],b[3]);
assert.deepEqual(a,await loginRateKeys(req('192.0.2.1'),' example ','synthetic-secret'));
assert.notDeepEqual(a,await loginRateKeys(req('192.0.2.1'),'Example','another-secret'));
const result=await checkLoginRate(req('192.0.2.1'),'Example','https://test.supabase.co','synthetic-secret',async(url,options)=>{
 const body=JSON.parse(options.body);assert.deepEqual(body.p_keys,a);assert(!options.body.includes('Example'));assert(!options.body.includes('192.0.2.1'));return new Response('true');
});assert.equal(result,true);
await assert.rejects(()=>checkLoginRate(req(), 'example','https://test.supabase.co','synthetic-secret',async()=>new Response('{}')),/LOGIN_RATE_UNAVAILABLE/);
console.log('Login limiter: keyed pseudonyms, account/source scopes, key rotation and fail-closed transport passed');
