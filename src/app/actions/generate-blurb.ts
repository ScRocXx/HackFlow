'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export interface GenerateBlurbInput {
  eventId: string;
  problemStatementTitle: string;
  problemStatementCategory?: string;
  problemStatementDescription?: string;
  solutionBullets?: string[];
  githubRepoUrl?: string | null;
  pitchDeckBase64?: string | null; // Client-side guarded <= 7MB
  pitchDeckUrl?: string | null;
  maxWords?: number; // default 150
}

export interface GeneratedBlurbResult {
  success: boolean;
  error?: string;
  elevator_pitch?: string;
  architecture_summary?: string;
  readmeFetched?: boolean;
  deckAnalyzed?: boolean;
}

/**
 * Fetches raw GitHub README with automatic branch fallback (main -> master).
 * Bypasses GitHub API rate limits.
 */
async function fetchGithubReadme(repoUrl: string): Promise<{ content: string | null; branch?: string }> {
  try {
    const cleanUrl = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return { content: null };

    const [, owner, repo] = match;
    const branches = ['main', 'master'];

    for (const branch of branches) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
      const res = await fetch(rawUrl, {
        headers: { 'User-Agent': 'HackFlow-Blurb-Generator' },
        next: { revalidate: 60 },
      });

      if (res.ok) {
        const text = await res.text();
        return { content: text.slice(0, 15000), branch }; // cap at 15k chars to keep prompt fast
      }
    }

    return { content: null };
  } catch (err) {
    console.warn('[GenerateBlurb] Failed to fetch README:', err);
    return { content: null };
  }
}

/**
 * Generates an elevator pitch and architecture summary using Gemini 1.5 Flash
 * Multimodal analysis of GitHub README + Presentation Deck PDF + Problem Statement
 */
export async function generateSubmissionBlurb(input: GenerateBlurbInput): Promise<GeneratedBlurbResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'GEMINI_API_KEY is not configured in server environment' };
    }

    const maxWords = input.maxWords || 150;
    const parts: any[] = [];
    let readmeFetched = false;
    let deckAnalyzed = false;

    // 1. Ingest GitHub README if URL provided
    let readmeText = '';
    if (input.githubRepoUrl && input.githubRepoUrl.trim()) {
      const readmeRes = await fetchGithubReadme(input.githubRepoUrl);
      if (readmeRes.content) {
        readmeFetched = true;
        readmeText = `\n--- GITHUB README.MD (${input.githubRepoUrl}, branch: ${readmeRes.branch}) ---\n${readmeRes.content}\n`;
      }
    }

    // 2. Ingest Presentation Deck PDF if base64 provided
    if (input.pitchDeckBase64 && input.pitchDeckBase64.trim()) {
      const cleanBase64 = input.pitchDeckBase64.replace(/^data:application\/pdf;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: 'application/pdf',
        },
      });
      deckAnalyzed = true;
    }

    // 3. Assemble Prompt
    const promptText = `
You are an elite hackathon mentor and winning pitch writer.
Analyze the following hackathon submission materials and write two high-impact, professional summaries for submission portals (Unstop, Devfolio, Devpost).

MATERIALS:
- Track / Problem Title: ${input.problemStatementTitle}
- Category / Domain: ${input.problemStatementCategory || 'General'}
- Problem Description: ${input.problemStatementDescription || 'N/A'}
- Squad Solution Bullets:
${(input.solutionBullets || []).map((b, i) => `  ${i + 1}. ${b}`).join('\n') || '  (None provided)'}
${readmeText ? readmeText : '- GitHub Repo: No README available'}
${deckAnalyzed ? '- Presentation Deck: Attached above as multimodal PDF document' : '- Presentation Deck: None provided'}

STRICT REQUIREMENTS:
1. Output MUST be valid JSON with strictly two fields: "elevator_pitch" and "architecture_summary".
2. "elevator_pitch":
   - Maximum ${maxWords} words.
   - High-impact problem/solution overview.
   - Hook the judges immediately with the exact core user pain point and how the project uniquely solves it.
3. "architecture_summary":
   - Maximum ${maxWords} words.
   - Concrete technical stack breakdown: Frontend, Backend, Database, AI/ML models, external APIs, and cloud deployment.
   - Avoid buzzword fluff; specify real technical libraries and components identified from the README/Deck/Bullets.
4. DO NOT wrap with markdown code blocks. Output raw JSON only.

Example JSON format:
{
  "elevator_pitch": "...",
  "architecture_summary": "..."
}
`;

    parts.push({ text: promptText });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const result = await model.generateContent(parts);
    const responseText = result.response.text().trim();

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Fallback clean if wrapped in code blocks
      const clean = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return {
      success: true,
      elevator_pitch: parsed?.elevator_pitch || '',
      architecture_summary: parsed?.architecture_summary || '',
      readmeFetched,
      deckAnalyzed,
    };
  } catch (error: any) {
    console.error('[generateSubmissionBlurb] Error:', error);
    return { success: false, error: error.message || 'Failed to generate submission blurb' };
  }
}
