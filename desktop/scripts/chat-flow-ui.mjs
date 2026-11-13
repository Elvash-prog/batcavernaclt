import assert from 'node:assert/strict';
export async function testChatFlow(page){
 await page.waitForFunction(()=>window.listeners['desktop-change']);
 await page.evaluate(async()=>{window.testFriends=[{id:'friend',nome:'Amigo A',slug:'amigoa'},{id:'second',nome:'Amigo B',slug:'amigob'}];window.testMessagesByTarget={friend:Array.from({length:55},(_,i)=>({id:'flow-'+i,remetente_id:i%2?'friend':'test',destinatario_id:'friend',texto:'Histórico '+i+' · conversa preservada',midia_url:i===0?'test/image.webp':null,lida:true,created_at:new Date(Date.UTC(2026,10,10,10,i)).toISOString()})),second:[{id:'second-only',remetente_id:'second',texto:'Conversa exclusiva B',lida:true,created_at:'2026-11-11T11:00:00Z'}]};showLogin();await showApp();await navigate('friends');});
 await page.evaluate(async()=>await window.batcavernaChooseChat({id:'friend',nome:'Amigo A'}));
 await page.locator('[data-message="flow-0"] .message-media').waitFor({state:'attached'});
 await page.locator('[data-message="flow-0"] .message-media').evaluate(async image=>{if(!image.complete)await new Promise(resolve=>image.addEventListener('load',resolve,{once:true}));});
 await page.locator('#liveChatText').fill('Rascunho preservado');
 await page.evaluate(()=>{window.flowArticle=document.querySelector('[data-message="flow-0"]');window.flowImage=window.flowArticle.querySelector('img');window.flowAside=document.querySelector('.chat-people');window.flowMenu=document.querySelector('[data-message="flow-20"] details');window.flowMenu.open=true;const box=document.querySelector('#liveMessages');box.scrollTop=document.querySelector('[data-message="flow-20"]').offsetTop-box.offsetTop;window.flowAnchor=document.querySelector('[data-message="flow-20"]').getBoundingClientRect().top;window.flowMediaReads=window.mediaCalls;window.testMessagesByTarget.friend.push({id:'flow-arrival',remetente_id:'friend',texto:'Chegou durante a leitura',lida:false,created_at:'2026-11-12T12:00:00Z'});window.listeners['desktop-change']({payload:{userId:'test',data:{table:'clt_chat_messages'}}});});
 await page.locator('[data-message="flow-arrival"]').waitFor({state:'attached'});
 const stable=await page.evaluate(()=>({article:window.flowArticle===document.querySelector('[data-message="flow-0"]'),image:window.flowImage===document.querySelector('[data-message="flow-0"] img'),menu:window.flowMenu.open,anchor:Math.abs(window.flowAnchor-document.querySelector('[data-message="flow-20"]').getBoundingClientRect().top),media:window.mediaCalls-window.flowMediaReads}));
 assert.equal(stable.article,true);assert.equal(stable.image,true);assert.equal(stable.menu,true);assert.ok(stable.anchor<1,'incoming messages preserve the reading anchor');assert.equal(stable.media,0,'unchanged images are not fetched again');assert.equal(await page.locator('#liveChatText').inputValue(),'Rascunho preservado');
 await page.evaluate(()=>window.flowMenu.open=false);
 // The outgoing bubble appears while the server call is still held.
 await page.locator('#liveChatText').fill('Envio imediato de teste');
 await page.evaluate(()=>{window.holdChatSend=true;document.querySelector('#liveMessageForm').requestSubmit();});
 await page.waitForFunction(()=>window.pendingChatSends?.length>0);
 const outgoing=await page.locator('.message.mine').filter({hasText:'Envio imediato de teste'}).getAttribute('data-message');
 assert.match(outgoing,/^[a-f0-9-]{36}$/i);assert.match(await page.locator(`[data-message="${outgoing}"] time`).innerText(),/Enviando/);
 assert.equal(await page.evaluate(()=>window.testMessagesByTarget.friend.some(row=>row.texto==='Envio imediato de teste')),false);
 await page.screenshot({path:'preview/chat-sending-immediate.png',animations:'disabled'});
 // A read that started before confirmation cannot remove that outgoing bubble.
 await page.evaluate(()=>{window.holdChatReads={friend:true};window.listeners['desktop-change']({payload:{userId:'test',data:{table:'clt_chat_messages'}}});});
 await page.waitForFunction(()=>window.pendingChatReads?.friend?.length>0);
 await page.evaluate(()=>{window.holdChatSend=false;window.pendingChatSends.splice(0).forEach(done=>done());});
 await page.waitForFunction(()=>document.querySelector('#chatDeliveryState')?.dataset.state==='sent');
 assert.equal(await page.locator('#liveChatText').inputValue(),'');assert.equal(await page.locator('#liveMessageForm button.primary').isEnabled(),true);
 await page.evaluate(()=>{window.holdChatReads.friend=false;window.pendingChatReads.friend.splice(0).forEach(done=>done());});
 await page.waitForFunction(id=>document.querySelector(`[data-message="${id}"] time`)?.dataset.delivery==='',outgoing);
 assert.equal(await page.locator(`[data-message="${outgoing}"]`).count(),1);
 assert.equal(await page.evaluate(()=>window.flowImage===document.querySelector('[data-message="flow-0"] img')),true);
 // A failed bubble can be retried with the same confirmation identity.
 await page.evaluate(()=>window.sendFailure='before');await page.locator('#liveChatText').fill('Confirmação perdida de teste');await page.locator('#liveMessageForm').evaluate(form=>form.requestSubmit());
 await page.locator('#chatDeliveryState[data-state="failed"]').waitFor();
 await page.locator('.chat-message-retry').click();await page.waitForFunction(()=>document.querySelector('#chatDeliveryState')?.dataset.state==='sent');
 assert.equal(await page.evaluate(()=>new Set(window.saved.filter(x=>x.c==='send_message'&&x.p.input.text==='Confirmação perdida de teste').map(x=>x.p.input.messageId)).size),1);
 // Confirmation after leaving and returning must not erase a newer draft.
 await page.locator('#liveChatText').fill('Envio com confirmação atrasada');await page.evaluate(()=>{window.holdChatAck=true;window.flowOldForm=document.querySelector('#liveMessageForm');window.flowOldForm.requestSubmit();});await page.waitForFunction(()=>window.pendingChatAcks?.length>0);
 await page.locator('[data-chat-user="second"]').click();await page.locator('[data-message="second-only"]').waitFor();await page.locator('[data-chat-user="friend"]').click();await page.waitForFunction(()=>document.querySelector('#chatProfile strong')?.textContent==='Amigo A');
 await page.locator('#liveChatText').fill('Novo rascunho depois do envio');await page.evaluate(()=>{window.holdChatAck=false;window.pendingChatAcks.splice(0).forEach(done=>done());});await page.waitForFunction(()=>window.flowOldForm.dataset.sending!=='true');
 assert.equal(await page.locator('#liveChatText').inputValue(),'Novo rascunho depois do envio');assert.equal(await page.evaluate(()=>localStorage.getItem('bc-chat-draft:test:friend')),'Novo rascunho depois do envio');
 // Stickers show their pending bubble immediately without clearing the text draft.
 await page.evaluate(()=>window.holdChatSend=true);await page.locator('#stickerButton').click();await page.locator('[data-sticker-send="s1"]').click();await page.waitForFunction(()=>window.pendingChatSends?.length>0);
 assert.equal(await page.locator('.message.mine time[data-delivery="sending"]').count(),1);await page.evaluate(()=>{window.holdChatSend=false;window.pendingChatSends.splice(0).forEach(done=>done());});await page.waitForFunction(()=>document.querySelectorAll('.message.mine time[data-delivery="sending"]').length===0);
 assert.equal(await page.locator('#liveChatText').inputValue(),'Novo rascunho depois do envio');
 // Keep contacts usable while a new conversation is waiting for its messages.
 await page.evaluate(()=>window.flowAside=document.querySelector('.chat-people'));
 await page.locator('#conversationSearch').fill('Amigo');await page.locator('#liveChatText').fill('Rascunho A');
 await page.evaluate(()=>window.holdChatReads={second:true});
 await page.locator('[data-chat-user="second"]').click();
 await page.waitForFunction(()=>window.pendingChatReads?.second?.length>0);
 assert.equal(await page.locator('#content').evaluate(root=>root.inert),false);
 assert.equal(await page.locator('[data-chat-user="friend"]').isEnabled(),true);
 await page.locator('[data-chat-user="friend"]').click();
 await page.waitForFunction(()=>document.querySelector('#chatProfile strong')?.textContent==='Amigo A'&&!document.querySelector('#content').classList.contains('navigation-pending'));
 await page.evaluate(()=>{window.holdChatReads.second=false;window.pendingChatReads.second.splice(0).forEach(done=>done());});
 assert.equal(await page.locator('[data-message="second-only"]').count(),0,'a late response cannot show another conversation');
 assert.equal(await page.evaluate(()=>window.flowAside===document.querySelector('.chat-people')),true,'the contact sidebar survives a conversation switch');
 assert.equal(await page.locator('#conversationSearch').inputValue(),'Amigo');assert.equal(await page.locator('#liveChatText').inputValue(),'Rascunho A');
 // Reactions cannot delay the composer or move data between conversations.
 await page.evaluate(()=>window.holdChatReactions=true);await page.locator('[data-chat-user="second"]').click();
 await page.locator('[data-message="second-only"]').waitFor();assert.equal(await page.locator('#liveChatText').isEnabled(),true);
 await page.waitForFunction(()=>window.pendingChatReactions?.length>0);
 await page.locator('#liveChatText').fill('Rascunho B');await page.locator('[data-chat-user="friend"]').click();
 await page.waitForFunction(()=>document.querySelector('#liveChatText')?.value==='Rascunho A');
 await page.evaluate(()=>{window.holdChatReactions=false;window.pendingChatReactions.splice(0).forEach(done=>done());});
 assert.equal(await page.locator('[data-message="second-only"]').count(),0);
 // Group sends use the same immediate bubble and confirmation identity.
 await page.evaluate(async()=>{window.testGroups=[{id:'flow-group',nome:'Grupo fluido',criado_por:'test'}];window.testGroupMessages=[];await renderChat();});await page.locator('#conversationSearch').fill('');await page.locator('[data-group="flow-group"]').click();await page.locator('#chatProfile strong').filter({hasText:'Grupo fluido'}).waitFor();
 await page.evaluate(()=>window.holdGroupSend=true);await page.locator('#liveChatText').fill('Envio imediato em grupo');await page.locator('#liveMessageForm').evaluate(form=>form.requestSubmit());await page.waitForFunction(()=>window.pendingGroupSends?.length>0);
 const groupId=await page.locator('.message.mine').filter({hasText:'Envio imediato em grupo'}).getAttribute('data-message');assert.match(groupId,/^[a-f0-9-]{36}$/i);assert.match(await page.locator(`[data-message="${groupId}"] time`).innerText(),/Enviando/);
 await page.evaluate(()=>{window.holdGroupSend=false;window.pendingGroupSends.splice(0).forEach(done=>done());});await page.waitForFunction(()=>document.querySelector('#chatDeliveryState')?.dataset.state==='sent');assert.equal(await page.locator(`[data-message="${groupId}"]`).count(),1);
 // Logout invalidates pending reads before the next account can enter.
 await page.evaluate(()=>{window.holdChatReads.second=true;window.batcavernaChooseChat({id:'second',nome:'Amigo B'});});await page.waitForFunction(()=>window.pendingChatReads.second.length>0);
 await page.evaluate(()=>{showLogin();window.holdChatReads.second=false;window.pendingChatReads.second.splice(0).forEach(done=>done());});
 assert.equal(await page.locator('#appShell').isHidden(),true);
 await page.evaluate(async()=>{window.testFriends=null;window.testMessagesByTarget=null;window.testGroups=null;window.testGroupMessages=null;window.holdChatReads={};window.holdChatSend=false;window.holdChatReactions=false;await showApp();});
 console.log('Chat flow UI: optimistic send, stable nodes/images/menu/scroll, idempotent retry, responsive contacts, stale reads/reactions and scoped drafts passed');
}
