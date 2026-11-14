import assert from 'node:assert/strict';
export async function testPerformance(page){
 await page.evaluate(()=>{window.BatPreload.cancel();window.batcavernaScreenCache.clear();window.navPerformanceTrack=true;window.navPerformanceCalls=[];});
 await page.evaluate(async()=>{state.libraryCategory='jogos';await navigate('library',{fresh:true});await navigate('settings');window.navPerformanceCalls=[];await navigate('library');});
 assert.equal(await page.evaluate(()=>window.navPerformanceCalls.filter(x=>x.command==='library').length),0,'revisiting the collection reuses the short-lived read');
 assert.equal(await page.locator('#content').evaluate(n=>n.inert),false);
 await page.evaluate(async()=>{await navigate('settings');await window.BatPreload.warm('library','animes');window.navPerformanceCalls=[];state.libraryCategory='animes';await navigate('library');});
 assert.equal(await page.evaluate(()=>window.navPerformanceCalls.filter(x=>x.command==='library').length),0,'a completed intent warmup is reused');
 await page.evaluate(()=>{window.BatPreload.cancel();window.holdLibraryPreparation=true;window.navPerformanceCalls=[];window.performanceWarm=window.BatPreload.warm('library','jogos');});
 await page.waitForFunction(()=>window.pendingLibraryRequests?.length>0);
 await page.evaluate(()=>{state.libraryCategory='jogos';window.performanceNavigation=navigate('library');});
 assert.equal(await page.evaluate(()=>window.navPerformanceCalls.filter(x=>x.command==='library'&&x.category==='jogos').length),1,'warmup and foreground navigation share the same pending read');
 await page.evaluate(async()=>{window.holdLibraryPreparation=false;window.releaseLibraryPreparation();await Promise.all([window.performanceWarm,window.performanceNavigation]);});
 // A backend edit must invalidate the snapshot even before its normal lifetime expires.
 await page.evaluate(async()=>{window.libraryQueryRows=[{id:771,nome:'Antes da edição',categoria:'jogos',status:'📌 Backlog'}];await navigate('library',{fresh:true});await navigate('settings');await api.saveItem({id:'771',nome:'Depois da edição',categoria:'jogos'});await navigate('library');});
 assert.match(await page.locator('#libraryGroups').innerText(),/Depois da edição/);
 await page.evaluate(async()=>{window.navPerformanceCalls=[];await renderLibrary();});
 assert.equal(await page.evaluate(()=>window.navPerformanceCalls.filter(x=>x.command==='library').length),1,'an explicit refresh still reads the server');
 await page.evaluate(()=>{window.libraryQueryRows=null;window.navPerformanceDelay=400;});
 await page.locator('#notificationBell').click();await page.locator('#notificationPopup .notification-list').waitFor();await page.locator('#closeNotifications').click();await page.waitForTimeout(450);assert.equal(await page.locator('#notificationPopup').count(),0,'a background notification read cannot reopen a closed menu');
 await page.evaluate(()=>{window.navPerformanceDelay=0;window.holdLibraryPreparation=true;window.performanceOld=window.BatPreload.warm('library','jogos').then(()=>'',e=>e.name);});await page.waitForFunction(()=>window.pendingLibraryRequests?.length>0);
 await page.evaluate(async()=>{showLogin();state.userId='another-account';window.holdLibraryPreparation=false;window.releaseLibraryPreparation();window.performanceOldResult=await window.performanceOld;});assert.equal(await page.evaluate(()=>window.performanceOldResult),'AbortError');
 await page.evaluate(async()=>{window.navPerformanceTrack=false;await showApp();});await page.locator('.studio-welcome').waitFor();
 console.log('Performance UI: cached navigation, intent preloading, shared reads, edit/refresh invalidation, closed menus and session isolation passed');
}
