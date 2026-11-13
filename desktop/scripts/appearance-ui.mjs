import assert from 'node:assert/strict';
import path from 'node:path';
export async function testAppearance(page){
 const settings=()=>page.evaluate(async()=>{state.settingsTab='appearance';await navigate('settings');});
 const paint=()=>page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});
 await settings();
 assert.equal(await page.locator('[data-setting-section="wallpaper"]').count(),1);
 assert.match(await page.locator('[data-setting-section="wallpaper"]').innerText(),/todas as abas.*perfil/);
 await page.locator('[data-theme-preset="Claro"]').click();await paint();
 await page.evaluate(()=>{const sync=window.batcavernaLayoutSync;sync.save({...sync.get(),preset:'Claro',bg:'#eef2f8'});});
 const colorState=await page.evaluate(()=>({body:getComputedStyle(document.body).backgroundColor,main:getComputedStyle(document.querySelector('#appShell>main')).backgroundColor,content:getComputedStyle(document.querySelector('#content')).backgroundColor,railInput:getComputedStyle(document.querySelector('.rail-search input')).backgroundColor,wallpaper:getComputedStyle(document.body,'::before').backgroundImage}));
 assert.equal(colorState.body,'rgb(250, 249, 253)','the light canvas follows the light palette rather than a fixed dark gradient');
 assert.equal(colorState.main,'rgba(0, 0, 0, 0)');assert.equal(colorState.content,'rgba(0, 0, 0, 0)');assert.equal(colorState.railInput,'rgba(0, 0, 0, 0)');
 assert.match(colorState.wallpaper,/data:image/);
 await page.screenshot({path:'preview/unified-light-settings.png',animations:'disabled'});
 for(const view of ['home','library','profile','game-feed']){
  await page.evaluate(async view=>{if(view==='library')state.libraryCategory='jogos';await navigate(view);},view);
  assert.equal(await page.locator('body').evaluate(n=>getComputedStyle(n,'::before').backgroundImage),colorState.wallpaper,'the wallpaper must not change between tabs');
  assert.equal(await page.locator('.profile-user-background').count(),0,'there is no second profile-only wallpaper layer');
  if(view==='profile'){assert.match(await page.locator('.profile-cover').evaluate(n=>getComputedStyle(n,'::after').backgroundImage),/linear-gradient/);assert.equal(await page.locator('.cavern-stats').evaluate(n=>getComputedStyle(n).backgroundImage),'none');}
  if(view==='library')assert.equal(await page.locator('.cavern-lib-tabs button:not(.active)').first().evaluate(n=>getComputedStyle(n).backgroundImage),'none');
  if(view==='home')assert.equal(await page.locator('.hero-greeting').evaluate(n=>getComputedStyle(n).color),'rgb(23, 32, 51)');
  await page.screenshot({path:`preview/unified-light-${view}.png`,animations:'disabled'});
 }
 await page.locator('#sidebarAccount').click();await page.locator('#profileAction').click();await page.locator('[data-profile-tab="appearance"]').click();
 assert.equal(await page.locator('#desktopProfileBackground').count(),0);
 await page.locator('[data-edit-wallpaper]').click();
 await page.locator('[data-setting-section="wallpaper"]').waitFor();
 assert.equal(await page.locator('.profile-editor').count(),0);
 // Every preset uses the same canvas and controls; accent labels retain contrast.
 for(const preset of ['Caverna','Oceano','Esmeralda','Rubi','Âmbar','Claro']){
  await page.locator(`[data-theme-preset="${preset}"]`).click();await paint();
  await page.evaluate(async()=>await navigate('home'));
  const colors=await page.evaluate(()=>{
   const rgba=color=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,1,1);return [...x.getImageData(0,0,1,1).data];};
   const lum=rgb=>rgb.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
   const ratio=(a,b)=>{const x=lum(rgba(a)),y=lum(rgba(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
   const body=getComputedStyle(document.body),root=getComputedStyle(document.documentElement),button=getComputedStyle(document.querySelector('.studio-add')),side=getComputedStyle(document.querySelector('.sidebar'));
   return {canvas:rgba(body.backgroundColor),expected:rgba(root.getPropertyValue('--bg')),textContrast:ratio(body.color,body.backgroundColor),buttonContrast:ratio(button.color,button.backgroundColor),sideAlpha:rgba(side.backgroundColor)[3]/255};
  });
  assert.deepEqual(colors.canvas,colors.expected,preset+' canvas');assert.ok(colors.textContrast>=7,preset+' text contrast');assert.ok(colors.buttonContrast>=4.5,preset+' accent contrast');assert.ok(colors.sideAlpha>=.7&&colors.sideAlpha<=.85,preset+' translucent navigation');
  await page.screenshot({path:`preview/unified-theme-${preset==='Âmbar'?'Ambar':preset}.png`,animations:'disabled'});
  await settings();
 }
 // Media headers use the selected palette even when their cover is applied inline.
 await page.evaluate(async()=>{state.discoverTab='retro';await navigate('discover');});
 const retro=await page.locator('.retro-profile').evaluate(n=>({background:getComputedStyle(n).backgroundImage,color:getComputedStyle(n.querySelector('h2')).color}));
 assert.match(retro.background,/color\(srgb 1 1 1 \/ 0\.96\)/,'retro cover overlay follows the light panel token');assert.equal(retro.color,'rgb(23, 32, 51)');
 await page.screenshot({path:'preview/unified-light-retro.png',animations:'disabled'});
 await settings();await page.locator('[data-theme-preset="Caverna"]').click();
 await page.evaluate(async()=>{state.discoverTab='retro';await navigate('discover');});
 assert.match(await page.locator('.retro-profile').evaluate(n=>getComputedStyle(n).backgroundImage),/color\(srgb 0\.0627451 0\.121569 0\.168627 \/ 0\.96\)/,'retro cover overlay follows the dark panel token');
 await settings();await page.locator('[data-theme-preset="Claro"]').click();
 const fixture=path.resolve('../tests/fixtures/profile-images/valid.png');
 const before=await page.evaluate(()=>({source:state.profile.fundo.url,writes:window.saved.filter(x=>x.c==='update_profile_background').length}));
 await page.evaluate(()=>window.failProfileUpload=true);
 await page.locator('#themeBackground').setInputFiles(fixture);
 await page.waitForFunction(()=>document.querySelector('#wallpaperStatus')?.textContent.includes('Falha simulada'));
 assert.equal(await page.evaluate(()=>state.profile.fundo.url),before.source);
 assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='update_profile_background').length),before.writes);
 await page.evaluate(()=>window.failProfileUpload=false);
 await page.locator('#themeBackground').setInputFiles(fixture);
 await page.waitForFunction(()=>window.saved.some(x=>x.c==='update_profile_background'&&x.p.input.url.includes('/background.webp')));
 await page.waitForFunction(()=>!document.querySelector('#chooseWallpaper')?.disabled);
 assert.equal(await page.evaluate(()=>state.profile.fundo.url),'https://example.invalid/avatars/demo/background.webp');
 // Failed saves/removals leave the selected image intact.
 await page.evaluate(()=>window.failWallpaperSave=true);await page.locator('#removeWallpaper').click();
 await page.waitForFunction(()=>document.querySelector('#wallpaperStatus')?.textContent.includes('Falha simulada'));
 assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('has-wallpaper')),true);
 await page.evaluate(()=>window.failWallpaperSave=false);await page.locator('#removeWallpaper').click();
 await page.waitForFunction(()=>!document.body.classList.contains('has-wallpaper'));
 await page.evaluate(async()=>await navigate('profile'));
 assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('has-wallpaper')),false,'profile reload cannot resurrect the removed wallpaper');
 for(const view of ['home','library']){await page.evaluate(async view=>await navigate(view),view);await page.screenshot({path:`preview/unified-light-plain-${view}.png`,animations:'disabled'});}
 await settings();await page.locator('#themeBackground').setInputFiles(fixture);await page.waitForFunction(()=>document.body.classList.contains('has-wallpaper'));
 await page.waitForFunction(()=>!document.querySelector('#chooseWallpaper')?.disabled);
 await page.locator('[data-theme-preset="Caverna"]').click();await paint();
 console.log('Appearance UI: all six palettes, light canvas, contrast, shared wallpaper, translucency, profile shortcut and upload/removal failures passed');
}
