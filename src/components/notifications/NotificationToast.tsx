'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function NotificationToast({ userId }: { userId: string }) {
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;

    try {
      const channel = supabase
        .channel(`notification_toasts_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const notification = payload.new as any;
            if (notification?.title) {
              toast({
                title: notification.title,
                description: notification.body || '',
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('NotificationToast subscription error:', err);
    }
  }, [userId, supabase, toast]);

  return null; // Renders globally in layout
}
