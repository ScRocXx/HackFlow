'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import type { EventProblemStatement } from '@/lib/supabase/types';

export interface ExtractedProblemStatement {
  title: string;
  category?: string;
  description?: string;
  solution_bullets: string[];
}

/**
 * Server action to ingest a hackathon brochure or problem statement PDF directly using Gemini 2.0 Flash native multimodal support.
 * Extracts tracks, challenges, and requirements, and automatically saves them into event_problem_statements.
 */
export async function extractProblemStatementsFromPdf(
  base64Pdf: string,
  eventId?: string
): Promise<{ success: boolean; data?: EventProblemStatement[] | ExtractedProblemStatement[]; error?: string }> {
  try {
    // 1. Check Content-Length header before buffering the PDF
    try {
      const reqHeaders = headers();
      const contentLengthHeader = reqHeaders.get('content-length');
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(contentLength) && contentLength > 4 * 1024 * 1024) {
          return {
            success: false,
            error: 'File exceeds 4MB serverless limit. Please paste the rulebook text directly into the text tab.',
          };
        }
      }
    } catch {
      // In case headers() is invoked in a non-request environment
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'GEMINI_API_KEY is not configured.' };
    }

    let pdfPayload = base64Pdf;

    // If a direct URL to a PDF was supplied, inspect remote Content-Length before buffering
    if (base64Pdf.startsWith('http://') || base64Pdf.startsWith('https://')) {
      try {
        const headRes = await fetch(base64Pdf, { method: 'HEAD' });
        const remoteContentLength = headRes.headers.get('content-length');
        if (remoteContentLength && parseInt(remoteContentLength, 10) > 4 * 1024 * 1024) {
          return {
            success: false,
            error: 'File exceeds 4MB serverless limit. Please paste the rulebook text directly into the text tab.',
          };
        }
        const getRes = await fetch(base64Pdf);
        const getCl = getRes.headers.get('content-length');
        if (getCl && parseInt(getCl, 10) > 4 * 1024 * 1024) {
          return {
            success: false,
            error: 'File exceeds 4MB serverless limit. Please paste the rulebook text directly into the text tab.',
          };
        }
        const arrayBuffer = await getRes.arrayBuffer();
        if (arrayBuffer.byteLength > 4 * 1024 * 1024) {
          return {
            success: false,
            error: 'File exceeds 4MB serverless limit. Please paste the rulebook text directly into the text tab.',
          };
        }
        pdfPayload = Buffer.from(arrayBuffer).toString('base64');
      } catch (fetchErr: any) {
        return { success: false, error: `Failed to fetch remote PDF: ${fetchErr?.message || 'Network error'}` };
      }
    }

    // Clean base64 string (strip data:application/pdf;base64, prefix if present)
    const cleanBase64 = pdfPayload.replace(/^data:application\/pdf;base64,/, '').trim();
    if (!cleanBase64) {
      return { success: false, error: 'Invalid or empty PDF payload.' };
    }

    // Check base64 payload size (approximate byte size = (len * 3) / 4)
    const approxBytes = Math.ceil((cleanBase64.length * 3) / 4);
    if (approxBytes > 4 * 1024 * 1024) {
      return {
        success: false,
        error: 'File exceeds 4MB serverless limit. Please paste the rulebook text directly into the text tab.',
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a hackathon technical advisor reviewing a challenge or hackathon brochure document.
Examine this PDF document thoroughly. Extract all problem statements, themes, tracks, or challenges provided in this document.

For each distinct problem statement or track found, extract:
1. "title": Concise, descriptive name of the problem or track (e.g., "AI-Powered Patient Triage", "Decentralized Carbon Credit Registry").
2. "category": The domain/category (e.g., "Healthcare", "FinTech", "AI/ML", "Web3", "Cybersecurity", "Open Innovation").
3. "description": A clear 2-4 sentence summary explaining the core problem, context, and pain point described in the brochure.
4. "solution_bullets": An array of 3 to 6 actionable requirements, suggested technologies, scope boundaries, or expected features mentioned in the brochure.

Respond ONLY with valid JSON in this exact structure without markdown code fences:
[
  {
    "title": "...",
    "category": "...",
    "description": "...",
    "solution_bullets": ["...", "..."]
  }
]`;

    const response = await model.generateContent([
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'application/pdf',
        },
      },
      prompt,
    ]);

    const rawText = response.response.text();
    // Strip markdown fences if Gemini added them
    const sanitizedJson = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

    let parsedList: ExtractedProblemStatement[] = [];
    try {
      parsedList = JSON.parse(sanitizedJson);
    } catch (parseErr) {
      console.error('[extract-pdf] Failed to parse JSON from Gemini response:', rawText);
      return { success: false, error: 'Failed to parse problem statements from the document.' };
    }

    if (!Array.isArray(parsedList) || parsedList.length === 0) {
      return { success: false, error: 'No distinct problem statements or tracks were identified in this PDF.' };
    }

    // If eventId is provided, persist into Supabase event_problem_statements
    if (eventId) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Authentication required to save statements to event.' };
      }

      const { data: participant } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: ev } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .maybeSingle();

      if (!participant && ev?.created_by !== user.id) {
        return { success: false, error: 'Forbidden: You are not authorized for this event.' };
      }

      const rowsToInsert = parsedList.map((p) => ({
        event_id: eventId,
        title: p.title?.trim() || 'Untitled Track',
        description: p.description?.trim() || null,
        category: p.category?.trim() || 'General',
        solution_bullets: Array.isArray(p.solution_bullets) ? p.solution_bullets.filter(Boolean) : [],
        is_chosen: false,
      }));

      const { data: inserted, error: dbError } = await supabase
        .from('event_problem_statements')
        .insert(rowsToInsert)
        .select('*');

      if (dbError) {
        console.error('[extract-pdf] Database insertion error:', dbError);
        return { success: false, error: dbError.message };
      }

      revalidatePath(`/events/${eventId}`);
      return { success: true, data: inserted as EventProblemStatement[] };
    }

    return { success: true, data: parsedList };
  } catch (error: any) {
    console.error('[extract-pdf] Unexpected error during PDF extraction:', error);
    return { success: false, error: error?.message || 'Failed to extract problem statements from PDF.' };
  }
}
