// Offline regression tests: real handler with simulated Auth, SQL RPC and providers.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const uid='2d3268d1-4993-46d6-abba-340a2ffdd0fa';
const site='https://batcavernaclt.gamersclt.workers.dev';
let handler, calls=[], mode='ok';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'test-anon',SUPABASE_SERVICE_ROLE_KEY:'test-service',SGDB_KEY:'test-grid',STEAM_KEY:'test-steam',RETROACHIEVEMENTS_KEY:'test-retro'};
globalThis.Deno={env:{get:k=>env[k]},serve:fn=>{handler=fn}};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
globalThis.fetch=async (url, options={})=>{
  const u=new URL(url); calls.push({u,options});
  if(u.pathname==='/auth/v1/user') return mode==='forged'?json({},401):json({id:uid,is_anonymous:mode==='anonymous'});
  if(u.pathname==='/rest/v1/rpc/clt_bright_api_limit') {
    assert.equal(options.headers.apikey,'test-service');
    assert.equal(JSON.parse(options.body).p_user_id,uid);
    return mode==='dbfail'?json({},500):json(mode!=='limited');
  }
  if(mode==='upstreamfail') throw new Error('secret='+env.STEAM_KEY);
  if(u.hostname==='www.steamgriddb.com') {
    if(u.pathname.includes('/search/')) return json({data:mode==='covermatch'?[{id:1,name:'Resident Evil'},{id:9,name:'Resident Evil Requiem'}]:[{id:42,name:'Safe Game'}]});
    return json({data:[{nsfw:true,url:'https://images.test/bad.jpg'},{nsfw:false,url:'https://images.test/safe.jpg'}]});
  }
  if(u.pathname.includes('ResolveVanityURL')) return json({response:{success:1,steamid:'76561198000000000'}});
  if(u.pathname.includes('GetPlayerSummaries')) return json({response:{players:[{steamid:'76561198000000000',personaname:'Player',communityvisibilitystate:3,gameid:'42'}]}});
  if(u.pathname.includes('GetOwnedGames')||u.pathname.includes('GetRecentlyPlayedGames')) return json({response:{game_count:1,games:[{appid:42,name:'Safe Game',playtime_forever:120,playtime_2weeks:60}]}});
  if(u.pathname.includes('GetPlayerAchievements')) return json({playerstats:{achievements:[{apiname:'WIN',achieved:1}]}});
  if(u.pathname.includes('GetSchemaForGame')) return json({game:{availableGameStats:{achievements:[{name:'WIN',displayName:'Win',icon:'https://images.test/win.png'}]}}});
  if(u.pathname.includes('appdetails')) return json({[u.searchParams.get('appids')]:{success:true,data:{name:mode==='adult'?'Hentai Game':'Safe Game',header_image:'https://images.test/game.jpg',is_free:false,price_overview:{initial:1000,final:0,discount_percent:100}}}});
  if(u.pathname.includes('storesearch')) return json({items:[{id:42}]});
  if(u.pathname.includes('freeGamesPromotions')) return json({data:{Catalog:{searchStore:{elements:[]}}}});
  if(u.pathname.includes('featuredcategories')) return json({});
  if(u.pathname.includes('/search/results')) return new Response('');
  if(u.pathname==='/rest/v1/clt_retro_collection'){if(options.method==='POST'){const body=JSON.parse(options.body);assert.equal(body.user_id,uid);return json({})}return json([{cover_url:'',game_ids:[7]}])}
  if(u.pathname.includes('API_GetGameList.php'))return json([{ID:7,Title:'Retro Game',ConsoleName:'SNES',NumAchievements:10}]);
  if(u.pathname.includes('API_GetUserProfile.php')) return json({User:'RetroPlayer',ULID:'00003EMFWR7XB8SDPEHB3K56ZQ',UserPic:'/UserPic/RetroPlayer.png',TotalPoints:123,TotalTruePoints:456});
  if(u.pathname.includes('API_GetUserCompletionProgress.php')) return json({Total:1,Results:[{GameID:7,Title:'Retro Game',ConsoleName:'SNES',MaxPossible:10,NumAwarded:5,NumAwardedHardcore:4}]});
  if(u.pathname.includes('API_GetUserRecentlyPlayedGames.php')) return json([{GameID:7,Title:'Retro Game',ConsoleName:'SNES',NumPossibleAchievements:10,NumAchieved:5,NumAchievedHardcore:4}]);
  if(u.pathname.includes('API_GetGameInfoAndUserProgress.php')) return json({Title:'Retro Game',ConsoleName:'SNES',Achievements:{1:{ID:1,Title:'Start',Description:'Begin',Points:5,BadgeName:'00001',DateEarnedHardcore:'2026-10-15'}}});
  throw new Error('Unexpected simulated URL '+u);
};
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/bright-api/index.ts',import.meta.url),'utf8'));
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function req(body,opts={}) {
  return new Request('https://test.supabase.co/functions/v1/bright-api',{
    method:opts.method||'POST',headers:{Origin:site,'Content-Type':'application/json',Authorization:'Bearer a.b.c',...opts.headers},
    ...(opts.method==='GET'||opts.method==='OPTIONS'?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),
  });
}
let passed=0;
async function check(label,run){mode='ok';calls=[];await run();passed++;console.log('PASS',label)}
await check('preflight has explicit origin',async()=>{const r=await handler(req(null,{method:'OPTIONS'}));assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),site);assert.equal(calls.length,0)});
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
await check('explicitly marked adult cover skipped',async()=>{const r=await handler(req({op:'capas',nomes:['Safe Game']}));assert.equal(r.status,200);assert.deepEqual((await r.json()).capas,['https://images.test/safe.jpg'])});
await check('cover search favors the complete title over another franchise entry',async()=>{mode='covermatch';const r=await handler(req({op:'capas',nomes:['Resident Evil 9 Requiem']}));assert.equal(r.status,200);await r.json();assert.ok(calls.some(x=>x.u.pathname==='/api/v2/grids/game/9'));assert.ok(!calls.some(x=>x.u.pathname==='/api/v2/grids/game/1'))});
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
