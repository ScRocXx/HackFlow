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
});

export type ParsedHackathon = z.infer<typeof ParsedHackathonSchema>;
export type ParsedStage = z.infer<typeof StageSchema>;

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

export async function parseHackathonContent(markdown: string, sourceUrl: string): Promise<ParsedHackathon> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
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

      return ParsedHackathonSchema.parse(parsed);
    } catch (error) {
      lastError = error;
      if (retries === 0) {
        throw new Error(`LLM Extraction failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
      }
      retries--;
    }
  }
  
  throw new Error(`Extraction failed: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
}
