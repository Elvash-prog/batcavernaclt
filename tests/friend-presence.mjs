import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../desktop/src/friend-presence.js',import.meta.url),'utf8'),context);
const {get,currentMeta}=context.window.BatFriendPresence;
const friend={id:'friend'},steam={friend:{jogando:{nome:'Hades'},checked_at:Date.now()}};
test('Steam enriches the online contact without a separate presence row',()=>{const r=get(friend,{presence:{friend:{status:'online'}},steam});assert.equal(r.online,true);assert.equal(r.game,'Hades');assert.equal(r.source,'steam');});
test('PC activity takes precedence over cached Steam activity',()=>{const r=get(friend,{presence:{friend:{status:'online',jogo:'Minecraft',jogo_fonte:'pc'}},steam});assert.equal(r.game,'Minecraft');assert.equal(r.source,'pc');});
test('invisible and disconnected accounts never expose a cached game',()=>{for(const presence of [{friend:{status:'invisivel',jogo:'Segredo'}},{}]){const r=get(friend,{presence,steam,presenceReady:true});assert.equal(r.online,false);assert.equal(r.game,'');assert.equal(r.text,'Offline');assert.doesNotMatch(JSON.stringify(r),/Hades|Segredo/);}});
test('another online device does not hide the playing device',()=>{const playing={status:'online',jogo:'Celeste'},mobile={status:'online'};assert.equal(currentMeta([mobile,playing]),playing);assert.equal(currentMeta([{status:'invisivel'},playing]),playing);});
test('without a game the actual status is retained',()=>{const r=get(friend,{presence:{friend:{status:'ausente'}},statusLabels:{ausente:'Ausente'}});assert.equal(r.text,'Ausente');assert.equal(r.game,'');assert.match(get(friend).text,/Sincronizando/);});

test('the PC session takes priority when another device reports Steam activity',()=>{const pc={status:'online',jogo:'Minecraft',jogo_fonte:'pc'},mobile={status:'online',jogo:'Hades',jogo_fonte:'steam'};assert.equal(currentMeta([mobile,pc]),pc);});

test('explicit cleared activity never falls back to the Steam cache',()=>{const r=get(friend,{presence:{friend:{status:'online',jogo:'',jogo_fonte:'',online_at:Date.now()}},steam});assert.equal(r.game,'');assert.equal(r.text,'Online');});
test('old Steam fallback expires',()=>{const r=get(friend,{presence:{friend:{status:'online'}},steam:{friend:{jogando:{nome:'Antigo'},checked_at:Date.now()-61000}}});assert.equal(r.game,'');});
test('a newer empty sample clears an old Steam device, but not a running PC game',()=>{const now=Date.now(),pc={phx_ref:'pc-new',status:'online',jogo:'',device:'desktop',online_at:now},mobile={status:'online',jogo:'Hades',jogo_fonte:'steam',online_at:now-1000};assert.equal(currentMeta([mobile,pc]),pc);const running={...pc,jogo:'Control',jogo_fonte:'pc',online_at:now-2000};assert.equal(currentMeta([mobile,running]),running);});
test('stale and future samples do not advertise a game',()=>{const now=Date.now();for(const stamp of [now-91000,now+310000]){const r=get(friend,{presence:{friend:{metas:[{status:'online',jogo:'Antigo',jogo_fonte:'pc',online_at:stamp}]}},presenceReady:true,now});assert.equal(r.online,false);assert.equal(r.game,'');}});
test('away and do not disturb stay visible alongside the game',()=>{for(const status of ['ausente','dnd']){const r=get(friend,{presence:{friend:{status,jogo:'Celeste',jogo_fonte:'pc'}}});assert.match(r.text,/Jogando · Celeste/);assert.match(r.text,status==='ausente'?/Ausente/:/Não incomodar/);}});
test('updated refs replace old samples and a late leave cannot remove the new one',()=>{const {merge}=context.window.BatFriendPresence,old={phx_ref:'old',jogo:'Hades'},fresh={phx_ref:'new',phx_ref_prev:'old',jogo:''};const changed=merge([old],[fresh]);assert.equal(changed.length,1);assert.equal(changed[0],fresh);assert.equal(merge(changed,[old],true)[0],fresh);assert.equal(merge(changed,[fresh],true).length,0);});
test('account invisibility and a disabled activity sample never expose a title',()=>{assert.equal(get({...friend,status_personalizado:'invisivel'},{presence:{friend:{status:'online',jogo:'Hades'}},steam}).game,'');assert.equal(get(friend,{presence:{friend:{status:'online',jogo:'Hades',activity_shared:false}},steam}).game,'');});
