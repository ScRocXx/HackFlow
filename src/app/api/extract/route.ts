import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchUrlContent } from '@/lib/extraction/jina-reader';
import { parseHackathonContent } from '@/lib/extraction/gemini-parser';
import { z } from 'zod';

const RequestSchema = z.object({
  url: z.string().url('Please enter a valid URL (e.g. https://unstop.com/...)'),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to import a hackathon' }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      const issueMessage = result.error.issues.map(i => i.message).join(', ');
      return NextResponse.json({ error: issueMessage || 'Invalid URL provided' }, { status: 400 });
    }

    const { url } = result.data;

    // Fetch dynamic content via Jina Reader + direct HTML JSON-LD
    const { content, url: finalUrl, jsonLd } = await fetchUrlContent(url);
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'I suppose this is not a hackathon...' },
        { status: 400 }
      );
    }

    // Parse structured metadata and multi-round timeline via Gemini with verified anchors
    const parsedData = await parseHackathonContent(content, finalUrl, jsonLd);

    return NextResponse.json(parsedData, { status: 200 });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: 'I suppose this is not a hackathon...' },
      { status: 400 }
    );
  }
}
