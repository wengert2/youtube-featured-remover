(function () {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const BADGE_TEXT = 'youtube featured';

  const CARD_SELECTORS = [
    'yt-lockup-view-model',
    'ytd-compact-promoted-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-promoted-video-renderer',
    'ytd-ad-slot-renderer',
    'ytd-statement-banner-renderer',
    'ytd-rich-item-renderer',
    'ytd-rich-grid-slim-media',
    'ytd-grid-video-renderer',
    'ytd-video-renderer',
    'ytd-playlist-video-renderer'
  ];

  const CONTAINER_SELECTORS = [
    'ytd-watch-next-secondary-results-renderer',
    'ytd-item-section-renderer',
    'ytd-section-list-renderer',
    'ytd-rich-grid-renderer',
    'ytd-rich-grid-row',
    'ytd-shelf-renderer',
    'ytd-horizontal-list-renderer',
    'ytd-reel-shelf-renderer',
    'ytd-rich-section-renderer'
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
    let el = badgeEl.parentElement;
    while (el && el !== document.documentElement) {
      if (CARD_SELECTORS.includes(el.localName)) return el;
      if (CONTAINER_SELECTORS.includes(el.localName)) return null;
      el = el.parentElement;
    }
    return null;
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