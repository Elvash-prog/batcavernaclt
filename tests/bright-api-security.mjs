// Offline regression tests: real handler with simulated Auth, SQL RPC and providers.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const uid='2d3268d1-4993-46d6-abba-340a2ffdd0fa';
const site='https://batcavernaclt.gamersclt.workers.dev';
let handler, calls=[], mode='ok',testClock=Date.now();Date.now=()=>testClock;
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:'sb_publishable_test_public'}),SUPABASE_SECRET_KEYS:JSON.stringify({batcaverna_backend:'sb_secret_test_service'}),STEAMGRIDDB_KEY:'test-grid',STEAM_KEY:'test-steam',RETROACHIEVEMENTS_KEY:'test-retro'};
globalThis.Deno={env:{get:k=>env[k]},serve:fn=>{handler=fn}};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
globalThis.fetch=async (url, options={})=>{
  const u=new URL(url);if(u.pathname==='/rest/v1/rpc/clt_record_operational_metric')return json(null); calls.push({u,options});
  if(u.pathname==='/auth/v1/user') return mode==='forged'?json({},401):json({id:uid,is_anonymous:mode==='anonymous'});
  if(u.pathname==='/rest/v1/rpc/clt_bright_api_limit') {
    assert.equal(options.headers.apikey,'sb_secret_test_service');
    assert.equal(JSON.parse(options.body).p_user_id,uid);
    return mode==='dbfail'?json({},500):json(mode!=='limited');
  }
  if(u.pathname==='/rest/v1/rpc/clt_provider_reserve')return json({allowed:true});
  if(u.pathname==='/rest/v1/rpc/clt_provider_pause'||u.pathname==='/rest/v1/rpc/clt_provider_cache_release')return json(null);
  if(u.pathname==='/rest/v1/rpc/clt_provider_cache_claim')return json({state:'fetch'});
  if(u.pathname==='/rest/v1/rpc/clt_provider_cache_store'){assert.ok(!JSON.stringify(JSON.parse(options.body).p_payload).includes('FORBIDDEN_LOGIC'));return json(true);}
  if(mode==='upstreamfail') throw new Error('secret='+env.STEAM_KEY);
  if(u.pathname==='/rest/v1/perfis')return json([{steam_id:'76561198000000000'}]);
  if(u.pathname==='/rest/v1/itens'){assert.equal(u.searchParams.get('user_id'),'eq.'+uid);if(options.method==='PATCH'){assert.equal(u.searchParams.get('id'),'eq.41');const b=JSON.parse(options.body);assert.equal(b.horas,2);assert.equal(b.status,undefined);assert.equal(b.nota,undefined);return json({})}return json([{id:41,steam_appid:42,horas:1,conquistas:0}])}

  if(u.hostname==='www.steamgriddb.com'){assert.equal(options.headers.Authorization,'Bearer test-grid');return json({data:[{id:1,width:600,height:900,url:'https://cdn2.steamgriddb.com/grid/portrait.png',score:1},{id:2,width:920,height:430,url:'https://cdn2.steamgriddb.com/grid/landscape.png',score:2}]});}
  if(u.pathname.includes('ResolveVanityURL')) return json({response:{success:1,steamid:'76561198000000000'}});
  if(u.pathname.includes('GetPlayerSummaries')) return json({response:{players:[{steamid:'76561198000000000',personaname:'Player',communityvisibilitystate:3,gameid:'42'}]}});
  if(u.pathname.includes('GetOwnedGames')||u.pathname.includes('GetRecentlyPlayedGames')) return json({response:{game_count:1,games:[{appid:42,name:'Safe Game',playtime_forever:mode==='precisetime'?223:120,playtime_2weeks:mode==='precisetime'?1:60}]}});
  if(u.pathname.includes('GetPlayerAchievements')&&mode==='privateach')return json({playerstats:{success:false}});
  if(u.pathname.includes('GetPlayerAchievements')) return json({playerstats:{achievements:[{apiname:'WIN',achieved:1}]}});
  if(u.pathname.includes('GetSchemaForGame')) return json({game:{availableGameStats:{achievements:[{name:'WIN',displayName:'Win',icon:'https://images.test/win.png'}]}}});
  if(u.pathname.includes('appdetails')) return json({[u.searchParams.get('appids')]:{success:true,data:{name:mode==='adult'?'Hentai Game':'Safe Game',header_image:'https://images.test/game.jpg',is_free:false,price_overview:{initial:1000,final:0,discount_percent:100}}}});
  if(u.pathname.includes('storesearch')) return json({items:[{id:42,name:'Safe Game',tiny_image:'https://images.test/tiny.jpg'}]});
  if(u.pathname.includes('freeGamesPromotions')) return json({data:{Catalog:{searchStore:{elements:[]}}}});
  if(u.pathname.includes('featuredcategories')) return json({specials:{items:[]}});
  if(u.pathname.includes('/search/results')) return new Response('');
  if(u.pathname==='/rest/v1/rpc/clt_retro_mutate'){const b=JSON.parse(options.body);assert.equal(b.p_user,uid);assert.equal(options.headers.Authorization,undefined);assert.equal(options.headers.apikey,'sb_secret_test_service');return json({cover_url:b.p_cover||'',game_ids:b.p_remove?[]:[7],hidden_game_ids:b.p_remove?[b.p_remove]:[]});}
  if(u.pathname==='/rest/v1/clt_retro_collection'){if(options.method==='POST'){const body=JSON.parse(options.body);assert.equal(body.user_id,uid);return json({})}return json([{cover_url:'',game_ids:[7]}])}
  if(u.pathname.includes('API_GetGameList.php'))return json([{ID:7,Title:'Retro Game',ConsoleName:'SNES',NumAchievements:10,MemAddr:'FORBIDDEN_LOGIC'}]);
  if(u.pathname.includes('API_GetUserProfile.php')) return json({User:'RetroPlayer',ULID:'00003EMFWR7XB8SDPEHB3K56ZQ',UserPic:'/UserPic/RetroPlayer.png',TotalPoints:123,TotalTruePoints:456});
  if(u.pathname.includes('API_GetUserCompletionProgress.php')) return json({Total:1,Results:[{GameID:7,Title:'Retro Game',ConsoleName:'SNES',MaxPossible:10,NumAwarded:5,NumAwardedHardcore:4}]});
  if(u.pathname.includes('API_GetUserRecentlyPlayedGames.php')) return json([{GameID:7,Title:'Retro Game',ConsoleName:'SNES',NumPossibleAchievements:10,NumAchieved:5,NumAchievedHardcore:4}]);
  if(u.pathname.includes('API_GetGameInfoAndUserProgress.php')) return json({Title:'Retro Game',ConsoleName:'SNES',Achievements:{1:{ID:1,Title:'Start',Description:'Begin',Points:5,MemAddr:'FORBIDDEN_LOGIC',BadgeName:'00001',DateEarnedHardcore:'2026-10-15'}}});
  throw new Error('Unexpected simulated URL '+u);
};
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/bright-api/index.ts',import.meta.url),'utf8')).replace("'../_shared/provider-requests.js'",JSON.stringify(new URL('../supabase/functions/_shared/provider-requests.js',import.meta.url).href)).replace("'../_shared/steamgrid.js'",JSON.stringify(new URL('../supabase/functions/_shared/steamgrid.js',import.meta.url).href)).replace("'../_shared/api-keys.js'",JSON.stringify(new URL('../supabase/functions/_shared/api-keys.js',import.meta.url).href)).replace("'../_shared/operational-metrics.js'",JSON.stringify(new URL('../supabase/functions/_shared/operational-metrics.js',import.meta.url).href));
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function req(body,opts={}) {
  return new Request('https://test.supabase.co/functions/v1/bright-api',{
    method:opts.method||'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer a.b.c',...opts.headers},
    ...(opts.method==='GET'||opts.method==='OPTIONS'?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),
  });
}
let passed=0;
async function check(label,run){mode='ok';calls=[];testClock+=172800000;await run();passed++;console.log('PASS',label)}
await check('retired web origin rejected',async()=>{const r=await handler(req(null,{method:'OPTIONS',headers:{Origin:site}}));assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);assert.equal(calls.length,0)});
await check('foreign origin rejected',async()=>{assert.equal((await handler(req({op:'gratis'},{headers:{Origin:'https://evil.test'}}))).status,403);assert.equal(calls.length,0)});
await check('GET rejected',async()=>{assert.equal((await handler(req(null,{method:'GET'}))).status,405)});
await check('missing login rejected before providers',async()=>{assert.equal((await handler(req({op:'gratis'},{headers:{Authorization:''}}))).status,401);assert.equal(calls.length,0)});
await check('forged JWT rejected by Auth',async()=>{mode='forged';assert.equal((await handler(req({op:'gratis'}))).status,401);assert.equal(calls.length,1)});
await check('anonymous user rejected',async()=>{mode='anonymous';assert.equal((await handler(req({op:'gratis'}))).status,401);assert.equal(calls.length,1)});
await check('invalid JSON rejected',async()=>{assert.equal((await handler(req('{'))).status,400);assert.equal(calls.length,1)});
await check('large body rejected',async()=>{assert.equal((await handler(req(JSON.stringify({op:'gratis',extra:'a'.repeat(17000)})))).status,413)});
await check('large batch rejected before rate or provider',async()=>{assert.equal((await handler(req({op:'capas',nomes:Array(21).fill('Game')}))).status,400);assert.equal(calls.length,1)});
await check('query injection rejected',async()=>{assert.equal((await handler(req({op:'conquistas',steamid:'76561198000000000&key=evil',appid:42}))).status,400);assert.equal(calls.length,1)});
await check('foreign vanity URL rejected',async()=>{assert.equal((await handler(req({op:'perfil',entrada:'https://evil.test/id/player'}))).status,400)});
await check('unknown operation rejected',async()=>{assert.equal((await handler(req({op:'admin'}))).status,400)});
await check('invalid RetroAchievements user rejected',async()=>{assert.equal((await handler(req({op:'raPerfil',usuario:'player&y=evil'}))).status,400)});
await check('distributed rate denial stops providers',async()=>{mode='limited';const r=await handler(req({op:'gratis'}));assert.equal(r.status,429);assert.equal(calls.length,2);assert.equal(r.headers.get('Retry-After'),'60')});
await check('SQL limit failure fails closed',async()=>{mode='dbfail';assert.equal((await handler(req({op:'gratis'}))).status,503);assert.equal(calls.length,2)});
await check('provider exceptions do not leak keys',async()=>{mode='upstreamfail';const r=await handler(req({op:'perfil',steamid:'76561198000000000'}));assert.equal(r.status,502);assert.ok(!(await r.text()).includes('test-steam'))});
await check('adult Steam metadata excluded',async()=>{mode='adult';const r=await handler(req({op:'steamInfo',appids:[42]}));assert.deepEqual((await r.json()).lista,[])});
for(const [op,body,key] of [
 ['perfil',{entrada:'https://steamcommunity.com/id/player'},'steamid'],
 ['agora',{steamid:'76561198000000000'},'jogando'],
 ['steamAmigos',{steamids:['76561198000000000']},'amigos'],
 ['jogos',{steamid:'76561198000000000'},'jogos'],
 ['conquistas',{steamid:'76561198000000000',appid:42},'lista'],
 ['steamInfo',{appids:[42],nomes:['Safe Game']},'lista'],
 ['gratis',{},'epic'],
 ['raPerfil',{usuario:'RetroPlayer'},'ulid'],
 ['raJogos',{usuario:'00003EMFWR7XB8SDPEHB3K56ZQ'},'jogos'],
 ['raConquistas',{usuario:'RetroPlayer',gameId:7},'lista'],
]) await check('compatible '+op,async()=>{const r=await handler(req({op,...body}));assert.equal(r.status,200, JSON.stringify({op,calls:calls.map(x=>x.u.href)}));const b=await r.json();assert.ok(key in b,JSON.stringify({op,b,calls:calls.map(x=>x.u.href)}));assert.equal(r.headers.get('Cache-Control'),'no-store')});
console.log(passed+' offline checks passed');

