import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const core=readFileSync(new URL('../public/performance-client.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
function setup(){
 const frames=[],events={},scans=[];
 const c={console,Map,Set,Promise,Array,JSON,Date,uid:'alice',P:{uid:'alice'},GROUP_MODE:'private',CHAT_ACTIVE:'bob',GROUP_ACTIVE:'g1',CHAT_MESSAGES:[],GROUP_MESSAGES:[],CHAT_MEDIA_URLS:{},GROUP_MEDIA_URLS:{},FEED_LIMIT:30,AMIGOS:['bob'],BC_FRIENDS_SIGNATURE:'old',BC_FRIENDS_PROFILE_AT:100,STEAM_AMIGOS_KEY:'old',STEAM_AMIGOS_AT:100,
  euId:()=>c.uid,edit:()=>false,bcScanPrivateMedia:(n,d)=>scans.push([n,d]),chatRenderMain:()=>{c.chatRenders++},groupRenderMain:()=>{c.groupRenders++},chatRenders:0,groupRenders:0,
  document:{readyState:'loading',addEventListener:(k,fn)=>{events[k]=fn}},requestAnimationFrame:fn=>{frames.push(fn);return frames.length},
 };
 c.window=c;vm.createContext(c);vm.runInContext(core,c);
 return {c,scans,events,frame:()=>{assert.ok(frames.length);frames.shift()()},frames};
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS',name)}
await test('200 requests share one pending read; completed data is not cached',async()=>{
 const {c}=setup();let calls=0,d=deferred();const read=c.bcSingleFlight('data',()=>{calls++;return d.promise});
 const work=Array.from({length:200},()=>read());assert.equal(calls,1);assert.equal(new Set(work).size,1);d.resolve('ok');await Promise.all(work);assert.equal(c.BC_PERFORMANCE.sharedReads,199);
 d=deferred();read();assert.equal(calls,2);d.resolve();await flush();
});
await test('reads are separated by session, profile and arguments',async()=>{
 const {c}=setup();let calls=0;const d=deferred(),read=c.bcSingleFlight('data',()=>{calls++;return d.promise},x=>x);
 read('a');read('b');c.P={uid:'other'};read('a');c.uid='other';read('a');assert.equal(calls,4);d.resolve();await flush();
});
await test('failed reads can be retried',async()=>{const {c}=setup();let calls=0;const read=c.bcSingleFlight('bad',()=>{calls++;return Promise.reject(Error('offline'))});await assert.rejects(read());await assert.rejects(read());assert.equal(calls,2)});
await test('frame updates are batched, latest state wins',async()=>{const {c,frame,frames}=setup();let x=0;for(let i=0;i<500;i++)c.bcFrame('layout',()=>{x=i});assert.equal(frames.length,1);frame();assert.equal(x,499);assert.equal(c.BC_PERFORMANCE.frameBatches,1)});
await test('media scans are limited to changed roots, attributes do not rescan descendants',async()=>{
 const {c,frame,scans}=setup();const root={nodeType:1,isConnected:true},image={nodeType:1,isConnected:true};
 for(let i=0;i<200;i++)c.bcQueuePrivateMedia([{type:'attributes',target:root},{type:'childList',addedNodes:[image,{nodeType:3}]}]);
 frame();assert.equal(scans.length,2);assert.equal(scans[0][1],false);assert.equal(scans[1][1],true);
});
await test('large insertion is spread across frames and removed nodes skipped',async()=>{
 const {c,frame,frames,scans}=setup();const nodes=Array.from({length:250},(_,i)=>({nodeType:1,isConnected:i!==1}));
 c.bcQueuePrivateMedia([{type:'childList',addedNodes:nodes}]);frame();assert.equal(scans.length,99);assert.equal(frames.length,1);frame();assert.equal(scans.length,199);frame();assert.equal(scans.length,249);
});
await test('chat image signing shares requests and ignores a closed conversation',async()=>{
 const {c,frame,frames}=setup();let calls=0;const d=deferred(),m={id:1,midia_url:'alice/a.jpg'};c.CHAT_MESSAGES=[m];c.sb={storage:{from:()=>({createSignedUrl:()=>{calls++;return d.promise}})}};
 for(let i=0;i<30;i++)c.bcLoadChatMedia(false,m);assert.equal(calls,1);c.CHAT_ACTIVE='carol';d.resolve({data:{signedUrl:'https://signed.test/a'}});await flush();assert.equal(Object.keys(c.CHAT_MEDIA_URLS).length,0);assert.equal(frames.length,0);
});
await test('several chat images request only one render per frame',async()=>{
 const {c,frame,frames}=setup();c.CHAT_MESSAGES=[{id:1,midia_url:'a'},{id:2,midia_url:'b'}];c.sb={storage:{from:()=>({createSignedUrl:path=>Promise.resolve({data:{signedUrl:'https://signed.test/'+path}})})}};
 c.CHAT_MESSAGES.forEach(m=>c.bcLoadChatMedia(false,m));await flush();assert.equal(frames.length,1);frame();assert.equal(c.chatRenders,1);assert.equal(Object.keys(c.CHAT_MEDIA_URLS).length,2);
});
await test('logout clears private pending work and rejects old signed-media results',async()=>{
 const {c,events,frames}=setup();const d=deferred(),auth=[];c.sb={auth:{onAuthStateChange:fn=>auth.push(fn)},storage:{from:()=>({createSignedUrl:()=>d.promise})}};
 events.DOMContentLoaded();c.CHAT_MESSAGES=[{id:1,midia_url:'a'}];c.bcLoadChatMedia(false,c.CHAT_MESSAGES[0]);auth[0]('SIGNED_OUT');c.uid='alice';d.resolve({data:{signedUrl:'https://signed.test/a'}});await flush();assert.equal(Object.keys(c.CHAT_MEDIA_URLS).length,0);assert.equal(frames.length,0);assert.equal(c.BC_FRIENDS_SIGNATURE,'');
});
await test('stable HTML preserves nodes but recovers after an external loading placeholder',async()=>{
 const c={};vm.createContext(c);vm.runInContext(html.match(/^function renderHtmlEstavel.*$/m)[0],c);let writes=0;const el={firstChild:null,get innerHTML(){return this.value},set innerHTML(v){this.value=v;this.firstChild={};writes++}};
 c.renderHtmlEstavel(el,'cards');const first=el.firstChild;c.renderHtmlEstavel(el,'cards');assert.equal(writes,1);assert.equal(first,el.firstChild);el.innerHTML='loading';c.renderHtmlEstavel(el,'cards');assert.equal(el.innerHTML,'cards');assert.equal(writes,3);
});
function tickContext(){
 const {c}=setup();c.D={jogos:[{nome:'Game',capa:'a'}],filmes:[],listas:{},fundo:null};c.sb={};c.ocupado=false;c.document.hidden=false;c.BC_TICK_BUSY=false;
 const d=deferred();c.buscarDados=()=>d.promise;c.updates=0;c.renders=0;c.setDados=x=>{c.D=x;c.updates++};c.setLive=()=>{};c.cachePut=()=>{};c.montarFiltros=()=>{};c.render=()=>c.renders++;c.$=()=>({});
 const a=html.indexOf('function bcLibraryChanged'),b=html.indexOf('/* =====================================================\n   FILTROS',a);vm.runInContext(html.slice(a,b),c);return {c,d};
}
await test('library polling ignores late response after changing profile',async()=>{const {c,d}=tickContext();const p=c.tick();c.P={uid:'carol'};d.resolve({jogos:[],filmes:[],listas:{},fundo:null});await p;assert.equal(c.updates,0);assert.equal(c.BC_TICK_BUSY,false)});
await test('unchanged library skips rendering; cover changes still update',async()=>{const {c,d}=tickContext();assert.equal(c.bcLibraryChanged({...c.D,atualizado:'new'}),false);assert.equal(c.bcLibraryChanged({...c.D,jogos:[{nome:'Game',capa:'b'}]}),true);const p=c.tick();d.resolve({...c.D,atualizado:'new'});await p;assert.equal(c.updates,1);assert.equal(c.renders,0)});
await test('only one library poll runs at once',async()=>{const {c,d}=tickContext();const p=c.tick();assert.equal(c.tick(),undefined);d.resolve(c.D);await p;assert.equal(c.updates,1)});
await test('private media scan still hides the original and only applies approved signed URL',async()=>{
 const {c}=setup();const d=deferred(),image={nodeType:1,tagName:'IMG',isConnected:true,dataset:{},src:'https://storage.test/public/avatar',matches:()=>true,querySelectorAll:()=>[],getAttribute(){return this.src},removeAttribute(){this.src=''}};
 c.BC_CONFIG={MEDIA_MODERATION_ENABLED:true};c.sb={};c.bcStoredMedia=()=>true;c.bcPrivateMediaUrl=()=>d.promise;
 vm.runInContext(html.match(/^function bcScanPrivateMedia.*$/m)[0],c);c.bcScanPrivateMedia(image,false);assert.equal(image.src,'');d.resolve('https://storage.test/signed/avatar');await flush();assert.equal(image.src,'https://storage.test/signed/avatar');assert.equal(image.decoding,'async');
});
await test('lazy cover observer releases detached cards and does not reobserve loaded ones',async()=>{
 const {c}=setup();let observer,observed=0,removed=0;c.IntersectionObserver=class{constructor(fn){this.callback=fn;observer=this}observe(){observed++}unobserve(){removed++}};c.cssUrl=u=>'url('+u+')';
 const a=html.indexOf('var IO_PENDING='),b=html.indexOf('/* ===== página inicial',a);vm.runInContext(html.slice(a,b),c);
 const card={isConnected:true,dataset:{bg:'cover'},style:{}},root={querySelectorAll:()=>[card]};c.lazyBg(root);c.lazyBg(root);assert.equal(observed,1);observer.callback([{isIntersecting:true,target:card}]);c.lazyBg(root);assert.equal(observed,1);
 const gone={isConnected:true,dataset:{bg:'b'},style:{}};c.lazyBg({querySelectorAll:()=>[gone]});gone.isConnected=false;c.lazyBg({querySelectorAll:()=>[]});assert.equal(removed,2);assert.equal(c.IO_PENDING.size,0);
});
function friendsContext(result){
 const {c}=setup();c.AMIGOS=['existing'];c.CONVITES=[];c.CONVITES_ENVIADOS=[];c.BLOQUEADOS=[];c.BC_FRIENDS_SIGNATURE='';c.BC_FRIENDS_PROFILE_AT=0;c.steamCalls=0;c.viewCalls=0;
 for(const name of ['montarPerfis','amigosLista','renderAmigosHome','carregarAtividadeSocial','mobileNavSync','desktopUiRender'])c[name]=()=>{c.viewCalls++};
 c.carregarSteamAmigos=()=>{c.steamCalls++};c.carregarNotificacoes=()=>Promise.resolve();c.atualizarInicioAmizades=()=>{};c.garantirPerfil=()=>{};
 function query(data){const q={select:()=>q,eq:()=>q,order:()=>q,in:()=>q,then:(fn,fail)=>Promise.resolve(data).then(fn,fail)};return q}
 c.sb={from:name=>query(name==='amigos'?result:Promise.resolve({data:[]}))};c.bcDirectory=()=>query({data:[]});
 vm.runInContext(html.slice(html.indexOf('function carregarAmigos('),html.indexOf('var PAINEL_EU=',html.indexOf('function carregarAmigos('))),c);return c;
}
await test('friends remain visible while loading; unchanged data does not force Steam refresh',async()=>{
 const d=deferred(),c=friendsContext(d.promise);const p=c.carregarAmigos();assert.equal(c.AMIGOS[0],'existing');d.resolve({data:[{amigo_id:'bob',created_at:'2026-10-08'}]});await p;assert.equal(c.steamCalls,1);const calls=c.viewCalls;await c.carregarAmigos();assert.equal(c.steamCalls,1);assert.equal(c.viewCalls,calls+2);
});
await test('friends response from a logged-out account cannot overwrite the new session',async()=>{
 const d=deferred(),c=friendsContext(d.promise);const p=c.carregarAmigos();c.uid='carol';d.resolve({data:[{amigo_id:'bob'}]});await p;assert.equal(c.AMIGOS[0],'existing');assert.equal(c.steamCalls,0);
});
await test('Steam presence honors freshness and pauses when hidden',async()=>{
 const {c}=setup();c.STEAM_AMIGOS_BUSY=false;c.STEAM_AMIGOS_AT=Date.now();c.STEAM_AMIGOS_KEY='alice:bob:76561198000000000';c.document.hidden=false;c.steamAmigosLista=()=>[{uid:'bob',steam:'76561198000000000'}];let calls=0;c.api=()=>{calls++;return Promise.resolve({})};c.steamAmigosRender=()=>{};c.STEAM_AMIGOS_ATIVOS=[];c.STEAM_AMIGOS_TIMER=null;c.clearTimeout=()=>{};c.setTimeout=()=>1;
 const start=html.indexOf('function carregarSteamAmigos(');vm.runInContext(html.slice(start,html.indexOf('/* ===== Amigos / convites',start)),c);
 c.carregarSteamAmigos(false);assert.equal(calls,0);c.document.hidden=true;c.carregarSteamAmigos(true);assert.equal(calls,0);c.document.hidden=false;c.carregarSteamAmigos(true);await flush();assert.equal(calls,1);assert.ok(html.includes('tick();agoraBuscar();carregarSteamAmigos(false)'));
});
await test('300 chat messages read reaction metadata once and unchanged render retains bubbles',async()=>{
 const {c}=setup();let metadataReads=0,writes=0;const box={dataset:{},scrollTop:0,scrollHeight:100,clientHeight:100,firstChild:null,set innerHTML(v){this.value=v;this.firstChild={};writes++}};
 c.$=name=>name==='#chatMessages'?box:null;c.chatAmigo=()=>({nome:'Bob'});c.chatStatus=()=> 'online';c.esc=x=>String(x||'');c.socialTempo=()=> 'agora';c.chatFormatText=m=>m.texto;c.chatMetaLoad=()=>{metadataReads++;return {}};
 c.CHAT_MESSAGES=Array.from({length:300},(_,i)=>({id:i,texto:'Message '+i,remetente_id:'bob'}));
 vm.runInContext(html.match(/^function renderHtmlEstavel.*$/m)[0],c);vm.runInContext(html.match(/^function chatRenderMain.*$/m)[0],c);
 c.chatRenderMain();assert.equal(metadataReads,1);assert.equal(writes,1);c.chatRenderMain();assert.equal(metadataReads,2);assert.equal(writes,1);
});
console.log(passed+' performance/stability checks passed');
