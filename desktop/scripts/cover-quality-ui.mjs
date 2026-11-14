import assert from 'node:assert/strict';
export async function testCoverQuality(page){
 const selected='https://images.igdb.com/igdb/image/upload/t_cover_big/quality-selected.jpg';
 await page.evaluate(async source=>{window.savedCoverProbe=[];window.catalogLibraryRows=[{id:'quality-game',nome:'Arte escolhida',categoria:'jogos',capa:source,status:'🎮 Em Progresso',steam_appid:42}];await navigate('home');},selected);
 const hero=page.locator('.home-hero-art');await page.waitForFunction(()=>document.querySelector('.home-hero-art')?.dataset.artLayout==='portrait');
 assert.equal(await hero.getAttribute('data-cover-source'),selected);
 const requests=await page.evaluate(()=>window.savedCoverProbe.filter(x=>x.c==='cover_image').map(x=>x.p.url));
 assert.ok(requests.includes(selected.replace('/t_cover_big/','/t_original/')));
 assert.ok(!requests.some(url=>url.includes('library_hero')),'a saved cover must not trigger a different Steam artwork');
 assert.equal(await hero.evaluate(n=>getComputedStyle(n).objectFit),'cover');
 for(const size of [{width:980,height:760},{width:1920,height:1080}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`preview/cover-quality-home-${size.width}.png`,animations:'disabled'});}
 await page.route('https://example.test/quality-custom.jpg',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#307b74"/></svg>'}));
 await page.evaluate(async()=>{window.savedCoverProbe=[];window.catalogLibraryRows[0].capa='https://example.test/quality-custom.jpg';await renderHome();});
 await page.waitForFunction(()=>document.querySelector('.home-hero-art')?.dataset.artLayout==='landscape');assert.equal(await hero.getAttribute('src'),'https://example.test/quality-custom.jpg');
 assert.ok(!(await page.evaluate(()=>window.savedCoverProbe)).some(x=>x.c==='cover_image'&&x.p.url.includes('quality-selected')),'changing to a custom cover must discard the previous selection');
 for(const host of ['shared.akamai.steamstatic.com','shared.fastly.steamstatic.com']){
  await page.evaluate(async host=>{window.savedCoverProbe=[];window.catalogLibraryRows[0].capa='https://'+host+'/store_item_assets/steam/apps/42/header.jpg';await renderHome();},host);
  await page.waitForFunction(()=>document.querySelector('.home-hero-art')?.dataset.artLayout);
  assert.ok((await page.evaluate(()=>window.savedCoverProbe)).some(x=>x.c==='cover_image'&&x.p.url.endsWith('/42/header_2x.jpg')),'alternate Steam hosts must use the same high-resolution header');
 }
 await page.evaluate(async()=>{window.catalogLibraryRows=null;window.savedCoverProbe=null;state.libraryCategory='animes';await navigate('library');openItemEditor(null);});
 await page.locator('#animeProvider').selectOption('anilist');await page.locator('#catalogQuery').fill('Anime de teste');await page.locator('#catalogSearch').click();await page.locator('#catalogResults .catalog-result').first().click();
 await page.waitForFunction(()=>document.querySelector('form.editor [name=capa]')?.value.includes('/cover/large/'));
 await page.locator('form.editor header [data-close]').click();await page.evaluate(async()=>{state.libraryCategory='jogos';await navigate('home');});
 console.log('Cover quality UI: selected hero, high-resolution requests, portrait layout, custom replacement and AniList extraLarge selection passed');
}
