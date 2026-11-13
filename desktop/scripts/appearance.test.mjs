import {test} from 'node:test';import assert from 'node:assert/strict';
import {normalizeTheme,wallpaperSource,createWallpaper,accentText} from '../src/appearance.js';
const data='data:image/webp;base64,YQ==',profile={fundo:{url:'https://example.test/profile.webp',escuro:65}};
test('existing application wallpaper wins; profile wallpaper is shared when none is set',()=>{
 assert.equal(wallpaperSource({background:data},profile),data);
 assert.equal(wallpaperSource({},profile),profile.fundo.url);
 assert.equal(wallpaperSource({}, {fundo:profile.fundo.url}),profile.fundo.url);
 assert.equal(wallpaperSource({background:'javascript:alert(1)'},{fundo:'javascript:alert(1)'}),'');
});
test('one source is reused across renders and clears when removed',async()=>{let calls=0;const paints=[];const model=createWallpaper({owner:()=> 'a',resolve:async src=>{calls++;return src},paint:src=>paints.push(src)});await model.update({},profile,'a');await model.update({},profile,'a');assert.equal(calls,1);assert.equal(paints.at(-1),profile.fundo.url);await model.update({}, {fundo:null},'a');assert.equal(paints.at(-1),'');});
test('old image resolution cannot replace a newer image',async()=>{const pending=new Map(),paints=[];const model=createWallpaper({owner:()=> 'a',resolve:src=>new Promise(resolve=>pending.set(src,resolve)),paint:src=>paints.push(src)});const old=model.update({},profile,'a'),current=model.update({background:data},profile,'a');pending.get(data)(data);await current;pending.get(profile.fundo.url)('old');await old;assert.equal(paints.at(-1),data);});
test('logout and account changes prevent a delayed image from leaking',async()=>{let resolve,owner='a';const paints=[];const model=createWallpaper({owner:()=>owner,resolve:()=>new Promise(done=>resolve=done),paint:src=>paints.push(src)});const old=model.update({},profile,owner);owner='b';model.clear();resolve('private image');await old;assert.equal(paints.at(-1),'');await model.update({},null,'b');assert.equal(paints.at(-1),'');});
test('failed image reads can retry without choosing a different wallpaper',async()=>{let calls=0;const paints=[];const model=createWallpaper({owner:()=> 'a',resolve:async src=>{if(++calls===1)throw Error('offline');return src},paint:src=>paints.push(src)});await model.update({},profile,'a');assert.equal(paints.at(-1),'');await model.update({},profile,'a');assert.equal(paints.at(-1),profile.fundo.url);assert.equal(calls,2);});
test('accent labels choose contrasting ink for light and dark colors',()=>{assert.equal(accentText('#fbbf24'),'#000000');assert.equal(accentText('#38bdf8'),'#000000');assert.equal(accentText('#6d28d9'),'#ffffff');assert.equal(accentText('#000000'),'#ffffff');assert.equal(accentText('#ffffff'),'#000000');});

test('existing light presets adopt the new white canvas without changing custom palettes',()=>{const old={preset:'Claro',bg:'#eef2f8',background:data};assert.equal(normalizeTheme(old).bg,'#faf9fd');assert.equal(old.bg,'#eef2f8');assert.equal(normalizeTheme(old).background,data);assert.equal(normalizeTheme({preset:'Claro',bg:'#aabbcc'}).bg,'#aabbcc');assert.equal(normalizeTheme({preset:'Oceano',bg:'#eef2f8'}).bg,'#eef2f8');});
