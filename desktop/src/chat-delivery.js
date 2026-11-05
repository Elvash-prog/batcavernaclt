(()=>{'use strict';
 function attempt(previous,input){if(previous&&previous.owner===input.owner&&previous.target===input.target&&previous.group===input.group&&previous.text===input.text&&previous.attachment===input.attachment)return previous;return {...input,id:crypto.randomUUID(),media:null};}
 function atEnd(box){return !!box&&box.clientHeight>0&&box.scrollHeight-box.scrollTop-box.clientHeight<=24;}
 function firstUnread(rows,user,group,through){return rows.find(row=>String(row.remetente_id)!==String(user)&&(group?through&&Date.parse(row.created_at)>Date.parse(through):row.lida===false))?.id;}
 window.BatChatDelivery={attempt,atEnd,firstUnread};
})();
