/* BatCaverna Patch 1.40 — bounded work, in-flight reads, stable media. No persistent private cache. */
(function () {
  'use strict';
  var frames=new Map(), frameId=null, reads=new Map(), media=new Map(), roots=new Map(), epoch=0;
  var metrics={sharedReads:0,frameBatches:0,mediaRoots:0};
  window.BC_PERFORMANCE=metrics;
  window.bcFrame=function(key,fn){
    frames.set(key,fn);
    if(frameId!==null)return;
    frameId=requestAnimationFrame(function(){
      frameId=null;var batch=Array.from(frames.values());frames.clear();metrics.frameBatches++;
      batch.forEach(function(job){try{job()}catch(e){console.warn('BatCaverna: falha ao atualizar a interface.')}});
    });
  };
  function context(){return epoch+':'+String(typeof euId==='function'?euId()||'':'')+':'+String(typeof P!=='undefined'&&P?P.uid||'':'')+':'+String(typeof edit==='function'?edit():false)}
  window.bcSingleFlight=function(name,fn,keyFn){
    return function(){
      var args=Array.from(arguments),self=this,key=name+':'+context()+':'+(keyFn?keyFn.apply(self,args):'');
      if(reads.has(key)){metrics.sharedReads++;return reads.get(key)}
      // Call immediately: providers capture the current profile/session before any await.
      var result;try{result=fn.apply(self,args)}catch(e){return Promise.reject(e)}
      var work=Promise.resolve(result).finally(function(){if(reads.get(key)===work)reads.delete(key)});
      reads.set(key,work);return work;
    };
  };
  window.bcQueuePrivateMedia=function(records){
    records.forEach(function(record){
      if(record.type==='attributes'){
        if(record.target.nodeType===1&&!roots.has(record.target))roots.set(record.target,false);
      }else Array.from(record.addedNodes||[]).forEach(function(node){if(node.nodeType===1)roots.set(node,true)});
    });
    if(!roots.size)return;
    bcFrame('private-media',function drain(){
      var count=0;
      for(var entry of roots){
        var node=entry[0],deep=entry[1];roots.delete(node);
        if(node.isConnected){metrics.mediaRoots++;bcScanPrivateMedia(node,deep)}
        if(++count>=100)break;
      }
      if(roots.size)bcFrame('private-media',drain);
    });
  };
  window.bcLoadChatMedia=function(group,message){
    var uid=String(euId()||''),thread=String(group?GROUP_ACTIVE:CHAT_ACTIVE),path=group?message.midia_path:message.midia_url;
    var currentEpoch=epoch,key=currentEpoch+':'+uid+':'+group+':'+thread+':'+message.id+':'+path;
    if(!uid||!path||media.has(key))return;
    var work=Promise.resolve(sb.storage.from(group?'group-chat-media':'chat-media').createSignedUrl(path,300)).then(function(r){
      if(epoch!==currentEpoch||String(euId()||'')!==uid||group!==(typeof GROUP_MODE!=='undefined'&&GROUP_MODE==='groups')||String(group?GROUP_ACTIVE:CHAT_ACTIVE)!==thread)return;
      var rows=group?GROUP_MESSAGES:CHAT_MESSAGES;
      if(!rows.some(function(m){return String(m.id)===String(message.id)&&(group?m.midia_path:m.midia_url)===path}))return;
      if(!r.error&&r.data&&r.data.signedUrl){
        (group?GROUP_MEDIA_URLS:CHAT_MEDIA_URLS)[String(message.id)]=r.data.signedUrl;
        bcFrame('chat-media',function(){if(epoch===currentEpoch&&String(euId()||'')===uid&&group===(typeof GROUP_MODE!=='undefined'&&GROUP_MODE==='groups')&&String(group?GROUP_ACTIVE:CHAT_ACTIVE)===thread)(group?groupRenderMain:chatRenderMain)()});
      }
    }).catch(function(){}).finally(function(){if(media.get(key)===work)media.delete(key)});
    media.set(key,work);
  };
  function install(){
    ['buscarDados','carregarAmigos','carregarNotificacoes','carregarAtividadeSocial','carregarRanking'].forEach(function(name){
      if(typeof window[name]==='function')window[name]=bcSingleFlight(name,window[name]);
    });
    if(typeof window.carregarFeedSocial==='function')window.carregarFeedSocial=bcSingleFlight('feed',window.carregarFeedSocial,function(){return FEED_LIMIT+':'+(AMIGOS||[]).join(',')});
    if(typeof window.api==='function')window.api=bcSingleFlight('steam-api',window.api,function(op,body){return JSON.stringify([op,body||{}])});
    if(typeof sb!=='undefined'&&sb)sb.auth.onAuthStateChange(function(event){if(event==='SIGNED_OUT'){epoch++;reads.clear();media.clear();roots.clear();if(typeof BC_FRIENDS_SIGNATURE!=='undefined'){BC_FRIENDS_SIGNATURE='';BC_FRIENDS_PROFILE_AT=0}if(typeof STEAM_AMIGOS_KEY!=='undefined'){STEAM_AMIGOS_KEY='';STEAM_AMIGOS_AT=0}}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
