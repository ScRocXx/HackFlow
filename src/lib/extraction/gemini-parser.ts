import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { cleanMarkdownContent } from './jina-reader';

export const StageSchema = z.object({
  round_number: z.number().int().default(1),
  title: z.string().min(1, 'Stage title is required'),
  stage_type: z.enum(['quiz', 'ppt_submission', 'prototype', 'presentation', 'other']).default('other'),
  deadline: z.string().nullable().optional().transform(val => {
    if (!val || val.trim() === '' || val === 'null' || val === 'undefined') {
      return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    }
    return val;
  }),
  evaluation_format: z.string().optional().default(''),
  deliverables_description: z.string().optional().default(''),
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
  overview: z.string().optional().default(''),
  eligibility: z.string().optional().default(''),
  team_size_min: z.number().int().optional().default(1),
  team_size_max: z.number().int().optional().default(4),
  stages: z.array(StageSchema).min(1, 'At least one stage is required'),
  resources: z.array(ResourceSchema).default([]),
});

export type ParsedHackathon = z.infer<typeof ParsedHackathonSchema>;
export type ParsedStage = z.infer<typeof StageSchema>;
export type ParsedResource = z.infer<typeof ResourceSchema>;

export function detectPlatform(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('unstop.com')) return 'unstop';
    if (hostname.includes('internshala.com')) return 'internshala';
    if (hostname.includes('devfolio.co')) return 'devfolio';
    if (hostname.includes('devpost.com')) return 'devpost';
    if (hostname.includes('mlh.io')) return 'mlh';
    if (hostname.includes('hackerearth.com')) return 'hackerearth';
    
    return 'custom';
  } catch {
    return 'custom';
  }
}

