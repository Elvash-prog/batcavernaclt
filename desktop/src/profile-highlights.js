// One scroll surface, bounded rendering and persistent draft selections.
(() => {
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fold=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${name==='check'?'<path d="m5 12 4 4L19 6"/>':name==='search'?'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>':name==='star'?'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>':'<path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v6m-4 3h8m-7-3h6"/>'}</svg>`;
 function mount(form,{games=[],achievements=[],profile={}}={}){
  const root=form.querySelector('[data-profile-panel="highlights"]');if(!root)return;
  const library=[...new Map(games.filter(g=>String(g.nome||'').trim()).map(g=>[g.nome,g])).values()].sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
  const available=achievements.map((a,id)=>({id,icon:a[0],name:a[1],description:a[2],unlocked:a[3]})).filter(a=>a.unlocked);
  const oldGames=Array.isArray(profile.jogos_destaque)?profile.jogos_destaque:[];
  const selectedGames=new Set(library.filter(g=>oldGames.includes(g.nome)||oldGames.map(String).includes(String(g.id))).slice(0,8).map(g=>g.nome));
  const selectedAchievements=new Set(available.filter(a=>(profile.conquistas_destaque||[]).map(Number).includes(a.id)).slice(0,4).map(a=>a.id));
  let active='games',selectedOnly=false,limit=24;
  const id='profile-picks-'+Math.random().toString(36).slice(2);
  root.classList.add('profile-highlights');
  root.innerHTML=`<div class="picks-heading"><div><span class="eyebrow">A SUA ASSINATURA</span><h3>Destaques</h3></div><span class="picks-heading-icon">${icon('star')}</span></div>
   <div class="picks-tabs" role="tablist" aria-label="Tipos de destaque"><button type="button" role="tab" id="${id}-games-tab" aria-controls="${id}-games" data-picks-tab="games">${icon('star')}<span>Jogos</span><b data-picks-game-count></b></button><button type="button" role="tab" id="${id}-achievements-tab" aria-controls="${id}-achievements" data-picks-tab="achievements">${icon('trophy')}<span>Conquistas</span><b data-picks-achievement-count></b></button></div>
   <p class="picks-notice" role="status" aria-live="polite"></p>
   <div data-picks-values hidden></div>
   <section id="${id}-games" role="tabpanel" aria-labelledby="${id}-games-tab" data-picks-page="games"><div class="picks-toolbar"><label class="picks-search">${icon('search')}<input type="search" placeholder="Buscar na sua biblioteca" aria-label="Buscar jogos para destacar"></label><button type="button" class="picks-filter" aria-pressed="false">Só selecionados</button></div><div class="picks-result-line"><span data-picks-results></span><span>Até 8 jogos</span></div><div class="picks-game-grid"></div><button type="button" class="picks-more">Mostrar mais jogos</button></section>
   <section id="${id}-achievements" role="tabpanel" aria-labelledby="${id}-achievements-tab" data-picks-page="achievements" hidden><div class="picks-result-line"><span>Suas conquistas desbloqueadas</span><span>Até 4 conquistas</span></div><div class="picks-achievement-grid"></div></section>`;
  const notice=root.querySelector('.picks-notice'),grid=root.querySelector('.picks-game-grid'),badges=root.querySelector('.picks-achievement-grid');
  function sync(){
   root.querySelector('[data-picks-game-count]').textContent=selectedGames.size+'/8';
   root.querySelector('[data-picks-achievement-count]').textContent=selectedAchievements.size+'/4';
   root.querySelector('[data-picks-values]').innerHTML='<input type="checkbox" name="achievements" value="" hidden>'+[...selectedGames].map(name=>`<input type="checkbox" name="games" value="${escape(name)}" checked hidden>`).join('')+[...selectedAchievements].map(id=>`<input type="checkbox" name="achievements" value="${id}" checked hidden>`).join('');
   root.querySelectorAll('[data-pick-game]').forEach(input=>{const on=selectedGames.has(library[Number(input.dataset.pickGame)].nome);input.checked=on;input.closest('label').classList.toggle('is-selected',on);});
   root.querySelectorAll('[data-pick-achievement]').forEach(input=>{const on=selectedAchievements.has(Number(input.dataset.pickAchievement));input.checked=on;input.closest('label').classList.toggle('is-selected',on);});
  }
  function renderGames(){
   const query=fold(root.querySelector('input[type=search]').value.trim());
   const matches=library.map((game,index)=>({game,index})).filter(({game})=>fold(game.nome).includes(query)&&(!selectedOnly||selectedGames.has(game.nome)));
   root.querySelector('[data-picks-results]').textContent=matches.length+' '+(matches.length===1?'jogo':'jogos')+(selectedOnly?' selecionados':' na biblioteca');
   grid.innerHTML=matches.slice(0,limit).map(({game,index})=>`<label class="picks-game ${selectedGames.has(game.nome)?'is-selected':''}"><input type="checkbox" data-pick-game="${index}" aria-label="Destacar ${escape(game.nome)}" ${selectedGames.has(game.nome)?'checked':''}><span class="picks-check">${icon('check')}</span><span class="picks-art"><img src="icon.png" data-private-src="${escape(game.capa||'')}" alt="" loading="lazy" decoding="async"></span><span class="picks-game-copy"><strong title="${escape(game.nome)}">${escape(game.nome)}</strong><small>${escape(game.plataforma||'Na sua biblioteca')}</small></span></label>`).join('')||`<div class="picks-empty">${icon('search')}<h4>${selectedOnly?'Sua vitrine começa aqui':'Nenhum jogo encontrado'}</h4><p>${selectedOnly?'Nenhum destaque selecionado.':'Nenhum jogo encontrado.'}</p></div>`;
   root.querySelector('.picks-more').hidden=matches.length<=limit;
   if(typeof hydrateMedia==='function')void hydrateMedia(grid).catch(()=>{});
  }
  badges.innerHTML=available.map(a=>`<label class="picks-achievement ${selectedAchievements.has(a.id)?'is-selected':''}"><input type="checkbox" data-pick-achievement="${a.id}" aria-label="Destacar ${escape(a.name)}" ${selectedAchievements.has(a.id)?'checked':''}><span class="picks-badge" aria-hidden="true">${escape(a.icon)}</span><span><strong>${escape(a.name)}</strong><small>${escape(a.description||'Conquista desbloqueada')}</small></span><span class="picks-check">${icon('check')}</span></label>`).join('')||'<div class="picks-empty"><h4>Sua jornada está começando</h4><p>As conquistas desbloqueadas aparecerão aqui.</p></div>';
  function changeTab(tab){active=tab;root.querySelectorAll('[data-picks-page]').forEach(n=>n.hidden=n.dataset.picksPage!==active);root.querySelectorAll('[data-picks-tab]').forEach(b=>{const on=b.dataset.picksTab===active;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});}
  root.querySelectorAll('[data-picks-tab]').forEach(button=>{button.onclick=()=>changeTab(button.dataset.picksTab);button.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'games':e.key==='End'?'achievements':active==='games'?'achievements':'games';changeTab(next);root.querySelector(`[data-picks-tab="${next}"]`).focus();}};});
  root.addEventListener('change',e=>{
   if(form.getAttribute('aria-busy')==='true')return;
   const input=e.target;if(!input.matches('[data-pick-game],[data-pick-achievement]'))return;
   const isGame=input.hasAttribute('data-pick-game'),choices=isGame?selectedGames:selectedAchievements,value=isGame?library[Number(input.dataset.pickGame)].nome:Number(input.dataset.pickAchievement),max=isGame?8:4;
   if(input.checked&&choices.size>=max){input.checked=false;notice.textContent=`Você já escolheu ${max} ${isGame?'jogos':'conquistas'}. Remova um para escolher outro.`;return;}
   if(input.checked)choices.add(value);else choices.delete(value);notice.textContent='';sync();if(isGame&&selectedOnly)renderGames();
  });
  root.querySelector('input[type=search]').addEventListener('input',()=>{limit=24;renderGames();});
  root.querySelector('.picks-filter').onclick=e=>{selectedOnly=!selectedOnly;e.currentTarget.setAttribute('aria-pressed',String(selectedOnly));limit=24;renderGames();};
  root.querySelector('.picks-more').onclick=()=>{limit+=24;renderGames();};
  changeTab('games');sync();renderGames();
 }
 window.BatProfileHighlights={mount};
})();
