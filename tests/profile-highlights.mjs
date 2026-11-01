import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const script=fs.readFileSync(new URL('../desktop/src/profile-highlights.js',import.meta.url),'utf8');
function setup({count=70,profile={},names}={}){
 const dom=new JSDOM('<form><section data-profile-panel="highlights"></section></form>',{runScripts:'outside-only'}),{window}=dom;
 window.hydrateMedia=async()=>{};window.eval(script);
 const games=Array.from({length:count},(_,i)=>({id:i+1,nome:names?.[i]||'Jogo '+(i+1),capa:'https://example.invalid/cover.jpg',plataforma:'PC'}));
 const achievements=Array.from({length:12},(_,i)=>['🏆','Conquista '+i,'Descrição '+i,i<8]);
 const form=window.document.querySelector('form');window.BatProfileHighlights.mount(form,{games,achievements,profile});
 const pick=(name)=>[...form.querySelectorAll('[data-pick-game]')].find(input=>input.getAttribute('aria-label')==='Destacar '+name);
 const search=(query)=>{const input=form.querySelector('input[type=search]');input.value=query;input.dispatchEvent(new window.Event('input',{bubbles:true}));};
 const selected=(name)=>[...form.querySelectorAll(`[name="${name}"]:checked`)].map(input=>input.value);
 return {window,form,pick,search,selected,close:()=>window.close()};
}
test('draft games survive searches, pagination and selected-only filtering',()=>{
 const ui=setup({profile:{jogos_destaque:['Jogo 1','Jogo 70']}});
 try{
  assert.equal(ui.form.querySelectorAll('[data-pick-game]').length,24);
  assert.deepEqual(ui.selected('games').sort(),['Jogo 1','Jogo 70']);
  ui.search('Jogo 70');assert.equal(ui.pick('Jogo 70').checked,true);
  ui.pick('Jogo 70').click();assert.deepEqual(ui.selected('games'),['Jogo 1']);
  ui.search('Jogo 2');ui.pick('Jogo 2').click();
  ui.form.querySelector('.picks-filter').click();assert.equal(ui.form.querySelectorAll('[data-pick-game]').length,1);
  ui.search('');assert.deepEqual(ui.selected('games').sort(),['Jogo 1','Jogo 2']);
  ui.form.querySelector('.picks-filter').click();ui.form.querySelector('.picks-more').click();
  assert.equal(ui.form.querySelectorAll('[data-pick-game]').length,48);
  assert.deepEqual(ui.selected('games').sort(),['Jogo 1','Jogo 2']);
 }finally{ui.close();}
});
test('eight games and four earned achievements are enforced without dropping hidden selections',()=>{
 const ui=setup({profile:{jogos_destaque:Array.from({length:8},(_,i)=>'Jogo '+(i+1)),conquistas_destaque:[0,1,2,3,11]}});
 try{
  ui.search('Jogo 9');ui.pick('Jogo 9').click();assert.equal(ui.pick('Jogo 9').checked,false);assert.equal(ui.selected('games').length,8);
  assert.match(ui.form.querySelector('.picks-notice').textContent,/8 jogos/);
  ui.form.querySelector('[data-picks-tab=achievements]').click();
  assert.equal(ui.form.querySelector('[data-pick-achievement="11"]'),null,'locked achievements are not offered');
  const fifth=ui.form.querySelector('[data-pick-achievement="4"]');fifth.click();assert.equal(fifth.checked,false);
  assert.equal(ui.selected('achievements').length,4);
  for(const input of ui.form.querySelectorAll('[data-pick-achievement]:checked'))input.click();
  assert.deepEqual(ui.selected('achievements'),[]);
  assert.ok(ui.form.elements.achievements,'an empty selection is serialized, not restored from the old profile');
 }finally{ui.close();}
});
test('accent-insensitive search, literal titles and keyboard navigation remain accessible',()=>{
 const hostile='<img src=x onerror="window.privateLeak=1">';
 const ui=setup({count:3,names:['Pokémon',hostile,'Aventura'],profile:{jogos_destaque:[2]}});
 try{
  assert.deepEqual(ui.selected('games'),[hostile]);
  assert.equal(ui.form.querySelector('[onerror]'),null);assert.equal(ui.window.privateLeak,undefined);
  ui.search('POKEMON');assert.equal(ui.form.querySelectorAll('[data-pick-game]').length,1);
  ui.pick('Pokémon').click();assert.equal(ui.selected('games').length,2);
  const tab=ui.form.querySelector('[data-picks-tab=games]');tab.dispatchEvent(new ui.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(ui.form.querySelector('[data-picks-tab=achievements]').getAttribute('aria-selected'),'true');
  assert.equal(ui.form.querySelector('[data-picks-page=games]').hidden,true);
 }finally{ui.close();}
});
test('empty libraries show an empty state and no phantom saved games',()=>{
 const ui=setup({count:0,profile:{jogos_destaque:['Removed']}});
 try{assert.equal(ui.form.querySelectorAll('[data-pick-game]').length,0);assert.deepEqual(ui.selected('games'),[]);assert.equal(ui.form.querySelector('.picks-more').hidden,true);}finally{ui.close();}
});
