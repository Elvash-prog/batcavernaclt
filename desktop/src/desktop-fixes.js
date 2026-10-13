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
})();
