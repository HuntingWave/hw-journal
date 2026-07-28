if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./service-worker.js').catch(function (e) {
      console.error('SW registration failed', e);
    });
  });
}