await check('Retro collection scoped to authenticated UID',async()=>{const r=await handler(req({op:'raCollection',user_id:'someone-else'}));assert.equal(r.status,200);assert.deepEqual((await r.json()).game_ids,[7]);assert.ok(calls.some(x=>x.u.pathname==='/rest/v1/clt_retro_collection'&&x.u.searchParams.get('user_id')==='eq.'+uid));});
await check('foreign Retro cover rejected',async()=>{assert.equal((await handler(req({op:'raSaveCollection',cover_url:'https://evil.test/a.jpg'}))).status,400)});
await check('duplicate Retro game does not duplicate collection',async()=>{const r=await handler(req({op:'raSaveCollection',gameId:7}));assert.equal(r.status,200);assert.deepEqual((await r.json()).game_ids,[7]);});
await check('Retro catalog searches cached console list',async()=>{for(let i=0;i<2;i++){const r=await handler(req({op:'raSearch',consoleId:3,query:'Retro'}));assert.equal(r.status,200);assert.equal((await r.json()).jogos[0].gameId,7)}assert.equal(calls.filter(x=>x.u.pathname.includes('API_GetGameList.php')).length,1)});

await check('published client PlayStation selector uses official RA system 12',async()=>{const r=await handler(req({op:'raSearch',consoleId:11,query:'Retro'}));assert.equal(r.status,200);assert.ok(calls.some(x=>x.u.pathname.includes('API_GetGameList.php')&&x.u.searchParams.get('i')==='12'))});
await check('published client GameCube selector uses official RA system 16',async()=>{const r=await handler(req({op:'raSearch',consoleId:78,query:'Retro'}));assert.equal(r.status,200);assert.ok(calls.some(x=>x.u.pathname.includes('API_GetGameList.php')&&x.u.searchParams.get('i')==='16'))});

