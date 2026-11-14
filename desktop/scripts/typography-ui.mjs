import assert from 'node:assert/strict';
export async function testTypography(page){
 await page.evaluate(async()=>{state.settingsTab='appearance';await navigate('settings');});
 const select=page.locator('select[data-interface-font]');await select.waitFor();assert.equal(await select.locator('option').count(),5);
 await select.selectOption('classic');assert.match(await page.locator('.font-preview').evaluate(n=>getComputedStyle(n).fontFamily),/Georgia/);
 await page.evaluate(async()=>{await window.batcavernaChooseChat({id:'friend',nome:'Amigo'});});
 await page.locator('#liveChatText').waitFor();assert.match(await page.locator('#liveChatText').evaluate(n=>getComputedStyle(n).fontFamily),/Georgia/);
 await page.reload();await page.locator('.home-hero-content h2').waitFor();assert.equal(await page.locator('html').getAttribute('data-interface-font'),'classic');
 await page.evaluate(()=>{showLogin();});assert.equal(await page.locator('html').getAttribute('data-interface-font'),'system');
 await page.evaluate(async()=>await showApp());assert.equal(await page.locator('html').getAttribute('data-interface-font'),'classic');
 const isolation=await page.evaluate(()=>{const original=state.userId;state.userId='font-other';window.BatTypography.apply();const other=document.documentElement.dataset.interfaceFont;state.userId=original;window.BatTypography.apply();return {other,restored:document.documentElement.dataset.interfaceFont};});assert.deepEqual(isolation,{other:'system',restored:'classic'});
 await page.evaluate(async()=>{state.settingsTab='appearance';await navigate('settings');});await page.locator('select[data-interface-font]').selectOption('mono');assert.match(await page.locator('.font-preview').evaluate(n=>getComputedStyle(n).fontFamily),/Consolas/);
 await page.locator('select[data-interface-font]').selectOption('system');assert.equal(await page.locator('html').evaluate(n=>n.style.getPropertyValue('--interface-font')),'');
 await page.evaluate(async()=>await navigate('home'));
 console.log('Typography UI: local fonts, preview, chat, reload, account isolation and system reset passed');
}
