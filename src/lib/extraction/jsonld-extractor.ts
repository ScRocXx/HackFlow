/**
 * Universal HTML & JSON-LD Metadata Extractor
 * Deterministically extracts verified W3C, OpenGraph, Twitter, and Schema.org metadata
 * before AI parsing.
 */

export interface ExtractedJsonLd {
  title?: string;
  startDate?: string;
  endDate?: string;
  organizer?: string;
  location?: string;
  mode?: 'online' | 'in-person' | 'hybrid';
  banner_url?: string;
  description?: string;
  raw_schema_type?: string;
  date_anchors?: string[];
}

export type ExtractedMetadata = ExtractedJsonLd;

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&bull;/g, '•')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return '';
      }
    });
}

/**
 * Extracts meta tag content by property or name attribute.
 * Supports standard (`property="..." content="..."`), inverted (`content="..." property="..."`),
 * and loosely-quoted/unquoted formats across multi-attribute tags.
 */
export function extractMetaTag(html: string, namesOrProperties: string[]): string | null {
  if (!html) return null;

  for (const item of namesOrProperties) {
    const escaped = item.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    // 1. Standard order: <meta (property|name|itemprop)="item" content="..." />
    // Matches double quotes, single quotes, or unquoted content
    const regex1 = new RegExp(
      `<meta\\b[^>]*\\b(?:property|name|itemprop)=["']?${escaped}["']?[^>]*\\bcontent=(?:"([^">]*)"|'([^'>]*)'|([^"'>\\s]+))`,
      'i'
    );
    const m1 = html.match(regex1);
    if (m1) {
      const val = (m1[1] ?? m1[2] ?? m1[3] ?? '').trim();
      if (val) return decodeHtmlEntities(val);
    }

    // 2. Inverted order: <meta content="..." (property|name|itemprop)="item" />
    const regex2 = new RegExp(
      `<meta\\b[^>]*\\bcontent=(?:"([^">]*)"|'([^'>]*)'|([^"'>\\s]+))[^>]*\\b(?:property|name|itemprop)=["']?${escaped}["']?`,
      'i'
    );
    const m2 = html.match(regex2);
    if (m2) {
      const val = (m2[1] ?? m2[2] ?? m2[3] ?? '').trim();
      if (val) return decodeHtmlEntities(val);
    }
  }

  return null;
}

const KNOWN_HOST_NAMES: Record<string, string> = {
  hackmit: 'HackMIT',
  calhacks: 'CalHacks',
  treehacks: 'TreeHacks',
  pennapps: 'PennApps',
  mhacks: 'MHacks',
  hackillinois: 'HackIllinois',
  devpost: 'Devpost',
  devfolio: 'Devfolio',
  unstop: 'Unstop',
  mlh: 'MLH',
  hackerearth: 'HackerEarth',
  dorahacks: 'DoraHacks',
  kaggle: 'Kaggle',
  luma: 'Luma',
  lu: 'Luma',
  github: 'GitHub',
  eventbrite: 'Eventbrite',
  mit: 'MIT',
  ibm: 'IBM',
  box: 'Box',
  aws: 'AWS',
  google: 'Google',
  microsoft: 'Microsoft',
  iit: 'IIT',
  bits: 'BITS',
};

// Known second-level domain designations in country-code TLDs (e.g. .co.in, .ac.uk, .edu.au)
const CC_SLDS = new Set(['co', 'com', 'org', 'net', 'edu', 'gov', 'ac', 'mil', 'gen', 'res', 'nic']);

/**
 * Extracts the root domain name and formats it into a human-readable organizer/host name.
 * e.g. "https://hackmit.org/2026" -> { root: "hackmit", displayName: "HackMIT" }
 * e.g. "https://my-challenge.co.in" -> { root: "my-challenge", displayName: "My Challenge" }
 * e.g. "https://hack.mit.edu" -> { root: "mit", displayName: "MIT" }
 * e.g. "https://app.box.com" -> { root: "box", displayName: "Box" }
 */
