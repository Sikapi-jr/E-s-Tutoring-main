// Shared "self-heal by reloading" helper.
//
// After a deploy, a browser tab that's been open for a while can end up
// asking for a JS chunk (e.g. Home-abc123.js) that no longer exists on the
// server because a newer build replaced it with a different hash. That
// request falls through to the SPA's catch-all route and comes back as
// index.html instead of the chunk, which the browser then refuses to
// execute ("Expected a JavaScript-or-Wasm module script but the server
// responded with a MIME type of text/html").
//
// The fix is simply to reload the page: that re-fetches a fresh index.html
// which references the current chunk hashes. A short delay gives any
// in-flight requests a moment to settle first, and a per-tab guard stops
// this from looping forever if the error keeps recurring (e.g. the user is
// offline) - in that case we give up auto-reloading and let the caller show
// a manual fallback instead.

const STORAGE_KEY = 'egs-auto-reload-at';
const MIN_INTERVAL_MS = 30000; // don't auto-reload more than once per 30s

export function scheduleAutoReload(delayMs = 1500) {
  try {
    const last = sessionStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    if (last && now - parseInt(last, 10) < MIN_INTERVAL_MS) {
      console.warn('[autoReload] Skipping - already attempted a reload recently.');
      return false;
    }
    sessionStorage.setItem(STORAGE_KEY, String(now));
  } catch {
    // sessionStorage unavailable (private browsing etc.) - fall through and
    // reload anyway, just without loop protection.
  }

  setTimeout(() => {
    window.location.reload();
  }, delayMs);
  return true;
}

export function wasReloadedRecently() {
  try {
    const last = sessionStorage.getItem(STORAGE_KEY);
    return !!last && Date.now() - parseInt(last, 10) < MIN_INTERVAL_MS;
  } catch {
    return false;
  }
}
