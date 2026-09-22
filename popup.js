(function () {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const toggle = document.getElementById('toggle');
  const status = document.getElementById('status');

  function setStatus(on) {
    status.textContent = on
      ? 'Hiding featured videos: ON'
      : 'Hiding featured videos: OFF';
  }

  function applyAndClose(on) {
    setStatus(on);
    api.storage.local.set({ enabled: on }, () => window.close());
  }

  api.storage.local.get('enabled', (result) => {
    const on = !!result.enabled;
    toggle.checked = on;
    setStatus(on);
  });

  toggle.addEventListener('change', () => applyAndClose(toggle.checked));
})();