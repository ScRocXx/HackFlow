import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchUrlContent, htmlToCleanText } from '@/lib/extraction/jina-reader';
import { extractJsonLd } from '@/lib/extraction/jsonld-extractor';
import { parseHackathonContent } from '@/lib/extraction/gemini-parser';
import { stashRawText, getStashedRawText, clearStashedRawText } from '@/lib/extraction/raw-cache';
import { z } from 'zod';

const RequestSchema = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
  rawText: z.string().optional(),
  content: z.string().optional(),
  forceFresh: z.boolean().optional().default(false),
  reparseOnly: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
  const textContent = (data.text || data.rawText || data.content || '').trim();
  const urlContent = (data.url || '').trim();

  if (!textContent && !urlContent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please provide either a valid competition URL or paste contest text/flyer guidelines.',
      path: ['url'],
    });
    return;
  }

  if (textContent && textContent.length < 20) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Pasted text is too short. Please paste the guidelines, flyer details, or competition description.',
      path: ['text'],
    });
    return;
  }

  if (!textContent && urlContent) {
    try {
      const urlToTest = urlContent.startsWith('http://') || urlContent.startsWith('https://')
        ? urlContent
        : `https://${urlContent}`;
      const parsed = new URL(urlToTest);
      if (!parsed.hostname.includes('.')) {
        throw new Error('Invalid hostname');
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid competition URL (e.g. https://example.com/...)',
        path: ['url'],
      });
    }
  }
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
      return NextResponse.json({ error: issueMessage || 'Invalid request payload' }, { status: 400 });
    }

    const rawText = (result.data.text || result.data.rawText || result.data.content || '').trim();
    let rawUrl = (result.data.url || '').replace(/[.,;'"\s]+$/, '').trim();
    if (rawUrl) {
      if (!/^https?:\/\//i.test(rawUrl) && rawUrl.includes('.')) {
        rawUrl = `https://${rawUrl}`;
      }
      try {
        new URL(rawUrl);
      } catch {
        // If malformed, clear rawUrl so it doesn't fail downstream
        rawUrl = '';
      }
    }

    let content = rawText;
    let finalUrl = rawUrl;
    let jsonLd = null;
    let pageTitle: string | undefined = undefined;

    let fromCache = false;

    if (content) {
      // If user pasted raw HTML (e.g. from page source or inspect element), clean it and extract metadata
      if (/<(?:!doctype|html|head|body|div|section|article|main)[\s>]/i.test(content)) {
        jsonLd = extractJsonLd(content, rawUrl);
        const { title, text } = htmlToCleanText(content, rawUrl, jsonLd?.organizer);
        if (text && text.trim().length >= 20) {
          content = text;
          if (jsonLd?.title || title) {
            pageTitle = jsonLd?.title || title;
          }
        }
      }
      if (rawUrl) {
        stashRawText(rawUrl, { rawText: content, finalUrl: rawUrl, jsonLd, pageTitle });
      }
    } else {
      // If forceFresh was requested, purge any stashed raw text first
      if (result.data.forceFresh && rawUrl) {
        clearStashedRawText(rawUrl);
      }

      // Check Ephemeral Raw Text Stash first (10-min TTL) to skip expensive 8-10s network re-scrape
      const cached = !result.data.forceFresh && rawUrl ? getStashedRawText(rawUrl) : null;

      if (cached && cached.rawText) {
        content = cached.rawText;
        finalUrl = cached.finalUrl;
        jsonLd = cached.jsonLd;
        pageTitle = cached.pageTitle;
        fromCache = true;
      } else {
        // Fetch dynamic content via Jina Reader + direct HTML JSON-LD
        const fetched = await fetchUrlContent(rawUrl);
        content = fetched.content;
        finalUrl = fetched.url;
        jsonLd = fetched.jsonLd || null;
        pageTitle = fetched.title;

        // Stash raw text immediately for 10 minutes
        if (rawUrl && content) {
          stashRawText(rawUrl, { rawText: content, finalUrl, jsonLd, pageTitle });
        }
      }
    }

    // Detection for Cloudflare / anti-bot challenges and empty SPA shells
    const isAntiBotBlocked = (text: string): boolean => {
      const lower = text.toLowerCase();
      if (
        lower.includes('just a moment...') || 
        lower.includes('attention required! | cloudflare') ||
        lower.includes('enable javascript and cookies to continue') ||
        lower.includes('checking your browser before accessing') ||
        lower.includes('ddos protection by cloudflare') ||
        lower.includes('cf-browser-verification') ||
        lower.includes('access denied') ||
        lower.includes('security check to access') ||
        lower.includes('verify you are human') ||
        lower.includes('bot detection')
      ) {
        return true;
      }
      // Empty client-side SPA shell without rendered DOM
      if (text.length < 200 && (lower.includes('javascript') || lower.includes('root') || lower.includes('__next') || lower.includes('app-root'))) {
        return true;
      }
      return false;
    };

    if (!content || content.trim().length === 0 || (rawUrl && isAntiBotBlocked(content))) {
      return NextResponse.json({
        error: 'scrape_blocked',
        code: 'SCRAPE_BLOCKED',
        message: 'This competition portal is protected by Cloudflare or requires client-side JavaScript. Please copy and paste the announcement text or guidelines into the Text tab for instant AI extraction.',
        suggestion: 'copy_paste',
        url: rawUrl || undefined,
      }, { status: 422 });
    }

    // Parse structured metadata and multi-round timeline via Gemini with verified anchors
    const parsedData = await parseHackathonContent(content, finalUrl, jsonLd, pageTitle);

    if (!parsedData || !parsedData.stages || parsedData.stages.length === 0) {
      return NextResponse.json({
        error: 'not_a_hackathon',
        code: 'NOT_A_HACKATHON',
        message: 'Could not detect competition stages or deadlines. Try copying and pasting the schedule or problem statement text directly.',
        suggestion: 'copy_paste',
      }, { status: 422 });
    }

    return NextResponse.json({
      ...parsedData,
      rawContent: content,
      fromCache,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Extraction error:', error);
    const errMsg = (error?.message || '').toLowerCase();
    const isScrapeBlocked = 
      errMsg.includes('403') || 
      errMsg.includes('429') || 
      errMsg.includes('cloudflare') || 
      errMsg.includes('forbidden') || 
      errMsg.includes('blocked') || 
      errMsg.includes('timeout');

    if (isScrapeBlocked) {
      return NextResponse.json({
        error: 'scrape_blocked',
        code: 'SCRAPE_BLOCKED',
        message: 'Scraper was blocked by portal anti-bot protection or rate limit. Copy and paste the competition text into the Text tab for instant AI parsing.',
        suggestion: 'copy_paste',
      }, { status: 422 });
    }

    return NextResponse.json({
      error: 'parse_failed',
      code: 'PARSE_FAILED',
      message: error?.message || 'Failed to extract competition details. Try pasting text directly.',
      suggestion: 'copy_paste',
    }, { status: 400 });
  }
}
