/**
 * Universal link handling and URL normalization utilities.
 * Safe to import in both Client and Server components.
 */

/**
 * Checks if a host or URL points to localhost or loopback address.
 */
export function isLocalhost(urlOrHost: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(urlOrHost);
}

/**
 * Ensures an external URL has a valid protocol (https:// or http://).
 * Prevents browsers from treating external URLs (meet.google.com, github.com, etc.)
 * as relative paths on the local application server.
 */
export function ensureExternalUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already has protocol scheme (http://, https://, mailto:, tel:, etc.)
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*?:/.test(trimmed)) {
    return trimmed;
  }

  // Protocol relative
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // Prepend https://
  return `https://${trimmed}`;
}

/**
 * Sanitizes in-app notification links to ensure they navigate internally
 * via relative paths instead of pushing users to localhost or foreign addresses.
 */
export function sanitizeInternalLink(link?: string | null): string {
  if (!link) return '/dashboard';
  const trimmed = link.trim();
  if (!trimmed) return '/dashboard';

  // If already a relative path
  if (trimmed.startsWith('/')) return trimmed;

  // If it's a full URL (e.g. http://localhost:3000/events/xyz or https://hackflow.app/events/xyz)
  try {
    const parsed = new URL(trimmed);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/dashboard';
  } catch {
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*?:/.test(trimmed)) {
      return `/${trimmed.replace(/^\/+/, '')}`;
    }
    return trimmed;
  }
}

/**
 * Returns the base application URL based on client origin, environment variables,
 * or Vercel production deployment URLs.
 */
export function getAppUrl(): string {
  // If running in browser, the authoritative source is current window origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

  // Check user-configured NEXT_PUBLIC_APP_URL / APP_URL
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) {
    const sanitized = ensureExternalUrl(envUrl);
    // In production, ignore misconfigured localhost URLs
    if (!isProd || !isLocalhost(sanitized)) {
      return sanitized.replace(/\/+$/, '');
    }
  }

  // Check Vercel project canonical production domain (e.g. your-app.vercel.app or custom domain)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, '');
  }

  // Check Vercel deployment URL
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, '');
  }

  // Local development fallback
  return 'http://localhost:3000';
}