export function extractHostnameRoot(url?: string): { root: string; displayName: string } | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    const parts = hostname.split('.').filter(Boolean);

    if (parts.length === 0) return null;

    let rootPart = parts[0];
    if (parts.length >= 3) {
      const secondToLast = parts[parts.length - 2];
      const last = parts[parts.length - 1];
      
      // A two-part ccTLD (e.g. .co.in, .ac.uk) has a 2-letter country code as `last`
      // and a known SLD abbreviation as `secondToLast`
      const isTwoPartCcTld = last.length === 2 && (CC_SLDS.has(secondToLast) || secondToLast.length <= 2);
      
      if (isTwoPartCcTld) {
        rootPart = parts[parts.length - 3];
      } else {
        rootPart = parts[parts.length - 2];
      }
    } else if (parts.length === 2) {
      rootPart = parts[0];
    }

    if (!rootPart) return null;

    const lower = rootPart.toLowerCase();
    const displayName =
      KNOWN_HOST_NAMES[lower] ||
      rootPart
        .split(/[-_]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    return { root: rootPart, displayName };
  } catch {
    return null;
  }
}

const BRAND_PORTAL_KEYWORDS = new Set([
  'devpost',
  'devfolio',
  'unstop',
  'hackerearth',
  'mlh',
  'dorahacks',
  'kaggle',
  'luma',
  'eventbrite',
  'github',
  'internshala',
  'twitter',
  'x',
  'linkedin',
  'discord',
  'portal',
  'official website',
  'official site',
  'home',
  'platform',
  'taikai',
  'bemyapp',
  'major league hacking',
  'hackathon.com',
]);

/**
 * Cleans trailing site branding and pipe delimiters from competition titles.
 * e.g. "HackMIT 2026 | Registration & Info | Devpost" -> "HackMIT 2026 | Registration & Info"
 * e.g. "TechSprint 2026 - Unstop" -> "TechSprint 2026"
 */
