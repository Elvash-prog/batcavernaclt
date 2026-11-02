import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../desktop/src/chat-presentation.js',import.meta.url),'utf8'),context);
const ui=context.window.BatChatPresentation;
test('contact and group markup cannot inject HTML',()=>{const value='\"><img src=x onerror=alert(1)>';for(const html of [ui.contact({id:value,nome:value,avatar_url:value},{online:true,text:value},true),ui.group({id:value,nome:value},true)]){assert.doesNotMatch(html,/<img src=x/);assert.doesNotMatch(html,/data-(chat-user|group)="">/);assert.match(html,/&lt;|&quot;/);assert.match(html,/aria-current="true"/);}});
test('group authors use permitted names and never raw account identifiers',()=>{const o={userId:'me',members:[{user_id:'other',nome:'Luna'}],friends:[]};assert.equal(ui.sender({remetente_id:'me'},o),'Você');assert.equal(ui.sender({remetente_id:'other'},o),'Luna');assert.equal(ui.sender({remetente_id:'private-id'},o),'Participante');});
