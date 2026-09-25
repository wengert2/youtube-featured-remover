(function () {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const toggle = document.getElementById('toggle');
  const status = document.getElementById('status');
  const closeButton = document.getElementById('close');

  function setStatus(on) {
    status.textContent = on
      ? 'Hiding featured videos: ON'
      : 'Hiding featured videos: OFF';
  }

  function apply(on) {
    setStatus(on);
    api.storage.local.set({ enabled: on });
  }

  api.storage.local.get('enabled').then((result) => {
    const on = !!result.enabled;
    toggle.checked = on;
    setStatus(on);
  });

  toggle.addEventListener('change', () => apply(toggle.checked));
  closeButton.addEventListener('click', () => window.close());
})();