export function cleanTitle(rawTitle: string, siteName?: string, rootDomain?: string): string {
  if (!rawTitle) return '';

  let title = decodeHtmlEntities(rawTitle)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip exact siteName suffix if present: "Title | SiteName" or "Title - SiteName"
  const candidatesToStrip = [siteName, rootDomain].filter((s): s is string => Boolean(s && s.length >= 2));
  for (const candidate of candidatesToStrip) {
    const escaped = candidate.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\s*[-|–—•:]\\s*${escaped}\\s*$`, 'i');
    title = title.replace(regex, '').trim();
  }

  // Check if trailing delimiter segment matches brand/portal keywords or generic site names
  for (const delimiter of [' | ', ' - ', ' – ', ' — ', ' • ']) {
    if (title.includes(delimiter)) {
      const parts = title.split(delimiter).map((p) => p.trim()).filter(Boolean);
      while (parts.length > 1) {
        const lastPart = parts[parts.length - 1].toLowerCase().replace(/^www\./, '');
        const isKnownBrand =
          BRAND_PORTAL_KEYWORDS.has(lastPart) ||
          (siteName && lastPart === siteName.toLowerCase()) ||
          (rootDomain && lastPart === rootDomain.toLowerCase()) ||
          (rootDomain && lastPart.includes(rootDomain.toLowerCase()));

        if (isKnownBrand) {
          parts.pop();
        } else {
          break;
        }
      }
      title = parts.join(delimiter).trim();
    }
  }

  // Clean all trailing delimiters and whitespace
  title = title.replace(/(?:\s*[-|–—•:]\s*)+$/, '').trim();

  return title;
}

/**
 * Scans HTML for universal ISO date anchors, OpenGraph event times, and standard <time> tags.
 * Chronologically sorts all anchors.
 */
export function extractUniversalDateAnchors(html: string): string[] {
  if (!html) return [];

  const anchors = new Set<string>();

  const tryAdd = (val?: string | null) => {
    if (!val) return;
    const trimmed = val.trim();
    if (trimmed) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
        anchors.add(d.toISOString());
      }
    }
  };

  // 1. <time datetime="..."> tags
  const timeTagRegex = /<time\b[^>]*\bdatetime=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = timeTagRegex.exec(html)) !== null) {
    tryAdd(match[1]);
  }

  // 2. Standard order meta dates: <meta (property|name|itemprop)="startDate" content="..." />
  const metaStandard =
    /<meta\b[^>]*\b(?:property|name|itemprop)=["'](?:startDate|endDate|eventStartDate|eventEndDate|event:start_time|event:end_time|og:start_time|releaseDate)["'][^>]*\bcontent=["']([^"']+)["']/gi;
  while ((match = metaStandard.exec(html)) !== null) {
    tryAdd(match[1]);
  }

  // 3. Inverted order meta dates: <meta content="..." (property|name|itemprop)="startDate" />
  const metaInverted =
    /<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\b(?:property|name|itemprop)=["'](?:startDate|endDate|eventStartDate|eventEndDate|event:start_time|event:end_time|og:start_time|releaseDate)["']/gi;
  while ((match = metaInverted.exec(html)) !== null) {
    tryAdd(match[1]);
  }

  return Array.from(anchors).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

/**
 * Universal Metadata Extractor
 * Combines Schema.org JSON-LD, OpenGraph, Twitter Cards, and W3C HTML standards
 * into a single verified baseline metadata object.
 */
export function extractMetadata(html: string, url?: string): ExtractedMetadata | null {
  if (!html) return null;

  try {
    const result: ExtractedMetadata = {};

    // 1. JSON-LD Schema.org Extraction
    const ldRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    const candidates: any[] = [];

    while ((match = ldRegex.exec(html)) !== null) {
      try {
        const rawContent = match[1].trim();
        if (!rawContent) continue;
        const parsed = JSON.parse(rawContent);
        if (Array.isArray(parsed)) {
          candidates.push(...parsed);
        } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          candidates.push(...parsed['@graph']);
        } else {
          candidates.push(parsed);
        }
      } catch {
        // Ignore JSON parse errors in individual script tags
      }
    }

    // Search for Event / Hackathon / Challenge candidate
    let eventItem = candidates.find((c) => {
      const type = (c['@type'] || '').toString().toLowerCase();
      return (
        type.includes('event') ||
        type.includes('hackathon') ||
        type.includes('competition') ||
        type.includes('challenge')
      );
    });

    if (!eventItem && candidates.length > 0) {
      // Fallback: check if any candidate has startDate or endDate
      eventItem = candidates.find((c) => c.startDate || c.endDate);
    }

    if (eventItem) {
      result.raw_schema_type = eventItem['@type'];
      if (eventItem.name) result.title = String(eventItem.name).trim();
      if (eventItem.description) result.description = String(eventItem.description).trim();

      // Verified Dates
      if (eventItem.startDate) {
        const d = new Date(eventItem.startDate);
        if (!isNaN(d.getTime())) {
          result.startDate = d.toISOString();
        }
      }
      if (eventItem.endDate) {
        const d = new Date(eventItem.endDate);
        if (!isNaN(d.getTime())) {
          result.endDate = d.toISOString();
        }
      }

      // Organizer
      if (eventItem.organizer) {
        if (typeof eventItem.organizer === 'string') {
          result.organizer = eventItem.organizer.trim();
        } else if (eventItem.organizer.name) {
          result.organizer = String(eventItem.organizer.name).trim();
        }
      }

      // Location & Attendance Mode
      const modeStr = String(eventItem.eventAttendanceMode || '').toLowerCase();
      if (modeStr.includes('online')) {
        result.mode = 'online';
      } else if (modeStr.includes('mixed')) {
        result.mode = 'hybrid';
      } else if (modeStr.includes('offline')) {
        result.mode = 'in-person';
      }

      if (eventItem.location) {
        if (typeof eventItem.location === 'string') {
          result.location = eventItem.location.trim();
        } else if (eventItem.location.name) {
          result.location = String(eventItem.location.name).trim();
        } else if (eventItem.location.address) {
          result.location =
            typeof eventItem.location.address === 'string'
              ? eventItem.location.address.trim()
              : String(eventItem.location.address.addressLocality || '').trim();
        }
      }

      // Banner Image
      if (eventItem.image) {
        let rawBanner: string | null = null;
        if (typeof eventItem.image === 'string') {
          rawBanner = eventItem.image.trim();
        } else if (Array.isArray(eventItem.image) && eventItem.image[0]) {
          rawBanner =
            typeof eventItem.image[0] === 'string'
              ? eventItem.image[0].trim()
              : String(eventItem.image[0].url || '').trim();
        } else if (eventItem.image.url) {
          rawBanner = String(eventItem.image.url).trim();
        }

        if (rawBanner) {
          if (rawBanner.startsWith('//')) {
            result.banner_url = `https:${rawBanner}`;
          } else if (url && (rawBanner.startsWith('/') || !/^https?:\/\//i.test(rawBanner))) {
            try {
              result.banner_url = new URL(rawBanner, url).href;
            } catch {
              result.banner_url = rawBanner;
            }
          } else {
            result.banner_url = rawBanner;
          }
        }
      }
    }

    // 2. Deterministic W3C & OpenGraph Metadata Fallbacks

    // Hostname root derivation
    const hostInfo = extractHostnameRoot(url);

    // Organizer / Host: og:site_name || author || hostname root
    if (!result.organizer) {
      const siteName = extractMetaTag(html, [
        'og:site_name',
        'twitter:site',
        'application-name',
        'author',
        'publisher',
      ]);
      if (siteName) {
        result.organizer = siteName.replace(/^@/, '').trim();
      } else if (hostInfo) {
        result.organizer = hostInfo.displayName;
      }
    }

    // Title: og:title || <title> || <h1>
    let rawTitle =
      result.title ||
      extractMetaTag(html, ['og:title', 'twitter:title']);

    if (!rawTitle) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        rawTitle = titleMatch[1];
      } else {
        const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1Match && h1Match[1]) {
          rawTitle = h1Match[1];
        }
      }
    }

    if (rawTitle) {
      result.title = cleanTitle(rawTitle, result.organizer, hostInfo?.displayName || hostInfo?.root);
    }

    // Banner: og:image || twitter:image
    if (!result.banner_url) {
      const ogImage = extractMetaTag(html, [
        'og:image',
        'og:image:url',
        'og:image:secure_url',
        'twitter:image',
        'twitter:image:src',
      ]);
      if (ogImage) {
        if (ogImage.startsWith('//')) {
          result.banner_url = `https:${ogImage}`;
        } else if (url && (ogImage.startsWith('/') || !/^https?:\/\//i.test(ogImage))) {
          try {
            result.banner_url = new URL(ogImage, url).href;
          } catch {
            result.banner_url = ogImage;
          }
        } else {
          result.banner_url = ogImage;
        }
      }
    }

    // Description: og:description || meta description
    if (!result.description) {
      const ogDesc = extractMetaTag(html, ['og:description', 'twitter:description', 'description']);
      if (ogDesc) {
        result.description = ogDesc.trim();
      }
    }

    // Universal Date Anchors
    const dateAnchors = extractUniversalDateAnchors(html);
    if (dateAnchors.length > 0) {
      result.date_anchors = dateAnchors;
      if (!result.startDate && dateAnchors[0]) {
        result.startDate = dateAnchors[0];
      }
      if (!result.endDate && dateAnchors.length > 1) {
        result.endDate = dateAnchors[dateAnchors.length - 1];
      }
    }

    if (Object.keys(result).length === 0) return null;

    return result;
  } catch (err) {
    console.warn('[Metadata Extractor] Error parsing HTML metadata:', err);
    return null;
  }
}

/**
 * Backward compatibility alias for extractJsonLd
 */
export const extractJsonLd = extractMetadata;
