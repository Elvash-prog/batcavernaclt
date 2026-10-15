'use strict';
(()=>{
 const baseSettings=renderSettings;
 renderSettings=async function(){
  await baseSettings();if(!['account','app'].includes(state.settingsTab))return;
  const panel=$('#settingsPanel');if(!panel)return;
  if(state.settingsTab==='app'){
   try{
    const info=await call('diagnostic_status');if(!panel.isConnected)return;
    panel.insertAdjacentHTML('beforeend',`<section class="native-desktop-settings diagnostic-settings"><h3>Diagnóstico e estabilidade</h3><p class="muted">Registra somente etapas técnicas, sem senhas, tokens, conversas ou conteúdo da biblioteca. Exporte o arquivo para investigar uma falha.</p><div class="diagnostic-summary"><span>Arquivo local</span><b>${Number(info.size||0).toLocaleString('pt-BR')} bytes</b></div><footer><button type="button" class="primary" id="exportDiagnostics">Exportar diagnóstico</button><button type="button" class="secondary" id="clearDiagnostics">Limpar histórico</button></footer><p role="status"></p></section>`);
    const section=panel.querySelector('.diagnostic-settings'),note=section.querySelector('[role=status]');
    section.querySelector('#exportDiagnostics').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{const result=await call('diagnostic_export');note.textContent=`Arquivo criado em ${result.path}`}catch(e){note.textContent=failure(e)}finally{button.disabled=false}};
    section.querySelector('#clearDiagnostics').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await call('diagnostic_clear');note.textContent='Histórico de diagnóstico limpo.';section.querySelector('.diagnostic-summary b').textContent='0 bytes'}catch(e){note.textContent=failure(e)}finally{button.disabled=false}};
   }catch(e){if(panel.isConnected)panel.insertAdjacentHTML('beforeend',`<p class="muted">Diagnóstico indisponível: ${esc(failure(e))}</p>`)}
   return;
  }
  try{
   const prefs=await call('desktop_preferences',{input:null});if(!panel.isConnected)return;
   panel.insertAdjacentHTML('beforeend',`<section class="native-desktop-settings"><h3>Windows e segundo plano</h3><p class="muted">Ao fechar a janela, continue recebendo atividades na bandeja. Para encerrar, use “Sair” no ícone da BatCaverna.</p><label><input id="desktopBackground" type="checkbox" ${prefs.background?'checked':''}>Continuar em segundo plano ao fechar</label><label><input id="desktopNotifications" type="checkbox" ${prefs.notifications?'checked':''}>Receber notificações do Windows</label><footer><button type="button" class="primary" id="saveDesktopPreferences">Salvar preferências do Windows</button><button type="button" class="secondary" id="testWindowsNotification">Testar notificação</button></footer><p role="status"></p></section>`);
   const section=panel.querySelector('.native-desktop-settings'),note=section.querySelector('[role=status]');
   section.querySelector('#saveDesktopPreferences').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await call('desktop_preferences',{input:{background:section.querySelector('#desktopBackground').checked,notifications:section.querySelector('#desktopNotifications').checked}});note.textContent='Preferências salvas neste computador.'}catch(e){note.textContent=failure(e)}finally{button.disabled=false}};
   section.querySelector('#testWindowsNotification').onclick=async()=>{try{await call('test_windows_notification');note.textContent='Notificação enviada. Se ela não aparecer, confira as notificações do aplicativo nas configurações do Windows.'}catch(e){note.textContent=failure(e)}};
  }catch(e){if(panel.isConnected)panel.insertAdjacentHTML('beforeend',`<p class="muted">Preferências do Windows indisponíveis: ${esc(failure(e))}</p>`)}
 };

 const baseLibrary=renderLibrary;
 renderLibrary=async function(){
  await baseLibrary();if(state.current!=='library')return;
  $('#content .collection-overview')?.remove();
  if($('#libraryCollectionHero'))return;
  const rows=state.libraryRows||[],game=state.libraryCategory==='jogos';
  const meta={jogos:['🎮','Biblioteca de jogos','Acompanhe jornadas, horas, conquistas e tudo que ainda quer zerar.'],filmes:['🎬','Seus filmes','Organize o que quer assistir, favoritos e histórias já concluídas.'],series:['📺','Suas séries','Continue temporadas, acompanhe episódios e guarde seus destaques.'],animes:['🌸','Seus animes','Temporadas, episódios e favoritos reunidos em uma coleção só.']}[state.libraryCategory]||['▦','Sua biblioteca','Toda a sua coleção em um só lugar.'];
  const done=rows.filter(x=>['finished','platinum','favorite'].includes(normalizedStatus(x.status))).length,active=rows.filter(x=>normalizedStatus(x.status)==='progress').length;
  const hero=document.createElement('section');hero.id='libraryCollectionHero';hero.className=`library-collection-hero collection-${state.libraryCategory}`;
  hero.innerHTML=`<div class="library-hero-icon">${meta[0]}</div><div class="library-hero-copy"><span class="eyebrow">SUA COLEÇÃO</span><h2>${meta[1]}</h2><p>${meta[2]}</p></div><div class="library-hero-metrics"><article><strong>${rows.length}</strong><span>${rows.length===1?'título':'títulos'}</span></article><article><strong>${active}</strong><span>${game?'jogando':'assistindo'}</span></article><article><strong>${done}</strong><span>concluídos</span></article></div>`;
  $('#content').insertBefore(hero,$('#content').firstChild);
 };

 const baseProfile=renderProfile;
 renderProfile=async function(userId=null){
  await baseProfile(userId);if(state.current!=='profile')return;
  const content=$('#content'),shell=$('#appShell');content.classList.remove('profile-user-background');content.style.removeProperty('--user-profile-background');content.style.removeProperty('--user-profile-dark');content.style.removeProperty('--user-profile-blur');shell.classList.remove('profile-background-active');
  const own=!userId||String(userId)===String(state.userId),actions=$('.complete-profile .profile-actions');
  if(own&&actions&&!$('#profileSettings')){const button=document.createElement('button');button.id='profileSettings';button.className='secondary';button.textContent='⚙ Configurações';button.onclick=()=>{state.settingsTab='account';navigate('settings')};actions.append(button)}
  $('.complete-profile')?.classList.add('profile-cover-fixed');
  try{const profile=own?state.profile:await api.profile(userId),background=typeof profile?.fundo==='string'?profile.fundo:profile?.fundo?.url;if(background){const src=await signed(background),dark=Math.max(0,Math.min(90,Number(profile.fundo?.escuro)||65)),blur=Math.max(0,Math.min(20,Number(profile.fundo?.desfoque)||0));if(state.current==='profile'){content.classList.add('profile-user-background');shell.classList.add('profile-background-active');content.style.setProperty('--user-profile-background',`url(${JSON.stringify(src)})`);content.style.setProperty('--user-profile-dark',String(dark/100));content.style.setProperty('--user-profile-blur',`${blur}px`)}}}catch(error){toast(`Não foi possível carregar o fundo do perfil: ${failure(error)}`)}
  if(own){try{const missions=await call('community',{input:{op:'missions_v2'}}),box=$('#profileMissions');if(box&&Array.isArray(missions)){const icon={add_game:'🎮',finish_game:'🏁',watch_episode:'📺',add_media:'🎬',finish_media:'🍿',rate_content:'⭐',play_hours:'⏱️'},paint=(label,rows)=>`<section class="mission-period"><header><h2>${label}</h2><span>${rows.length} objetivos</span></header><div class="mission-cards">${rows.map(m=>`<article data-mission-kind="${esc(m.missao_id)}"><div class="mission-card-head"><i>${icon[m.missao_id]||'🎯'}</i><span><b>${esc(m.nome||'Missão')}</b><em>+${Number(m.xp)||0} XP</em></span></div><p class="mission-objective">${esc(m.objetivo||'Complete o objetivo.')}</p><progress max="${Number(m.meta)||1}" value="${Number(m.progresso)||0}"></progress><small>${Math.min(Number(m.progresso)||0,Number(m.meta)||1)} / ${Number(m.meta)||1}</small><button data-claim-v2="${esc(m.id)}" ${(m.reivindicada||Number(m.progresso)<Number(m.meta||1))?'disabled':''}>${m.reivindicada?'Recompensa recebida':Number(m.progresso)>=Number(m.meta||1)?`Resgatar +${Number(m.xp)||0} XP`:'Em andamento'}</button></article>`).join('')}</div></section>`;const daily=missions.filter(m=>!String(m.periodo).startsWith('semana:')),weekly=missions.filter(m=>String(m.periodo).startsWith('semana:'));box.innerHTML='<div class="section-head"><div><span class="eyebrow">PROGRESSÃO</span><h2>Missões da sua conta</h2><p>Objetivos variados que acompanham sua atividade real.</p></div></div>'+paint('Missões diárias',daily)+paint('Missões semanais',weekly);box.querySelectorAll('[data-claim-v2]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const result=await call('community',{input:{op:'claim_mission_v2',missionId:button.dataset.claimV2}});toast(result?.[0]?.mensagem||'Recompensa recebida.');await renderProfile()}catch(error){toast(failure(error));button.disabled=false}})}}catch{}}
 };

 const baseProfileEditor=openProfileEditor;
 openProfileEditor=async function(profile){
  await baseProfileEditor(profile);const form=document.querySelector('.profile-editor'),panel=form?.querySelector('[data-profile-panel="appearance"]');if(!panel||$('#desktopProfileBackground'))return;
  const current=typeof profile.fundo==='string'?profile.fundo:profile.fundo?.url||'';
  const section=document.createElement('section');section.id='desktopProfileBackground';section.className='profile-background-editor';section.innerHTML=`<h3>Fundo do perfil</h3><p class="muted">Separado da capa: aparece somente como fundo da página do seu perfil.</p><div class="editor-grid"><label class="wide">Enviar imagem<input id="profileBackgroundFile" type="file" accept="image/png,image/jpeg,image/webp"></label><label class="wide">URL do fundo<input id="profileBackgroundUrl" type="url" value="${esc(current)}"></label><label>Escurecer <output id="profileBackgroundDarkValue">${Number(profile.fundo?.escuro)||65}%</output><input id="profileBackgroundDark" type="range" min="0" max="90" value="${Number(profile.fundo?.escuro)||65}"></label><label>Desfoque <output id="profileBackgroundBlurValue">${Number(profile.fundo?.desfoque)||0}px</output><input id="profileBackgroundBlur" type="range" min="0" max="20" value="${Number(profile.fundo?.desfoque)||0}"></label></div><div class="preview-actions"><button type="button" class="primary" id="saveProfileBackground">Salvar fundo</button><button type="button" class="secondary" id="removeProfileBackground">Remover fundo</button></div><p role="status"></p>`;
  panel.append(section);const file=section.querySelector('#profileBackgroundFile'),url=section.querySelector('#profileBackgroundUrl'),note=section.querySelector('[role=status]'),dark=section.querySelector('#profileBackgroundDark'),blur=section.querySelector('#profileBackgroundBlur');
  dark.oninput=()=>section.querySelector('#profileBackgroundDarkValue').value=dark.value+'%';blur.oninput=()=>section.querySelector('#profileBackgroundBlurValue').value=blur.value+'px';
  section.querySelector('#saveProfileBackground').onclick=async event=>{event.currentTarget.disabled=true;note.textContent='Salvando fundo…';try{let value=url.value.trim();if(file.files[0]){const selected=file.files[0];if(!/^image\/(png|jpeg|webp)$/.test(selected.type)||selected.size>10*1024*1024)throw Error('Escolha PNG, JPG ou WebP de até 10 MB.');const data=await fileData(selected),uploaded=await api.uploadProfile({name:'background',mime:selected.type,base64:data.split(',')[1]});value=uploaded.url}await call('update_profile_background',{input:{url:value,escuro:Number(dark.value),desfoque:Number(blur.value)}});profile.fundo=value?{url:value,escuro:Number(dark.value),desfoque:Number(blur.value)}:null;url.value=value;note.textContent='Fundo do perfil salvo.';toast('Fundo atualizado.')}catch(error){note.textContent=failure(error)}finally{event.currentTarget.disabled=false}};
  section.querySelector('#removeProfileBackground').onclick=async event=>{event.currentTarget.disabled=true;try{await call('update_profile_background',{input:{url:''}});profile.fundo=null;url.value='';file.value='';note.textContent='Fundo removido.';const content=$('#content');content.classList.remove('profile-user-background');content.style.removeProperty('--user-profile-background');content.style.removeProperty('--user-profile-dark');content.style.removeProperty('--user-profile-blur');$('#appShell').classList.remove('profile-background-active')}catch(error){note.textContent=failure(error)}finally{event.currentTarget.disabled=false}};
 };

 const baseDiscover=renderDiscover;
 renderDiscover=async function(){
  await baseDiscover();if(state.current!=='discover'||state.discoverTab!=='free')return;
  const body=$('#discoverBody');body?.classList.add('free-offers-page');
  [...body.querySelectorAll('.offer-card')].forEach(card=>{const store=card.querySelector('small')?.textContent||'';card.classList.toggle('offer-steam',/steam/i.test(store));card.classList.toggle('offer-epic',/epic/i.test(store));const tag=document.createElement('span');tag.className='offer-discount';tag.textContent='−100%';card.querySelector('.body')?.prepend(tag)});
 };

 const baseNavigate=navigate;
 navigate=async function(view){if(view!=='profile'){const content=$('#content');content?.classList.remove('profile-user-background');content?.style.removeProperty('--user-profile-background');content?.style.removeProperty('--user-profile-dark');content?.style.removeProperty('--user-profile-blur');$('#appShell')?.classList.remove('profile-background-active')}return baseNavigate(view)};
})();
