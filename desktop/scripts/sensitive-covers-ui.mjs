import assert from 'node:assert/strict';
import fs from 'node:fs';
export async function testSensitiveCovers(browser){
 const page=await browser.newPage({viewport:{width:1000,height:800}});
 try{
  await page.route('https://explicit-filter.test/**',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('https://explicit-filter.test/');
  const source='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>').toString('base64');
  await page.setContent(`<section id="filter"></section><div id="results"></div><button id="game" style="position:relative;width:68px;height:90px"><img id="explicit" data-sensitive="1" style="width:100%;height:100%" src="${source}"></button><img id="ordinary" data-sensitive="0" style="width:68px;height:90px" src="${source}">`);
  await page.locator('#explicit').evaluate(image=>image.decode());await page.addStyleTag({content:fs.readFileSync('src/sensitive-covers.css','utf8')});
  assert.equal(await page.locator('#ordinary').evaluate(el=>getComputedStyle(el).opacity),'1','age-18 ordinary cover is visible from the first frame');
  assert.equal(await page.locator('#explicit').evaluate(el=>getComputedStyle(el).opacity),'0','only flagged explicit cover is hidden by default');
  await page.evaluate(()=>{window.state={userId:'fixture-one'};});await page.addScriptTag({content:fs.readFileSync('src/sensitive-covers.js','utf8')});
  await page.evaluate(()=>{window.opens=0;document.querySelector('#game').onclick=()=>window.opens++;const host=document.querySelector('#filter');host.innerHTML=window.BatSensitive.controlHTML();const draw=()=>{document.querySelector('#results').textContent=[{name:'Lords of the Fallen',adult:false},{name:'Synthetic explicit',adult:true}].filter(x=>window.BatSensitive.visible(x)).map(x=>x.name).join(' | ');};window.BatSensitive.register(host,draw);window.BatSensitive.scan();draw();});
  assert.equal(await page.locator('#results').textContent(),'Lords of the Fallen');assert.equal(await page.locator('#game [role=button]').count(),0,'no per-cover click wall');
  const filter=page.locator('[data-explicit-filter]');await filter.check();assert.match(await page.locator('#results').textContent(),/Synthetic explicit/);assert.equal(await page.locator('#explicit').evaluate(el=>getComputedStyle(el).opacity),'1');
  await page.locator('#game').click();assert.equal(await page.evaluate(()=>window.opens),1,'normal cover navigation survives the filter');assert.equal(await page.locator('#explicit').getAttribute('src'),source);
  await filter.uncheck();assert.equal(await page.locator('#explicit').evaluate(el=>getComputedStyle(el).opacity),'0');assert.equal(await page.locator('#ordinary').evaluate(el=>getComputedStyle(el).opacity),'1');
  await filter.focus();await filter.press('Space');assert.equal(await page.locator('#explicit').evaluate(el=>getComputedStyle(el).opacity),'1');
  await page.evaluate(()=>{window.state.userId='fixture-two';document.body.append(document.createElement('hr'));});await page.waitForFunction(()=>document.documentElement.dataset.explicitContent==='hide');assert.equal(await filter.isChecked(),false,'account preference is isolated');
  await page.evaluate(()=>{window.state.userId='fixture-one';document.body.append(document.createElement('hr'));});await page.waitForFunction(()=>document.documentElement.dataset.explicitContent==='show');assert.equal(await filter.isChecked(),true,'original account preference is retained');
  await page.setViewportSize({width:420,height:800});await page.screenshot({path:'preview/explicit-content-filter.png'});
  console.log('Explicit filter UI: ordinary age-18 covers, optional explicit results, normal card clicks, keyboard, persistence and account isolation passed');
 }finally{await page.close();}
}
