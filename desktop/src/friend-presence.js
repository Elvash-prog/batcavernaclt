// BatCaverna presence determines visibility; Steam only enriches an online contact.
(() => {
 'use strict';
 function currentMeta(metas){const visible=metas.filter(m=>m.status!=='invisivel');return visible.find(m=>m.jogo&&m.jogo_fonte==='pc')||visible.find(m=>m.jogo)||visible[0]||metas[0];}
 function get(friend,{presence={},steam={},presenceReady=false,statusLabels={}}={}){
  const p=presence[String(friend.id)],s=steam[String(friend.id)];
  if(p?.status==='invisivel')return {online:false,text:'Offline',game:'',source:'',status:'offline'};
  if(p){const game=String(p.jogo||s?.jogando?.nome||''),source=p.jogo?(p.jogo_fonte||'pc'):'steam';return {online:true,text:game?'Jogando · '+game:statusLabels[p.status]||'Online',game,source:game?source:'',status:p.status||'online'};}
  return {online:false,text:presenceReady?'Offline':'Sincronizando presença…',game:'',source:'',status:'offline'};
 }
 window.BatFriendPresence={get,currentMeta};
})();
