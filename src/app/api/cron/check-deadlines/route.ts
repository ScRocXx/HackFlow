import { NextResponse } from 'next/server';
import { evaluateAndDispatchNotifications } from '@/lib/notifications/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed for Vercel Free tier is 10s usually, or 60s for Pro. Keep at 60.

// NOTE: Vercel cron on free tier is limited to 1/day.
// We configure this route to be called by an external cron service (like cron-job.org)
// every 15 minutes to properly dispatch notifications based on intervals.

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await evaluateAndDispatchNotifications();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
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
