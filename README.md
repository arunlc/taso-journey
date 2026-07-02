# Tsao Journey

Interactive scroll-driven page for the Tsao Family Office journey.

## What's in here

- `index.html` (~580 KB) — the page itself.
- `assets/` — 144 files (images, 4 videos, fonts, scripts) extracted from the
  original single-file bundle. Every file is under 3 MB, so everything can be
  uploaded through the GitHub website (25 MB per-file limit).
- `.nojekyll` — tells GitHub Pages to serve files as-is.
- `src/` — the editable source version (needs its own `assets/` and `uploads/`
  folders, not included). `tsao-ship.js` is legacy and unused.

`index.html` must stay next to the `assets/` folder — the references are
relative paths.

## Deploy on GitHub Pages

1. Create a new public repository (e.g. `tsao-journey`).
2. Upload everything in this folder. On github.com use "Add file → Upload
   files" and drag the whole contents in (you can drag the `assets` folder
   itself; GitHub keeps the folder structure). If it complains about too many
   files at once, upload `assets` in two or three batches — just make sure
   they all land inside a folder named `assets`.
3. Settings → Pages → Source: "Deploy from a branch" → Branch `main`,
   folder `/ (root)` → Save.
4. Live in a minute or two at `https://<your-username>.github.io/tsao-journey/`

Note: because the page now fetches real files, double-clicking index.html on
your desktop won't show it correctly (browsers block local file fetches).
Test it via the GitHub Pages URL, or run a local server
(`python3 -m http.server` in the folder, then open http://localhost:8000).

## Embed in Wix

1. Wix editor: Add Elements → Embed Code → **Embed a Site** (iframe).
2. Paste the GitHub Pages URL.
3. Stretch to full width and give it generous height (ideally full viewport).
   The page scrolls inside its own frame, so animations work normally.

## Why this layout is better than the single 27 MB file

- Uploads fit GitHub's 25 MB web-upload limit.
- The page appears immediately (~0.6 MB) while videos stream on demand
  instead of everything downloading up front.
- The browser caches each asset separately, so repeat visits are fast.
