import { extractJsonLd, type ExtractedJsonLd } from './jsonld-extractor';

export async function fetchUrlContent(url: string): Promise<{ 
  title: string; 
  content: string; 
  url: string; 
  jsonLd?: ExtractedJsonLd | null; 
}> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const apiKey = process.env.JINA_API_KEY;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Timeout': '30',
    'X-Remove-Selector': 'header, footer, nav, .cookie-banner, .advertisement, .sidebar, .mega-dropdown, .dropdown-menu, .is_header, .footer, .login-modal, .registration-modal',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  // Run JSON-LD extraction and Jina Reader in parallel for maximum speed
  let cachedJsonLd: ExtractedJsonLd | null = null;
  const jsonLdPromise = (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(7000)
      });
      if (res.ok) {
        const html = await res.text();
        cachedJsonLd = extractJsonLd(html);
        return cachedJsonLd;
      }
    } catch {
      // Ignore errors in direct fetch; Jina will serve as fallback
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

    if (!jinaResponse.ok) {
      console.warn(`Jina Reader returned status ${jinaResponse.status}. Falling back to Direct HTML fetch.`);
      return await fetchDirectHtmlFallback(url, jsonLd || cachedJsonLd);
    }

    const json = await jinaResponse.json();

    if (json.code !== 200) {
      console.warn(`Jina API code ${json.code}. Falling back to Direct HTML fetch.`);
      return await fetchDirectHtmlFallback(url, jsonLd || cachedJsonLd);
    }

    const { data } = json;
    const rawContent = data.content || '';
    const preFiltered = preFilterMarkdown(rawContent);

    return {
      title: jsonLd?.title || data.title || '',
      content: preFiltered || rawContent,
      url: data.url || url,
      jsonLd,
    };
  } catch (error) {
    console.warn(`Jina fetch failed for ${url}, trying direct HTML fallback:`, error);
    try {
      return await fetchDirectHtmlFallback(url, cachedJsonLd);
    } catch (fallbackError) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Fetch timed out after 30 seconds for URL: ${url}`);
        }
        throw error;
      }
      throw new Error('An unknown error occurred while fetching URL content');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchDirectHtmlFallback(url: string, existingJsonLd?: ExtractedJsonLd | null): Promise<{
  title: string;
  content: string;
  url: string;
  jsonLd?: ExtractedJsonLd | null;
}> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      throw new Error(`Direct fetch HTTP ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    const jsonLd = existingJsonLd || extractJsonLd(html);
    const { title, text } = htmlToCleanText(html);
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

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

export function htmlToCleanText(html: string): { title: string; text: string } {
  if (!html) return { title: '', text: '' };

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';

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
    return cleanContent ? `[${cleanContent}](${href})` : '';
  });

  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n* $1');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|section|tr|table|article|aside)>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeHtmlEntities(text);
  text = text.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/gi, '');
  text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();

  return { title, text };
}

/**
 * Strategy C: Pre-Filter the Scraped Markdown
 * Strips out 80%+ of extraneous portal marketing clutter, footers, and recommendation lists
 * while preserving high-signal timeline, stage, prize, and eligibility text.
 */
export function preFilterMarkdown(raw: string): string {
  if (!raw) return '';

  let cleaned = cleanMarkdownContent(raw);

  // 1. Cut off everything below common footer / recommendation sections
  const cutOffPatterns = [
    /##?\s*(?:Other|Similar|Recommended|Upcoming)\s*(?:Hackathons|Challenges|Events|Opportunities)[\s\S]*/i,
    /##?\s*(?:Explore|More)\s*(?:Opportunities|Challenges|Hackathons)[\s\S]*/i,
    /##?\s*(?:People\s*also\s*viewed|Related\s*contests)[\s\S]*/i,
    /\n---\n\s*\[(?:Privacy Policy|Terms of Service|About Us)\][\s\S]*/i,
    /©\s*\d{4}[^\n]*(?:All rights reserved|Private Limited)[\s\S]*/i,
  ];

  for (const pattern of cutOffPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 2. Strip excessive social media share blocks and app store download links
  cleaned = cleaned
    .replace(/\* \[Share on (?:WhatsApp|Facebook|Twitter|LinkedIn|X)\][^\n]*/gi, '')
    .replace(/\[Download on (?:Google Play|App Store)\][^\n]*/gi, '')
    .replace(/Download the App[\s\S]*?(?:App Store|Google Play)[^\n]*/gi, '');

  return cleaned.trim();
}

export function cleanMarkdownContent(raw: string): string {
  if (!raw) return '';
  return raw
    // Remove navigation link blocks
    .replace(/\[(?:Jobs|Internships|Fresher Jobs|Placement Courses)[^\]]*\]\([^)]+\)/gi, '')
    .replace(/\* \[Jobs in [^\]]+\]\([^)]+\)/gi, '')
    .replace(/Internship by (?:Places|Stream)[\s\S]*?View all internship[^\n]*/gi, '')
    .replace(/Jobs by (?:Places|Type)[\s\S]*?View all jobs[^\n]*/gi, '')
    .replace(/Fresher Jobs by (?:Places|Type)[\s\S]*?View all fresher jobs[^\n]*/gi, '')
    .replace(/\[Forgot Password\?\][\s\S]*?Register now[^\n]*/gi, '')
    // Strip giant base64 data URIs
    .replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/gi, '')
    // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
