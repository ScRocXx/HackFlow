/**
 * Ephemeral Raw Text Stash
 * Caches the sanitized raw markdown / HTML text from Jina Reader / Scraper with a 10-minute TTL.
 * 
 * Why: Caching parsed JSON is a trap because if Gemini hallucinates or misses a stage,
 * a hard cache locks the user into bad data. By caching the RAW TEXT instead:
 * - "Re-parse" skips scraping (saving 8-10s network latency & portal rate limits)
 * - Gemini can be re-invoked with alternate prompting or temperature
 * - "Fresh Re-scrape" bypasses the stash to fetch live updates from source.
 */

interface StashedContent {
  rawText: string;
  finalUrl: string;
  jsonLd: any | null;
  pageTitle?: string;
  stashedAt: number;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 20; // Serverless memory bound

// In-memory cache keyed by normalized URL string
const rawTextStash = new Map<string, StashedContent>();

function normalizeUrlKey(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Clean up expired entries periodically and bound cache size
 */
function purgeExpired() {
  const now = Date.now();
  for (const [key, value] of rawTextStash.entries()) {
    if (now - value.stashedAt > TTL_MS) {
      rawTextStash.delete(key);
    }
  }
  while (rawTextStash.size >= MAX_ENTRIES) {
    const oldestKey = rawTextStash.keys().next().value;
    if (oldestKey) rawTextStash.delete(oldestKey);
    else break;
  }
}

export function stashRawText(url: string, data: {
  rawText: string;
  finalUrl?: string;
  jsonLd?: any | null;
  pageTitle?: string;
}): void {
  if (!url || !data.rawText) return;
  purgeExpired();
  const key = normalizeUrlKey(url);
  rawTextStash.set(key, {
    rawText: data.rawText,
    finalUrl: data.finalUrl || url,
    jsonLd: data.jsonLd || null,
    pageTitle: data.pageTitle,
    stashedAt: Date.now(),
  });
}

export function getStashedRawText(url: string): StashedContent | null {
  if (!url) return null;
  purgeExpired();
  const key = normalizeUrlKey(url);
  const entry = rawTextStash.get(key);
  if (!entry) return null;

  if (Date.now() - entry.stashedAt > TTL_MS) {
    rawTextStash.delete(key);
    return null;
  }

  return entry;
}

export function clearStashedRawText(url: string): void {
  if (!url) return;
  const key = normalizeUrlKey(url);
  rawTextStash.delete(key);
}

export function getStashStats(): { size: number } {
  purgeExpired();
  return { size: rawTextStash.size };
}
