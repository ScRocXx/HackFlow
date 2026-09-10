'use client';

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    const fetchNotifications = async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (data) {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.read).length);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();

    // Subscribe to realtime updates
    try {
      const channel = supabase
        .channel(`notifications_channel_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new) {
              setNotifications((prev) => [payload.new, ...prev]);
              setUnreadCount((prev) => prev + 1);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('Realtime subscription error in bell:', err);
    }
  }, [userId, supabase]);

  const handleMarkAllRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      if (!notification.read) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification.id)
          .eq('user_id', userId);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
    
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative border-2 border-[#10201d] bg-[#f7f7f2] hover:bg-[#e97b77] text-[#10201d] shadow-[2px_2px_0_#10201d]">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center border border-[#10201d] bg-[#e53927] text-[10px] font-mono font-bold text-white shadow-[1px_1px_0_#10201d]">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] p-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-[#10201d] bg-[#3d5f58] text-[#f7f7f2]">
          <span className="font-display font-bold text-base">Notifications</span>
          <button onClick={handleMarkAllRead} className="font-mono text-[11px] font-bold text-[#8bb2de] hover:text-white underline">
            Mark all read
          </button>
        </div>
        {notifications.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-[#34433f]">No notifications yet</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "flex flex-col items-start p-3 cursor-pointer gap-1 border-b border-[#10201d]/20 last:border-b-0 hover:bg-[#e4e5da] transition-colors",
                !notification.read && "bg-[#f2f2eb]"
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-center gap-2 w-full">
                {!notification.read && <div className="h-2 w-2 rounded-none bg-[#e53927] border border-[#10201d]" />}
                <span className="font-display font-bold text-sm text-[#10201d]">{notification.title}</span>
              </div>
              <p className="font-mono text-xs text-[#34433f] line-clamp-2">{notification.body}</p>
              <span className="font-mono text-[10px] text-[#2e4742] font-semibold mt-1">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
