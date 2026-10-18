// Retire any service worker left by the former browser application.
// The presentation site has no account session or offline application cache.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      if (registration.scope.startsWith(location.origin + '/')) registration.unregister();
    }
  }).catch(() => {});
}
if ('caches' in window) caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).catch(() => {});
