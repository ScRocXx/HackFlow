import { createClient } from '@supabase/supabase-js';
import { sanitizeInternalLink } from '@/lib/utils/url';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://llyzvbwmktztyyrpcydp.supabase.co').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function createInAppNotification(params: {
  userId: string;
  title: string;
  body: string;
  link?: string;
}) {
  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id: params.userId,
    title: params.title,
    body: params.body,
    link: sanitizeInternalLink(params.link),
    read: false,
  });

  if (error) {
    console.error('Error creating in-app notification:', error);
  }
}

export async function createBatchInAppNotifications(notifications: Array<{
  userId: string;
  title: string;
  body: string;
  link?: string;
}>) {
  if (!notifications || notifications.length === 0) return;
  const rows = notifications.map(n => ({
    user_id: n.userId,
    title: n.title,
    body: n.body,
    link: sanitizeInternalLink(n.link),
    read: false,
  }));
  const { error } = await supabaseAdmin.from('notifications').insert(rows);
  if (error) {
    console.error('Error creating batch in-app notifications:', error);
  }
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

export async function getUserNotifications(userId: string, limit = 20) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user notifications:', error);
    return [];
  }

  return data;
}

export async function hasRecentNudge(targetUserId: string, squadId: string, minutes = 15): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', targetUserId)
      .like('link', `%squad=${squadId}%`)
      .gte('created_at', cutoff)
      .limit(1);

    if (error || !data) return false;
    return data.length > 0;
  } catch (err) {
    console.error('hasRecentNudge error:', err);
    return false;
  }
}
