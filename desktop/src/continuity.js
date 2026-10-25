'use strict';
(()=>{
 const latest=rows=>rows.filter(x=>normalizedStatus(x.status)==='progress').sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))).slice(0,4);
 const journey=(action,data)=>call('community',{input:{op:'journey',action,data}});
 let homeGeneration=0;
 const home=renderHome;
 renderHome=async function(){
  const generation=++homeGeneration;await home();if(state.current!=='home'||generation!==homeGeneration)return;
  const owner=state.userId,host=document.createElement('section');host.className='continuity';host.setAttribute('aria-label','Continuar de onde parei');
  host.innerHTML='<header class="section-head"><div><span class="eyebrow">SEU PRÓXIMO PASSO</span><h2>Continuar de onde parei</h2><p>Títulos em andamento, pelas últimas atualizações.</p></div></header><div class="continuity-groups"></div>';
  const anchor=$('.dashboard-columns');if(anchor)anchor.after(host);else $('#content').prepend(host);
  $('#recent-shelf')?.closest('.shelf-section')?.remove();
  const current=()=>host.isConnected&&state.current==='home'&&owner===state.userId&&generation===homeGeneration;
  function group(label,rows,kind){
   if(!current())return;const section=document.createElement('section');section.className='continuity-group';section.innerHTML=`<h3>${esc(label)}</h3><div class="continuity-grid"></div>`;host.querySelector('.continuity-groups').append(section);
   const grid=section.querySelector('.continuity-grid');if(!rows.length){grid.innerHTML='<p class="muted">Nenhum título em andamento.</p>';return;}
   for(const row of rows){const card=document.createElement('article');card.className='continuity-card';const game=kind==='games',retro=kind==='retro',episodes=!game&&!retro&&/anime|serie|série/i.test(row.tipo||'');
    card.innerHTML=`<img loading="lazy" src="brand.jpg" data-cover="${esc(coverUrl(row.capa))}" data-cover-name="${esc(row.nome)}" data-cover-game="${game?'1':'0'}" data-steam-appid="${esc(row.steam_appid||'')}" alt=""><div><small>${retro?'RETROACHIEVEMENTS':game?'JOGANDO':'ASSISTINDO'}</small><h4>${esc(row.nome)}</h4><p class="continuity-meta">${retro?`${Number(row.desbloqueadas)||0}/${Number(row.total)||0} conquistas`:game?`${formatPlaytime(row.horas)} h jogadas`:esc(row.status)}</p><div class="continuity-actions"><button class="secondary" data-resume-details>${retro?'Ver conquistas':'Ver detalhes'}</button>${episodes?'<button class="primary" data-resume-episodes>Atualizar episódios</button>':''}${game&&/^\d+$/.test(String(row.steam_appid||''))?'<button class="primary" data-resume-play>Jogar</button>':''}</div></div>`;
    grid.append(card);card.querySelector('[data-resume-details]').onclick=()=>window.batcavernaOpenDetails(row,retro);card.querySelector('[data-resume-play]')?.addEventListener('click',()=>call('launch_game',{appid:Number(row.steam_appid)}).catch(e=>toast(failure(e))));
    if(episodes){card.querySelector('[data-resume-episodes]').onclick=()=>window.batcavernaOpenProgress(row);void journey('progress',{item_id:String(row.id)}).then(rows=>{if(!current())return;const p=rows?.[0];if(p)card.querySelector('.continuity-meta').textContent=`Temporada ${Number(p.temporada)||1} · Episódio ${Number(p.episodio)||0}`}).catch(()=>{if(current())card.querySelector('.continuity-meta').textContent='Consulte seu progresso em Atualizar episódios'})}
   }hydrateCovers(grid);
  }
  group('Seus jogos',latest(state.resumeGames||[]),'games');
  const mediaSlot=document.createElement('p');mediaSlot.className='muted';mediaSlot.textContent='Carregando títulos para assistir…';host.append(mediaSlot);
  void Promise.all(['filmes','series','animes'].map(category=>api.library(category))).then(sets=>{if(!current())return;mediaSlot.remove();const unique=[...new Map(sets.flat().map(row=>[String(row.id),row])).values()];group('Suas histórias',latest(unique),'media')}).catch(()=>{if(current())mediaSlot.textContent='Não foi possível consultar filmes e séries. Tente atualizar o início.'});
  const retroUser=state.profile?.retroachievements_user;if(retroUser){
   const retroSlot=document.createElement('p');retroSlot.className='muted';retroSlot.textContent='Consultando Meu Retrô…';host.append(retroSlot);
   void Promise.all([api.bright({op:'raJogos',usuario:String(retroUser),offset:0}),api.bright({op:'raCollection'})]).then(([data,collection])=>{if(!current())return;retroSlot.remove();const hidden=new Set((collection.hidden_game_ids||[]).map(Number));const rows=(data.jogos||[]).filter(g=>!hidden.has(Number(g.gameId))).filter(g=>{const status=collection.statuses?.[String(g.gameId)]||((g.premio||Number(g.total)>0&&Number(g.desbloqueadas)>=Number(g.total))?'platinum':Number(g.desbloqueadas)>0?'progress':'backlog');return status==='progress'}).slice(0,4).map(g=>({...g,id:'retro-'+g.gameId,categoria:'jogos',status:'🎮 Em Progresso',retroUser,plataforma:g.console,loja:'RetroAchievements',conquistas:g.total?Math.round(g.desbloqueadas/g.total*100):null}));group('Seus clássicos',rows,'retro')}).catch(()=>{if(current())retroSlot.textContent='Não foi possível consultar o progresso retrô. Sua coleção continua disponível em Meu Retrô.'});
  }
 };
 document.addEventListener('batcaverna:item-details',event=>{
  const {item}=event.detail||{};const overlay=document.querySelector('.editor-overlay:last-of-type'),summary=overlay?.querySelector('.reference-detail-summary');if(!summary||!item)return;
  overlay.querySelector('.reference-detail').classList.add('detail-focused');
  const progress=summary.querySelector('.detail-progress');if(progress)summary.querySelector('.detail-title-row').after(progress);
  const rating=document.createElement('p');rating.className='detail-own-rating';rating.textContent=`Sua avaliação · ${item.nota||'Ainda não avaliado'}`;progress?.after(rating);
  const actions=summary.querySelector('.detail-primary-actions');if(actions)overlay.querySelector('.detail-poster').append(actions);
  const description=summary.querySelector('#detailDescription');if(description){
   const wrap=document.createElement('details');wrap.className='detail-synopsis';wrap.open=true;const heading=document.createElement('summary');heading.textContent='Sobre o título';wrap.append(heading);description.before(wrap);wrap.append(description);
   const button=document.createElement('button');button.type='button';button.className='link-button description-toggle';button.textContent='Ler descrição completa';button.hidden=true;button.setAttribute('aria-expanded','false');description.after(button);const measure=()=>requestAnimationFrame(()=>{if(description.isConnected)button.hidden=!description.classList.contains('description-expanded')&&description.scrollHeight<=description.clientHeight+2});new MutationObserver(measure).observe(description,{childList:true,subtree:true,characterData:true});measure();button.onclick=()=>{const expanded=description.classList.toggle('description-expanded');button.textContent=expanded?'Recolher descrição':'Ler descrição completa';button.setAttribute('aria-expanded',String(expanded))};
  }
 });
})();
