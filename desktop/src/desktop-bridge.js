/* Only packaged local pages can call the native commands. */
(function () {
  'use strict';
  const invoke = window.__TAURI__?.core.invoke;
  const nativeFetch = window.fetch.bind(window);
  window.BC_DESKTOP = true;
  window.BC_WEB_ORIGIN = 'https://batcavernaclt.gamersclt.workers.dev';
  window.BC_CONFIG = JSON.parse(sessionStorage.getItem('bc-desktop-config') || '{}');
  window.bcBackendRequest = async function (path, options = {}) {
    if (!invoke) throw new Error('Abra pelo programa BatCaverna CLT.');
    const request = new Request(new URL(path, location.href), options);
    if (request.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
    const bytes = new Uint8Array(await request.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    const result = await invoke('backend_request', {request: {
      path, method: request.method, headers: Object.fromEntries(request.headers), bodyBase64: bytes.length ? btoa(binary) : null
    }});
    if (request.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
    return new Response([204,205,304].includes(result.status) ? null : result.body, {status: result.status, headers: result.headers});
  };
  window.fetch = async function (input, options) {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    if (url.origin === location.origin && (url.pathname.startsWith('/api/') || url.pathname === '/config.js')) {
      const req = new Request(input instanceof Request ? input : url, options);
      return window.bcBackendRequest(url.pathname + url.search, {
        method: req.method, headers: req.headers, signal: req.signal,
        ...(!['GET','HEAD'].includes(req.method) ? {body: await req.arrayBuffer()} : {})
      });
    }
    return nativeFetch(input, options);
  };
  function external(url) {
    const parsed = new URL(url, location.href);
    if (parsed.protocol !== 'https:') return Promise.reject(new Error('Somente links HTTPS são permitidos.'));
    return invoke('open_external', {url: parsed.href});
  }
  document.addEventListener('click', function (event) {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin && !link.hasAttribute('download')) {
      event.preventDefault();
      external(url.href).catch(() => window.toast?.('Não foi possível abrir esse link.'));
    }
  }, true);
  window.open = function (url) {
    external(url).catch(() => window.toast?.('Não foi possível abrir esse link.'));
    return null;
  };
})();
