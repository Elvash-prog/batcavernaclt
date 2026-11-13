import assert from 'node:assert/strict';
export async function testNavigationMotion(page){
 const settle=()=>page.locator('#content').evaluate(async root=>{await Promise.all(root.getAnimations().map(a=>a.finished.catch(()=>{})));});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>document.body.classList.remove('no-animations'));
 await page.evaluate(async()=>{state.libraryCategory='jogos';await navigate('library');const effect=document.querySelector('#content').getAnimations().find(a=>a.id==='navigation-reveal');window.testPaneEffect=effect;effect.pause();effect.currentTime=80;});
 const frame=await page.locator('#content').evaluate(root=>({effects:root.getAnimations().filter(a=>a.id==='navigation-reveal').length,opacity:Number(getComputedStyle(root).opacity),transform:getComputedStyle(root).transform,inert:root.inert,active:[...document.querySelectorAll('#mainNav button.active')].map(button=>button.dataset.view)}));
 assert.deepEqual(frame.active,['library'],'only the destination tab stays selected');
 assert.equal(frame.effects,1);assert.ok(frame.opacity>.4&&frame.opacity<1);assert.notEqual(frame.transform,'none');assert.equal(frame.inert,false,'the visual effect does not delay interaction');
 await page.screenshot({path:'preview/navigation-mid-transition.png'});
 await page.evaluate(()=>window.testPaneEffect.finish());await settle();
 assert.equal(await page.locator('#content').evaluate(root=>getComputedStyle(root).transform),'none');
 await page.evaluate(async()=>{await renderLibrary();});
 assert.equal(await page.locator('#content').evaluate(root=>root.getAnimations().filter(a=>a.id==='navigation-reveal').length),0,'refreshing the same screen does not replay its entrance');
 // Category changes count as navigation even though they use the same renderer.
 await page.evaluate(async()=>{state.libraryCategory='animes';await navigate('library');const effect=document.querySelector('#content').getAnimations().find(a=>a.id==='navigation-reveal');window.testOldPaneEffect=effect;effect.pause();effect.currentTime=60;window.holdLibraryPreparation=true;state.libraryCategory='jogos';window.testNextPane=navigate('library');});
 await page.waitForFunction(()=>window.pendingLibraryRequests?.length>0);
 assert.equal(await page.locator('#content').evaluate(root=>root.inert),true,'the next read starts while the previous animation is still running');
 await page.evaluate(async()=>{window.holdLibraryPreparation=false;window.releaseLibraryPreparation();await window.testNextPane;const effect=document.querySelector('#content').getAnimations().find(a=>a.id==='navigation-reveal');effect.pause();effect.currentTime=80;});
 assert.equal(await page.locator('#content').evaluate(root=>root.getAnimations().filter(a=>a.id==='navigation-reveal').length),1,'rapid switches leave only the newest effect');
 assert.equal(await page.evaluate(()=>window.testOldPaneEffect.playState),'idle');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('#content').getAnimations().every(a=>a.id!=='navigation-reveal'));
 await page.evaluate(async()=>await navigate('home'));
 assert.equal(await page.locator('#content').evaluate(root=>root.getAnimations().filter(a=>a.id==='navigation-reveal').length),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(async()=>{await navigate('library');const effect=document.querySelector('#content').getAnimations().find(a=>a.id==='navigation-reveal');effect.pause();document.body.classList.add('no-animations');});
 await page.waitForFunction(()=>document.querySelector('#content').getAnimations().every(a=>a.id!=='navigation-reveal'));
 await page.evaluate(async()=>await navigate('home'));
 assert.equal(await page.locator('#content').evaluate(root=>root.getAnimations().filter(a=>a.id==='navigation-reveal').length),0);
 await page.evaluate(()=>document.body.classList.remove('no-animations'));
 await settle();
 console.log('Navigation motion UI: whole-pane entrance, immediate reads, single latest effect, refresh stability and both reduced-motion preferences passed');
}
