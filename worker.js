import images from "./image-assets.js";
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (Object.prototype.hasOwnProperty.call(images, url.pathname)) {
      const bytes = Uint8Array.from(atob(images[url.pathname]), c => c.charCodeAt(0));
      return new Response(request.method === "HEAD" ? null : bytes, {headers: {
        "Content-Type": "image/png", "Cache-Control": "public, max-age=86400"
      }});
    }

    // Service worker / PWA assets must be served normally.
    // All application files live under /public and are handled by
    // Cloudflare's Workers Static Assets binding.
    if (url.pathname === "/" || !url.pathname.includes(".")) {
      const indexRequest = new Request(new URL("/index.html", request.url), request);
      return env.ASSETS.fetch(indexRequest);
    }

    return env.ASSETS.fetch(request);
  }
};
