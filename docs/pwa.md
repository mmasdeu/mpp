# PWA and offline behaviour

- **Install:** `static/manifest.webmanifest` (Catalan, standalone, relative URLs so it works under a GitHub Pages sub-path) and icons in `static/icons/` (regenerate with `node scripts/make-icons.mjs`).
- **Service worker** (`src/service-worker.ts`, policy in `src/lib/pwa/policy.ts`):
  - Install precaches the app bundle, static files and every prerendered page *except* the per-needle pages (small first install); images are not precached.
  - Needle pages are cached when visited, or all at once from `/offline/` ("Descarrega totes les fitxes").
  - Navigation is network-first with a 3.5 s timeout, then cache, then the SPA fallback shell (`404.html`, re-served as 200). Because the dataset is bundled
    in the JS, even never-visited needle pages render offline.
  - Images are cached on first view, capped at 80. Third-party requests (map tiles) are never cached (provider licensing); offline the map shows markers on an empty background.
  - Caches are versioned per deployment (`shell-<v>`, `pages-<v>`); old ones are deleted on activation.
- **Feedback:** an offline banner in the layout and the `/offline/` page (status, what works, storage used, clear, install button).
- **Testing:** `npm run test:e2e` builds the site and serves `build/` with `scripts/serve-static.mjs`, which mimics GitHub Pages (404 status with `404.html` for unknown paths);
  `vite preview` is *not* used because it does not serve the real fallback page. Run with `BASE_PATH=/repo-name` to test sub-path deployment.
- **Updates:** a new deployment installs a new service worker, which takes over immediately (`skipWaiting` + `clients.claim`).
