(function () {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const BADGE_TEXT = 'youtube featured';

  const CARD_SELECTORS = [
    'ytd-compact-promoted-video-renderer',
    'ytd-promoted-video-renderer',
    'ytd-ad-slot-renderer',
    'ytd-statement-banner-renderer',
    'ytd-rich-item-renderer',
    'ytd-grid-video-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-playlist-video-renderer'
  ];

  let enabled = false;
  const hiddenCards = new Set();
  let scanScheduled = false;

  function badgeText(el) {
    return (el.textContent || '').trim().toLowerCase();
  }

  function badgesIn(root) {
    const candidates = root.querySelectorAll('.ytBadgeShapeText, yt-badge, ytd-badge-supported-renderer');
    const badges = new Set();
    for (const el of candidates) {
      if (badgeText(el) === BADGE_TEXT) badges.add(el);
    }
    return badges;
  }

  function cardFor(badgeEl) {
    const known = [];
    const others = [];
    let el = badgeEl.parentElement;
    while (el && el !== document.documentElement) {
      if (el.localName.startsWith('ytd-') && el.localName.endsWith('-renderer')) {
        (CARD_SELECTORS.includes(el.localName) ? known : others).push(el);
      }
      el = el.parentElement;
    }
    const pool = known.length ? known : others;
    if (pool.length === 0) return null;

    const promoted = pool.filter((m) =>
      m.localName.includes('promoted') ||
      m.localName.includes('ad-slot') ||
      m.localName.includes('statement-banner')
    );
    if (promoted.length) return promoted[promoted.length - 1];
    return pool[pool.length - 1];
  }

  function hideCard(card) {
    if (hiddenCards.has(card)) return;
    hiddenCards.add(card);
    card.style.setProperty('display', 'none', 'important');
  }

  function restoreCard(card) {
    if (!hiddenCards.has(card)) return;
    card.style.removeProperty('display');
    hiddenCards.delete(card);
  }

  function scanDocument() {
    if (!enabled) return;
    for (const badge of badgesIn(document)) {
      const card = cardFor(badge);
      if (card) hideCard(card);
    }
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    setTimeout(() => {
      scanScheduled = false;
      scanDocument();
    }, 120);
  }

  api.storage.local.get('enabled', (result) => {
    enabled = !!result.enabled;
    if (enabled) scanDocument();
  });

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.enabled) return;
    const on = !!changes.enabled.newValue;
    if (on && !enabled) {
      enabled = true;
      scanDocument();
    } else if (!on && enabled) {
      enabled = false;
      for (const card of hiddenCards) restoreCard(card);
    }
  });

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.addedNodes.length) {
        scheduleScan();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();