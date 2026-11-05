// BatCaverna presence determines visibility; activity samples expire independently of reconnects.
(()=>{'use strict';
 const timestamp=meta=>typeof meta?.online_at==='number'?meta.online_at:Date.parse(meta?.online_at||'')||0;
 const fresh=(meta,now)=>!timestamp(meta)||(timestamp(meta)<=now+300000&&now-timestamp(meta)<=90000);
 function currentMeta(metas,now=Date.now()){const live=metas.filter(m=>m&&fresh(m,now)),visible=live.filter(m=>m.status!=='invisivel').sort((a,b)=>timestamp(b)-timestamp(a)),shared=visible.filter(m=>m.activity_shared!==false),pc=shared.find(m=>m.jogo&&m.jogo_fonte==='pc');if(pc)return pc;const known=shared.filter(m=>m.activity_known!==false);if(known[0]&&timestamp(known[0]))return known[0];return known.find(m=>m.jogo)||known[0]||visible[0]||live[0];}
 function merge(current,incoming,remove=false){const next=current.filter(old=>!incoming.some(m=>m.phx_ref===old.phx_ref||(!remove&&m.phx_ref_prev===old.phx_ref)));return remove?next:[...incoming,...next];}
 function get(friend,{presence={},steam={},presenceReady=false,statusLabels={},now=Date.now()}={}){let p=presence[String(friend.id)];const s=steam[String(friend.id)];if(p?.metas?.length)p=currentMeta(p.metas,now);if(p&&!fresh(p,now))p=null;
  if(friend.status_personalizado==='invisivel'||p?.status==='invisivel'||!p)return {online:false,text:friend.status_personalizado==='invisivel'||p||presenceReady?'Offline':'Sincronizando presença…',game:'',source:'',status:'offline'};
  const fallback=!Object.hasOwn(p,'jogo')&&s?.checked_at&&now-s.checked_at<=60000?s.jogando?.nome:'',game=p.activity_shared===false?'':String(p.jogo??fallback??''),source=game?(p.jogo?p.jogo_fonte||'pc':'steam'):'',status=p.status||'online',label=statusLabels[status]||({ausente:'Ausente',dnd:'Não incomodar',jogando:'Jogando'})[status]||'Online';
  return {online:true,text:game?(status==='ausente'||status==='dnd'?label+' · ':'')+'Jogando · '+game:label,game,source,status};
 }
 window.BatFriendPresence={get,currentMeta,merge};
})();
