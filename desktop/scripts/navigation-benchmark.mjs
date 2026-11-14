import fs from 'node:fs';
export async function benchmarkNavigation(page,destination,bootMs){
 await page.evaluate(()=>{window.BatPreload?.cancel();window.batcavernaScreenCache?.clear();window.navPerformanceCalls=[];window.navPerformanceTrack=true;window.navPerformanceDelay=250;document.body.classList.add('no-animations');});
 const cases=[];
 for(const [name,view,category] of [['first-library','library','jogos'],['appearance','settings','appearance'],['anime','library','animes'],['library-revisit','library','jogos'],['appearance-revisit','settings','appearance'],['profile','profile'],['home-revisit','home'],['library-again','library','jogos']]){
  cases.push(await page.evaluate(async ({name,view,category})=>{const before=window.navPerformanceCalls.length;if(view==='library')state.libraryCategory=category;if(view==='settings')state.settingsTab=category;const start=performance.now();await navigate(view);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {name,ms:performance.now()-start,requests:window.navPerformanceCalls.slice(before).filter(x=>['library','dashboard','journey_stats','profile'].includes(x.command)),cards:document.querySelectorAll('[data-detail]').length};},{name,view,category}));
 }
 const menus=[];for(let i=0;i<2;i++){const start=performance.now();await page.locator('#notificationBell').click();await page.locator('#notificationPopup .notification-list').waitFor();menus.push({name:i?'notifications-revisit':'notifications-first',ms:performance.now()-start});await page.locator('#closeNotifications').click();}
 const report={environment:'Chromium headless; mocked native bridge with 250 ms per read; real built frontend',bootMs,cases,menus};fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
