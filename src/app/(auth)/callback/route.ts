import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle provider-level errors (e.g. access_denied or unconfigured provider)
  if (error || errorDescription) {
    const errorMsg = errorDescription || error || 'OAuth authentication failed';
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(errorMsg)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!exchangeError) {
      // Ensure the redirect stays on the same origin
      const redirectPath = next.startsWith('/') ? next : '/dashboard';
      return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`);
    }

    console.error('OAuth code exchange error:', exchangeError);
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  // No code or error was provided
  return NextResponse.redirect(`${requestUrl.origin}/login?error=No+authentication+code+received`);
}
