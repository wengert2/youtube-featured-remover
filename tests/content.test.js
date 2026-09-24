import { afterEach, describe, expect, it, vi } from 'vitest';

function makeChrome({ enabled = true } = {}) {
  const listeners = new Set();
  return {
    storage: {
      local: {
        get(key, cb) {
          cb({ enabled });
        }
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

async function boot({ enabled = true, html = '' } = {}) {
  document.body.innerHTML = html;
  const chrome = makeChrome({ enabled });
  globalThis.chrome = chrome;
  vi.resetModules();
  await import('../content.js');
  return chrome;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 250));

afterEach(() => {
  document.body.innerHTML = '';
  delete globalThis.chrome;
});

describe('content script', () => {
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
    await boot({ html });

    expect(document.getElementById('featured').style.display).toBe('none');
    expect(document.getElementById('rec1').style.display).not.toBe('none');
    expect(document.getElementById('rec2').style.display).not.toBe('none');
    expect(document.querySelector('ytd-item-section-renderer').style.display).not.toBe('none');
    expect(document.querySelector('ytd-watch-next-secondary-results-renderer').style.display).not.toBe('none');
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
    await boot({ html });

    expect(document.getElementById('promoted').style.display).toBe('none');
    expect(document.getElementById('recA').style.display).not.toBe('none');
    expect(document.querySelector('ytd-item-section-renderer').style.display).not.toBe('none');
  });

  it('hides a promoted rich item on the home feed grid', async () => {
    const html = `
      <ytd-rich-grid-renderer>
        <ytd-rich-item-renderer id="gridA">Video A</ytd-rich-item-renderer>
        <ytd-rich-item-renderer id="gridFeatured">
          <ytd-promoted-video-renderer id="promoted">
            <span class="ytBadgeShapeText">YouTube Featured</span>Sponsored
          </ytd-promoted-video-renderer>
        </ytd-rich-item-renderer>
      </ytd-rich-grid-renderer>`;
    await boot({ html });

    expect(document.getElementById('promoted').style.display).toBe('none');
    expect(document.getElementById('gridA').style.display).not.toBe('none');
    expect(document.getElementById('gridFeatured').style.display).not.toBe('none');
  });

  it('does nothing when the badge sits at section level with no card below it', async () => {
    const html = `
      <ytd-watch-next-secondary-results-renderer>
        <ytd-item-section-renderer>
          <div id="section-header"><span class="ytBadgeShapeText">YouTube Featured</span></div>
          <yt-lockup-view-model id="recX">Video</yt-lockup-view-model>
        </ytd-item-section-renderer>
      </ytd-watch-next-secondary-results-renderer>`;
    await boot({ html });

    expect(document.getElementById('recX').style.display).not.toBe('none');
    expect(document.querySelector('ytd-item-section-renderer').style.display).not.toBe('none');
    expect(document.querySelector('ytd-watch-next-secondary-results-renderer').style.display).not.toBe('none');
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
    await boot({ html });

    expect(document.getElementById('members').style.display).not.toBe('none');
  });

  it('hides a featured card added to the sidebar after load (MutationObserver path)', async () => {
    await boot({ html: '<ytd-watch-next-secondary-results-renderer><ytd-item-section-renderer></ytd-item-section-renderer></ytd-watch-next-secondary-results-renderer>' });

    const card = document.createElement('yt-lockup-view-model');
    card.id = 'lateFeatured';
    card.innerHTML = '<span class="ytBadgeShapeText">YouTube Featured</span>Sponsored';
    document.querySelector('ytd-item-section-renderer').appendChild(card);

    await flush();
    expect(document.getElementById('lateFeatured').style.display).toBe('none');
  });

  it('restores hidden cards when toggled off and re-hides them when toggled back on', async () => {
    const html = `
      <ytd-watch-next-secondary-results-renderer>
        <ytd-item-section-renderer>
          <yt-lockup-view-model id="featured"><span class="ytBadgeShapeText">YouTube Featured</span>Sponsored</yt-lockup-view-model>
          <yt-lockup-view-model id="rec">Video</yt-lockup-view-model>
        </ytd-item-section-renderer>
      </ytd-watch-next-secondary-results-renderer>`;
    const chrome = await boot({ html, enabled: true });

    expect(document.getElementById('featured').style.display).toBe('none');

    chrome.setEnabled(false);
    expect(document.getElementById('featured').style.display).not.toBe('none');
    expect(document.getElementById('rec').style.display).not.toBe('none');

    chrome.setEnabled(true);
    expect(document.getElementById('featured').style.display).toBe('none');
  });

  it('does nothing at all when the extension is disabled at load', async () => {
    const html = `
      <yt-lockup-view-model id="featured"><span class="ytBadgeShapeText">YouTube Featured</span>Sponsored</yt-lockup-view-model>`;
    await boot({ html, enabled: false });

    expect(document.getElementById('featured').style.display).not.toBe('none');
  });
});