await check('Retro removal uses authenticated UID and excludes forged owner',async()=>{const r=await handler(req({op:'raSaveCollection',removeGameId:7,user_id:'someone-else'}));assert.equal(r.status,200);assert.deepEqual((await r.json()).hidden_game_ids,[7]);const b=JSON.parse(calls.find(x=>x.u.pathname==='/rest/v1/rpc/clt_retro_mutate').options.body);assert.equal(b.p_user,uid);assert.equal(b.p_remove,7);});
await check('Retro removal rejects invalid ID before mutation',async()=>{assert.equal((await handler(req({op:'raSaveCollection',removeGameId:-1}))).status,400);assert.ok(!calls.some(x=>x.u.pathname.includes('clt_retro_mutate')));});
await check('Retro conflicting actions rejected',async()=>{assert.equal((await handler(req({op:'raSaveCollection',removeGameId:7,gameId:8}))).status,400);});

await check('Steam progress uses authenticated owner and exact saved App ID',async()=>{const r=await handler(req({op:'steamSync',appids:[42],user_id:'someone-else',steamid:'76561198999999999'}));assert.equal(r.status,200);assert.equal((await r.json()).updated,1);const patch=JSON.parse(calls.find(x=>x.options.method==='PATCH').options.body);assert.equal(patch.conquistas,100);assert.ok(calls.some(x=>x.u.pathname.includes('GetPlayerAchievements')&&x.u.searchParams.get('steamid')==='76561198000000000'));});
await check('private achievement progress leaves the stored percentage unchanged',async()=>{mode='privateach';const r=await handler(req({op:'steamSync',appids:[42]}));assert.equal(r.status,200);const patch=JSON.parse(calls.find(x=>x.options.method==='PATCH').options.body);assert.equal(patch.conquistas,undefined);});
await check('Steam progress rejects excessive batches',async()=>{assert.equal((await handler(req({op:'steamSync',appids:[1,2,3,4,5,6]}))).status,400);});

