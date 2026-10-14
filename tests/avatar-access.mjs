import assert from 'node:assert/strict';
import {mediaPrepare} from '../security-worker.js';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const viewer='2d3268d1-4993-46d6-abba-340a2ffdd0fa',owner='11111111-2222-4333-8444-555555555555';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'test-publishable',SUPABASE_SERVICE_ROLE_KEY:'test-service',SIGHTENGINE_API_USER:'test-user',SIGHTENGINE_API_SECRET:'test-secret'};
let scenario='ok',calls=[];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
globalThis.fetch=async (url,options={})=>{
 const u=new URL(url);calls.push({u,options});
 if(u.pathname==='/auth/v1/user')return json({id:viewer});
 if(u.pathname==='/rest/v1/rpc/clt_can_view_media')return json(scenario==='friend');
 if(u.pathname==='/rest/v1/perfis')return json([{avatar_url:env.SUPABASE_URL+'/storage/v1/object/public/avatars/'+owner+'/current.png'}]);
 if(u.pathname==='/rest/v1/bloqueios_clt'){
  const filter=u.searchParams.get('or');assert.ok(filter.includes('bloqueador_id.eq.'+viewer+',bloqueado_id.eq.'+owner));assert.ok(filter.includes('bloqueador_id.eq.'+owner+',bloqueado_id.eq.'+viewer));
  if(scenario==='dbfail')return json({},500);return json(scenario==='blocked'?[{bloqueador_id:owner}]:[]);
 }
 if(u.pathname==='/rest/v1/clt_media_reviews')return json(scenario==='unreviewed'?[]:[{status:scenario==='rejected'?'rejected':'approved'}]);
 if(u.pathname.startsWith('/storage/v1/object/sign/')){
  const duration=JSON.parse(options.body).expiresIn;assert.equal(duration,scenario==='unreviewed'?600:300);return json({signedURL:'/object/sign/avatars/'+owner+'/current.png?token=test'});
 }
 if(u.hostname==='api.sightengine.com')return json({status:'failure'},503);
 throw Error('Unexpected test endpoint '+u);
};
function request(bucket='avatars',file='current.png',token=true){return new Request('https://site.test/api/media/prepare',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer a'.padEnd(35,'a')}:{})},body:JSON.stringify({bucket,path:owner+'/'+file})})}
let total=0;async function test(name,fn){calls=[];scenario='ok';await fn();total++;console.log('PASS',name)}
await test('current avatar available across accounts, signed for 300 seconds',async()=>{const r=await mediaPrepare(request(),env);assert.equal(r.status,200);const d=await r.json();assert.equal(d.approved,true);assert.ok(d.signedUrl.startsWith(env.SUPABASE_URL+'/storage/v1/object/sign/avatars/'));assert.equal(calls.filter(x=>x.u.pathname.startsWith('/storage/v1/object/sign/')).length,1)});
await test('old avatar and profile background remain private',async()=>{for(const file of ['old.png','background.png']){const r=await mediaPrepare(request('avatars',file),env);assert.equal(r.status,401)}assert.equal(calls.filter(x=>x.u.pathname.startsWith('/storage/v1/object/sign/')).length,0)});
await test('chat, group images and feed do not use public avatar exception',async()=>{for(const bucket of ['chat-media','group-chat-media','group-avatars','feed-media'])assert.equal((await mediaPrepare(request(bucket),env)).status,401);assert.equal(calls.filter(x=>x.u.pathname==='/rest/v1/perfis').length,0)});
await test('blocked account cannot get public avatar',async()=>{scenario='blocked';assert.equal((await mediaPrepare(request(),env)).status,401);assert.equal(calls.filter(x=>x.u.pathname.startsWith('/storage/v1/object/sign/')).length,0)});
await test('block lookup failure fails closed',async()=>{scenario='dbfail';assert.equal((await mediaPrepare(request(),env)).status,503)});
await test('rejected avatar is not signed',async()=>{scenario='rejected';assert.equal((await mediaPrepare(request(),env)).status,422);assert.equal(calls.filter(x=>x.u.pathname.startsWith('/storage/v1/object/sign/')).length,0)});
await test('unreviewed avatar fails closed if moderation is unavailable',async()=>{scenario='unreviewed';assert.equal((await mediaPrepare(request(),env)).status,503)});
await test('visitor cannot request ranking photo',async()=>{assert.equal((await mediaPrepare(request('avatars','current.png',false),env)).status,401);assert.equal(calls.length,0)});
await test('existing friend media path still uses its normal storage signer',async()=>{scenario='friend';const r=await mediaPrepare(request(),env);assert.equal(r.status,200);assert.equal((await r.json()).signedUrl,undefined);assert.equal(calls.filter(x=>x.u.pathname==='/rest/v1/perfis').length,0)});
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
await test('photo markup includes escaped fallback and never displays broken alt text',async()=>{
 const c={safeUrl:s=>s,esc:s=>String(s).replaceAll('<','&lt;').replaceAll('"','&quot;')};vm.createContext(c);vm.runInContext(html.match(/^function avatarHtml.*$/m)[0],c);const markup=c.avatarHtml({nome:'<bad>',avatar:'https://test/photo.png'},'rank-avatar');assert.ok(markup.includes('&lt;'));assert.ok(markup.includes('data-avatar-image'));assert.ok(markup.includes('alt=""'));assert.ok(markup.includes('avatar-fallback'));
});
await test('browser accepts server-authorized photo without calling the denied storage signer',async()=>{
 let normalSigner=0;const c={window:{BC_CONFIG:{MEDIA_MODERATION_ENABLED:true}},bcMediaRequest:()=>Promise.resolve({signedUrl:'https://test/signed'}),Blob};c.client={storage:{from:()=>({createSignedUrl:()=>{normalSigner++;return Promise.reject(Error('not friends'))}})}};vm.createContext(c);vm.runInContext(html.match(/^function bcProtectStorage.*$/m)[0],c);c.bcProtectStorage(c.client);const r=await c.client.storage.from('avatars').createSignedUrl(owner+'/current.png',300);assert.equal(r.data.signedUrl,'https://test/signed');assert.equal(normalSigner,0);
});
console.log(total+' avatar/security checks passed');
