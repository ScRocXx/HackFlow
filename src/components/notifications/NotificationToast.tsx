'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function NotificationToast({ userId }: { userId: string }) {
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('notification_toasts')
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
          toast({
            title: notification.title,
            description: notification.body,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, toast]);

  return null; // Renders globally in layout
}