await check('SteamGridDB selects the requested orientation without exposing its credential',async()=>{for(const format of ['poster','landscape']){const r=await handler(req({op:'capas',appids:[42],format}));assert.equal(r.status,200);const data=await r.json();assert.match(data.capas[0],format==='poster'?/portrait/:/landscape/);assert.ok(!JSON.stringify(data).includes('test-grid'));}});
await check('SteamGridDB returns safe options for the cover picker',async()=>{const r=await handler(req({op:'capaOpcoes',appids:[42],format:'poster'}));assert.equal(r.status,200);const data=await r.json();assert.equal(data.opcoes.length,1);assert.match(data.opcoes[0].url,/portrait/);assert.ok(!JSON.stringify(data).includes('test-grid'));});

await check('provider outage returns an empty cover for client fallback',async()=>{mode='upstreamfail';const r=await handler(req({op:'capas',appids:[43],format:'poster'}));assert.equal(r.status,200);assert.deepEqual((await r.json()).capas,[null]);});

await check('Steam library preserves minute precision instead of rounding to tenths',async()=>{mode='precisetime';const r=await handler(req({op:'jogos',steamid:'76561198000000000'}));assert.equal(r.status,200);const data=await r.json();assert.equal(data.jogos[0].horas,223/60);assert.equal(data.recentes[0].horasRecentes,1/60);});

await check('retired storefront operations never contact the store or offers feeds',async()=>{
 for(const input of [{op:'steamStoreSearch',query:'Safe Game'},{op:'steamStoreDetails',appid:42},{op:'steamInfo',appids:[42],nomes:['Safe Game']},{op:'gratis'}]){
  const r=await handler(req(input));assert.equal(r.status,input.op==='steamStoreDetails'?410:200);
 }
 assert.ok(!calls.some(c=>['store.steampowered.com','store-site-backend-static.ak.epicgames.com','www.reddit.com'].includes(c.u.hostname)));
});
await check('official library remains available without storefront metadata',async()=>{assert.equal((await handler(req({op:'jogos',steamid:'76561198000000000'}))).status,200)});
