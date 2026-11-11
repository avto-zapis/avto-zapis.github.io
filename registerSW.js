// Регистрация service worker. Своя, а не от vite-plugin-pwa, чтобы у каждого бизнеса был свой scope:
// /norde/ управляет только /norde/..., а /nish, демо и другие папки сайта SW не трогает.
// Файл называется так же, как старый registerSW.js, поэтому его подхватят и старые закэшированные страницы.
(function () {
  if (!('serviceWorker' in navigator)) return
  // папки сайта, которые не являются бизнесами: для них SW не нужен
  var NOT_TENANT = ['', 'assets', 'nish', 'vintik', 'glad', 'mokryi-list', 'landings', 'index.html', '404.html', 'sw.js', 'registerSW.js']

  function rootPrecacheNames(keys) {
    // кэши старого SW со scope «/»: имя workbox оканчивается на адрес корня сайта
    var root = location.origin + '/'
    return keys.filter(function (k) { return k.slice(-root.length) === root })
  }

  async function run() {
    var seg = location.pathname.split('/')[1] || ''
    var regs = await navigator.serviceWorker.getRegistrations()
    var keepRoot = false
    for (var i = 0; i < regs.length; i++) {
      var r = regs[i]
      if (new URL(r.scope).pathname !== '/') continue
      // старый SW на весь сайт. Если на нём подписка на уведомления владельца, не ломаем её:
      // он сам обновится до новой версии, а она уже не перехватывает чужие страницы.
      var sub = null
      try { sub = r.pushManager && (await r.pushManager.getSubscription()) } catch (e) {}
      if (sub) { keepRoot = true; r.update(); continue }
      await r.unregister()
      if (window.caches) {
        var names = rootPrecacheNames(await caches.keys())
        for (var j = 0; j < names.length; j++) await caches.delete(names[j])
      }
    }
    if (keepRoot) return
    if (seg === 'owner') return navigator.serviceWorker.register('/sw.js', { scope: '/owner' })
    if (NOT_TENANT.indexOf(seg) >= 0) return
    // регистрируем только для настоящего бизнеса: у него есть свой manifest
    var res = await fetch('/' + seg + '/manifest.webmanifest', { method: 'HEAD', cache: 'no-store' })
    if (res.ok) navigator.serviceWorker.register('/sw.js', { scope: '/' + seg + '/' })
  }

  window.addEventListener('load', function () { run().catch(function () {}) })
})()
