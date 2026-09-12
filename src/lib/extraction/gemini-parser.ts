import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { cleanMarkdownContent, preFilterMarkdown } from './jina-reader';
import type { ExtractedJsonLd } from './jsonld-extractor';

export const StageSchema = z.object({
  round_number: z.number().int().default(1),
  title: z.string().min(1, 'Stage title is required'),
  stage_type: z.enum(['quiz', 'ppt_submission', 'prototype', 'hackathon_sprint', 'presentation', 'other']).default('other'),
  window_start: z.string().nullable().optional().default(null),
  window_end: z.string().nullable().optional().default(null),
  actionable_deadline: z.string().nullable().optional().default(null),
  deadline: z.string().nullable().optional().default(null),
  raw_date_snippet: z.string().nullable().optional().default(null),
  evaluation_format: z.string().optional().default(''),
  deliverables_description: z.string().optional().default(''),
}).transform((stage) => {
  // Runtime safeguard 1: Object-level transform avoiding ctx.parent
  // Strictly zero-hallucination: No synthetic fallback dates. If null, keep null!
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
  };
});

export const PrizeSchema = z.object({
  display_summary: z.string().default(''),
  cash_pool: z.string().nullable().optional().default(null),
  first_place_cash: z.string().nullable().optional().default(null),
  has_perks_or_credits: z.boolean().default(false),
  raw_prize_text: z.string().optional().default(''),
});

export const ResourceSchema = z.object({
  title: z.string().min(1, 'Resource title is required'),
  url: z.string().min(1, 'Resource URL is required'),
  resource_type: z.enum(['problem_statement', 'rulebook', 'template', 'dataset', 'reference', 'other']).default('other'),
});

export const ParsedHackathonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organizer: z.string().optional().default(''),
  source_platform: z.string().default('custom'),
  mode: z.enum(['online', 'in-person', 'hybrid']).optional().default('online'),
  location: z.string().optional().default(''),
  banner_url: z.string().optional().default(''),
  prize_pool: z.string().optional().default(''),
  prizes: PrizeSchema.optional().default({
    display_summary: '',
    cash_pool: null,
    first_place_cash: null,
    has_perks_or_credits: false,
    raw_prize_text: ''
  }),
  overview: z.string().optional().default(''),
  eligibility: z.string().optional().default(''),
  team_size_min: z.number().int().optional().default(1),
  team_size_max: z.number().int().optional().default(4),
  stages: z.array(StageSchema).min(1, 'At least one stage is required'),
  resources: z.array(ResourceSchema).default([]),
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

export function detectPlatform(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    
    // Known major platforms
    if (hostname.includes('unstop.com')) return 'unstop';
    if (hostname.includes('internshala.com')) return 'internshala';
    if (hostname.includes('devfolio.co')) return 'devfolio';
    if (hostname.includes('devpost.com')) return 'devpost';
    if (hostname.includes('mlh.io')) return 'mlh';
    if (hostname.includes('hackerearth.com')) return 'hackerearth';
    if (hostname.includes('dorahacks.io')) return 'dorahacks';
    if (hostname.includes('kaggle.com')) return 'kaggle';
    if (hostname.includes('lu.ma')) return 'luma';
    
    // Dynamically derive platform slug from domain (e.g. hackmit.org -> hackmit, calhacks.io -> calhacks)
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      const mainPart = domainParts.length > 2 && domainParts[domainParts.length - 2].length <= 3 && domainParts[domainParts.length - 1].length <= 3
        ? domainParts[domainParts.length - 3]
        : domainParts[domainParts.length - 2];
      if (mainPart && mainPart.length >= 2) {
        return mainPart;
      }
    }
    return 'independent';
  } catch {
    return 'independent';
  }
}

