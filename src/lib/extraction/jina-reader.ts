import { extractJsonLd, type ExtractedJsonLd, cleanTitle, decodeHtmlEntities } from './jsonld-extractor';

export async function fetchUrlContent(url: string): Promise<{ 
  title: string; 
  content: string; 
  url: string; 
  jsonLd?: ExtractedJsonLd | null; 
}> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const apiKey = process.env.JINA_API_KEY;

  // Site-agnostic headers with zero platform-specific selector pruning
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Timeout': '4',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  // Run universal metadata extraction and Jina Reader in parallel for maximum speed
  let cachedHtml: string | null = null;
  let cachedJsonLd: ExtractedJsonLd | null = null;

  const jsonLdPromise = (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        cachedHtml = await res.text();
        cachedJsonLd = extractJsonLd(cachedHtml, url);
        return cachedJsonLd;
      }
    } catch {
      // Ignore direct fetch errors; Jina will serve as primary reader
    }
    return null;
  })();

  try {
    const [jinaResponse, jsonLd] = await Promise.all([
      fetch(jinaUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      }),
      jsonLdPromise,
    ]);

    const metadata = jsonLd || cachedJsonLd;

    if (!jinaResponse.ok) {
      console.warn(`Jina Reader returned status ${jinaResponse.status}. Falling back to Direct HTML fetch.`);
      return await fetchDirectHtmlFallback(url, metadata, cachedHtml);
    }

    const json = await jinaResponse.json();

    if (json.code !== 200) {
      console.warn(`Jina API code ${json.code}. Falling back to Direct HTML fetch.`);
      return await fetchDirectHtmlFallback(url, metadata, cachedHtml);
    }

    const { data } = json;
    const rawContent = data.content || '';
    const preFiltered = preFilterMarkdown(rawContent);

    // Clean page title from Jina or use verified metadata title
    const resolvedTitle = metadata?.title || cleanTitle(data.title || '', metadata?.organizer) || '';

    return {
      title: resolvedTitle,
      content: preFiltered || rawContent,
      url: data.url || url,
      jsonLd: metadata,
    };
  } catch (error) {
    console.warn(`Jina fetch failed for ${url}, trying direct HTML fallback:`, error);
    try {
      return await fetchDirectHtmlFallback(url, cachedJsonLd, cachedHtml);
    } catch (fallbackError) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Fetch timed out after 4 seconds for URL: ${url}`);
        }
        throw error;
      }
      throw new Error('An unknown error occurred while fetching URL content');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchDirectHtmlFallback(
  url: string, 
  existingJsonLd?: ExtractedJsonLd | null,
  existingHtml?: string | null
): Promise<{
  title: string;
  content: string;
  url: string;
  jsonLd?: ExtractedJsonLd | null;
}> {
  try {
    let html = existingHtml;
    if (!html) {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) {
        throw new Error(`Direct fetch HTTP ${res.status}: ${res.statusText}`);
      }

      html = await res.text();
    }

    const jsonLd = existingJsonLd || extractJsonLd(html, url);
    const { title, text } = htmlToCleanText(html, url, jsonLd?.organizer);
    const preFiltered = preFilterMarkdown(text);

    return {
      title: jsonLd?.title || title || 'Competition Details',
      content: preFiltered || text,
      url,
      jsonLd,
    };
  } catch (directErr: any) {
    throw new Error(`Failed to fetch contest URL via Jina Reader and Direct HTML: ${directErr?.message || 'Network error'}`);
  }
}

export function htmlToCleanText(html: string, url?: string, organizer?: string): { title: string; text: string } {
  if (!html) return { title: '', text: '' };

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';
  const title = cleanTitle(rawTitle, organizer);

  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  text = text.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n#### $1\n');

  text = text.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, content) => {
    const cleanContent = content.replace(/<[^>]+>/g, '').trim();
    if (!cleanContent) return '';
    let fullUrl = href;
    if (url && (href.startsWith('/') || !/^https?:\/\//i.test(href))) {
      try {
        fullUrl = new URL(href, url).href;
      } catch {
        fullUrl = href;
      }
    }
    return `[${cleanContent}](${fullUrl})`;
  });

  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n* $1');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|section|tr|table|article|aside)>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeHtmlEntities(text);
  text = preFilterMarkdown(text);

  return { title, text };
}

/**
 * Universal Non-Destructive Markdown Sanitizer
 * Strips ONLY pure technical garbage (base64 data URIs, raw SVGs, scripts, styles)
 * and collapses excessive newlines.
 * NEVER uses heuristic regex to cut off schedules, stages, or body sections.
 */
export function preFilterMarkdown(raw: string): string {
  if (!raw) return '';

  return raw
    // Strip giant base64 data URIs of any media or font type
    .replace(/data:(?:image|font|application)\/[^;]+;base64,[A-Za-z0-9+/=\s\r\n-_]+(?=["'\)\s>]|$)/gi, '')
    .replace(/data:image\/[^;]+;base64,[^\s"'\)>]+/gi, '')
    // Strip raw SVG tags or SVG data URIs
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/data:image\/svg\+xml;[^\s\)]+/gi, '')
    // Strip any residual script or style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Collapse excessive empty newlines while preserving all readable content
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

export function cleanMarkdownContent(raw: string): string {
  return preFilterMarkdown(raw);
}
