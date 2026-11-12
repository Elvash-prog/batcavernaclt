import {test} from 'node:test';import assert from 'node:assert/strict';
import {igdbCatalog,sensitiveGame} from '../supabase/functions/native-api/igdb.js';
import {steamGridCovers,steamGridCover} from '../supabase/functions/_shared/steamgrid.js';
const game={id:88,name:'Synthetic adult game',themes:[{id:42,name:'Erotic'}],cover:{image_id:'synthetic'}};
let body='';globalThis.fetch=async(url,options)=>{if(String(url).includes('oauth2'))return Response.json({access_token:'synthetic-token-123',expires_in:3600});body=options.body;return Response.json([game]);};
test('new classified catalog includes adult games and details while legacy remains filtered',async()=>{
 const env={IGDB_CLIENT_ID:'synthetic-id',IGDB_CLIENT_SECRET:'synthetic-secret'};
 let r=await igdbCatalog(env,new URL('https://test/?search=Synthetic&include_sensitive=1'),'games');let d=await r.json();assert.equal(d.results.length,1);assert.equal(d.results[0].adult,true);assert.equal(d.results[0].capa_adulta,true);assert.ok(!body.includes('themes !='));
 r=await igdbCatalog(env,new URL('https://test/?include_sensitive=1'),'games/88');d=await r.json();assert.equal(d.id,88);assert.equal(d.capa_adulta,true);
 r=await igdbCatalog(env,new URL('https://test/?search=Synthetic'),'games');assert.deepEqual((await r.json()).results,[]);assert.ok(body.includes('themes !='));
 assert.equal((await igdbCatalog(env,new URL('https://test/'),'games/88')).status,404);
});
test('18 ratings are a warning, ordinary regional descriptors alone are not',()=>{
 assert.equal(sensitiveGame({name:'Synthetic',age_ratings:[{rating_category:{rating:'18'}}]}),true);
 assert.equal(sensitiveGame({name:'Hades',age_ratings:[{rating_category:{rating:'C'},rating_content_descriptions:[{description:'Sexual Content'}]}]}),false);
});
test('manual gallery includes labeled NSFW; automatic cover never picks it',async()=>{
 let requested;const getJson=async url=>{requested=new URL(url);return {data:[{id:1,url:'https://cdn2.steamgriddb.com/grid/synthetic.png',nsfw:true,score:99,width:600,height:900}]}};
 let rows=await steamGridCovers({appid:42,key:'synthetic',includeSensitive:true,getJson});assert.equal(requested.searchParams.get('nsfw'),'any');assert.equal(requested.searchParams.has('dimensions'),false);assert.equal(rows.length,1);assert.equal(rows[0].capa_adulta,true);assert.equal(rows[0].nsfw,true);
 assert.equal(await steamGridCover({appid:42,key:'synthetic',getJson}),null);assert.equal(requested.searchParams.get('nsfw'),'false');
});
