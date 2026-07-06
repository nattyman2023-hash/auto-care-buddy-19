## Stop the repeated broken preview/cache loop

Fix the app so a stale PWA service worker or cached document cannot repeatedly reload a broken Lovable preview URL.

### What will change

1. **Disable PWA registration in Lovable preview/dev hosts**
   - Keep the PWA enabled for the published site and custom domain.
   - Do not register a service worker on `*.lovable.app` preview/development hosts.

2. **Add an early cache reset safety guard**
   - On preview/dev hosts, before React renders, unregister any existing service workers and clear browser caches from older builds.
   - Remove accidental `code` / token-style query parameters from preview URLs by replacing the URL with the clean path.

3. **Make cache diagnostics easier to reach**
   - Keep the existing `/cache-diagnostics` page for manual clearing.
   - Add support for a URL-triggered clear, e.g. `/cache-diagnostics?clear=1`, so cache reset can run immediately when the page loads.

### Expected result

- The preview should stop showing the recurring sad-file/broken cached URL screen.
- Published users still get PWA/offline behavior.
- Future preview sessions should recover automatically from stale caches instead of needing repeated manual clearing.

### Files to update

- `src/main.tsx`
- `src/components/PwaUpdatePrompt.tsx`
- `src/pages/CacheDiagnostics.tsx`