'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Check, Trash2, X, AlertTriangle, Clock, Calendar, Sparkles, Users, FileText, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
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

  const handleClearAll = async () => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      const target = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (target && !target.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
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

  const getUrgencyBadge = (title: string) => {
    const t = title.toLowerCase();
    if (title.includes('Critical') || title.includes('🚨')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#e53927] text-white border border-[#10201d]">
          <AlertTriangle className="w-2.5 h-2.5" /> Urgent
        </span>
      );
    }
    if (title.includes('Freeze') || title.includes('TOMORROW') || t.includes('24h')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#f5b726] text-[#10201d] border border-[#10201d]">
          <Clock className="w-2.5 h-2.5" /> 24h Left
        </span>
      );
    }
    if (title.includes('Midpoint') || t.includes('3 days')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#8bb2de] text-[#10201d] border border-[#10201d]">
          <Calendar className="w-2.5 h-2.5" /> 3 Days
        </span>
      );
    }
    if (t.includes('team') || t.includes('squad') || t.includes('collaborator') || t.includes('invited')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#2e4742] text-[#8bb2de] border border-[#10201d]">
          <Users className="w-2.5 h-2.5" /> Team
        </span>
      );
    }
    if (t.includes('resource') || t.includes('statement') || t.includes('rulebook') || t.includes('deck') || t.includes('dataset')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#d4ebd0] text-[#1e4620] border border-[#10201d]">
          <FileText className="w-2.5 h-2.5" /> Resource
        </span>
      );
    }
    if (t.includes('friend')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#d8ccf4] text-[#3b1d7d] border border-[#10201d]">
          <UserPlus className="w-2.5 h-2.5" /> Friend
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#e4e5da] text-[#10201d] border border-[#10201d]">
        <Sparkles className="w-2.5 h-2.5" /> Update
      </span>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative border-2 border-[#10201d] bg-[#f7f7f2] hover:bg-[#e97b77] text-[#10201d] shadow-[2px_2px_0_#10201d] transition-transform active:translate-x-[1px] active:translate-y-[1px]"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center border-2 border-[#10201d] bg-[#e53927] text-[10px] font-mono font-black text-white shadow-[1px_1px_0_#10201d] animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[340px] sm:w-[420px] border-2 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912] p-0 overflow-hidden z-50 rounded-none"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#10201d] bg-[#2e4742] text-[#f7f7f2]">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-base tracking-wide uppercase">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 font-mono text-[10px] font-bold bg-[#e53927] text-white border border-[#10201d]">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead} 
                className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#f5b726] hover:text-white transition-colors underline"
              >
                <Check className="w-3 h-3" /> Mark read
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                onClick={handleClearAll} 
                className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#e97b77] hover:text-white transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Notification List */}
        <div className="max-h-[380px] overflow-y-auto divide-y-2 divide-[#10201d]/15 bg-[#f7f7f2]">
          {notifications.length === 0 ? (
            <div className="py-12 px-4 text-center font-mono text-xs text-[#34433f] flex flex-col items-center gap-2">
              <Bell className="w-8 h-8 opacity-30 text-[#2e4742]" />
              <p className="font-bold">No notifications right now.</p>
              <p className="text-[11px] text-[#34433f]/70">You&apos;re all caught up with deadlines!</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const isCritical = notification.title.includes('Critical') || notification.title.includes('🚨');
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "relative p-3.5 cursor-pointer flex flex-col gap-1.5 transition-colors group",
                    notification.read 
                      ? "bg-[#f7f7f2] hover:bg-[#e4e5da]/80" 
                      : isCritical
                        ? "bg-[#fff1f0] hover:bg-[#ffe5e3] border-l-4 border-l-[#e53927]"
                        : "bg-[#f2f2eb] hover:bg-[#e4e5da] border-l-4 border-l-[#f5b726]"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getUrgencyBadge(notification.title)}
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-none bg-[#e53927] border border-[#10201d] inline-block animate-ping" />
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#34433f] hover:text-[#e53927] p-0.5 transition-opacity"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className={cn(
                    "font-display text-xs font-bold leading-snug line-clamp-2",
                    isCritical ? "text-[#9e1c14]" : "text-[#10201d]"
                  )}>
                    {notification.title}
                  </h4>

                  {notification.body && (
                    <p className="font-mono text-[11px] text-[#34433f] line-clamp-2 leading-normal">
                      {notification.body}
                    </p>
                  )}

                  <div className="flex items-center justify-between font-mono text-[10px] text-[#2e4742] font-semibold mt-0.5">
                    <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                    {notification.link && (
                      <span className="text-[#3d5f58] group-hover:text-[#e53927] underline">View &rarr;</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t-2 border-[#10201d] bg-[#e4e5da] flex items-center justify-between font-mono text-[10px] text-[#2e4742] font-bold">
            <span>Showing {notifications.length} notification{notifications.length > 1 ? 's' : ''}</span>
            <span>Real-time updates active</span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
