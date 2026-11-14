import assert from 'node:assert/strict';
export async function testLibraryProfilePolish(page){
 for(const category of ['jogos','animes','filmes','series']){
  await page.evaluate(async category=>{state.libraryCategory=category;await navigate('library');},category);
  const horizontal=page.locator('[data-lib-format=landscape]'),vertical=page.locator('[data-lib-format=poster]');await horizontal.click();assert.equal(await horizontal.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('body').getAttribute('data-card-format'),'landscape');
  await page.locator('[data-lib-view=list]').click();assert.equal(await page.locator('#libraryGroups').evaluate(n=>n.classList.contains('cavern-list')),true);
  await vertical.click();assert.equal(await page.locator('body').getAttribute('data-card-format'),'poster');await page.locator('[data-lib-view=grid]').click();
 }
 await page.evaluate(async()=>{state.settingsTab='appearance';await navigate('settings');});assert.equal(await page.locator('#referenceCardFormat').count(),0);assert.equal(await page.locator('#friendsDock').count(),0);
 await page.locator('#accountStatusToggle').click();await page.getByRole('menuitemradio',{name:'Ausente',exact:true}).click();await page.waitForFunction(()=>state.profile.status_personalizado==='ausente');assert.equal(await page.locator('#accountStatusMenu').count(),0);
 await page.locator('#accountStatusToggle').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#accountStatusMenu').count(),0);assert.equal(await page.locator('#accountStatusToggle').evaluate(n=>n===document.activeElement),true);
 await page.locator('#accountStatusToggle').click();await page.getByRole('menuitem',{name:'Ver perfil',exact:true}).click();await page.locator('.complete-profile').waitFor();
 // The original account button still opens the profile independently of the status menu.
 await page.evaluate(async()=>await navigate('home'));await page.locator('#sidebarAccount').focus();await page.keyboard.press('Enter');await page.locator('.complete-profile').waitFor();
 await page.evaluate(async()=>{state.libraryCategory='animes';await navigate('library');openItemEditor({id:'adult-editor-fixture',nome:'Capa marcada',categoria:'filmes',tipo:'anime',capa:'https://example.test/marked.jpg',capa_adulta:true});});
 const editor=page.locator('form.editor');assert.equal(await editor.locator('[name=capa_adulta]').isChecked(),true);assert.equal(await editor.locator('[name=capa_adulta]').isVisible(),false);assert.doesNotMatch(await editor.innerText(),/pornografia|hentai|Capa com conteúdo sexual/i);
 const filter=editor.locator('[data-explicit-filter]');await filter.check();assert.equal(await page.locator('html').getAttribute('data-explicit-content'),'show');assert.equal(await editor.locator('[name=capa_adulta]').isChecked(),true);await filter.uncheck();await editor.locator('header [data-close]').click();
 await page.route('https://example.com/cover.jpg',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#263e58"/><rect x="18" y="18" width="564" height="864" rx="22" fill="none" stroke="#c6a561" stroke-width="12"/><text x="300" y="430" text-anchor="middle" fill="#fff" font-size="48">CAPA INTEIRA</text></svg>'}));
 await page.evaluate(async()=>await navigate('game-feed'));await page.locator('.game-feed-art img').first().waitFor();assert.equal(await page.locator('.game-feed-art img').first().evaluate(n=>getComputedStyle(n).objectFit),'fill');
 await page.screenshot({path:'preview/feed-complete-covers.png',animations:'disabled'});
 await page.evaluate(async()=>{state.libraryCategory='jogos';await navigate('home');});assert.match(await page.locator('.sidebar .logo img').getAttribute('src'),/icon\.png$/);
 console.log('Library/profile UI: inline orientation in four collections, grid/list, avatar status/profile, editor display filter, complete feed art and canonical icon passed');
}
