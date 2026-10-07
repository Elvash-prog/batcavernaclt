const CACHE='batcaverna-shell-v2';
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting())});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  if(new URL(req.url).origin!==self.location.origin) return;
  event.respondWith(fetch(req).then(res=>{
    const copy=res.clone();
    caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
    return res;
  }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
});
self.addEventListener('push',event=>{
  let data={title:'BatCaverna dos CLTs',body:'Você tem uma nova notificação.',url:'./'};
  try{if(event.data)data=Object.assign(data,event.data.json())}catch(e){
    try{if(event.data)data.body=event.data.text()}catch(_){}
  }
  event.waitUntil(self.registration.showNotification(data.title||'BatCaverna dos CLTs',{
    body:data.body||'',icon:'./icon-192.png',badge:'./push-badge.png',data:{url:data.url||'./'},
    tag:data.tag||'batcaverna',renotify:true
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data&&event.notification.data.url||'./';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    for(const c of clients){if('focus' in c){c.focus();if('navigate' in c)c.navigate(url);return;}}
    if(self.clients.openWindow)return self.clients.openWindow(url);
  }));
});
