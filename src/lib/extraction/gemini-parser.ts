import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const ParsedHackathonSchema = z.object({
  title: z.string(),
  organizer: z.string().optional().default(''),
  source_platform: z.enum(['unstop', 'devfolio', 'devpost', 'mlh', 'hackerearth', 'custom']),
  mode: z.enum(['online', 'in-person', 'hybrid']).optional().default('online'),
  location: z.string().optional().default(''),
  banner_url: z.string().optional().default(''),
  prize_pool: z.string().optional().default(''),
  overview: z.string().optional().default(''),
  eligibility: z.string().optional().default(''),
  team_size_min: z.number().int().optional().default(1),
  team_size_max: z.number().int().optional().default(4),
  stages: z.array(z.object({
    round_number: z.number().int(),
    title: z.string(),
    stage_type: z.enum(['quiz', 'ppt_submission', 'prototype', 'presentation', 'other']),
    deadline: z.string(), // ISO 8601 with timezone
    evaluation_format: z.string().optional().default(''),
    deliverables_description: z.string().optional().default(''),
  })).min(1),
});

export type ParsedHackathon = z.infer<typeof ParsedHackathonSchema>;

export function detectPlatform(url: string): 'unstop' | 'devfolio' | 'devpost' | 'mlh' | 'hackerearth' | 'custom' {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('unstop.com')) return 'unstop';
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
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const platform = detectPlatform(sourceUrl);

  const systemPrompt = `You are a hackathon data extraction expert. Extract hackathon metadata from the provided markdown content.
Identify ALL sequential rounds/stages with their deadlines.

CRITICAL TIMEZONE HANDLING: Parse all dates and times into ISO 8601 format with timezone offsets. 
Indian platforms (Unstop, HackerEarth) typically use IST (UTC+05:30). US platforms (Devpost, MLH) typically use EST/EDT or UTC. 
If no timezone is specified, infer from the platform. ALWAYS include the timezone offset (e.g., 2026-10-15T23:59:59+05:30, not just 2026-10-15T23:59:59).

The source platform detected from the URL is: ${platform}. Ensure this is returned in the 'source_platform' field.
Also extract prize pool, eligibility, team size constraints, and mode (online/in-person/hybrid).

Return ONLY a valid JSON object matching this schema, without any markdown formatting or code blocks around it:
{
  "title": "string",
  "organizer": "string",
  "source_platform": "unstop" | "devfolio" | "devpost" | "mlh" | "hackerearth" | "custom",
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
      "round_number": number,
      "title": "string",
      "stage_type": "quiz" | "ppt_submission" | "prototype" | "presentation" | "other",
      "deadline": "string", // ISO 8601 with timezone
      "evaluation_format": "string",
      "deliverables_description": "string"
    }
  ]
}`;

  let retries = 2;
  while (retries >= 0) {
    try {
      const result = await model.generateContent([
        systemPrompt,
        `Here is the markdown content to parse:\n\n${markdown}`
      ]);
      
      const text = result.response.text();
      let jsonStr = text.trim();
      
      // Clean up markdown formatting if the model still includes it
      if (jsonStr.startsWith('\`\`\`json')) {
        jsonStr = jsonStr.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
      } else if (jsonStr.startsWith('\`\`\`')) {
        jsonStr = jsonStr.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      return ParsedHackathonSchema.parse(parsed);
    } catch (error) {
      if (retries === 0) {
        throw new Error(`Failed to parse hackathon content: ${error instanceof Error ? error.message : String(error)}`);
      }
      retries--;
    }
  }
  
  throw new Error('Unreachable');
}
