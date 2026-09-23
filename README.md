# YouTube Featured Remover

A Manifest V3 browser extension that hides "YouTube featured" (promoted) cards on YouTube.

## Features

- Removes the entire card/video containing the "YouTube featured" badge, so the layout stays clean
- On/off toggle via a toolbar popup; setting persists across browser restarts
- Live updates: toggling off restores already-hidden cards without a page reload
- MutationObserver handles YouTube's SPA navigation and lazy-loading

## Install

### Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder
4. Pin the extension (puzzle icon) to access the toggle

### Firefox

1. Go to `about:debugging` → **This Firefox**
2. Click **Load Temporary Add-on…** and select `manifest.json`
3. Note: temporary add-ons are session-only; a permanent install requires signing via AMO

## Usage

Click the toolbar icon to open the popup and toggle hiding on/off.

## Structure

```
manifest.json   MV3 manifest, shared by both browsers
content.js      Finds "YouTube featured" badges and hides the surrounding card
popup.html      Toggle UI
popup.css
popup.js        Reads/writes state via storage.local
icons/          Toolbar icons
```

The extension uses no background worker; the popup and content script communicate through `storage.local`, which behaves identically in Chrome and Firefox.

## Testing changes

Chrome: refresh the extension on `chrome://extensions`, then reload the YouTube tab.

Firefox: temporary add-ons auto-refresh, but reload the YouTube tab to re-inject the content script.

If a "featured" card isn't hidden, inspect it in DevTools and check the card's renderer tag against `CARD_SELECTORS` in `content.js`.

## License

MIT — see [LICENSE](LICENSE).