'use strict';
(()=>{
 const baseSettings=renderSettings;
 renderSettings=async function(){
  await baseSettings();if(state.settingsTab!=='app')return;
  const panel=$('#settingsPanel');if(!panel)return;const reads=await Promise.allSettled([call('diagnostic_status'),call('desktop_preferences',{input:null})]);if(!panel.isConnected)return;
  if(state.settingsTab==='app'){
   try{
    if(reads[0].status==='rejected')throw reads[0].reason;const info=reads[0].value;if(!panel.isConnected)return;
    panel.insertAdjacentHTML('beforeend',`<section class="native-desktop-settings diagnostic-settings"><h3>Diagnóstico e estabilidade</h3><p class="muted">Relatório técnico sem senhas, tokens, conversas ou dados da biblioteca.</p><div class="diagnostic-summary"><span>Arquivo local</span><b>${Number(info.size||0).toLocaleString('pt-BR')} bytes</b></div><footer><button type="button" class="primary" id="exportDiagnostics">Exportar diagnóstico</button><button type="button" class="secondary" id="clearDiagnostics">Limpar histórico</button></footer><p role="status"></p></section>`);
    const section=panel.querySelector('.diagnostic-settings'),note=section.querySelector('[role=status]');
    section.querySelector('#exportDiagnostics').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{const result=await call('diagnostic_export');note.textContent=`Arquivo criado em ${result.path}`}catch(e){note.textContent=failure(e)}finally{button.disabled=false}};
    section.querySelector('#clearDiagnostics').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await call('diagnostic_clear');note.textContent='Histórico de diagnóstico limpo.';section.querySelector('.diagnostic-summary b').textContent='0 bytes'}catch(e){note.textContent=failure(e)}finally{button.disabled=false}};
   }catch(e){if(panel.isConnected)panel.insertAdjacentHTML('beforeend',`<p class="muted">Diagnóstico indisponível: ${esc(failure(e))}</p>`)}
  }
  try{
   if(reads[1].status==='rejected')throw reads[1].reason;const prefs=reads[1].value;if(!panel.isConnected)return;
   panel.insertAdjacentHTML('beforeend',`<section class="native-desktop-settings windows-preferences"><h3>Windows e segundo plano</h3><label><input id="desktopBackground" type="checkbox" ${prefs.background?'checked':''}>Continuar em segundo plano ao fechar</label><label><input id="desktopNotifications" type="checkbox" ${prefs.notifications?'checked':''}>Receber notificações do Windows</label><label><input id="desktopSound" type="checkbox" ${prefs.sound!==false?'checked':''}>Som de notificação</label><label><input id="desktopAutostart" type="checkbox" ${prefs.autostart?'checked':''}>Iniciar com o Windows</label><label><input id="desktopStartMinimized" type="checkbox" ${prefs.start_minimized?'checked':''}>Iniciar minimizado na bandeja</label><footer><button type="button" class="primary" id="saveDesktopPreferences">Salvar preferências do Windows</button><button type="button" class="secondary" id="testWindowsNotification">Testar notificação</button></footer><p role="status"></p></section>`);
   const section=panel.querySelector('.windows-preferences'),note=section.querySelector('[role=status]');
   section.querySelector('#saveDesktopPreferences').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await call('desktop_preferences',{input:{background:section.querySelector('#desktopBackground').checked,notifications:section.querySelector('#desktopNotifications').checked,sound:section.querySelector('#desktopSound').checked,autostart:section.querySelector('#desktopAutostart').checked,start_minimized:section.querySelector('#desktopStartMinimized').checked}});note.textContent='Preferências salvas neste computador.'}catch(e){note.textContent=failure(e)}finally{button.disabled=false}};
   section.querySelector('#testWindowsNotification').onclick=async()=>{try{await call('test_windows_notification');note.textContent='Notificação de teste enviada.'}catch(e){note.textContent=failure(e)}};
  }catch(e){if(panel.isConnected)panel.insertAdjacentHTML('beforeend',`<p class="muted">Preferências do Windows indisponíveis: ${esc(failure(e))}</p>`)}
 };

 const baseLibrary=renderLibrary;
 renderLibrary=async function(){
  await baseLibrary();if(state.current!=='library')return;
  $('#content .collection-overview')?.remove();
  if($('#libraryCollectionHero'))return;
  const rows=state.libraryRows||[],game=state.libraryCategory==='jogos';
  const meta={jogos:['🎮','Biblioteca de jogos','Acompanhe jornadas, horas, conquistas e tudo que ainda quer zerar.'],filmes:['🎬','Seus filmes','Organize o que quer assistir, favoritos e histórias já concluídas.'],series:['📺','Suas séries','Continue temporadas, acompanhe episódios e guarde seus destaques.'],animes:['🌸','Seus animes','Temporadas, episódios e favoritos reunidos em uma coleção só.']}[state.libraryCategory]||['▦','Sua biblioteca','Toda a sua coleção em um só lugar.'];
  const category=state.libraryCategory,defaultTitle=meta[1],sync=window.batcavernaLayoutSync;
  const storedTitles=sync?.get()?.collectionTitles;
  const titles=storedTitles&&typeof storedTitles==='object'&&!Array.isArray(storedTitles)?storedTitles:{};
  const title=typeof titles[category]==='string'&&titles[category].trim()?titles[category]:defaultTitle;
  const done=rows.filter(x=>['finished','platinum','favorite'].includes(normalizedStatus(x.status))).length,active=rows.filter(x=>normalizedStatus(x.status)==='progress').length;
  const hero=document.createElement('section');hero.id='libraryCollectionHero';hero.className=`library-collection-hero collection-${state.libraryCategory}`;
  hero.innerHTML=`<div class="library-hero-icon">${meta[0]}</div><div class="library-hero-copy"><span class="eyebrow">SUA COLEÇÃO</span><div class="library-hero-title-row"><h2 data-collection-title>${esc(title)}</h2>${sync?'<button type="button" class="icon-button" data-customize-collection-title aria-label="Personalizar título da coleção" title="Personalizar título">✎</button>':''}</div></div><div class="library-hero-metrics"><article><strong>${rows.length}</strong><span>${rows.length===1?'título':'títulos'}</span></article><article><strong>${active}</strong><span>${game?'jogando':'assistindo'}</span></article><article><strong>${done}</strong><span>concluídos</span></article></div>`;
  hero.querySelector('[data-customize-collection-title]')?.addEventListener('click',()=>{
   const owner=state.userId,dialog=window.batcavernaPopup(`<header><div><span class="eyebrow">SUA COLEÇÃO</span><h2>Personalizar título</h2></div><button class="icon-button" data-close aria-label="Fechar">×</button></header><p>Escolha um nome para esta coleção. Deixe em branco para restaurar o padrão.</p><label>Novo título<input type="text" data-collection-title-input maxlength="80" autocomplete="off" placeholder="${esc(defaultTitle)}"></label><p data-collection-title-status role="status"></p><footer><button type="button" class="primary" data-save-collection-title>Salvar título</button></footer>`,'collection-title-editor');
   const input=dialog.querySelector('[data-collection-title-input]'),status=dialog.querySelector('[data-collection-title-status]'),save=dialog.querySelector('[data-save-collection-title]');
   input.value=typeof titles[category]==='string'?titles[category]:'';
   input.focus();
   save.onclick=async()=>{
    if(owner!==state.userId||!sync){status.textContent='A conta mudou. Abra a coleção novamente.';return}
    const value=input.value.trim();
    if([...value].length>80){status.textContent='O título deve ter até 80 caracteres.';return}
    const existing=sync.get().collectionTitles;
    const nextTitles=existing&&typeof existing==='object'&&!Array.isArray(existing)?{...existing}:{};
    if(value)nextTitles[category]=value;else delete nextTitles[category];
    save.disabled=true;dialog.dataset.busy='1';status.textContent='Salvando na sua conta…';
    try{
     sync.save({...sync.get(),collectionTitles:nextTitles});
     await sync.flush();
     if(owner!==state.userId)return;
     const activeTitle=hero.querySelector('[data-collection-title]');
     if(activeTitle?.isConnected)activeTitle.textContent=value||defaultTitle;
     dialog.remove();toast(sync.status()||'Título salvo na sua conta.');
    }catch(error){status.textContent=failure(error);save.disabled=false}
    finally{dialog.dataset.busy='0'}
   };
  });
  $('#content').insertBefore(hero,$('#content').firstChild);
 };

 const baseProfile=renderProfile;
 renderProfile=async function(userId=null){
  await baseProfile(userId);if(state.current!=='profile')return;
  const own=!userId||String(userId)===String(state.userId),actions=$('.complete-profile .profile-actions');
  if(own&&actions&&!$('#profileSettings')){const button=document.createElement('button');button.id='profileSettings';button.className='secondary';button.textContent='⚙ Configurações';button.onclick=()=>{state.settingsTab='account';navigate('settings')};actions.append(button)}
  $('.complete-profile')?.classList.add('profile-cover-fixed');
  if(own){try{const missions=await call('community',{input:{op:'missions_v2'}}),box=$('#profileMissions');if(box&&Array.isArray(missions)){const icon={add_game:'🎮',finish_game:'🏁',watch_episode:'📺',add_media:'🎬',finish_media:'🍿',rate_content:'⭐',play_hours:'⏱️'},paint=(label,rows)=>`<section class="mission-period"><header><h2>${label}</h2><span>${rows.length} objetivos</span></header><div class="mission-cards">${rows.map(m=>`<article data-mission-kind="${esc(m.missao_id)}"><div class="mission-card-head"><i>${icon[m.missao_id]||'🎯'}</i><span><b>${esc(m.nome||'Missão')}</b><em>+${Number(m.xp)||0} XP</em></span></div><p class="mission-objective">${esc(m.objetivo||'Complete o objetivo.')}</p><progress max="${Number(m.meta)||1}" value="${Number(m.progresso)||0}"></progress><small>${Math.min(Number(m.progresso)||0,Number(m.meta)||1)} / ${Number(m.meta)||1}</small><button data-claim-v2="${esc(m.id)}" ${(m.reivindicada||Number(m.progresso)<Number(m.meta||1))?'disabled':''}>${m.reivindicada?'Recompensa recebida':Number(m.progresso)>=Number(m.meta||1)?`Resgatar +${Number(m.xp)||0} XP`:'Em andamento'}</button></article>`).join('')}</div></section>`;const daily=missions.filter(m=>!String(m.periodo).startsWith('semana:')),weekly=missions.filter(m=>String(m.periodo).startsWith('semana:'));box.innerHTML='<div class="section-head"><div><span class="eyebrow">PROGRESSÃO</span><h2>Missões da sua conta</h2></div></div>'+paint('Missões diárias',daily)+paint('Missões semanais',weekly);box.querySelectorAll('[data-claim-v2]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const result=await call('community',{input:{op:'claim_mission_v2',missionId:button.dataset.claimV2}});toast(result?.[0]?.mensagem||'Recompensa recebida.');await renderProfile()}catch(error){toast(failure(error));button.disabled=false}})}}catch{}}
 };

 const baseProfileEditor=openProfileEditor;
 openProfileEditor=async function(profile){
  await baseProfileEditor(profile);const form=document.querySelector('.profile-editor'),panel=form?.querySelector('[data-profile-panel="appearance"]');if(!panel||panel.querySelector('.profile-background-link'))return;
  const section=document.createElement('section');section.className='profile-background-link';section.innerHTML='<h3>Fundo do aplicativo</h3><button type="button" class="secondary" data-edit-wallpaper>Personalizar fundo</button>';panel.append(section);
  section.querySelector('[data-edit-wallpaper]').onclick=async()=>{form.closest('.editor-overlay')?.remove();state.settingsTab='appearance';await navigate('settings');document.querySelector('[data-setting-section="wallpaper"]')?.scrollIntoView({block:'center'});};
 };

 const baseDiscover=renderDiscover;
 renderDiscover=async function(){
  await baseDiscover();if(state.current!=='discover'||state.discoverTab!=='free')return;
  const body=$('#discoverBody');body?.classList.add('free-offers-page');
  [...body.querySelectorAll('.offer-card')].forEach(card=>{const store=card.querySelector('small')?.textContent||'';card.classList.toggle('offer-steam',/steam/i.test(store));card.classList.toggle('offer-epic',/epic/i.test(store));const tag=document.createElement('span');tag.className='offer-discount';tag.textContent='−100%';card.querySelector('.body')?.prepend(tag)});
 };


})();
