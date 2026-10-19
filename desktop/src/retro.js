'use strict';
(()=>{
 const nav=$('#mainNav');
 const trophy='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z M8 6H4v2a4 4 0 0 0 4 4 M16 6h4v2a4 4 0 0 1-4 4 M12 13v4 M8 21h8 M9 17h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const discoverButton=nav?.querySelector('[data-view="discover"]');
 if(discoverButton){
  discoverButton.dataset.discoverKind='free';
  discoverButton.querySelector('span').textContent='Jogos grátis';
  let steamButton=nav.querySelector('[data-discover-kind="steam"]');
  if(!steamButton){
   steamButton=discoverButton.cloneNode(true);
   steamButton.dataset.discoverKind='steam';
   steamButton.querySelector('span').textContent='Minha Steam';
   discoverButton.after(steamButton);
  }
  let retroButton=nav.querySelector('[data-discover-kind="retro"]');
  if(!retroButton){
   retroButton=discoverButton.cloneNode(true);
   retroButton.dataset.discoverKind='retro';
   retroButton.innerHTML='♛<span>Meu Retrô</span>';
   steamButton.after(retroButton);
  }
 }
 const retroCoverCache=new Map();
 const retroStatuses=[['backlog','📌 Backlog'],['progress','🎮 Em progresso'],['finished','✅ Zerado'],['platinum','🏆 Platinado'],['paused','⏸️ Pausado'],['abandoned','❌ Abandonado']];
 const retroStatusLabel=key=>retroStatuses.find(([value])=>value===key)?.[1]||'📌 Backlog';
 const automaticRetroStatus=game=>game.premio||Number(game.total)>0&&Number(game.desbloqueadas)>=Number(game.total)?'platinum':Number(game.desbloqueadas)>0?'progress':'backlog';
 const titleTokens=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[™®©]/g,'').replace(/\b(?:the|game|edition|deluxe|ultimate|remake)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
 const titleScore=(query,candidate)=>{const q=titleTokens(query),c=titleTokens(candidate);if(!q.length||!c.length)return 0;const a=q.join(' '),b=c.join(' ');if(a===b)return 1;const cs=new Set(c),common=q.filter(x=>cs.has(x)).length;return common/q.length*.7+common/c.length*.3};
 async function igdbCover(name,fallback){
  const format=document.body.dataset.cardFormat||'poster';const key=format+':'+titleTokens(name).join(' ');if(!key)return fallback;
  if(!retroCoverCache.has(key))retroCoverCache.set(key,(async()=>{try{const data=await api.catalog({provider:'igdb',query:name,page:1}),candidate=(data.results||[]).filter(g=>g?.background_image).map(g=>({...g,score:titleScore(name,g.name)})).sort((a,b)=>b.score-a.score)[0];if(candidate?.score>=.78)return format==='poster'?candidate.cover_image||candidate.background_image:candidate.background_image}catch{}return fallback})());
  return retroCoverCache.get(key);
 }
 window.batcavernaRetroCover=igdbCover;
 function hydrateRetroImages(root){
  root.querySelectorAll('[data-retro-image]').forEach(image=>{const url=image.dataset.retroImage;image.removeAttribute('data-retro-image');if(!url){image.src='brand.jpg';return}queueCover(()=>api.coverImage(url)).then(src=>{if(image.isConnected)image.src=src}).catch(()=>{if(image.isConnected)image.src='brand.jpg'})});
 }
 function hydrateRetroCovers(root,rows){
  const load=image=>{if(image.dataset.retroLoading)return;image.dataset.retroLoading='1';const matches=rows.filter(item=>String(item.gameId)===image.dataset.retroCoverId),fallback='';queueCover(()=>igdbCover(image.dataset.retroCoverName,fallback)).then(async url=>{if(!url)throw Error('Capa indisponível');matches.forEach(row=>row.capa=url);return api.coverImage(url)}).then(src=>{if(image.isConnected)image.src=src}).catch(()=>{if(image.isConnected)image.src='brand.jpg'})};
  const images=[...root.querySelectorAll('[data-retro-cover-name]')];
  if(!('IntersectionObserver' in window)){images.slice(0,24).forEach(load);return}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);load(entry.target)}}),{rootMargin:'280px'});
  images.forEach(image=>observer.observe(image));
 }
 function retroImage(item,compact=false){return `<img loading="lazy" ${compact?'':'class="retro-game-cover"'} src="brand.jpg" data-retro-cover-id="${Number(item.gameId)||0}" data-retro-cover-name="${esc(item.nome)}" data-retro-fallback="${esc(item.capa||'')}" alt="Capa de ${esc(item.nome)}"${compact?' width="46" height="46"':''}>`}
 async function openRetroAchievements(button,user){
  button.disabled=true;
  const modal=window.batcavernaPopup(`<header><div><span class="eyebrow">RETROACHIEVEMENTS</span><h2>Carregando conquistas…</h2></div><button class="icon-button" data-close aria-label="Fechar">×</button></header><div class="retro-achievements" aria-live="polite"><div class="loading"><span class="spinner"></span>Buscando conquistas…</div></div>`,'retro-achievements-modal');
  modal.classList.add('retro-achievements-overlay');
  modal.setAttribute('role','presentation');
  const dialog=modal.querySelector('.retro-achievements-modal'),body=modal.querySelector('.retro-achievements');
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','retroAchievementsTitle');
  dialog.querySelector('h2').id='retroAchievementsTitle';
  dialog.querySelector('[data-close]').onclick=()=>modal.remove();
  async function load(){
   body.innerHTML='<div class="loading"><span class="spinner"></span>Buscando conquistas…</div>';
   try{
    const game=await api.bright({op:'raConquistas',usuario:String(user),gameId:Number(button.dataset.retroAchievements)}),list=game.lista||[];
    if(!modal.isConnected)return;
    dialog.querySelector('.eyebrow').textContent=game.console||'RETROACHIEVEMENTS';
    dialog.querySelector('h2').textContent=game.nome||'Conquistas';
    const count=document.createElement('p');count.textContent=`${list.filter(a=>a.got).length} de ${list.length} desbloqueadas`;
    dialog.querySelector('header > div').append(count);
    body.innerHTML=list.map(a=>`<article class="${a.got?'earned':''} ${a.hardcore?'hardcore':''}"><img src="brand.jpg" data-retro-image="${esc(a.icon||'')}" alt=""><div><h3>${esc(a.nome)}</h3><p>${esc(a.desc)}</p><small>${a.pontos} pontos${a.hardcore?' · Hardcore':a.got?' · Desbloqueada':''}</small></div></article>`).join('')||'<p class="empty">Este jogo não retornou conquistas para essa conta.</p>';
    hydrateRetroImages(modal);
   }catch(error){
    if(!modal.isConnected)return;
    body.innerHTML=`<div class="error-card"><p>Não foi possível carregar as conquistas.</p><p>${esc(failure(error))}</p><button class="secondary" data-retry>↻ Tentar novamente</button></div>`;
    body.querySelector('[data-retry]').onclick=load;
   }finally{button.disabled=false}
  }
  await load();
 }
 async function openRetroSearch(user){
  const modal=window.batcavernaPopup(`<header><h2>Adicionar do RetroAchievements</h2><button class="icon-button" data-close>×</button></header><form class="retro-toolbar"><label>Plataforma<select name="console">${[[1,'Mega Drive'],[2,'Nintendo 64'],[3,'Super Nintendo'],[4,'Game Boy'],[5,'Game Boy Advance'],[6,'Game Boy Color'],[7,'NES'],[8,'PC Engine'],[10,'Master System'],[11,'PlayStation'],[12,'Atari Lynx'],[13,'Neo Geo Pocket'],[14,'Game Gear'],[17,'Atari Jaguar'],[18,'Nintendo DS'],[21,'PlayStation 2'],[23,'Magnavox Odyssey 2'],[25,'Atari 2600'],[27,'Arcade'],[28,'Virtual Boy'],[39,'Saturn'],[40,'Dreamcast'],[41,'PSP'],[57,'WonderSwan'],[78,'GameCube']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><input name="query" type="search" minlength="2" maxlength="160" required placeholder="Nome do jogo"><button class="primary">Buscar</button></form><p role="status"></p><div class="ra-search-results"></div>`,'retro-search-dialog');
  modal.querySelector('[data-close]').onclick=()=>modal.remove();
  modal.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button'),status=modal.querySelector('[role="status"]'),results=modal.querySelector('.ra-search-results');button.disabled=true;status.textContent='Buscando no RetroAchievements…';results.innerHTML='';try{const data=await api.bright({op:'raSearch',consoleId:Number(e.target.elements.console.value),query:e.target.elements.query.value.trim()});if(!modal.isConnected)return;status.textContent=data.jogos.length+' resultados';data.jogos.forEach(game=>{const add=document.createElement('button');add.className='secondary retro-search-result';add.innerHTML=retroImage(game)+`<span><strong>${esc(game.nome)}</strong><small>${esc(game.console)} · ${Number(game.total)||0} conquistas</small><b>＋ Adicionar</b></span>`;results.append(add);hydrateRetroCovers(add,[game]);add.onclick=async()=>{add.disabled=true;try{await api.bright({op:'raSaveCollection',gameId:game.gameId});add.textContent='✓ '+game.nome;toast('Adicionado ao Meu Retrô.');}catch(err){status.textContent=failure(err);add.disabled=false}}})}catch(err){status.textContent=failure(err)}finally{button.disabled=false}};
  modal.addEventListener('click',e=>{if(e.target===modal)renderDiscover()});
  modal.querySelector('[data-close]').onclick=()=>{modal.remove();renderDiscover()};
 }
 async function renderRetroContent(out,user,{readOnly=false}={}){
  const [account,data,collection]=await Promise.all([api.bright({op:'raPerfil',usuario:String(user)}),api.bright({op:'raJogos',usuario:String(user),offset:0}),readOnly?Promise.resolve({}):api.bright({op:'raCollection'})]);
  const hidden=new Set(collection.hidden_game_ids||[]);data.jogos=(data.jogos||[]).filter(g=>!hidden.has(Number(g.gameId)));data.recentes=(data.recentes||[]).filter(g=>!hidden.has(Number(g.gameId)));
  for(const id of collection.game_ids||[]){if((data.jogos||[]).some(g=>Number(g.gameId)===id))continue;try{const g=await api.bright({op:'raConquistas',usuario:String(user),gameId:id});(data.jogos||=[]).push({gameId:id,nome:g.nome,console:g.console,capa:g.capa,total:g.lista.length,desbloqueadas:g.lista.filter(a=>a.got).length,hardcore:g.lista.filter(a=>a.hardcore).length})}catch{}}
  const savedStatuses=collection.statuses&&typeof collection.statuses==='object'?collection.statuses:{};
  const rows=(data.jogos||[]).map(g=>{const retroStatus=savedStatuses[String(g.gameId)]||automaticRetroStatus(g);return {...g,id:'retro-'+g.gameId,categoria:'jogos',retroStatus,status:retroStatusLabel(retroStatus),plataforma:g.console||'Retro',loja:'RetroAchievements',conquistas:g.total?Math.round(g.desbloqueadas/g.total*100):0}});
  const recent=(data.recentes||[]).slice(0,8),allImages=[...recent,...rows.filter(row=>!recent.some(item=>item.gameId===row.gameId))];
  const card=r=>`<div class="retro-library-item" data-retro-title="${esc(r.nome.toLocaleLowerCase('pt-BR'))}"><article class="offer-card retro-game-card" role="button" tabindex="0" aria-label="Ver detalhes de ${esc(r.nome)}" data-retro-detail="${Number(r.gameId)}">${retroImage(r)}<div class="body"><h3>${esc(r.nome)}</h3><p>${esc(r.status)} · ${esc(r.console)}</p><p>${r.desbloqueadas}/${r.total} conquistas · ${r.hardcore} Hardcore</p><progress max="${r.total||1}" value="${r.desbloqueadas||0}"></progress></div></article><div class="retro-actions ${readOnly?'retro-actions-readonly':''}">${readOnly?'':`<button class="secondary" data-retro-add="${esc(r.id)}">＋ Adicionar à biblioteca</button>`}</div></div>`;
  const sections=retroStatuses.map(([key,label])=>{const games=rows.filter(row=>row.retroStatus===key);return games.length?`<section class="collection-section retro-status-section" data-retro-status="${key}"><div class="section-head"><div><h2>${label} <small>${games.length}</small></h2><p>${key==='platinum'?'Todas as conquistas concluídas.':key==='progress'?'Jogos com progresso registrado.':'Organizados na sua coleção retrô.'}</p></div></div><div class="steam-library-grid retro-library-grid">${games.map(card).join('')}</div></section>`:''}).join('');
  out.innerHTML=`<section class="retro-profile"><img src="brand.jpg" data-retro-image="${esc(account.avatar||'')}" alt="Foto de ${esc(account.usuario)}"><div><span class="eyebrow">RETROACHIEVEMENTS</span><h2>${esc(account.usuario)}</h2><p>${Number(account.pontos).toLocaleString('pt-BR')} pontos · ${Number(account.pontosHardcore).toLocaleString('pt-BR')} true points</p>${account.presenca?`<small>${esc(account.presenca)}</small>`:''}</div></section>${recent.length?`<div class="section-head"><div><h2>Jogados recentemente</h2><p>Atividade mais recente da conta.</p></div></div><div class="retro-recent">${recent.map(r=>`<button data-retro-achievements="${r.gameId}">${retroImage(r,true)}<span>${esc(r.nome)}<small>${esc(r.console)}</small></span></button>`).join('')}</div>`:''}<div class="section-head"><div><h2>Coleção retrô <small>${rows.length}</small></h2><p>Organizada por status, com conquistas normais e Hardcore sincronizadas.</p></div></div>${sections||'<div class="empty">Nenhum progresso encontrado.</div>'}`;
  const hero=out.querySelector('.retro-profile');
  if(collection.cover_url){try{const source=await api.coverImage(await signed(collection.cover_url));if(hero.isConnected){hero.style.setProperty('background-image',`linear-gradient(90deg,#070d18cc,#070d1833),url("${source}")`,'important');hero.style.backgroundSize='cover';hero.style.backgroundPosition='center'}}catch(error){toast('Não foi possível abrir a capa do Meu Retrô. '+failure(error))}}
  const toolbar=document.createElement('div');toolbar.className='retro-toolbar';toolbar.innerHTML='<input type="search" placeholder="Buscar no Meu Retrô" aria-label="Buscar no Meu Retrô">'+(readOnly?'':'<button class="secondary" data-cover-choice>Alterar capa</button><button class="primary" data-ra-search>＋ Adicionar jogo</button>');hero.after(toolbar);
  toolbar.querySelector('input').oninput=e=>{const q=e.target.value.trim().toLocaleLowerCase('pt-BR');out.querySelectorAll('.retro-library-item').forEach(card=>card.hidden=!card.dataset.retroTitle.includes(q));out.querySelectorAll('.retro-status-section').forEach(section=>section.hidden=![...section.querySelectorAll('.retro-library-item')].some(card=>!card.hidden))};
  toolbar.querySelector('[data-cover-choice]')?.addEventListener('click',()=>{const modal=window.batcavernaPopup('<header><h2>Capa do Meu Retrô</h2><button data-close class="icon-button">×</button></header><form><label>Imagem PNG, JPG ou WebP<input type="file" accept="image/png,image/jpeg,image/webp" required></label><button class="primary">Salvar capa</button><p role="status"></p></form>','retro-cover-dialog');modal.querySelector('[data-close]').onclick=()=>modal.remove();modal.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const file=e.target.querySelector('input').files[0];if(file.size>10*1024*1024)throw Error('Escolha uma imagem de até 10 MB.');const encoded=await fileData(file),uploaded=await api.uploadProfile({name:'banner',mime:file.type,base64:encoded.split(',')[1]});await api.bright({op:'raSaveCollection',cover_url:uploaded.url});modal.remove();renderDiscover()}catch(err){e.target.querySelector('p').textContent=failure(err)}finally{button.disabled=false}}});
  toolbar.querySelector('[data-ra-search]')?.addEventListener('click',()=>openRetroSearch(user));
  hydrateRetroImages(out);hydrateRetroCovers(out,allImages);
  out.querySelectorAll('[data-retro-achievements]').forEach(button=>button.onclick=async()=>{const id=Number(button.dataset.retroAchievements),row=rows.find(r=>Number(r.gameId)===id)||allImages.find(r=>Number(r.gameId)===id);row.capa=await igdbCover(row.nome,row.capa);await openRetroDetails({...row,categoria:'jogos',loja:'RetroAchievements',plataforma:row.console})});
  const openRetroDetails=async row=>{await window.batcavernaOpenDetails({...row,retroUser:user},true);const detail=document.querySelector('.reference-detail');if(!detail)return;const attribution=document.createElement('p');attribution.className='muted retro-provider-credit';attribution.innerHTML='Conquistas por <button class="link-button" data-retro-provider>RetroAchievements</button> · Dados e mídia do jogo por <button class="link-button" data-igdb-provider>IGDB.com</button>';detail.append(attribution);attribution.querySelector('[data-retro-provider]').onclick=()=>api.open('https://retroachievements.org');attribution.querySelector('[data-igdb-provider]').onclick=()=>api.open('https://www.igdb.com');if(readOnly)return;const controls=document.createElement('div');controls.className='retro-detail-controls';controls.innerHTML=`<label>Status no Meu Retrô<select data-retro-status-choice>${retroStatuses.map(([key,label])=>`<option value="${key}" ${key===row.retroStatus?'selected':''}>${label}</option>`).join('')}</select></label><button class="danger" data-retro-remove="${Number(row.gameId)}">Remover do Meu Retrô</button>`;detail.append(controls);const select=controls.querySelector('select');select.onchange=async()=>{select.disabled=true;try{await api.bright({op:'raSaveCollection',statusGameId:Number(row.gameId),status:select.value});detail.closest('.editor-overlay')?.remove();await renderRetroContent(out,user);toast('Status do Meu Retrô atualizado.')}catch(error){toast(failure(error));select.disabled=false}};const remove=controls.querySelector('[data-retro-remove]');remove.onclick=async()=>{if(!await window.batcavernaConfirm('Remover do Meu Retrô?',row.nome+' será removido da coleção do app. Suas conquistas no RetroAchievements serão preservadas.'))return;remove.disabled=true;try{await api.bright({op:'raSaveCollection',removeGameId:Number(row.gameId)});detail.closest('.editor-overlay')?.remove();await renderRetroContent(out,user)}catch(error){toast(failure(error));remove.disabled=false}};};
  out.querySelectorAll('[data-retro-detail]').forEach(card=>{
   const open=async()=>{const row=rows.find(row=>Number(row.gameId)===Number(card.dataset.retroDetail));row.capa=await igdbCover(row.nome,row.capa);await openRetroDetails(row)};
   card.onclick=open;card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}};
  });
  if(!readOnly)out.querySelectorAll('[data-retro-add]').forEach(button=>button.onclick=async()=>{button.disabled=true;const row=rows.find(r=>r.id===button.dataset.retroAdd);try{const library=await api.library('jogos');if(library.some(x=>String(x.nome).toLocaleLowerCase('pt-BR')===row.nome.toLocaleLowerCase('pt-BR')))throw Error('Este jogo já está na sua biblioteca.');await api.saveItem({nome:row.nome,categoria:'jogos',plataforma:row.plataforma,loja:'RetroAchievements',status:row.status,capa:row.capa,conquistas:row.conquistas});button.textContent='✓ Adicionado';toast('Jogo do RetroAchievements adicionado à biblioteca.')}catch(error){toast(failure(error));button.disabled=false}});
 }

 const baseDiscover=renderDiscover;
 renderDiscover=async function(){
  if(state.discoverTab!=='retro')return baseDiscover();
  setPage('Meu Retrô','RETROACHIEVEMENTS');const content=$('#content');content.innerHTML='<div id="discoverBody"><div class="loading"><span class="spinner"></span>Sincronizando RetroAchievements…</div></div>';const out=$('#discoverBody');
  try{
   const profile=await api.profile(null),user=profile?.retroachievements_user||profile?.retroachievements_ulid;
   if(!user){out.innerHTML='<div class="empty">Conecte sua conta RetroAchievements em Configurações → Integrações.</div>';return}
   await renderRetroContent(out,user);if(state.current!=='discover'||state.discoverTab!=='retro')return;
  }catch(error){if(out.isConnected)out.innerHTML=`<div class="empty"><strong>Não foi possível sincronizar o RetroAchievements.</strong><p>${esc(failure(error))}</p><button class="secondary" id="retryRetro">Tentar novamente</button></div>`;$('#retryRetro')?.addEventListener('click',renderDiscover)}
 };

 const baseProfile=renderProfile;
 renderProfile=async function(userId=null){
  await baseProfile(userId);if(state.current!=='profile')return;
  try{
   const profile=userId?await api.profile(userId):state.profile,user=profile?.retroachievements_user||profile?.retroachievements_ulid;
   if(!user)return;
   const tabs=$('.profile-tabs');if(!tabs||tabs.querySelector('[data-profile-section="retro"]'))return;
   const tab=document.createElement('button');tab.dataset.profileSection='retro';tab.innerHTML='🏆 Retro';tabs.append(tab);
   const panel=document.createElement('section');panel.dataset.profilePage='retro';panel.className='profile-retro-page';panel.hidden=true;panel.innerHTML='<div class="loading"><span class="spinner"></span>Sincronizando RetroAchievements…</div>';tabs.after(panel);
   let loaded=false;tab.onclick=async()=>{$$('[data-profile-page]').forEach(node=>node.hidden=node!==panel);$$('[data-profile-section]').forEach(node=>node.classList.toggle('active',node===tab));if(loaded)return;try{await renderRetroContent(panel,user,{readOnly:true});loaded=true}catch(error){panel.innerHTML=`<div class="empty"><strong>Não foi possível abrir o RetroAchievements deste amigo.</strong><p>${esc(failure(error))}</p></div>`}};
  }catch(error){if(state.current==='profile')toast(`Não foi possível carregar a integração RetroAchievements do perfil: ${failure(error)}`)}
 };

 const baseSettings=renderSettings;
 renderSettings=async function(){await baseSettings();if(state.current!=='settings')return;const panel=$('#settingsPanel'),settingsNav=$('.settings-nav');if(!panel||!settingsNav)return;let integrationsTab=settingsNav.querySelector('[data-settings-tab="integrations"]');if(!integrationsTab){integrationsTab=document.createElement('button');integrationsTab.dataset.settingsTab='integrations';integrationsTab.textContent='Integrações';const appTab=settingsNav.querySelector('[data-settings-tab="app"]');appTab?settingsNav.insertBefore(integrationsTab,appTab):settingsNav.append(integrationsTab);integrationsTab.onclick=()=>{if(typeof ui!=='undefined')ui.configSection='integrations';state.settingsTab='account';renderSettings()}}
  const steamForm=$('#steamConnection'),showingIntegrations=(typeof ui!=='undefined'&&ui.configSection==='integrations')||!!steamForm;if(!showingIntegrations||$('#retroConnection'))return;const markup=`<form id="retroConnection" class="integration-form"><h3>RetroAchievements</h3><label>Usuário da conta<input name="username" maxlength="64" pattern="[A-Za-z0-9_-]{1,64}" value="${esc(state.profile?.retroachievements_user||'')}" placeholder="Seu usuário"></label><p class="muted">Sincronize perfil, jogos recentes, progresso e conquistas Hardcore. Seus amigos também poderão ver essa aba no seu perfil. A chave da API permanece protegida no servidor.</p><button class="primary">Salvar conexão</button><p class="form-error" role="status"></p></form>`;steamForm?steamForm.insertAdjacentHTML('afterend',markup):panel.insertAdjacentHTML('beforeend',markup);const retroForm=$('#retroConnection');if(!retroForm)return;
  retroForm.onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;try{const rows=await call('link_retroachievements',{username:form.elements.username.value.trim()}),profile=Array.isArray(rows)?rows[0]:rows;state.profile.retroachievements_user=profile?.retroachievements_user||'';state.profile.retroachievements_ulid=profile?.retroachievements_ulid||'';form.querySelector('.form-error').textContent=form.elements.username.value?'RetroAchievements conectado.':'RetroAchievements desconectado.'}catch(error){form.querySelector('.form-error').textContent=failure(error)}finally{button.disabled=false}};
 };
})();
