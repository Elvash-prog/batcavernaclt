import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const context=vm.createContext({normalizedStatus:s=>s==='playing'?'progress':'other'});
vm.runInContext(readFileSync(new URL('../src/home-highlight.js',import.meta.url),'utf8'),context);
const games=[{id:1,steam_appid:10,status:'playing',updated_at:'2026-10-01'},{id:2,steam_appid:20,status:'playing',updated_at:'2026-10-20'}];
test('manual selection wins over recent activity',()=>assert.equal(context.chooseHomeHighlight(games,'1',{'2':99999},[]).id,1));
test('automatic uses real Steam recency instead of edited date',()=>assert.equal(context.chooseHomeHighlight(games,'',{},[{appid:10,ultimaVez:'2026-10-28'}]).id,1));
test('local play after Steam session wins, removed pin falls back',()=>assert.equal(context.chooseHomeHighlight(games,'deleted',{'2':Date.parse('2026-10-29')},[{appid:10,ultimaVez:'2026-10-28'}]).id,2));
test('without play history uses latest in-progress game',()=>assert.equal(context.chooseHomeHighlight(games).id,2));
test('empty library has no highlight',()=>assert.equal(context.chooseHomeHighlight([]),null));

test('achievement progress uses real local count and official catalogue',()=>{const p=context.homeAchievementProgress({}, {lista:[{got:false},{got:false},{got:false},{got:false}]},{total:4,unlocked:1});assert.equal(p.percent,25);assert.match(p.label,/1 de 4/)});
test('unknown achievement progress stays unavailable and zero stays zero',()=>{assert.equal(context.homeAchievementProgress({},null,null),null);assert.equal(context.homeAchievementProgress({conquistas:0},null,null).percent,0)});
test('time editor shows hours and minutes with carry',()=>{assert.equal(context.playtimeEditorParts(3.775).hours,3);assert.equal(context.playtimeEditorParts(3.775).minutes,47);assert.equal(context.playtimeEditorParts(1.999).hours,2);assert.equal(context.playtimeEditorParts(1.999).minutes,0)});

test('catalogue without known player progress does not invent zero percent',()=>assert.equal(context.homeAchievementProgress({}, {lista:[{got:null}],progressKnown:false},null),null));

test('home artwork never replaces a saved cover, including when the image is unavailable',async()=>{for(const source of ['https://images.igdb.com/igdb/image/upload/t_cover_big/a.jpg','https://cdn2.steamgriddb.com/grid/a.png','https://example.test/custom.jpg'])for(const fail of [false,true]){const direct=source.includes('example.test'),calls=[],image={isConnected:true},item={nome:'Selected game',capa:source,steam_appid:42};context.api={coverImage:async url=>{calls.push(url);if(fail)throw Error('offline');return 'decoded'}};context.call=async()=>{throw Error('Unexpected metadata search')};context.coverUrl=x=>x;context.signed=async x=>x;context.requiresMediaSigning=()=>false;context.publicCover=()=>!direct;await context.loadHomeHero(image,item);if(direct&&fail)image.onerror();assert.deepEqual(calls,direct?[]:[source]);assert.equal(item.capa,source);assert.equal(image.src,fail?'icon.png':direct?source:'decoded');}});


test('a late hero response cannot replace a newer choice on the same image',async()=>{
 const pending=[],c=vm.createContext({window:{},state:{userId:'owner'},coverUrl:x=>x,requiresMediaSigning:()=>false,publicCover:()=>true,api:{coverImage:url=>new Promise(resolve=>pending.push({url,resolve}))}});vm.runInContext(readFileSync(new URL('../src/home-highlight.js',import.meta.url),'utf8'),c);
 const image={isConnected:true},first=c.loadHomeHero(image,{capa:'first'}),second=c.loadHomeHero(image,{capa:'second'});pending[1].resolve('second pixels');await second;pending[0].resolve('first pixels');await first;assert.equal(image.src,'second pixels');assert.equal(image.dataset.coverSource,'second');
 const third=c.loadHomeHero(image,{capa:'third'});c.state.userId='another';pending[2].resolve('private old result');await third;assert.equal(image.src,'second pixels');
});
test('portrait hero artwork is identified without substituting its source',async()=>{
 const c=vm.createContext({window:{},coverUrl:x=>x,requiresMediaSigning:()=>false,publicCover:()=>false});vm.runInContext(readFileSync(new URL('../src/home-highlight.js',import.meta.url),'utf8'),c);const hero={dataset:{}},image={isConnected:true,naturalWidth:600,naturalHeight:900,closest:()=>hero};await c.loadHomeHero(image,{capa:'https://example.test/chosen.png'});image.onload();assert.equal(hero.dataset.artLayout,'portrait');assert.equal(image.src,'https://example.test/chosen.png');
});
