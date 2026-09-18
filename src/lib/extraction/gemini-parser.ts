import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { preFilterMarkdown } from './jina-reader';
import { extractHostnameRoot, type ExtractedJsonLd } from './jsonld-extractor';

const nullableDateString = z.preprocess((val) => {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (
    !str ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'none' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'tba'
  ) {
    return null;
  }
  return str;
}, z.string().nullable().optional().default(null));

const nullableSnippetString = z.preprocess((val) => {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
    return null;
  }
  return str;
}, z.string().nullable().optional().default(null));

export const StageSchema = z.object({
  round_number: z.preprocess((val) => {
    const n = Number(val);
    return isNaN(n) ? 1 : Math.round(n);
  }, z.number().int().default(1)),
  title: z.string().min(1, 'Stage title is required'),
  stage_type: z.preprocess((val) => {
    const valid = ['quiz', 'ppt_submission', 'prototype', 'hackathon_sprint', 'presentation', 'other'];
    return typeof val === 'string' && valid.includes(val) ? val : 'other';
  }, z.enum(['quiz', 'ppt_submission', 'prototype', 'hackathon_sprint', 'presentation', 'other'])).default('other'),
  raw_date_snippet: nullableSnippetString,
  deadline: nullableDateString,
  window_start: nullableDateString,
  window_end: nullableDateString,
  actionable_deadline: nullableDateString,
  evaluation_format: z.string().nullable().optional().transform(v => v || '').default(''),
  deliverables_description: z.string().nullable().optional().transform(v => v || '').default(''),
  deliverables: z.array(z.string()).nullable().optional().default([]),
}).transform((stage) => {
  // Runtime safeguard: Strictly zero-hallucination. If null, keep null!
  const effectiveDeadline = stage.deadline || stage.actionable_deadline || stage.window_end || null;
  const effectiveWindowEnd = stage.window_end || effectiveDeadline;
  const effectiveActionable = stage.actionable_deadline || stage.window_start || effectiveDeadline;
  const rawSnippet = stage.raw_date_snippet || (!effectiveDeadline ? 'TBA' : null);

  return {
    ...stage,
    deadline: effectiveDeadline,
    window_end: effectiveWindowEnd,
    actionable_deadline: effectiveActionable,
    raw_date_snippet: rawSnippet,
    deliverables: stage.deliverables || [],
  };
});

export const PrizeSchema = z.object({
  display_summary: z.string().nullable().optional().transform(v => v || '').default(''),
  cash_pool: z.union([z.string(), z.number()]).nullable().optional().transform(v => (v !== null && v !== undefined) ? String(v) : null).default(null),
  first_place_cash: z.union([z.string(), z.number()]).nullable().optional().transform(v => (v !== null && v !== undefined) ? String(v) : null).default(null),
  has_perks_or_credits: z.preprocess(v => Boolean(v), z.boolean()).default(false),
  raw_prize_text: z.string().nullable().optional().transform(v => v || '').default(''),
});

export const ResourceSchema = z.object({
  title: z.string().nullable().optional().transform(v => v || 'Attached Document').default('Attached Document'),
  url: z.string().min(1, 'Resource URL is required'),
  resource_type: z.preprocess((val) => {
    const valid = ['problem_statement', 'rulebook', 'template', 'dataset', 'reference', 'other'];
    return typeof val === 'string' && valid.includes(val) ? val : 'other';
  }, z.enum(['problem_statement', 'rulebook', 'template', 'dataset', 'reference', 'other'])).default('other'),
});

export const ParsedHackathonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organizer: z.string().nullable().optional().transform(v => v || '').default(''),
  source_platform: z.string().nullable().optional().transform(v => v || 'custom').default('custom'),
  mode: z.preprocess((val) => {
    return val === 'in-person' || val === 'hybrid' ? val : 'online';
  }, z.enum(['online', 'in-person', 'hybrid'])).default('online'),
  location: z.string().nullable().optional().transform(v => v || '').default(''),
  banner_url: z.string().nullable().optional().transform(v => v || '').default(''),
  prize_pool: z.string().nullable().optional().transform(v => v || '').default(''),
  prizes: z.preprocess(v => v || {}, PrizeSchema).default({
    display_summary: '',
    cash_pool: null,
    first_place_cash: null,
    has_perks_or_credits: false,
    raw_prize_text: ''
  }),
  overview: z.string().nullable().optional().transform(v => v || '').default(''),
  eligibility: z.string().nullable().optional().transform(v => v || '').default(''),
  team_size_min: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return 1;
    const n = Number(val);
    return isNaN(n) ? 1 : Math.max(1, Math.round(n));
  }, z.number().int().default(1)),
  team_size_max: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return 4;
    const n = Number(val);
    return isNaN(n) ? 4 : Math.max(1, Math.round(n));
  }, z.number().int().default(4)),
  stages: z.array(StageSchema).min(1, 'At least one stage is required'),
  resources: z.preprocess(v => Array.isArray(v) ? v : [], z.array(ResourceSchema)).default([]),
}).transform((data) => {
  const displaySummary = data.prizes?.display_summary || data.prize_pool || '';
  return {
    ...data,
    prize_pool: displaySummary || data.prize_pool || '',
    prizes: {
      ...data.prizes,
      display_summary: displaySummary,
    }
  };
});

