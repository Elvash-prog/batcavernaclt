import assert from 'node:assert/strict';
import fs from 'node:fs';

// Uses the same mocked native bridge and built frontend as the full UI suite.
export async function benchmarkLibrary(page,destination,bootMs){
 const session=await page.context().newCDPSession(page);await session.send('Performance.enable');
 const report={environment:'Chromium headless; API and artwork responses mocked; synthetic library',bootMs,cases:[]};
 for(const size of [500,2000]){
  const rows=Array.from({length:size},(_,i)=>({id:'perf-'+i,nome:`Coleção Áurea ${String(size-i).padStart(4,'0')}`,categoria:'jogos',status:i%3===0?'🎮 Em Progresso':i%3===1?'📌 Backlog':'✅ Zerado',generos:i%2?'Ação • Aventura':'RPG • Estratégia',plataforma:i%3?'PC • Switch':'PlayStation 5',horas:i/10,nota:i%2?'⭐⭐⭐⭐ Muito bom':'⭐⭐⭐ Ok',updated_at:`2026-11-${String(i%28+1).padStart(2,'0')}T10:00:00.123Z`,capa:'https://images.igdb.com/igdb/image/upload/t_cover_big/perf-'+i+'.jpg'}));
  await session.send('HeapProfiler.collectGarbage');
  const before=await session.send('Performance.getMetrics');
  const result=await page.evaluate(async rows=>{
   window.libraryQueryRows=rows;state.libraryCategory='jogos';state.libraryStatus='all';state.libraryQuery='';state.cavernFilter='all';state.librarySort='recent';
   const start=performance.now();await navigate('library');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const openMs=performance.now()-start;
   const measured=async action=>{const values=[];for(let i=0;i<8;i++){const at=performance.now();await action();values.push(performance.now()-at);}return values.slice(2).sort((a,b)=>a-b)[3];};
   const filterSortMs=await measured(()=>{rows.filter(row=>window.BatLibraryQuery.matchesFilters(row,{query:'colecao aurea',genre:'acao',platform:'PC'})).sort(window.BatLibraryQuery.comparator?window.BatLibraryQuery.comparator('rating'):(a,b)=>window.BatLibraryQuery.compare(a,b,'rating'));});
   const searchMs=await measured(()=>{state.libraryQuery='colecao aurea 0001';drawLibrary();});
   const searchFound=document.querySelectorAll('#libraryGroups [data-detail]').length;
   state.libraryQuery='';state.librarySort='name';const sortMs=await measured(()=>drawLibrary());
   const cacheData={};for(let i=0;i<512;i++)cacheData['choice-'+i]='https://images.igdb.com/'+i+'.jpg';localStorage.setItem('bc-cover-choices-v2:'+state.userId,JSON.stringify(cacheData));
   const coverCacheMs=await measured(()=>{for(let i=0;i<500;i++)savedCoverChoice('choice-'+i);});
   return {size:rows.length,openMs,filterSortMs,searchMs,sortMs,coverCacheMs,searchFound,cards:document.querySelectorAll('#libraryGroups [data-detail]').length,coverCalls:window.coverCalls};
  },rows);
  assert.equal(result.searchFound,1,'Search must include titles beyond the mounted page');assert.ok(result.cards<=96,'The initial grid must stay bounded');
  const beforeCovers=await page.evaluate(()=>window.coverCalls);await page.evaluate(()=>{document.querySelector('#content').scrollTo(0,document.querySelector('#content').scrollHeight);});await page.waitForTimeout(250);
  result.scrollCoverCalls=await page.evaluate(at=>window.coverCalls-at,beforeCovers);
  await session.send('HeapProfiler.collectGarbage');const after=await session.send('Performance.getMetrics');const heap=m=>m.metrics.find(x=>x.name==='JSHeapUsedSize')?.value||0;result.heapMiB=(heap(after)-heap(before))/1048576;
  report.cases.push(result);
 }
 await page.evaluate(async()=>{window.libraryQueryRows=null;await navigate('home');});await session.send('HeapProfiler.collectGarbage');
 report.heapAfterLeavingMiB=(await session.send('Performance.getMetrics')).metrics.find(x=>x.name==='JSHeapUsedSize').value/1048576;
 fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
