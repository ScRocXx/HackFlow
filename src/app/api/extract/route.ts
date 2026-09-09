import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchUrlContent } from '@/lib/extraction/jina-reader';
import { parseHackathonContent } from '@/lib/extraction/gemini-parser';
import { z } from 'zod';

const RequestSchema = z.object({
  url: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid URL', details: result.error.issues }, { status: 400 });
    }

    const { url } = result.data;

    const { content, url: finalUrl } = await fetchUrlContent(url);
    const parsedData = await parseHackathonContent(content, finalUrl);

    return NextResponse.json(parsedData, { status: 200 });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during extraction' },
      { status: 500 }
    );
  }
}
