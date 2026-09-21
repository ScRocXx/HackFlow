import { NextResponse } from 'next/server';
import { evaluateAndDispatchNotifications } from '@/lib/notifications/engine';
import { getServerBaseUrl } from '@/lib/utils/url-server';

export const dynamic = 'force-dynamic';

// NOTE: External cron service (or Vercel Cron) calls this endpoint with:
// Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')?.trim();
  const cronSecret = (process.env.CRON_SECRET || 'hackflow-cron-secret-change-in-production').trim();

  // STRICT FAIL-CLOSED: Refuse execution if authorization token does not match
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide valid Authorization: Bearer <token> header.' },
      { status: 401 }
    );
  }

  try {
    const baseUrl = getServerBaseUrl(request);
    const result = await evaluateAndDispatchNotifications({ baseUrl });
    return NextResponse.json({
      success: true,
      processed: result.evaluated,
      timestamp: new Date().toISOString(),
      serviceRoleKeyConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 12) : 'none',
      keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
      ...result,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
