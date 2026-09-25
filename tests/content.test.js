import { afterEach, describe, expect, it, vi } from 'vitest';

const API_NAMES = ['chrome', 'browser'];

function makeApi(name, { enabled = true } = {}) {
  const listeners = new Set();
  return {
    storage: {
      local: {
        get: (key) => Promise.resolve({ enabled }),
        set: (items) => Promise.resolve()
      },
      onChanged: {
        addListener(fn) {
          listeners.add(fn);
        }
      }
    },
    setEnabled(on) {
      for (const fn of listeners) fn({ enabled: { newValue: on } }, 'local');
    }
  };
}

async function boot(name, { enabled = true, html = '' } = {}) {
  document.body.innerHTML = html;
  const api = makeApi(name, { enabled });
  globalThis[name] = api;
  vi.resetModules();
  await import('../content.js');
  await Promise.resolve();
  return api;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 250));

afterEach(() => {
  document.body.innerHTML = '';
  delete globalThis.chrome;
  delete globalThis.browser;
});

for (const name of API_NAMES) {
describe(`content script (${name})`, () => {
  it('hides only the featured card in a modern watch sidebar, not the whole list', async () => {
    const html = `
      <div id="secondary">
        <ytd-watch-next-secondary-results-renderer>
          <div id="contents">
            <ytd-item-section-renderer>
              <div id="section-contents">
                <yt-lockup-view-model id="rec1" class="regular-card">Video A</yt-lockup-view-model>
                <yt-lockup-view-model id="featured" class="featured-card">
                  <span class="ytBadgeShapeText">YouTube Featured</span>Sponsored card
                </yt-lockup-view-model>
                <yt-lockup-view-model id="rec2" class="regular-card">Video B</yt-lockup-view-model>
              </div>
            </ytd-item-section-renderer>
          </div>
        </ytd-watch-next-secondary-results-renderer>
      </div>`;
    await boot(name, { html });

    expect(document.getElementById('featured')).toBeNull();
    expect(document.getElementById('rec1')).not.toBeNull();
    expect(document.getElementById('rec2')).not.toBeNull();
    expect(document.querySelector('ytd-item-section-renderer')).not.toBeNull();
    expect(document.querySelector('ytd-watch-next-secondary-results-renderer')).not.toBeNull();
  });

  it('hides a legacy compact promoted card in the sidebar', async () => {
    const html = `
      <ytd-watch-next-secondary-results-renderer>
        <ytd-item-section-renderer>
          <ytd-compact-video-renderer id="recA">Video A</ytd-compact-video-renderer>
          <ytd-compact-promoted-video-renderer id="promoted">
            <span class="ytBadgeShapeText">YouTube Featured</span>Sponsored
          </ytd-compact-promoted-video-renderer>
        </ytd-item-section-renderer>
      </ytd-watch-next-secondary-results-renderer>`;
    await boot(name, { html });

    expect(document.getElementById('promoted')).toBeNull();
    expect(document.getElementById('recA')).not.toBeNull();
    expect(document.querySelector('ytd-item-section-renderer')).not.toBeNull();
  });

  it('removes the whole featured cell on the home feed grid so the layout reflows', async () => {
    const html = `
      <ytd-rich-grid-renderer>
        <ytd-rich-item-renderer id="gridA">Video A</ytd-rich-item-renderer>
        <ytd-rich-item-renderer id="gridFeatured">
          <ytd-promoted-video-renderer id="promoted">
            <span class="ytBadgeShapeText">YouTube Featured</span>Sponsored
          </ytd-promoted-video-renderer>
        </ytd-rich-item-renderer>
      </ytd-rich-grid-renderer>`;
    await boot(name, { html });

    expect(document.getElementById('gridFeatured')).toBeNull();
    expect(document.getElementById('gridA')).not.toBeNull();
    expect(document.querySelector('ytd-rich-grid-renderer')).not.toBeNull();
  });

  it('removes the whole cell when a modern lockup nested inside a rich item is featured', async () => {
    const html = `
      <ytd-rich-grid-renderer>
        <ytd-rich-item-renderer id="cellA">
          <yt-lockup-view-model>Video A</yt-lockup-view-model>
        </ytd-rich-item-renderer>
        <ytd-rich-item-renderer id="cellFeatured">
          <yt-lockup-view-model>
            <span class="ytBadgeShapeText">YouTube Featured</span>Sponsored
          </yt-lockup-view-model>
        </ytd-rich-item-renderer>
        <ytd-rich-item-renderer id="cellB">
          <yt-lockup-view-model>Video B</yt-lockup-view-model>
        </ytd-rich-item-renderer>
      </ytd-rich-grid-renderer>`;
    await boot(name, { html });

    expect(document.getElementById('cellFeatured')).toBeNull();
    expect(document.getElementById('cellA')).not.toBeNull();
    expect(document.getElementById('cellB')).not.toBeNull();
    expect(document.querySelector('ytd-rich-grid-renderer')).not.toBeNull();
  });

  it('does nothing when the badge sits at section level with no card below it', async () => {
    const html = `
      <ytd-watch-next-secondary-results-renderer>
        <ytd-item-section-renderer>
          <div id="section-header"><span class="ytBadgeShapeText">YouTube Featured</span></div>
          <yt-lockup-view-model id="recX">Video</yt-lockup-view-model>
        </ytd-item-section-renderer>
      </ytd-watch-next-secondary-results-renderer>`;
    await boot(name, { html });

    expect(document.getElementById('recX')).not.toBeNull();
    expect(document.querySelector('ytd-item-section-renderer')).not.toBeNull();
    expect(document.querySelector('ytd-watch-next-secondary-results-renderer')).not.toBeNull();
  });

  it('does not hide a card whose badge does not match "YouTube Featured"', async () => {
    const html = `
      <ytd-watch-next-secondary-results-renderer>
        <ytd-item-section-renderer>
          <yt-lockup-view-model id="members">
            <span class="ytBadgeShapeText">Members only</span>Video
          </yt-lockup-view-model>
        </ytd-item-section-renderer>
      </ytd-watch-next-secondary-results-renderer>`;
    await boot(name, { html });

    expect(document.getElementById('members')).not.toBeNull();
  });

  it('hides a featured card added to the sidebar after load (MutationObserver path)', async () => {
    await boot(name, { html: '<ytd-watch-next-secondary-results-renderer><ytd-item-section-renderer></ytd-item-section-renderer></ytd-watch-next-secondary-results-renderer>' });

    const card = document.createElement('yt-lockup-view-model');
    card.id = 'lateFeatured';
    card.innerHTML = '<span class="ytBadgeShapeText">YouTube Featured</span>Sponsored';
    document.querySelector('ytd-item-section-renderer').appendChild(card);

    await flush();
    expect(document.getElementById('lateFeatured')).toBeNull();
  });

  it('restores hidden cards when toggled off and re-hides them when toggled back on', async () => {
    const html = `
      <ytd-watch-next-secondary-results-renderer>
        <ytd-item-section-renderer>
          <yt-lockup-view-model id="featured"><span class="ytBadgeShapeText">YouTube Featured</span>Sponsored</yt-lockup-view-model>
          <yt-lockup-view-model id="rec">Video</yt-lockup-view-model>
        </ytd-item-section-renderer>
      </ytd-watch-next-secondary-results-renderer>`;
    const api = await boot(name, { html, enabled: true });

    expect(document.getElementById('featured')).toBeNull();

    api.setEnabled(false);
    expect(document.getElementById('featured')).not.toBeNull();
    expect(document.getElementById('featured').parentElement).toBe(document.querySelector('ytd-item-section-renderer'));
    expect(document.getElementById('rec')).not.toBeNull();

    api.setEnabled(true);
    expect(document.getElementById('featured')).toBeNull();
  });

  it('does nothing at all when the extension is disabled at load', async () => {
    const html = `
      <yt-lockup-view-model id="featured"><span class="ytBadgeShapeText">YouTube Featured</span>Sponsored</yt-lockup-view-model>`;
    await boot(name, { html, enabled: false });

    expect(document.getElementById('featured')).not.toBeNull();
  });
});
}