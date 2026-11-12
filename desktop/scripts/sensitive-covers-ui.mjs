import assert from 'node:assert/strict';
import fs from 'node:fs';
export async function testSensitiveCovers(browser){
 const page=await browser.newPage({viewport:{width:1000,height:800}});
 try{
  const source='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>').toString('base64');
  await page.setContent(`<button id="game" style="position:relative;width:240px;height:300px"><img id="adult" data-sensitive="1" style="width:100%;height:100%" src="${source}"></button><div style="position:relative;width:100px;height:150px"><img id="other" data-sensitive="1" style="width:100%;height:100%" src="${source}"></div><img id="ordinary" data-sensitive="0">`);
  await page.locator('#adult').evaluate(image=>image.decode());
  await page.addStyleTag({content:fs.readFileSync('src/sensitive-covers.css','utf8')});
  assert.equal(await page.locator('#adult').evaluate(el=>getComputedStyle(el).opacity),'0','hidden before JS/hydration');
  await page.addScriptTag({content:fs.readFileSync('src/sensitive-covers.js','utf8')});
  await page.evaluate(()=>{window.opens=0;document.querySelector('#game').onclick=()=>window.opens++;window.BatSensitive.scan();});
  const warning=page.locator('#game [role=button]');await warning.click();
  assert.equal(await page.locator('#adult').evaluate(el=>getComputedStyle(el).opacity),'1');assert.equal(await page.evaluate(()=>window.opens),0);
  assert.equal(await page.locator('#other').evaluate(el=>getComputedStyle(el).opacity),'0','reveal is per-view');
  await warning.press('Enter');assert.equal(await page.locator('#adult').evaluate(el=>getComputedStyle(el).opacity),'0');
  await warning.press('Space');assert.equal(await page.locator('#adult').evaluate(el=>getComputedStyle(el).opacity),'1');
  await page.evaluate(()=>window.BatSensitive.mount(document.querySelector('#adult'),true));
  assert.equal(await page.locator('#adult').evaluate(el=>getComputedStyle(el).opacity),'0','new image/edit resets consent');
  await page.setViewportSize({width:420,height:800});await warning.waitFor({state:'visible'});
  const art=await page.locator('#adult').boundingBox(),cover=await warning.boundingBox();assert.ok(Math.abs(art.width-cover.width)<2);assert.ok(Math.abs(art.height-cover.height)<2);
  assert.equal(await page.locator('#ordinary').evaluate(el=>getComputedStyle(el).opacity),'1');
  await page.screenshot({path:'preview/sensitive-cover-warning.png'});
  console.log('Sensitive covers UI: first-frame concealment, click/keyboard consent, per-view reset, responsive overlay passed');
 }finally{await page.close();}
}
