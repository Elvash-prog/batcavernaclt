(function () {
  const button = document.getElementById('retry');
  const status = document.getElementById('status');
  async function start() {
    button.hidden = true;
    status.textContent = 'Conectando à BatCaverna…';
    try {
      const response = await window.bcBackendRequest('/config.js');
      if (!response.ok) throw new Error('Servidor indisponível.');
      const source = await response.text();
      const match = /^\s*window\.BC_CONFIG\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(source);
      if (!match) throw new Error('Configuração inválida.');
      const config = JSON.parse(match[1]);
      const url = new URL(config.SUPABASE_URL);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || !config.SUPABASE_ANON_KEY) throw new Error('Configuração incompleta.');
      if (/^sb_secret_/i.test(config.SUPABASE_ANON_KEY)) throw new Error('Chave pública inválida.');
      const parts = config.SUPABASE_ANON_KEY.split('.');
      if (parts.length === 3) {
        const role = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/'))).role;
        if (role !== 'anon') throw new Error('Chave pública inválida.');
      }
      sessionStorage.setItem('bc-desktop-config', JSON.stringify(config));
      location.replace('./app.html');
    } catch (_) {
      status.textContent = 'Não foi possível iniciar. Confira a conexão com a internet e tente novamente. Se continuar, o servidor pode estar indisponível.';
      button.hidden = false;
    }
  }
  button.addEventListener('click', start);
  start();
})();
