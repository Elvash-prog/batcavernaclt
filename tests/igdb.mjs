import assert from 'node:assert/strict';
import {igdbCatalog,igdbProbe,normalizeGame,blockedGame,igdbImage} from '../supabase/functions/native-api/igdb.js';
const env={IGDB_CLIENT_ID:'test-client',IGDB_CLIENT_SECRET:'test-secret'};
let tokens=0,queries=0,force401=true,lastBody='',lastUrl='';
globalThis.fetch=async(url,o)=>{
 lastUrl=String(url);
 if(lastUrl==='https://id.twitch.tv/oauth2/token'){
  tokens++;assert.equal(o.body.get('client_secret'),'test-secret');return Response.json({access_token:'app-token-'+tokens,expires_in:3600});
 }
 assert.equal(lastUrl,'https://api.igdb.com/v4/games');assert.equal(o.headers['Client-ID'],'test-client');assert.ok(o.headers.Authorization.startsWith('Bearer app-token-'));
 queries++;lastBody=o.body;
 if(force401){force401=false;return Response.json({}, {status:401})}
 return Response.json([{id:99,name:'A Safe Game',first_release_date:1704067200,cover:{image_id:'co_99'},artworks:[{image_id:'ar_99'}],total_rating:88,total_rating_count:23,genres:[{name:'Adventure'}],platforms:[{name:'PC'}],summary:'Game description',videos:[{video_id:'abcdefghijk'}]}]);
};
const url=new URL('https://local/api/catalog/igdb/games?search='+encodeURIComponent('game"; fields *;'));
let r=await igdbCatalog(env,url,'games');assert.equal(r.status,200);let d=await r.json();
assert.equal(tokens,2);assert.equal(queries,2);assert.equal(d.source,'igdb');assert.equal(d.results[0].igdb_id,99);
assert.equal(d.results[0].rating,4.4);assert.match(d.results[0].cover_image,/t_cover_big\/co_99.jpg$/);assert.match(d.results[0].background_image,/t_screenshot_huge\/ar_99.jpg$/);
assert.ok(lastBody.includes('search "game\\"; fields *;";'));assert.doesNotMatch(JSON.stringify(d),/test-secret|app-token/);
await igdbCatalog(env,url,'games');assert.equal(queries,2,'successful results cached');
assert.equal(await igdbProbe(env),true);assert.equal(tokens,2,'warm tokens reused');
assert.equal(blockedGame({name:'Safe',themes:[{id:42,name:'Erotic'}]}),true);
assert.equal(blockedGame({name:'Safe',age_ratings:[{rating_category:{rating:'AO'}}]}),true);
assert.equal(blockedGame({name:'Safe',age_ratings:[{rating_content_descriptions:[{description:'Strong Sexual Content'}]}]}),true);
assert.equal(blockedGame({name:'Safe',age_ratings:[{rating_category:{rating:'M'}}]}),false,'Mature violence alone is not pornographic');
assert.equal(igdbImage('../bad'), '');assert.equal(normalizeGame({id:1,name:'Without artwork'}).cover_image,'');
r=await igdbCatalog({},url,'games');assert.equal(r.status,503);
r=await igdbCatalog(env,new URL('https://local/?page=1.5'),'games');assert.equal(r.status,400);
const failed={IGDB_CLIENT_ID:'x',IGDB_CLIENT_SECRET:'y'};globalThis.fetch=async()=>Response.json({error:'do not disclose y'}, {status:400});
r=await igdbCatalog(failed,url,'games');assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/disclose/);
console.log('IGDB: token renewal, cache, query escaping, image formats, ratings, adult filtering and secret redaction passed');