export function heuristicExtract(
  markdown: string, 
  sourceUrl: string, 
  jsonLd?: ExtractedJsonLd | null,
  pageTitle?: string
): ParsedHackathon {
  const platform = detectPlatform(sourceUrl);
  
  // 1. Title
  let title = jsonLd?.title || pageTitle || '';
  if (!title) {
    const titleMatch = markdown.match(/^#\s+([^\n#]+)/m) || markdown.match(/Title:\s*([^\n]+)/i);
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].trim();
    } else {
      try {
        const urlObj = new URL(sourceUrl);
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
  let hasPerks = /cloud credits?|aws credits?|google cloud|voucher|swag|subscription/i.test(markdown);

  const multiPrizeMatch = markdown.match(/cash prizes? of (?:₹|Rs\.?|INR)\s*([\d,]+)[^\n]*?(?:₹|Rs\.?|INR)\s*([\d,]+)[^\n]*?(?:₹|Rs\.?|INR)\s*([\d,]+)/i);
  if (multiPrizeMatch) {
    const p1 = parseInt(multiPrizeMatch[1].replace(/,/g, ''), 10) || 0;
    const p2 = parseInt(multiPrizeMatch[2].replace(/,/g, ''), 10) || 0;
    const p3 = parseInt(multiPrizeMatch[3].replace(/,/g, ''), 10) || 0;
    const total = p1 + p2 + p3;
    cashPool = `₹${total.toLocaleString('en-IN')}`;
    firstPlaceCash = `₹${p1.toLocaleString('en-IN')}`;
    displaySummary = `₹${total.toLocaleString('en-IN')} Cash${hasPerks ? ' + Perks' : ''}`;
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

  // 5. Stages (Strictly Zero-Hallucination: Dates are null if not provided in JSON-LD)
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
    raw_date_snippet: defaultStart && defaultEnd ? `${defaultStart} to ${defaultEnd}` : (defaultEnd ? 'Portal Timeline' : 'TBA'),
    evaluation_format: 'Online Evaluation',
    deliverables_description: 'Working prototype, repository link, slide deck',
  });

  // 6. Overview
  const cleanLines = markdown
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 40 && !l.startsWith('#') && !l.startsWith('!'));
  const overview = jsonLd?.description || cleanLines.slice(0, 3).join('\n\n') || `Hackathon imported from ${platform}.`;

  return {
    title: title || 'Imported Challenge',
    organizer: jsonLd?.organizer || 'Competition Host',
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
  sourceUrl: string, 
  jsonLd?: ExtractedJsonLd | null,
  pageTitle?: string
): Promise<ParsedHackathon> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is not configured. Falling back to heuristic parsing.');
    return heuristicExtract(markdown, sourceUrl, jsonLd, pageTitle);
  }

  const preFiltered = preFilterMarkdown(markdown);
  const platform = detectPlatform(sourceUrl);
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelCandidates = ['gemini-2.5-flash', 'gemini-3.6-flash'];

  // Dynamic Temporal Injection (IST UTC+05:30)
  const now = new Date();
  const currentIso = now.toISOString();
  const currentYear = now.getFullYear();

  let jsonLdContext = '';
  if (jsonLd) {
    jsonLdContext = `
VERIFIED GROUND TRUTH METADATA (Extracted deterministically from portal Schema.org JSON-LD):
- Verified Title: ${jsonLd.title || 'N/A'}
- Verified Start Timestamp: ${jsonLd.startDate || 'N/A'}
- Verified End Timestamp: ${jsonLd.endDate || 'N/A'}
- Verified Organizer: ${jsonLd.organizer || 'N/A'}
- Verified Location: ${jsonLd.location || 'N/A'}
- Attendance Mode: ${jsonLd.mode || 'N/A'}
Rule: Treat these verified timestamps as hard truth anchors. If dates in markdown align with these, normalize directly to these exact ISO timestamps.
`;
  }

  const systemPrompt = `You are an elite competitive technology intelligence parser.
Your mission is to analyze competition text with extreme precision and output structured JSON.

CURRENT TIME ANCHOR: ${currentIso} (Current Year: ${currentYear}, Timezone: Asia/Kolkata IST UTC+05:30)
${jsonLdContext}

CRITICAL PARSING RULES:
1. **Verification**:
   - If the content is NOT a hackathon, coding challenge, case competition, innovation challenge, or student contest, set "is_hackathon": false.

2. **STRICT ZERO-HALLUCINATION DATE RULES**:
   - You must NEVER invent, extrapolate, or fabricate any date or time.
   - If a stage or round does NOT have an explicit date or time stated in the text (e.g. 'Dates TBA', 'To be announced', or simply not mentioned), you MUST set:
     * "window_start": null
     * "window_end": null
     * "actionable_deadline": null
     * "deadline": null
     * "raw_date_snippet": "TBA"
   - Do NOT make up synthetic dates. A null date is strictly required when dates are unannounced.
   - If a sprint window is specified (e.g. '24-28 Oct'):
     * 'window_start': ISO 8601 string when stage/sprint opens (e.g. "${currentYear}-10-24T09:00:00+05:30").
     * 'window_end': ISO 8601 string of hard submission close (e.g. "${currentYear}-10-28T23:59:59+05:30").
     * 'actionable_deadline': Points to 'window_start' (Kickoff) if currently before kickoff; rolls over to 'window_end' (Submission) once kickoff passes.
     * 'deadline': Cutoff timestamp ('window_end').
     * 'raw_date_snippet': Verbatim string copied from text.
   - If a single deadline is given, set 'deadline', 'window_end', and 'actionable_deadline' to that ISO timestamp.

3. **PRIZE EVALUATION RULE**:
   - Differentiate between real cash prizes and vanity perk pools.
   - If an event advertises 'Total Pool: ₹10,00,000' but the breakdown shows '1st: ₹50,000 Cash, 2nd: ₹25,000 Cash, remainder in cloud credits/API tools', do NOT set '₹10,00,000' as cash.
   - Set 'display_summary': Highlights tangible cash, e.g. "₹75,000 Cash + ₹9.25L Credits".
   - Set 'cash_pool': Verified hard cash amount only (e.g. "₹75,000").
   - Set 'first_place_cash': First prize cash amount (e.g. "₹50,000").
   - Set 'has_perks_or_credits': True if the advertised prize consists largely of cloud credits, swags, or subscriptions.
   - Set 'raw_prize_text': Exact snippet from the page.

4. **Multi-Stage Funnel**:
   - Extract EVERY stage sequentially with accurate round numbers:
     * Stage types: 'quiz' | 'ppt_submission' | 'prototype' | 'hackathon_sprint' | 'presentation' | 'other'.
     * Multi-day hacking rounds MUST be classified as 'hackathon_sprint'.

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
      "window_start": "YYYY-MM-DDTHH:mm:ss+05:30" | null,
      "window_end": "YYYY-MM-DDTHH:mm:ss+05:30" | null,
      "actionable_deadline": "YYYY-MM-DDTHH:mm:ss+05:30" | null,
      "deadline": "YYYY-MM-DDTHH:mm:ss+05:30" | null,
      "raw_date_snippet": "string",
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

      const result = await model.generateContent([
        systemPrompt,
        `Here is the contest page content from ${sourceUrl}:\n\n${preFiltered.slice(0, 40000)}`
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
        throw new Error('I suppose this is not a hackathon...');
      }

      // Ensure stages array exists (Safeguard: Zero synthetic fallback dates)
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
            raw_date_snippet: fallbackEnd ? 'Portal Timeline' : 'TBA',
            evaluation_format: 'Online Evaluation',
            deliverables_description: 'Deliverables as per competition guidelines',
          }
        ];
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
      if (err.message === 'I suppose this is not a hackathon...') {
        throw err;
      }
      console.warn(`Attempt with ${modelName} encountered: ${err.message}. Trying next option...`);
    }
  }

  console.warn('All Gemini models failed or unavailable. Falling back to heuristic parser.');
  return heuristicExtract(markdown, sourceUrl, jsonLd, pageTitle);
}
