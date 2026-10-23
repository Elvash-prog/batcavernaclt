// Public presentation/downloads only. The Windows and Android apps use Supabase.
const presentation = new Set(['/', '/index.html', '/privacidade', '/privacidade.html', '/marketing/privacy.css', '/marketing/site.css', '/marketing/site.js', '/marketing/cave.jpg', '/marketing/brand.jpg']);
const security = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return new Response(null, {status: 308, headers: {...security, Location: url.toString()}});
    }
    if (!['GET', 'HEAD'].includes(request.method) || !presentation.has(url.pathname)) {
      return new Response(request.method === 'HEAD' ? null : 'O acesso à conta está disponível nos aplicativos Windows e Android. Conheça o programa na página inicial.', {
        status: 410, headers: {...security, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'},
      });
    }
    const assetUrl = new URL(request.url);
    if (assetUrl.pathname === '/') assetUrl.pathname = '/index.html';
    if (assetUrl.pathname === '/privacidade') assetUrl.pathname = '/privacidade.html';
    const asset = await env.ASSETS.fetch(new Request(assetUrl, request));
    const headers = new Headers(asset.headers);
    for (const [name, value] of Object.entries(security)) headers.set(name, value);
    headers.set('Cache-Control', url.pathname.endsWith('.jpg') ? 'public, max-age=86400' : 'no-cache');
    return new Response(request.method === 'HEAD' ? null : asset.body, {status: asset.status, headers});
  },
};
