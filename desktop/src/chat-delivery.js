(()=>{'use strict';
 function attempt(previous,input){if(previous&&previous.owner===input.owner&&previous.target===input.target&&previous.group===input.group&&previous.text===input.text&&previous.attachment===input.attachment)return previous;return {...input,id:crypto.randomUUID(),media:null};}
 function atEnd(box){return !!box&&box.clientHeight>0&&box.scrollHeight-box.scrollTop-box.clientHeight<=24;}
 function firstUnread(rows,user,group,through){return rows.find(row=>String(row.remetente_id)!==String(user)&&(group?through&&Date.parse(row.created_at)>Date.parse(through):row.lida===false))?.id;}
 const scope=(owner,target,group)=>JSON.stringify([String(owner||''),group?'group':'private',String(target||'')]);
 function merge(rows,outbox=[]){const result=new Map(rows.map(row=>[String(row.id),row]));for(const pending of outbox)if(!result.has(String(pending.row.id))||result.get(String(pending.row.id))._delivery)result.set(String(pending.row.id),{...pending.row,_delivery:pending.status});return [...result.values()].sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||String(a.id).localeCompare(String(b.id)));}
 const key=node=>node.dataset.message?'message:'+node.dataset.message:node.dataset.chatDay?'day:'+node.dataset.chatDay:node.hasAttribute('data-chat-unread')?'unread':'empty';
 function patchMessage(old,next){
  const entering=old.classList.contains('chat-message-enter');old.className=next.className+(entering?' chat-message-enter':'');
  const childKey=node=>node.tagName==='P'?'text':node.tagName==='FOOTER'?'footer':node.className;
  const children=new Map([...old.children].map(node=>[childKey(node),node]));let cursor=old.firstElementChild;
  for(const wanted of [...next.children]){const kind=childKey(wanted);let node=children.get(kind);if(!node)node=wanted;else if(kind==='message-media'){
    if(node.dataset.chatMedia!==wanted.dataset.chatMedia||node.dataset.chatPreview&&!wanted.dataset.chatPreview){node.dataset.chatMedia=wanted.dataset.chatMedia;if(wanted.dataset.privateSrc)node.dataset.privateSrc=wanted.dataset.privateSrc;else if(wanted.getAttribute('src'))node.src=wanted.getAttribute('src');}
    if(wanted.dataset.chatPreview)node.dataset.chatPreview='1';else delete node.dataset.chatPreview;
   }else if(kind==='footer'){
    const time=node.querySelector('time'),newTime=wanted.querySelector('time');if(time.outerHTML!==newTime.outerHTML){time.textContent=newTime.textContent;time.title=newTime.title;time.dataset.delivery=newTime.dataset.delivery||'';}
    const retry=node.querySelector('[data-retry-message]'),newRetry=wanted.querySelector('[data-retry-message]');if(!newRetry)retry?.remove();else if(!retry)node.append(newRetry);const menu=node.querySelector('details'),newMenu=wanted.querySelector('details');if(!newMenu)menu?.remove();else if(!menu)node.append(newMenu);
   }else if(node.innerHTML!==wanted.innerHTML)node.innerHTML=wanted.innerHTML;
   if(node!==cursor)old.insertBefore(node,cursor);cursor=node.nextElementSibling;children.delete(kind);
  }for(const node of children.values())node.remove();
 }
 function sync(box,html){const template=document.createElement('template');template.innerHTML=html;const existing=new Map([...box.children].map(node=>[key(node),node])),added=[];let cursor=box.firstElementChild;
  for(const wanted of [...template.content.children]){const id=key(wanted);let node=existing.get(id);if(!node){node=wanted;if(node.dataset.message)added.push(node);}else if(node.dataset.message)patchMessage(node,wanted);else if(node.innerHTML!==wanted.innerHTML)node.innerHTML=wanted.innerHTML;
   if(node!==cursor)box.insertBefore(node,cursor);cursor=node.nextElementSibling;existing.delete(id);
  }for(const node of existing.values())node.remove();return added;
 }
 function capture(box){const top=box.getBoundingClientRect().top,first=[...box.querySelectorAll('[data-message]')].find(node=>node.getBoundingClientRect().bottom>top);return {id:first?.dataset.message,offset:first?first.getBoundingClientRect().top-top:0,top:box.scrollTop,tail:atEnd(box)};}
 function restore(box,position){if(position.tail){box.scrollTop=box.scrollHeight;return;}const anchor=[...box.querySelectorAll('[data-message]')].find(node=>node.dataset.message===position.id);box.scrollTop=anchor?box.scrollTop+anchor.getBoundingClientRect().top-box.getBoundingClientRect().top-position.offset:position.top;}
 window.BatChatDelivery={attempt,atEnd,firstUnread,scope,merge,sync,capture,restore};
})();
