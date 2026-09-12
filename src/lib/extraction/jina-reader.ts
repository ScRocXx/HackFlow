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
    'X-Wait-For-Selector': 'main, #content, .hackathon-content, .challenge-detail, .timeline',
    'X-Timeout': '30',
    'X-Remove-Selector': 'header, footer, nav, .cookie-banner, .advertisement, .sidebar, .mega-dropdown, .dropdown-menu, .is_header, .footer, .login-modal, .registration-modal',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  // Run JSON-LD extraction and Jina Reader in parallel for maximum speed
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
        return extractJsonLd(html);
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
      throw new Error(`Failed to fetch from Jina API: ${jinaResponse.status} ${jinaResponse.statusText}`);
    }

    const json = await jinaResponse.json();

    if (json.code !== 200) {
      throw new Error(`Jina API error: ${json.code} - ${JSON.stringify(json.status)}`);
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
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Fetch timed out after 30 seconds for URL: ${url}`);
      }
      throw error;
    }
    throw new Error('An unknown error occurred while fetching URL content');
  } finally {
    clearTimeout(timeoutId);
  }
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
    // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
