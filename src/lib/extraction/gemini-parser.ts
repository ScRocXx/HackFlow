import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

export const StageSchema = z.object({
  round_number: z.number().int().default(1),
  title: z.string().min(1, 'Stage title is required'),
  stage_type: z.enum(['quiz', 'ppt_submission', 'prototype', 'presentation', 'other']).default('other'),
  deadline: z.string().min(1, 'Deadline is required'), // ISO 8601 with timezone or standard date string
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

  // 2. Mode
  let mode: 'online' | 'in-person' | 'hybrid' = 'online';
  if (/hybrid/i.test(markdown)) {
    mode = 'hybrid';
  } else if (/in-person|offline|on-campus|physical venue/i.test(markdown)) {
    mode = 'in-person';
  }

  // 3. Prize Pool
  let prizePool = '';
  const prizeMatch = markdown.match(/(?:₹|INR|Rs\.?|\$)\s*[\d,]+(?:\s*(?:lakhs?|crores?|k|million))?/i) 
    || markdown.match(/Prize(?:s|\s*Pool)?\s*[:\-]?\s*([^\n]+)/i);
  if (prizeMatch) {
    prizePool = prizeMatch[0].trim();
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
      lower.includes('kaggle')
    ) {
      seenUrls.add(linkUrl);
      let resType: 'problem_statement' | 'rulebook' | 'template' | 'dataset' | 'reference' | 'other' = 'other';
      if (lower.includes('problem') || lower.includes('brief') || lower.includes('track')) {
        resType = 'problem_statement';
      } else if (lower.includes('rule') || lower.includes('guide')) {
        resType = 'rulebook';
      } else if (lower.includes('template') || lower.includes('deck')) {
        resType = 'template';
      } else if (lower.includes('dataset') || lower.includes('data') || lower.includes('kaggle')) {
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

  // Look for Round / Stage mentions
  const roundRegex = /(?:###?|####?|\*\*)\s*(Round\s*\d+|Stage\s*\d+|Phase\s*\d+|Prelims?|Grand\s*Finale|Final\s*Submission|Ideation\s*Round)[^\n]*/gi;
  let roundMatch: RegExpExecArray | null;
  const foundRounds: string[] = [];

  while ((roundMatch = roundRegex.exec(markdown)) !== null) {
    const cleanRound = roundMatch[0].replace(/^[#*\s]+|[#*\s]+$/g, '').trim();
    if (cleanRound && !foundRounds.includes(cleanRound) && cleanRound.length < 80) {
      foundRounds.push(cleanRound);
    }
  }

  // Search for date patterns
  const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi;
  const datesFound: string[] = [];
  let dateMatch: RegExpExecArray | null;
  while ((dateMatch = dateRegex.exec(markdown)) !== null) {
    try {
      const d = new Date(dateMatch[0]);
      if (!isNaN(d.getTime()) && d.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000) {
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

      const stageDeadline = datesFound[idx] || new Date(Date.now() + (idx + 1) * 5 * 24 * 60 * 60 * 1000).toISOString();

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
    // Default single stage with best date
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

  // 6. Overview
  const cleanLines = markdown
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 40 && !l.startsWith('#') && !l.startsWith('!'));
  const overview = cleanLines.slice(0, 3).join('\n\n') || `Hackathon imported from ${platform}.`;

  return {
    title: title || 'Imported Challenge',
    organizer: platform === 'internshala' ? 'Internshala Challenge' : platform === 'unstop' ? 'Unstop Competition' : 'Challenge Host',
    source_platform: platform,
    mode,
    location: '',
    banner_url: '',
    prize_pool: prizePool,
    overview,
    eligibility: 'Open for all eligible students and developers',
    team_size_min: 1,
    team_size_max: 4,
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

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const platform = detectPlatform(sourceUrl);

  const systemPrompt = `You are a hackathon data extraction expert. Extract comprehensive competition metadata and multi-round stages from the provided markdown.

Source platform detected: "${platform}". Set 'source_platform' accordingly.

CRITICAL INSTRUCTIONS FOR MULTI-STAGE EXTRACTION:
Hackathons and student challenges (especially on Unstop and Internshala) are sequential multi-stage funnels, NOT single-deadline events.
1. For Unstop (Dare2Compete): Look for "Rounds & Timelines", "Stages", or milestone lists. Extract each round chronologically:
   - Round 1: Online Quiz / Preliminary Assessment / Screening
   - Round 2: Solution Deck / PPT / Abstract Submission
   - Round 3: Prototype / MVP Code Submission
   - Round 4: Grand Finale / Pitch Presentation
2. For Internshala: Look for competition milestones, rounds, quizzes, case submissions, or final project deadlines.
3. For Devpost/Devfolio: Look for tracks, milestones, submission deadlines, and demo days.

TIMEZONE NORMALIZATION (MANDATORY):
- Parse all dates and times into ISO 8601 strings WITH timezones (e.g. 2026-10-15T23:59:59+05:30).
- Indian platforms (Unstop, Internshala, HackerEarth) default to IST (UTC+05:30).
- US platforms (Devpost, MLH) default to EST/EDT or UTC.
- If only a date is given (e.g., "Oct 15, 2026"), default to end of day in the platform's timezone (e.g. 2026-10-15T23:59:59+05:30).

STAGE TYPE CLASSIFICATION:
Classify each stage's 'stage_type' as one of:
- 'quiz': Online quiz, screening test, aptitude, MCQ round
- 'ppt_submission': Idea deck, slide deck, abstract, executive summary
- 'prototype': Working code, GitHub repo, MVP, demo link submission
- 'presentation': Final demo, offline pitch, live presentation
- 'other': Any other format

ATTACHED DOCUMENTS & PROBLEM STATEMENT LINKS:
Scan the markdown for any markdown links [title](url), download buttons, or external references pointing to:
- Problem Statements, challenge tracks, problem docs, themes
- Rulebooks, guidelines, code of conduct PDFs
- Starter slide templates (Google Slides, Canva, PPT, Figma)
- Datasets (Kaggle, Google Drive, AWS S3, GitHub datasets, CSV/JSON links)
- Official references, GitHub starter repositories, API docs
- Important cloud files (Google Drive folders, Notion docs, PDF downloads)

Classify each resource's 'resource_type' as one of:
- 'problem_statement': Challenge brief, problem description, theme tracks, PS document
- 'rulebook': Rules, guidelines, evaluation criteria, official PDF rulebook
- 'template': Presentation slide template, submission template, GitHub boilerplate repo
- 'dataset': Dataset links, training data, APIs, CSVs
- 'reference': Official documentation, API references, external reading
- 'other': Any other official attached link or resource

Only extract genuine external URLs (https://... or http://...), DO NOT extract internal page anchors like '#overview' or '#' or 'javascript:void(0)'.
If no resources or attached documents are found, return an empty array [].

If only a single final submission deadline is found, produce a single stage titled "Round 1: Final Submission". Never return an empty stages array.

Return ONLY a valid, raw JSON object matching this schema (do NOT wrap in markdown code blocks \`\`\`json):
{
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
      "deadline": "2026-10-15T23:59:59+05:30",
      "evaluation_format": "string",
      "deliverables_description": "string"
    }
  ],
  "resources": [
    {
      "title": "Problem Statement / Guidelines",
      "url": "https://...",
      "resource_type": "problem_statement" | "rulebook" | "template" | "dataset" | "reference" | "other"
    }
  ]
}`;

  let retries = 2;
  let lastError: any = null;

  while (retries >= 0) {
    try {
      const result = await model.generateContent([
        systemPrompt,
        `Here is the hackathon page markdown content from ${sourceUrl}:\n\n${markdown.slice(0, 45000)}`
      ]);
      
      const text = result.response.text();
      let jsonStr = text.trim();
      
      // Clean up markdown formatting if included
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Fallback: If stages is empty or missing, create default stage from available info
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

      if (!parsed.resources || !Array.isArray(parsed.resources)) {
        parsed.resources = [];
      } else {
        // Filter out empty or invalid URLs
        parsed.resources = parsed.resources.filter(
          (r: any) => r && typeof r.url === 'string' && r.url.startsWith('http')
        );
      }

      return ParsedHackathonSchema.parse(parsed);
    } catch (error) {
      lastError = error;
      retries--;
    }
  }
  
  console.warn(`Gemini extraction failed (${lastError instanceof Error ? lastError.message : String(lastError)}), falling back to heuristic parser.`);
  return heuristicExtract(markdown, sourceUrl);
}
