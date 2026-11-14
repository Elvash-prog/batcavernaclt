import assert from 'node:assert/strict';
export async function testCardLayout(page){
 const settings=()=>page.evaluate(async()=>{state.settingsTab='appearance';await navigate('settings');});
 const values=()=>page.evaluate(()=>({theme:window.batcavernaLayoutSync.get(),card:getComputedStyle(document.documentElement).getPropertyValue('--reference-card-width').trim(),scale:getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim()}));
 await settings();assert.equal(await page.locator('#settingsPanel [data-theme-range]').count(),0);const original=await values();
 await page.locator('#editCardLayout').click();const dialog=page.getByRole('dialog',{name:'Cards e layout'});await dialog.waitFor();
 const size=dialog.locator('[data-layout-value=cardWidth]'),canvas=dialog.locator('.card-layout-canvas');
 const before=await canvas.evaluate(n=>({width:n.style.width,scale:n.style.transform,columns:n.querySelector('.card-layout-grid').style.gridTemplateColumns}));
 await size.fill('420');assert.match(await dialog.locator('.card-layout-summary').innerText(),/420 px/);assert.notEqual(await dialog.locator('.card-layout-grid').evaluate(n=>n.style.gridTemplateColumns),before.columns);assert.deepEqual(await values(),original,'preview must not change or persist the actual app layout');
 await dialog.locator('[data-layout-value=scale]').fill('120');assert.notEqual(await canvas.evaluate(n=>n.style.width),before.width);assert.deepEqual(await values(),original);
 await dialog.locator('[data-layout-value=width]').fill('1050');assert.equal(await dialog.locator('.card-layout-collection').evaluate(n=>n.style.width),'1050px');
 await page.screenshot({path:'preview/card-layout-draft-dark.png',animations:'disabled',style:'#updateToast{visibility:hidden}'});
 await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();assert.deepEqual(await values(),original);assert.equal(await page.locator('#editCardLayout').evaluate(n=>n===document.activeElement),true);
 await page.locator('#editCardLayout').click();await dialog.locator('[data-layout-preset="200"]').click();assert.equal(await dialog.locator('[data-layout-value=cardWidth]').inputValue(),'200');await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.deepEqual(await values(),original);
 await page.locator('#editCardLayout').click();await page.locator('.card-layout-overlay').click({position:{x:2,y:2}});assert.equal(await dialog.count(),0);assert.deepEqual(await values(),original);
 await page.locator('#editCardLayout').click();await dialog.locator('[data-layout-preset="420"]').click();await dialog.getByRole('button',{name:'Salvar layout',exact:true}).click();await page.waitForFunction(()=>window.batcavernaLayoutSync.get().cardWidth===420);assert.equal((await values()).card,'420px');
 await page.locator('#editCardLayout').waitFor();assert.match(await page.locator('.layout-launcher small').innerText(),/420 px/);
 await page.evaluate(async()=>{state.libraryCategory='jogos';await navigate('library');});assert.equal(await page.locator('.card-layout-library-button,#editCardLayout').count(),0,'the editor stays in settings');assert.equal((await values()).card,'420px');
 await settings();await page.locator('[data-theme-preset="Claro"]').click();await page.locator('#editCardLayout').click();
 await dialog.locator('[data-layout-reset]').click();assert.equal(await size.inputValue(),'300');assert.equal(await dialog.locator('[data-layout-value=scale]').inputValue(),'100');assert.equal(await dialog.locator('[data-layout-value=width]').inputValue(),'1480');
 // Keyboard focus stays inside the modal, including Shift+Tab from its first control.
 await dialog.getByRole('button',{name:'Fechar ajustes'}).focus();await page.keyboard.press('Shift+Tab');assert.equal(await dialog.getByRole('button',{name:'Salvar layout'}).evaluate(n=>n===document.activeElement),true);
 await page.screenshot({path:'preview/card-layout-draft-light.png',animations:'disabled',style:'#updateToast{visibility:hidden}'});
 for(const width of [980,720,390]){await page.setViewportSize({width,height:850});await page.waitForTimeout(80);const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1,JSON.stringify({width,bounds,overlay:await page.locator('.card-layout-overlay').boundingBox()}));assert.equal(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'modal cannot overflow horizontally');await page.screenshot({path:`preview/card-layout-${width}.png`,animations:'disabled',style:'#updateToast{visibility:hidden}'});}
 await page.setViewportSize({width:1920,height:1080});await dialog.getByRole('button',{name:'Salvar layout'}).click();await page.waitForFunction(()=>window.batcavernaLayoutSync.get().cardWidth===300);
 await page.locator('[data-theme-preset="Caverna"]').click();
 console.log('Card layout: live draft, cancel/Escape/outside, focus, saved preferences, light/dark and narrow windows passed');
}
