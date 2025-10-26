// src/lib/swrCache.js
// A simple "stale-while-revalidate" localStorage cache

export function getCached(key, { version }) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { v, t, data } = JSON.parse(raw);
    if (v !== version) return null;       // cache invalid if version changed
    return { ageMs: Date.now() - t, data };
  } catch {
    return null;
  }
}

export function setCached(key, { version, data }) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: version, t: Date.now(), data }));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Stale-while-revalidate helper
 * @param {Object} opts
 * @param {string} opts.key - storage key
 * @param {string} opts.version - bump to invalidate cache
 * @param {Function} opts.fetcher - async fn returning fresh data
 * @param {Function} [opts.onUpdate] - called when fresh data arrives
 * @param {number} [opts.ttlMs] - time-to-live in ms (default 24h)
 */
export async function swr({
  key,
  version,
  fetcher,
  onUpdate,
  ttlMs = 24 * 60 * 60 * 1000,
}) {
  const cached = getCached(key, { version });
  const now = Date.now();

  if (cached?.data) {
    // show cached immediately
    if (onUpdate) onUpdate(cached.data);

    // if stale, refresh in background
    if (now - (now - cached.ageMs) > ttlMs) {
      fetcher()
        .then((fresh) => {
          setCached(key, { version, data: fresh });
          if (onUpdate) onUpdate(fresh);
        })
        .catch(() => {});
    }
    return cached.data;
  }

  // no cache → fetch fresh and store
  const fresh = await fetcher();
  setCached(key, { version, data: fresh });
  if (onUpdate) onUpdate(fresh);
  return fresh;
}