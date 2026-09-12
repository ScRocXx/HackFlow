/**
 * Deterministic JSON-LD Schema.org extractor
 * Extracts verified timestamps, locations, and organizers before AI parsing
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
}

export function extractJsonLd(html: string): ExtractedJsonLd | null {
  if (!html) return null;

  try {
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
      // Check if any candidate has startDate or endDate
      eventItem = candidates.find((c) => c.startDate || c.endDate);
    }

    const result: ExtractedJsonLd = {};

    if (eventItem) {
      result.raw_schema_type = eventItem['@type'];
      if (eventItem.name) result.title = String(eventItem.name).trim();
      if (eventItem.description) result.description = String(eventItem.description).trim();

      // Dates
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
          result.organizer = eventItem.organizer;
        } else if (eventItem.organizer.name) {
          result.organizer = String(eventItem.organizer.name);
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
          result.location = eventItem.location;
        } else if (eventItem.location.name) {
          result.location = String(eventItem.location.name);
        } else if (eventItem.location.address) {
          result.location = typeof eventItem.location.address === 'string' 
            ? eventItem.location.address 
            : eventItem.location.address.addressLocality || '';
        }
      }

      // Banner Image
      if (eventItem.image) {
        if (typeof eventItem.image === 'string') {
          result.banner_url = eventItem.image;
        } else if (Array.isArray(eventItem.image) && eventItem.image[0]) {
          result.banner_url = typeof eventItem.image[0] === 'string' ? eventItem.image[0] : eventItem.image[0].url;
        } else if (eventItem.image.url) {
          result.banner_url = eventItem.image.url;
        }
      }
    }

    // OpenGraph fallback for missing metadata
    const ogTitleMatch = html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (!result.title && ogTitleMatch) {
      result.title = ogTitleMatch[1].trim();
    }

    const ogImageMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (!result.banner_url && ogImageMatch) {
      result.banner_url = ogImageMatch[1].trim();
    }

    const ogDescMatch = html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (!result.description && ogDescMatch) {
      result.description = ogDescMatch[1].trim();
    }

    if (Object.keys(result).length === 0) return null;

    return result;
  } catch (err) {
    console.warn('[JSON-LD Extractor] Error parsing HTML metadata:', err);
    return null;
  }
}
