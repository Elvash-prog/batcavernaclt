import assert from 'node:assert/strict';
import {igdbCatalog,igdbProbe,normalizeGame,blockedGame,igdbImage,gameSearchScore} from '../supabase/functions/native-api/igdb.js';
const env={IGDB_CLIENT_ID:'test-client',IGDB_CLIENT_SECRET:'test-secret'};
let tokens=0,queries=0,force401=true,lastBody='',lastUrl='';
globalThis.fetch=async(url,o)=>{
 lastUrl=String(url);
 if(lastUrl==='https://id.twitch.tv/oauth2/token'){
  tokens++;assert.equal(o.body.get('client_secret'),'test-secret');return Response.json({access_token:'app-token-'+tokens,expires_in:3600});
 }
 assert.equal(lastUrl,'https://api.igdb.com/v4/games');assert.equal(o.headers['Client-ID'],'test-client');assert.ok(o.headers.Authorization.startsWith('Bearer app-token-'));
 queries++;lastBody=o.body;if(o.body.includes('search "Horizon Zero Dawn"'))return Response.json([{id:16596,name:'Horizon Zero Dawn'}]);
 if(force401){force401=false;return Response.json({}, {status:401})}
 return Response.json([{id:99,name:'A Safe Game',first_release_date:1704067200,cover:{image_id:'co_99'},artworks:[{image_id:'ar_99'}],total_rating:88,total_rating_count:23,genres:[{name:'Adventure'}],platforms:[{name:'PC'}],summary:'Game description',videos:[{video_id:'abcdefghijk'}]}]);
};
const url=new URL('https://local/api/catalog/igdb/games?search='+encodeURIComponent('safe game'));
let r=await igdbCatalog(env,url,'games');assert.equal(r.status,200);let d=await r.json();
assert.equal(tokens,2);assert.equal(queries,2);assert.equal(d.source,'igdb');assert.equal(d.results[0].igdb_id,99);
assert.equal(d.results[0].rating,4.4);assert.match(d.results[0].cover_image,/t_cover_big\/co_99.jpg$/);assert.match(d.results[0].background_image,/t_screenshot_huge\/ar_99.jpg$/);
assert.ok(lastBody.includes('search "safe game";'));assert.doesNotMatch(JSON.stringify(d),/test-secret|app-token/);
await igdbCatalog(env,url,'games');assert.equal(queries,2,'successful results cached');
assert.equal(await igdbProbe(env),true);assert.equal(tokens,2,'warm tokens reused');
assert.equal(blockedGame({name:'Safe',themes:[{id:42,name:'Erotic'}]}),true);
assert.equal(blockedGame({name:'Safe',age_ratings:[{rating_category:{rating:'AO'}}]}),true);
assert.equal(blockedGame({name:'Safe',age_ratings:[{rating_category:{rating:'AO (Adults Only 18+)'}}]}),true);
assert.equal(blockedGame({name:'Safe',age_ratings:[{rating_content_descriptions:[{description:'Strong Sexual Content'}]}]}),true);
assert.equal(blockedGame({name:'Horizon Zero Dawn',age_ratings:[{rating_content_descriptions:[{description:'Mild Sexual Themes'}]}]}),false);
assert.equal(blockedGame({name:'Safe',age_ratings:[{rating_category:{rating:'M'}}]}),false,'Mature violence alone is not pornographic');
assert.equal(igdbImage('../bad'), '');assert.equal(normalizeGame({id:1,name:'Without artwork'}).cover_image,'');
r=await igdbCatalog({},url,'games');assert.equal(r.status,503);
r=await igdbCatalog(env,new URL('https://local/?page=1.5'),'games');assert.equal(r.status,400);
assert.equal(gameSearchScore({name:'Horizon Forbidden West'},'Horizon Zero Dawn'),0);assert.equal(gameSearchScore({name:'Horizon Zero Dawn'},'Horizon Zero Dawn'),1000);assert.ok(gameSearchScore({name:'Horizon Zero Dawn: Complete Edition'},'horizon zero dawn')>0);assert.equal(gameSearchScore({name:'Resident Evil 1'},'Resident Evil 9'),0);
const failed={IGDB_CLIENT_ID:'x',IGDB_CLIENT_SECRET:'y'};globalThis.fetch=async()=>Response.json({error:'do not disclose y'}, {status:400});
r=await igdbCatalog(failed,url,'games');assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/disclose/);
console.log('IGDB: token renewal, cache, query escaping, image formats, ratings, adult filtering and secret redaction passed');
// Steam IDs are read from IGDB links, never by querying the storefront.
assert.equal(normalizeGame({id:1,name:'Game',websites:[{url:'https://store.steampowered.com/app/1174180/Red_Dead_Redemption_2/'}]}).steam_appid,1174180);
assert.equal(normalizeGame({id:1,name:'Game',websites:[{url:'https://store.steampowered.com.evil.test/app/42/'}]}).steam_appid,null);
assert.equal(normalizeGame({id:1,name:'Game',websites:[{url:'https://store.steampowered.com/app/42/'},{url:'https://store.steampowered.com/app/43/'}]}).steam_appid,null,'ambiguous edition requires manual selection');
