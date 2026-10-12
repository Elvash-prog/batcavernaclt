'use strict';
(()=>{
 const baseSettings=renderSettings;
 renderSettings=async function(){
  await baseSettings();if(state.settingsTab!=='account')return;
  const panel=$('#settingsPanel');if(!panel)return;
  try{
   const prefs=await call('desktop_preferences',{input:null});if(!panel.isConnected)return;
   panel.insertAdjacentHTML('beforeend',`<section class="native-desktop-settings"><h3>Windows e segundo plano</h3><p class="muted">Ao fechar a janela, continue recebendo atividades na bandeja. Para encerrar, use “Sair” no ícone da BatCaverna.</p><label><input id="desktopBackground" type="checkbox" ${prefs.background?'checked':''}>Continuar em segundo plano ao fechar</label><label><input id="desktopNotifications" type="checkbox" ${prefs.notifications?'checked':''}>Receber notificações do Windows</label><footer><button type="button" class="primary" id="saveDesktopPreferences">Salvar preferências do Windows</button><button type="button" class="secondary" id="testWindowsNotification">Testar notificação</button></footer><p role="status"></p></section>`);
   const section=panel.querySelector('.native-desktop-settings'),note=section.querySelector('[role=status]');
   section.querySelector('#saveDesktopPreferences').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await call('desktop_preferences',{input:{background:section.querySelector('#desktopBackground').checked,notifications:section.querySelector('#desktopNotifications').checked}});note.textContent='Preferências salvas neste computador.'}catch(e){note.textContent=failure(e)}finally{button.disabled=false}};
   section.querySelector('#testWindowsNotification').onclick=async()=>{try{await call('test_windows_notification');note.textContent='Notificação enviada. Se ela não aparecer, confira as notificações do aplicativo nas configurações do Windows.'}catch(e){note.textContent=failure(e)}};
  }catch(e){if(panel.isConnected)panel.insertAdjacentHTML('beforeend',`<p class="muted">Preferências do Windows indisponíveis: ${esc(failure(e))}</p>`)}
 };
})();
