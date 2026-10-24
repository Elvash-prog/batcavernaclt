import test from 'node:test';
import assert from 'node:assert/strict';
import {translateDescription} from '../supabase/functions/native-api/translation.js';
import {catalogTtl} from '../supabase/functions/native-api/catalog-cache.js';
const originalFetch=globalThis.fetch;
test('translation is server-side, deduplicated and reused across devices',async()=>{
 let calls=0,cache=null;
 globalThis.fetch=async(url,o)=>{
  if(url.includes('cache_claim'))return Response.json(cache?{state:'hit',payload:cache}:{state:'fetch'});
  if(url.includes('cache_store')){const body=JSON.parse(o.body);assert.equal(body.p_ttl,2592000);cache=body.p_payload;return Response.json(true)}
  assert.equal(url,'https://api-free.deepl.com/v2/translate');assert.equal(o.headers.Authorization,'DeepL-Auth-Key synthetic-free-key');assert.equal(o.redirect,'error');
  const body=JSON.parse(o.body);assert.equal(body.source_lang,'EN');assert.equal(body.target_lang,'PT-BR');assert.deepEqual(body.text,['A game about exploring space.']);calls++;await new Promise(r=>setTimeout(r,5));
  return Response.json({translations:[{text:'Um jogo sobre explorar o espaço.'}]});
 };
 try{
  const env={DEEPL_API_KEY:'synthetic-free-key',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key'};
  const [a,b]=await Promise.all([translateDescription(env,'A game about exploring space.'),translateDescription({...env},'A game about exploring space.')]);
  assert.deepEqual(a,b);assert.equal(a.translated,true);assert.equal(calls,1);
  await translateDescription({...env},'A game about exploring space.');assert.equal(calls,1);
 }finally{globalThis.fetch=originalFetch}
});
test('missing key, provider quota and malformed responses preserve the original without leaking keys',async()=>{
 const original='An English description.';
 try{
  globalThis.fetch=async()=>{throw Error('must not call provider')};
  assert.deepEqual(await translateDescription({},original),{text:original,translated:false});
  assert.equal((await translateDescription({DEEPL_API_KEY:'private'},'a'.repeat(16001))).translated,false);
  for(const response of [Response.json({message:'private'}, {status:456}),Response.json({translations:[]})]){
   globalThis.fetch=async()=>response;
   assert.deepEqual(await translateDescription({DEEPL_API_KEY:'private'},original),{text:original,translated:false});
  }
  assert.equal(catalogTtl('translation:en:pt-BR:v1:Some text'),2592000);
 }finally{globalThis.fetch=originalFetch}
});
