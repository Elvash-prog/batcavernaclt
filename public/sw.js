// Patch 1.21 — cache restrito aos arquivos públicos do aplicativo.
const CACHE='batcaverna-shell-v144';
const SHELL=['./index.html','./performance-client.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./push-icon.png','./push-badge.png','./notification-icon-v141.png','./notification-badge-v141.png'];
const SHELL_URLS=new Set(SHELL.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await Promise.all(SHELL.map(async path=>{
      try { const response=await fetch(new Request(new URL(path,self.registration.scope),{cache:'reload'}));
        if(response.ok)await cache.put(new URL(path,self.registration.scope).href,response);
      } catch (_) {} // Uma falha isolada não bloqueia a atualização.
    }));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('batcaverna-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin)return;
  const navigation=req.mode==='navigate';
  const shell=SHELL_URLS.has(url.href);
  if(!navigation&&!shell)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    // Only immutable public shell routes get the fast path. Auth links with query/hash,
    // APIs, profiles and all private data continue through the existing network path.
    const root=new URL('./',self.registration.scope);
    const publicNavigation=navigation&&!url.search&&!url.hash&&(url.pathname===root.pathname||url.pathname===new URL('./index.html',root).pathname);
    const cacheKey=publicNavigation?new URL('./index.html',root).href:req;
    const cachedShell=(publicNavigation||shell)?await cache.match(cacheKey):null;
    async function refresh(){
      const response=await fetch(req);
      // Never cache redirects, errors, API data, or token-bearing navigation.
      if(response.ok&&!response.redirected&&(shell||publicNavigation))await cache.put(cacheKey,response.clone()).catch(()=>{});
      return response;
    }
    if(cachedShell){
      event.waitUntil(refresh().catch(()=>{}));
      return cachedShell;
    }
    try {
      return await refresh();
    } catch (_) {
      const cached=await cache.match(req);
      if(cached)return cached;
      if(navigation){
        const index=await cache.match(new URL('./index.html',self.registration.scope).href);
        if(index)return index;
        return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BatCaverna — sem conexão</title><body style="background:#07070b;color:#f2f2f7;font-family:system-ui;padding:32px"><h1>Você está sem conexão</h1><p>Reconecte-se à internet e recarregue para abrir a BatCaverna.</p></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
      return Response.error();
    }
  })());
});
self.addEventListener('push',event=>{
  let data={title:'BatCaverna dos CLTs',body:'Você tem uma nova notificação.',url:'./'};
  try{if(event.data)data=Object.assign(data,event.data.json())}catch(e){
    try{if(event.data)data.body=event.data.text()}catch(_){}
  }
  event.waitUntil(self.registration.showNotification(data.title||'BatCaverna dos CLTs',{
    body:data.body||'',icon:'./notification-icon-v141.png',badge:'./notification-badge-v141.png',data:{url:data.url||'./'},
    tag:data.tag||'batcaverna',renotify:true
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  let url=new URL('./',self.registration.scope).href;try{const proposed=new URL(event.notification.data&&event.notification.data.url||'./',self.registration.scope);if(proposed.origin===self.location.origin&&proposed.protocol==='https:')url=proposed.href}catch(_){}
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    for(const c of clients){if('focus' in c){c.focus();if('navigate' in c)c.navigate(url);return;}}
    if(self.clients.openWindow)return self.clients.openWindow(url);
  }));
});
