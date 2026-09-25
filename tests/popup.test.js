import { afterEach, describe, expect, it, vi } from 'vitest';

const API_NAMES = ['chrome', 'browser'];

const POPUP_HTML = `
  <button type="button" id="close">&times;</button>
  <input type="checkbox" id="toggle">
  <div id="status">Hiding featured videos: OFF</div>
`;

const originalClose = typeof window !== 'undefined' ? window.close : undefined;

function makeApi(name, { enabled = true } = {}) {
  let stored = { enabled };
  return {
    storage: {
      local: {
        get: vi.fn((key) => Promise.resolve(stored)),
        set: vi.fn((items) => {
          stored = { ...items };
          return Promise.resolve();
        })
      }
    }
  };
}

async function bootPopup(name, { enabled = true } = {}) {
  document.body.innerHTML = POPUP_HTML;
  const api = makeApi(name, { enabled });
  globalThis[name] = api;
  window.close = vi.fn();
  vi.resetModules();
  await import('../popup.js');
  await Promise.resolve();
  return api;
}

afterEach(() => {
  document.body.innerHTML = '';
  delete globalThis.chrome;
  delete globalThis.browser;
  if (typeof originalClose === 'function') {
    window.close = originalClose;
  } else {
    delete globalThis.close;
  }
});

for (const name of API_NAMES) {
describe(`popup (${name})`, () => {
  it('initializes the toggle and status from storage', async () => {
    await bootPopup(name, { enabled: true });

    expect(document.getElementById('toggle').checked).toBe(true);
    expect(document.getElementById('status').textContent).toBe('Hiding featured videos: ON');
  });

  it('initializes to off when storage says disabled', async () => {
    await bootPopup(name, { enabled: false });

    expect(document.getElementById('toggle').checked).toBe(false);
    expect(document.getElementById('status').textContent).toBe('Hiding featured videos: OFF');
  });

  it('persists a toggle change to storage and updates the status', async () => {
    const api = await bootPopup(name, { enabled: false });

    const toggle = document.getElementById('toggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    expect(api.storage.local.set).toHaveBeenCalledWith({ enabled: true });
    expect(document.getElementById('status').textContent).toBe('Hiding featured videos: ON');
  });

  it('closes the popup when the close button is clicked', async () => {
    await bootPopup(name, { enabled: true });

    document.getElementById('close').click();
    expect(window.close).toHaveBeenCalledTimes(1);
  });
});
}