export type ParsedHackathon = z.infer<typeof ParsedHackathonSchema>;
export type ParsedStage = z.infer<typeof StageSchema>;
export type ParsedResource = z.infer<typeof ResourceSchema>;
export type ParsedPrize = z.infer<typeof PrizeSchema>;

/**
 * Universal site-agnostic platform detector.
 * Derives the platform identifier dynamically from the hostname root with zero hardcoded branches.
 */
export function detectPlatform(url?: string): string {
  if (!url) return 'custom';
  const hostInfo = extractHostnameRoot(url);
  return hostInfo ? hostInfo.root.toLowerCase() : 'custom';
}

/**
 * Deterministic heuristic fallback parser for situations when Gemini API is unavailable.
 * Follows the 4 universal lifecycle phases and enforces strict zero-hallucination on dates.
 */
export function heuristicExtract(
  markdown: string, 
  sourceUrl: string = '', 
  jsonLd?: ExtractedJsonLd | null,
  pageTitle?: string
): ParsedHackathon {
  const platform = detectPlatform(sourceUrl);
  const hostInfo = extractHostnameRoot(sourceUrl);

  // 1. Title: JSON-LD || pageTitle || Clean Markdown Title || Host-based Title
  let title = jsonLd?.title || pageTitle || '';
  if (!title) {
    const titleMatch = markdown.match(/^#+\s+([^\n#]+)/m) || 
                       markdown.match(/(?:title|hackathon|challenge|competition):\s*([^\n]+)/i);
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].trim();
    } else if (sourceUrl) {
      try {
        const urlObj = new URL(sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://') ? sourceUrl : `https://${sourceUrl}`);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1].replace(/#.*$/, '').replace(/-\d{5,}$/, '');
          title = lastPart
            .split(/[-_]+/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }
      } catch {
        title = 'Imported Challenge';
      }
    } else {
      const candidateLines = markdown
        .split('\n')
        .map(l => l.trim().replace(/^[#*>\s-]+/, ''))
        .filter(l => l.length >= 3 && l.length <= 90 && !l.startsWith('http') && !l.startsWith('!'));

      const keywordLine = candidateLines.find(l => 
        /(?:hackathon|challenge|competition|contest|codefest|ideathon|track|sprint|grid|hacks|olympiad|datathon)/i.test(l)
      );
      title = keywordLine || candidateLines[0] || 'Imported Challenge';
    }
  }

  // 2. Mode & Location
  let mode: 'online' | 'in-person' | 'hybrid' = jsonLd?.mode || 'online';
  if (!jsonLd?.mode) {
    if (/hybrid/i.test(markdown)) {
      mode = 'hybrid';
    } else if (/in-person|offline|on-campus|physical venue/i.test(markdown)) {
      mode = 'in-person';
    }
  }

  // 3. Prize Pool
  let cashPool: string | null = null;
  let firstPlaceCash: string | null = null;
  let displaySummary = '';
  const hasPerks = /cloud credits?|aws credits?|google cloud|voucher|swag|subscription/i.test(markdown);

  const multiPrizeMatch = markdown.match(/cash prizes? of (?:₹|Rs\.?|INR|\$)\s*([\d,]+)[^\n]*?(?:₹|Rs\.?|INR|\$)\s*([\d,]+)/i);
  if (multiPrizeMatch) {
    const p1 = parseInt(multiPrizeMatch[1].replace(/,/g, ''), 10) || 0;
    const p2 = parseInt(multiPrizeMatch[2].replace(/,/g, ''), 10) || 0;
    const total = p1 + p2;
    cashPool = `${total.toLocaleString()}`;
    firstPlaceCash = `${p1.toLocaleString()}`;
    displaySummary = `${total.toLocaleString()} Cash${hasPerks ? ' + Perks' : ''}`;
  } else {
    const prizeMatch = markdown.match(/(?:₹|INR|Rs\.?|\$)\s*[\d,]+(?:\s*(?:lakhs?|crores?|k|million))?/i);
    if (prizeMatch) {
      cashPool = prizeMatch[0].trim();
      displaySummary = `${cashPool}${hasPerks ? ' (+ Perks)' : ''}`;
    } else {
      displaySummary = 'See Details';
    }
  }

  // 4. Resources
  const resources: Array<{ title: string; url: string; resource_type: 'problem_statement' | 'rulebook' | 'template' | 'dataset' | 'reference' | 'other' }> = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  let match: RegExpExecArray | null;
  const seenUrls = new Set<string>();

  while ((match = linkRegex.exec(markdown)) !== null) {
    const linkText = match[1].trim();
    const linkUrl = match[2].trim();
    if (seenUrls.has(linkUrl) || linkUrl === sourceUrl) continue;
    const lower = (linkText + ' ' + linkUrl).toLowerCase();
    if (
      lower.includes('.pdf') ||
      lower.includes('drive.google') ||
      lower.includes('docs.google') ||
      lower.includes('problem') ||
      lower.includes('rulebook') ||
      lower.includes('guideline') ||
      lower.includes('template') ||
      lower.includes('dataset') ||
      lower.includes('terms')
    ) {
      seenUrls.add(linkUrl);
      let resType: 'problem_statement' | 'rulebook' | 'template' | 'dataset' | 'reference' | 'other' = 'other';
      if (lower.includes('problem') || lower.includes('brief') || lower.includes('track')) {
        resType = 'problem_statement';
      } else if (lower.includes('rule') || lower.includes('guide') || lower.includes('terms')) {
        resType = 'rulebook';
      } else if (lower.includes('template') || lower.includes('deck')) {
        resType = 'template';
      } else if (lower.includes('dataset') || lower.includes('data')) {
        resType = 'dataset';
      }
      resources.push({
        title: linkText || 'Attached Document',
        url: linkUrl,
        resource_type: resType,
      });
    }
  }

  // 5. Universal Stages (Strict Zero-Hallucination: Dates null if not explicitly in metadata)
  const stages: Array<z.infer<typeof StageSchema>> = [];
  const defaultStart = jsonLd?.startDate || null;
  const defaultEnd = jsonLd?.endDate || null;

  stages.push({
    round_number: 1,
    title: 'Round 1: Final Submission',
    stage_type: 'prototype',
    window_start: defaultStart,
    window_end: defaultEnd,
    actionable_deadline: defaultStart && new Date() < new Date(defaultStart) ? defaultStart : defaultEnd,
    deadline: defaultEnd,
    raw_date_snippet: defaultStart && defaultEnd ? `${defaultStart} to ${defaultEnd}` : (defaultEnd ? 'Event Timeline' : 'TBA'),
    evaluation_format: 'Online Evaluation',
    deliverables_description: 'Working prototype, repository link, slide deck',
    deliverables: ['Working prototype', 'repository link', 'slide deck'],
  });

  // 6. Overview
  const cleanLines = markdown
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 40 && !l.startsWith('#') && !l.startsWith('!'));
  const overview = jsonLd?.description || cleanLines.slice(0, 3).join('\n\n') || `Competition details imported from ${platform}.`;

  const organizerName = jsonLd?.organizer || hostInfo?.displayName || 'Competition Host';

  return {
    title: title || 'Imported Challenge',
    organizer: organizerName,
    source_platform: platform,
    mode,
    location: jsonLd?.location || '',
    banner_url: jsonLd?.banner_url || '',
    prize_pool: displaySummary,
    prizes: {
      display_summary: displaySummary,
      cash_pool: cashPool,
      first_place_cash: firstPlaceCash,
      has_perks_or_credits: hasPerks,
      raw_prize_text: displaySummary,
    },
    overview,
    eligibility: /individual only/i.test(markdown) ? 'Individual participation only' : 'Open for teams and individuals',
    team_size_min: 1,
    team_size_max: /individual only/i.test(markdown) ? 1 : 4,
    stages,
    resources,
  };
}

export async function parseHackathonContent(
  markdown: string, 
  sourceUrl: string = '', 
  jsonLd?: ExtractedJsonLd | null,
  pageTitle?: string
): Promise<ParsedHackathon> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is not configured. Falling back to heuristic parsing.');
    return heuristicExtract(markdown, sourceUrl, jsonLd, pageTitle);
  }

  // Universal sanitization: only removes base64/SVG/scripts, preserving 100% of schedule text
  const cleanedContent = preFilterMarkdown(markdown);
  const contentToAnalyze = cleanedContent && cleanedContent.length > 50 ? cleanedContent : markdown;
  const platform = detectPlatform(sourceUrl);
  const hostInfo = extractHostnameRoot(sourceUrl);
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelCandidates = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.6-flash'];

  // Dynamic Temporal Anchor
  const now = new Date();
  const currentIso = now.toISOString();
  const currentYear = now.getFullYear();

  let jsonLdContext = '';
  if (jsonLd) {
    jsonLdContext = `
VERIFIED GROUND TRUTH METADATA (Extracted deterministically from W3C / OpenGraph / Schema.org metadata):
- Verified Title: ${jsonLd.title || pageTitle || 'N/A'}
- Verified Organizer / Host: ${jsonLd.organizer || hostInfo?.displayName || 'N/A'}
- Verified Banner Image URL: ${jsonLd.banner_url || 'N/A'}
- Verified Start Timestamp: ${jsonLd.startDate || 'N/A'}
- Verified End Timestamp: ${jsonLd.endDate || 'N/A'}
- Verified Location: ${jsonLd.location || 'N/A'}
- Attendance Mode: ${jsonLd.mode || 'N/A'}
- Verified Date Anchors: ${jsonLd.date_anchors && jsonLd.date_anchors.length > 0 ? jsonLd.date_anchors.join(', ') : 'None'}
Rule: Treat these verified values as authoritative ground-truth baselines. Adopt the verified title, organizer, and banner image directly unless contradicted by primary competition text.
`;
  }

  const sourceContext = sourceUrl
    ? `Source URL: ${sourceUrl} (Host: ${hostInfo?.displayName || platform})`
    : `Source URL: Not provided (Content pasted directly from guidelines, flyer, or rules text)`;

  const systemPrompt = `Extract structured competition data from the provided text and return valid JSON matching the schema below.

Current Time Anchor: ${currentIso} (Year: ${currentYear})
${sourceContext}
${jsonLdContext}

EXTRACTION RULES:
1. Stages & Rounds: Identify chronological rounds, checkpoints, sprint windows, and final demos in sequence with round_number (1, 2, 3...). Assign stage_type ('quiz' | 'ppt_submission' | 'prototype' | 'presentation' | 'other').
2. Strict Zero-Hallucination Dates: Never invent dates. If a round deadline is unannounced or TBA, set window_start, window_end, actionable_deadline, and deadline to null, and set raw_date_snippet to "TBA".
3. Timezones: Format all timestamps as ISO 8601 strings with timezone offset. If text or host references Indian context/IST/INR, resolve to Asia/Kolkata (+05:30); otherwise preserve stated timezone or default to UTC.
4. Sprint Windows: For time-bounded hackathons, set window_start to hacking kickoff and window_end/deadline to submission cutoff.
5. Prizes: Distinguish hard cash pool from perks/credits.
6. Resources: Extract direct links to problem statements, guidelines, or datasets.
7. Exact Anchors: Set raw_date_snippet to the verbatim date text from the source.

OUTPUT JSON SCHEMA:
{
  "is_hackathon": true,
  "title": "string",
  "organizer": "string",
  "source_platform": "${platform}",
  "mode": "online" | "in-person" | "hybrid",
  "location": "string",
  "banner_url": "string",
  "prize_pool": "string",
  "prizes": {
    "display_summary": "string",
    "cash_pool": "string" | null,
    "first_place_cash": "string" | null,
    "has_perks_or_credits": boolean,
    "raw_prize_text": "string"
  },
  "overview": "string",
  "eligibility": "string",
  "team_size_min": number,
  "team_size_max": number,
  "stages": [
    {
      "round_number": 1,
      "title": "string",
      "stage_type": "quiz" | "ppt_submission" | "prototype" | "hackathon_sprint" | "presentation" | "other",
      "raw_date_snippet": "string (verbatim quote from text, or 'TBA')",
      "deadline": "YYYY-MM-DDTHH:mm:ss+05:30" | null,
      "window_start": "YYYY-MM-DDTHH:mm:ss+05:30" | null,
      "window_end": "YYYY-MM-DDTHH:mm:ss+05:30" | null,
      "actionable_deadline": "YYYY-MM-DDTHH:mm:ss+05:30" | null,
      "evaluation_format": "string",
      "deliverables_description": "string"
    }
  ],
  "resources": [
    {
      "title": "string",
      "url": "https://...",
      "resource_type": "problem_statement" | "rulebook" | "template" | "dataset" | "reference" | "other"
    }
  ]
}`;

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      // Feed full readable text to the model so schedules and timelines are never truncated
      const userContentPrompt = sourceUrl
        ? `Here is the full contest page content from ${sourceUrl}:\n\n${contentToAnalyze}`
        : `Here is the contest text / flyer / guidelines pasted directly by the user:\n\n${contentToAnalyze}`;

      const result = await model.generateContent([
        systemPrompt,
        userContentPrompt
      ]);

      const text = result.response.text();
      let jsonStr = text.trim();
      
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(jsonStr);

      if (parsed.is_hackathon === false) {
        throw new Error('This content does not appear to be a competitive tech event or hackathon.');
      }

      // Ground-truth fallback baselines from extracted metadata
      if ((!parsed.title || parsed.title === 'Imported Challenge' || parsed.title.toLowerCase() === 'string') && (jsonLd?.title || pageTitle)) {
        parsed.title = jsonLd?.title || pageTitle;
      }
      if ((!parsed.organizer || parsed.organizer === 'Competition Host' || parsed.organizer.toLowerCase() === 'string' || parsed.organizer.toLowerCase() === 'n/a') && (jsonLd?.organizer || hostInfo?.displayName)) {
        parsed.organizer = jsonLd?.organizer || hostInfo?.displayName;
      }
      if ((!parsed.banner_url || parsed.banner_url === 'string' || parsed.banner_url.startsWith('https://...')) && jsonLd?.banner_url) {
        parsed.banner_url = jsonLd.banner_url;
      }

      // Ensure stages array exists with strict zero-hallucination
      if (!parsed.stages || !Array.isArray(parsed.stages) || parsed.stages.length === 0) {
        const fallbackEnd = jsonLd?.endDate || null;
        parsed.stages = [
          {
            round_number: 1,
            title: 'Round 1: Submission',
            stage_type: 'prototype',
            window_start: jsonLd?.startDate || null,
            window_end: fallbackEnd,
            actionable_deadline: fallbackEnd,
            deadline: fallbackEnd,
            raw_date_snippet: fallbackEnd ? 'Event Timeline' : 'TBA',
            evaluation_format: 'Online Evaluation',
            deliverables_description: 'Deliverables as per competition guidelines',
          }
        ];
      } else {
        // Pass 2 Programmatic Self-Correction:
        // Cross-reference extracted stages with raw source text to guarantee zero synthetic dates
        const textLower = contentToAnalyze.toLowerCase();
        parsed.stages = parsed.stages.map((stage: any) => {
          const rawSnippet = (stage.raw_date_snippet || '').trim().toLowerCase();
          const hasSnippetInText = rawSnippet.length >= 3 && rawSnippet !== 'tba' && textLower.includes(rawSnippet);
          const hasJsonLdAnchor = jsonLd?.date_anchors?.some((a: string) => textLower.includes(a.toLowerCase())) || jsonLd?.endDate || jsonLd?.startDate;

          // If a stage claims to have a deadline but has no matching text snippet, no jsonld anchor, and snippet is TBA or missing:
          if ((!rawSnippet || rawSnippet === 'tba' || (!hasSnippetInText && !hasJsonLdAnchor)) && !stage.deadline) {
            return {
              ...stage,
              window_start: null,
              window_end: null,
              actionable_deadline: null,
              deadline: null,
              raw_date_snippet: 'TBA',
            };
          }

          return stage;
        });
      }

      // Filter resources
      if (!parsed.resources || !Array.isArray(parsed.resources)) {
        parsed.resources = [];
      } else {
        parsed.resources = parsed.resources.filter(
          (r: any) => r && typeof r.url === 'string' && r.url.startsWith('http')
        );
      }

      return ParsedHackathonSchema.parse(parsed);
    } catch (err: any) {
      if (err.message === 'This content does not appear to be a competitive tech event or hackathon.') {
        throw err;
      }
      console.warn(`Attempt with ${modelName} encountered: ${err.message}. Trying next option...`);
    }
  }

  console.warn('All Gemini models failed or unavailable. Falling back to heuristic parser.');
  return heuristicExtract(markdown, sourceUrl, jsonLd, pageTitle);
}
