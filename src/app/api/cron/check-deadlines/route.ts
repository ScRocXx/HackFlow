import { NextResponse } from 'next/server';
import { evaluateAndDispatchNotifications } from '@/lib/notifications/engine';

export const dynamic = 'force-dynamic';

// NOTE: External cron service (or Vercel Cron) calls this endpoint with:
// Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const isDev = process.env.NODE_ENV === 'development';
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    isDev ||
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}`;

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide valid Authorization: Bearer <token> header.' },
      { status: 401 }
    );
  }

  try {
    const result = await evaluateAndDispatchNotifications();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      serviceRoleKeyConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
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
