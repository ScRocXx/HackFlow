import { headers } from 'next/headers';
import { getAppUrl, isLocalhost } from './url';

/**
 * Server-only base URL resolution.
 * Detects the runtime domain from incoming request headers (x-forwarded-host, host),
 * falling back to environment variables and Vercel domains.
 *
 * @param request Optional incoming Request object (e.g. from an API route)
 */
export function getServerBaseUrl(request?: Request): string {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

  const isValidHost = (h: string | null | undefined): h is string => {
    if (!h) return false;
    if (isProd && isLocalhost(h)) return false;
    return true;
  };

  // 1. Explicit request object
  if (request) {
    try {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const proto = request.headers.get('x-forwarded-proto') || (isProd ? 'https' : 'http');
      if (isValidHost(forwardedHost)) {
        return `${proto}://${forwardedHost}`.replace(/\/+$/, '');
      }
      const host = request.headers.get('host');
      if (isValidHost(host)) {
        return `${proto}://${host}`.replace(/\/+$/, '');
      }
      const origin = request.headers.get('origin');
      if (isValidHost(origin)) {
        return origin.replace(/\/+$/, '');
      }
      const referer = request.headers.get('referer');
      if (referer) {
        try {
          const refOrigin = new URL(referer).origin;
          if (isValidHost(refOrigin)) {
            return refOrigin.replace(/\/+$/, '');
          }
        } catch {}
      }
      const reqOrigin = new URL(request.url).origin;
      if (isValidHost(reqOrigin)) {
        return reqOrigin.replace(/\/+$/, '');
      }
    } catch {}
  }

  // 2. Next.js request headers via next/headers (Server Actions, Route Handlers, SSR)
  try {
    const reqHeaders = headers();
    const forwardedHost = reqHeaders.get('x-forwarded-host');
    const proto = reqHeaders.get('x-forwarded-proto') || (isProd ? 'https' : 'http');
    if (isValidHost(forwardedHost)) {
      return `${proto}://${forwardedHost}`.replace(/\/+$/, '');
    }
    const host = reqHeaders.get('host');
    if (isValidHost(host)) {
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
    const origin = reqHeaders.get('origin');
    if (isValidHost(origin)) {
      return origin.replace(/\/+$/, '');
    }
    const referer = reqHeaders.get('referer');
    if (referer) {
      try {
        const refOrigin = new URL(referer).origin;
        if (isValidHost(refOrigin)) {
          return refOrigin.replace(/\/+$/, '');
        }
      } catch {}
    }
  } catch {
    // headers() might not be available in non-request contexts
  }

  // 3. Fallback to getAppUrl (environment variables, Vercel system domains, or PRODUCTION_APP_URL)
  return getAppUrl();
}
