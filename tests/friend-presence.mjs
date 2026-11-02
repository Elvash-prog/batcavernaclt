import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../desktop/src/friend-presence.js',import.meta.url),'utf8'),context);
const {get,currentMeta}=context.window.BatFriendPresence;
const friend={id:'friend'},steam={friend:{jogando:{nome:'Hades'}}};
test('Steam enriches the online contact without a separate presence row',()=>{const r=get(friend,{presence:{friend:{status:'online'}},steam});assert.equal(r.online,true);assert.equal(r.game,'Hades');assert.equal(r.source,'steam');});
test('PC activity takes precedence over cached Steam activity',()=>{const r=get(friend,{presence:{friend:{status:'online',jogo:'Minecraft',jogo_fonte:'pc'}},steam});assert.equal(r.game,'Minecraft');assert.equal(r.source,'pc');});
test('invisible and disconnected accounts never expose a cached game',()=>{for(const presence of [{friend:{status:'invisivel',jogo:'Segredo'}},{}]){const r=get(friend,{presence,steam,presenceReady:true});assert.equal(r.online,false);assert.equal(r.game,'');assert.equal(r.text,'Offline');assert.doesNotMatch(JSON.stringify(r),/Hades|Segredo/);}});
test('another online device does not hide the playing device',()=>{const playing={status:'online',jogo:'Celeste'},mobile={status:'online'};assert.equal(currentMeta([mobile,playing]),playing);assert.equal(currentMeta([{status:'invisivel'},playing]),playing);});
test('without a game the actual status is retained',()=>{const r=get(friend,{presence:{friend:{status:'ausente'}},statusLabels:{ausente:'Ausente'}});assert.equal(r.text,'Ausente');assert.equal(r.game,'');assert.match(get(friend).text,/Sincronizando/);});

test('the PC session takes priority when another device reports Steam activity',()=>{const pc={status:'online',jogo:'Minecraft',jogo_fonte:'pc'},mobile={status:'online',jogo:'Hades',jogo_fonte:'steam'};assert.equal(currentMeta([mobile,pc]),pc);});
