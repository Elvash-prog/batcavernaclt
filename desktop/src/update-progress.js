// This view receives only progress numbers and phases from the native updater.
window.BatUpdateProgress = {
 open(version) {
  const previous = document.activeElement;
  const overlay = window.batcavernaPopup('<header><div><span class="eyebrow">ATUALIZAÇÃO DO APLICATIVO</span><h2 id="updateProgressTitle">Preparando atualização</h2></div></header><p class="update-version"></p><div class="update-transfer"><progress aria-label="Download da atualização"></progress><p data-transfer></p></div><p data-update-stage role="status" aria-live="polite"></p><footer><button type="button" class="secondary" data-dismiss hidden>Fechar</button><button type="button" class="primary" data-retry hidden>Tentar novamente</button></footer>', 'update-progress-modal');
  const dialog = overlay.querySelector('section');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'updateProgressTitle');
  dialog.tabIndex = -1;
  dialog.querySelector('.update-version').textContent = `BatCaverna ${version}`;
  const bar = dialog.querySelector('progress'), transfer = dialog.querySelector('[data-transfer]'), status = dialog.querySelector('[data-update-stage]');
  const dismiss = dialog.querySelector('[data-dismiss]'), retry = dialog.querySelector('[data-retry]');
  const close = () => { overlay.remove(); if (previous?.isConnected) previous.focus(); };
  dismiss.onclick = close;
  overlay.onclick = event => { if (event.target === overlay && overlay.dataset.busy !== '1') close(); };
  dialog.addEventListener('keydown', event => {
   if (event.key === 'Escape') { event.stopPropagation(); if (overlay.dataset.busy !== '1') close(); }
   if (event.key === 'Tab') {
    const buttons = [...dialog.querySelectorAll('button')].filter(b => !b.hidden && !b.disabled);
    if (!buttons.length) { event.preventDefault(); dialog.focus(); }
    else if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === dialog)) { event.preventDefault(); buttons.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
   }
  });
  const title = text => dialog.querySelector('h2').textContent = text;
  const mb = n => (n / 1048576).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + ' MB';
  return {
   start() {
    overlay.dataset.busy = '1'; dialog.setAttribute('aria-busy', 'true');
    dismiss.hidden = retry.hidden = true; retry.onclick = null;
    bar.hidden = false; bar.removeAttribute('value'); transfer.textContent = '';
    title('Preparando atualização'); status.textContent = 'Confirmando a versão disponível…'; dialog.focus();
   },
   progress(event) {
    if (!overlay.isConnected || overlay.dataset.busy !== '1') return;
    if (event?.phase === 'installing') {
     title('Verificando atualização'); bar.removeAttribute('value');
     status.textContent = 'Download concluído. Verificando a assinatura e preparando o instalador…'; return;
    }
    if (event?.phase !== 'downloading') return;
    const bytes = Number(event.downloaded), total = Number(event.total);
    if (!Number.isFinite(bytes) || bytes < 0) return;
    title('Baixando atualização'); status.textContent = 'Aguarde o download terminar para instalar.';
    if (Number.isFinite(total) && total > 0) {
     bar.max = total; bar.value = Math.min(bytes, total);
     transfer.textContent = `${Math.min(100, Math.floor(bytes * 100 / total))}% · ${mb(bytes)} de ${mb(total)}`;
    } else { bar.removeAttribute('value'); transfer.textContent = `${mb(bytes)} recebidos`; }
   },
   fail(message, again) {
    overlay.dataset.busy = '0'; dialog.removeAttribute('aria-busy'); bar.hidden = true;
    title('A atualização não foi concluída'); status.textContent = message;
    dismiss.hidden = retry.hidden = false; retry.onclick = again; retry.focus();
   },
   complete() {
    overlay.dataset.busy = '0'; dialog.removeAttribute('aria-busy'); bar.hidden = true;
    title('Atualização preparada'); status.textContent = 'O instalador iniciará a versão nova.';
    dismiss.hidden = false; dismiss.focus();
   }
  };
 }
};
