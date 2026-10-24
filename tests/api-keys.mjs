import assert from 'node:assert/strict';
import test from 'node:test';
import {backendKeys,keyOnlyFetch} from '../supabase/functions/_shared/api-keys.js';
test('named modern keys are required and legacy credentials never provide fallback',()=>{
 const env={SUPABASE_SECRET_KEYS:JSON.stringify({batcaverna_backend:'sb_secret_test'}),SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:'sb_publishable_test'})};
 assert.deepEqual(backendKeys(k=>env[k]),{secretKey:'sb_secret_test',publicKey:'sb_publishable_test'});
 for(const bad of [undefined,'{','[]','null',JSON.stringify({default:'sb_secret_wrong_name'}),JSON.stringify({batcaverna_backend:'legacy-jwt'}),JSON.stringify({batcaverna_backend:'sb_secret_with space'})]){
  assert.equal(backendKeys(k=>k==='SUPABASE_SECRET_KEYS'?bad:'legacy-jwt').secretKey,'');
 }
});
test('opaque keys use apikey while authenticated user JWTs are preserved',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(input,init)=>{calls.push(init);return new Response('ok')};
 try{
  for(const token of ['sb_secret_test','sb_publishable_test','user.jwt.signature']){
   await keyOnlyFetch('https://test.invalid',{method:'POST',headers:{apikey:'sb_secret_test',Authorization:'Bearer '+token},body:'payload'});
   const request=calls.at(-1);assert.equal(request.headers.get('apikey'),'sb_secret_test');assert.equal(request.method,'POST');assert.equal(request.body,'payload');
   assert.equal(request.headers.get('authorization'),token==='user.jwt.signature'?'Bearer '+token:null);
  }
 }finally{globalThis.fetch=original;}
});