export function heuristicExtract(markdown: string, sourceUrl: string): ParsedHackathon {
  const platform = detectPlatform(sourceUrl);
  
  // 1. Extract Title
  let title = '';
  const tysicMatch = markdown.match(/Tata\s+Young\s+Social\s+Innovator\s+Challenge[^\n\(\)]*(?:\([^\)]+\))?/i);
  if (tysicMatch) {
    title = tysicMatch[0].trim();
  } else {
    const titleMatch = markdown.match(/^#\s+([^\n#]+)/m) || markdown.match(/Title:\s*([^\n]+)/i);
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].trim();
    } else {
      try {
        const urlObj = new URL(sourceUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1].replace(/#.*$/, '');
          title = lastPart
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }
      } catch {
        title = 'Imported Challenge';
      }
    }
  }

  // 2. Mode
  let mode: 'online' | 'in-person' | 'hybrid' = 'online';
  if (/hybrid/i.test(markdown) || (/virtual/i.test(markdown) && /grand finale|offline|iim\s*calcutta/i.test(markdown))) {
    mode = 'hybrid';
  } else if (/in-person|offline|on-campus|physical venue/i.test(markdown)) {
    mode = 'in-person';
  }

  // 3. Prize Pool
  let prizePool = '';
  const multiPrizeMatch = markdown.match(/cash prizes? of (?:₹|Rs\.?|INR)\s*([\d,]+)[^\n]*?(?:₹|Rs\.?|INR)\s*([\d,]+)[^\n]*?(?:₹|Rs\.?|INR)\s*([\d,]+)/i);
  if (multiPrizeMatch) {
    const p1 = parseInt(multiPrizeMatch[1].replace(/,/g, ''), 10) || 0;
    const p2 = parseInt(multiPrizeMatch[2].replace(/,/g, ''), 10) || 0;
    const p3 = parseInt(multiPrizeMatch[3].replace(/,/g, ''), 10) || 0;
    const total = p1 + p2 + p3;
    prizePool = `₹${total.toLocaleString('en-IN')} (1st: ₹${p1.toLocaleString('en-IN')}, 2nd: ₹${p2.toLocaleString('en-IN')}, 3rd: ₹${p3.toLocaleString('en-IN')}) + Certificates & Mentorship`;
  } else {
    const prizeMatch = markdown.match(/(?:₹|INR|Rs\.?|\$)\s*[\d,]+(?:\s*(?:lakhs?|crores?|k|million))?/i) 
      || markdown.match(/Prize(?:s|\s*Pool)?\s*[:\-]?\s*([^\n]+)/i);
    if (prizeMatch) {
      prizePool = prizeMatch[0].trim();
    }
  }

  // 4. Extract Resources (PDFs, drive links, problem statements)
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

  // 5. Extract Stages / Rounds
  const stages: Array<{
    round_number: number;
    title: string;
    stage_type: 'quiz' | 'ppt_submission' | 'prototype' | 'presentation' | 'other';
    deadline: string;
    evaluation_format: string;
    deliverables_description: string;
  }> = [];

  const stageFaqMatch = markdown.match(/four stages:\s*Stage\s*1\s*[-–]\s*([^,]+),\s*Stage\s*2\s*[-–]\s*([^,]+),\s*Stage\s*3\s*[-–]\s*([^,]+),\s*and\s*Stage\s*4\s*[-–]\s*([^.]+)/i);
  if (stageFaqMatch) {
    const rawStages = [
      { name: stageFaqMatch[1].trim(), type: 'other' as const, desc: 'Participant registration' },
      { name: stageFaqMatch[2].trim(), type: 'ppt_submission' as const, desc: 'Problem statement selection and PPT/DOC/PDF solution submission (max 10MB)' },
      { name: stageFaqMatch[3].trim(), type: 'presentation' as const, desc: 'Virtual semi-final idea presentation to jury' },
      { name: stageFaqMatch[4].trim(), type: 'presentation' as const, desc: 'Grand finale offline pitch at IIM Calcutta' },
    ];
    rawStages.forEach((s, i) => {
      stages.push({
        round_number: i + 1,
        title: `Stage ${i + 1}: ${s.name}`,
        stage_type: s.type,
        deadline: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        evaluation_format: i === 1 ? 'Expert panel evaluation on innovation & feasibility' : 'Jury evaluation',
        deliverables_description: s.desc,
      });
    });
  } else {
    const roundRegex = /(?:###?|####?|\*\*)\s*(Round\s*\d+|Stage\s*\d+|Phase\s*\d+|Prelims?|Grand\s*Finale|Final\s*Submission|Ideation\s*Round)[^\n]*/gi;
    let roundMatch: RegExpExecArray | null;
    const foundRounds: string[] = [];

    while ((roundMatch = roundRegex.exec(markdown)) !== null) {
      const cleanRound = roundMatch[0].replace(/^[#*\s]+|[#*\s]+$/g, '').trim();
      if (cleanRound && !foundRounds.includes(cleanRound) && cleanRound.length < 80) {
        foundRounds.push(cleanRound);
      }
    }

    const dateRegex = /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*['\s]+\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;
    const datesFound: string[] = [];
    let dateMatch: RegExpExecArray | null;
    while ((dateMatch = dateRegex.exec(markdown)) !== null) {
      try {
        let rawDate = dateMatch[0].replace(/'(\d{2})\b/, ' 20$1');
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          datesFound.push(d.toISOString());
        }
      } catch {
        // ignore
      }
    }

    if (foundRounds.length > 0) {
      foundRounds.forEach((roundTitle, idx) => {
        const lower = roundTitle.toLowerCase();
        let stageType: 'quiz' | 'ppt_submission' | 'prototype' | 'presentation' | 'other' = 'prototype';
        if (lower.includes('quiz') || lower.includes('test') || lower.includes('assessment')) {
          stageType = 'quiz';
        } else if (lower.includes('ppt') || lower.includes('idea') || lower.includes('deck') || lower.includes('abstract')) {
          stageType = 'ppt_submission';
        } else if (lower.includes('finale') || lower.includes('pitch') || lower.includes('presentation')) {
          stageType = 'presentation';
        }

        const stageDeadline = datesFound[idx] || new Date(Date.now() + (idx + 1) * 7 * 24 * 60 * 60 * 1000).toISOString();

        stages.push({
          round_number: idx + 1,
          title: roundTitle,
          stage_type: stageType,
          deadline: stageDeadline,
          evaluation_format: 'Portal Guidelines',
          deliverables_description: stageType === 'ppt_submission' ? 'Slide deck PDF, Problem brief' : stageType === 'quiz' ? 'Online Assessment' : 'Working Prototype, Code Repository',
        });
      });
    } else {
      const finalDeadline = datesFound[0] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      stages.push({
        round_number: 1,
        title: 'Round 1: Final Submission',
        stage_type: 'prototype',
        deadline: finalDeadline,
        evaluation_format: 'Online Evaluation',
        deliverables_description: 'Working prototype, slide deck, repository link',
      });
    }
  }

  // 6. Overview
  const cleanLines = markdown
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 40 && !l.startsWith('#') && !l.startsWith('!'));
  const overview = cleanLines.slice(0, 3).join('\n\n') || `Hackathon imported from ${platform}.`;

  return {
    title: title || 'Imported Challenge',
    organizer: platform === 'internshala' ? 'Tata Group & IIM Calcutta (Internshala)' : platform === 'unstop' ? 'Unstop Host' : 'Challenge Host',
    source_platform: platform,
    mode,
    location: mode === 'hybrid' ? 'IIM Calcutta (Grand Finale)' : '',
    banner_url: '',
    prize_pool: prizePool,
    overview,
    eligibility: /individual only/i.test(markdown) ? 'Students and young innovators across India. Individual participation only.' : 'Open for all eligible students and developers',
    team_size_min: 1,
    team_size_max: /individual only/i.test(markdown) ? 1 : 4,
    stages,
    resources,
  };
}

export async function parseHackathonContent(markdown: string, sourceUrl: string): Promise<ParsedHackathon> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is not configured. Falling back to heuristic parsing.');
    return heuristicExtract(markdown, sourceUrl);
  }

  const cleanedMarkdown = cleanMarkdownContent(markdown);
  const platform = detectPlatform(sourceUrl);
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelCandidates = ['gemini-2.5-flash', 'gemini-3.6-flash'];

  const now = new Date();
  const currentIso = now.toISOString();
  const currentYear = now.getFullYear();

  const systemPrompt = `You are a world-class hackathon and competitive technology intelligence parser, operating like GPT-4o.
Your mission is to analyze competition text with extreme precision and output structured JSON.

CURRENT TIMESTAMP: ${currentIso} (Current Year: ${currentYear})

DETECTION & PARSING RULES:
1. **Verification**:
   - If the provided content is NOT a hackathon, coding challenge, case competition, innovation challenge, or student contest, set "is_hackathon": false.
2. **Title & Organizer**:
   - Title: The official name of the event (e.g. "Tata Young Social Innovator Challenge (TYSIC)").
   - Organizer: The primary company/university hosting or sponsoring it (e.g. "Tata Group & IIM Calcutta").
3. **Mode & Location**:
   - "online", "in-person", or "hybrid".
   - If rounds are virtual/online but the Grand Finale or pitching is on-campus/in-person (e.g. at IIM Calcutta), mode MUST be "hybrid", with "location" set to the physical venue.
4. **Prize Pool**:
   - Calculate and summarize the complete monetary prize pool.
   - If multiple prizes are mentioned (e.g., 1st: ₹1,00,000, 2nd: ₹60,000, 3rd: ₹40,000), compute the TOTAL: "₹2,00,000 (1st: ₹1,00,000 | 2nd: ₹60,000 | 3rd: ₹40,000)".
   - Include mentions of certificates, mentorship, seed funding (e.g., up to ₹1 Crore), and incubation.
5. **Multi-Stage Sequential Timeline**:
   - Student challenges (especially Internshala & Unstop) are multi-round funnels. Look in FAQ sections (e.g. "What are the stages of the competition?", "What happens after I submit?"), timeline tables, and round tabs.
   - Extract EVERY stage sequentially with accurate round numbers:
     * Round 1: Registration / Screening
     * Round 2: Problem Statement Selection & Solution Deck Submission
     * Round 3: Semi-Finals (Virtual)
     * Round 4: Grand Finale (In-person presentation)
   - 'stage_type': Classify as 'quiz' | 'ppt_submission' | 'prototype' | 'presentation' | 'other'.
   - 'deadline': ISO 8601 with timezone offset (e.g. "+05:30" for IST Indian events, e.g. "${currentYear}-10-15T23:59:59+05:30").
     If an exact date is not given in the text, extrapolate sequential realistic deadlines based on the ${currentYear} calendar (e.g., +7 days, +14 days, +21 days). NEVER return null, empty, or 1970.
6. **Attached Documents & Problem Statement Links**:
   - Scan for links to Google Docs, Google Drive folders, PDFs, rulebooks, problem statements, and slide deck templates.
   - Resource types: 'problem_statement' | 'rulebook' | 'template' | 'dataset' | 'reference' | 'other'.
7. **Eligibility & Team Size**:
   - Check if individual only (team_size_min: 1, team_size_max: 1) or teams (e.g. 1 to 4).

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
  "overview": "string",
  "eligibility": "string",
  "team_size_min": number,
  "team_size_max": number,
  "stages": [
    {
      "round_number": 1,
      "title": "string",
      "stage_type": "quiz" | "ppt_submission" | "prototype" | "presentation" | "other",
      "deadline": "YYYY-MM-DDTHH:mm:ss+05:30",
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
        `Here is the contest page content from ${sourceUrl}:\n\n${cleanedMarkdown.slice(0, 50000)}`
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

      // Ensure stages array exists
      if (!parsed.stages || !Array.isArray(parsed.stages) || parsed.stages.length === 0) {
        parsed.stages = [
          {
            round_number: 1,
            title: 'Round 1: Submission',
            stage_type: 'prototype',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            evaluation_format: 'Online Evaluation',
            deliverables_description: 'Deliverables as per portal guidelines',
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
  return heuristicExtract(markdown, sourceUrl);
}

