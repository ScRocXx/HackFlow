'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
import { sanitizeInternalLink } from '@/lib/utils/url';

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = useMemo(() => createClient(), []);
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
      const targetLink = sanitizeInternalLink(notification.link);
      if (targetLink.startsWith('/')) {
        router.push(targetLink);
      } else {
        window.open(targetLink, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const getUrgencyBadge = (title: string) => {
    const t = title.toLowerCase();
    if (title.includes('Critical') || title.includes('🚨')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-hack-coral/15 text-hack-coral">
          <AlertTriangle className="w-2.5 h-2.5" /> Urgent
        </span>
      );
    }
    if (title.includes('Freeze') || title.includes('TOMORROW') || t.includes('24h')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-hack-gold/15 text-hack-gold">
          <Clock className="w-2.5 h-2.5" /> 24h Left
        </span>
      );
    }
    if (title.includes('Midpoint') || t.includes('3 days')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-hack-blue/15 text-hack-blue">
          <Calendar className="w-2.5 h-2.5" /> 3 Days
        </span>
      );
    }
    if (t.includes('team') || t.includes('squad') || t.includes('collaborator') || t.includes('invited')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-hack-forest/15 text-hack-forest">
          <Users className="w-2.5 h-2.5" /> Team
        </span>
      );
    }
    if (t.includes('resource') || t.includes('statement') || t.includes('rulebook') || t.includes('deck') || t.includes('dataset')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-hack-sand text-hack-ink border border-hack-muted/30">
          <FileText className="w-2.5 h-2.5" /> Resource
        </span>
      );
    }
    if (t.includes('friend')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-hack-coral/10 text-hack-coral">
          <UserPlus className="w-2.5 h-2.5" /> Friend
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-hack-sand text-hack-subtext border border-hack-muted/30">
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
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
          className="relative border border-hack-muted/30 bg-hack-surface hover:bg-hack-sand text-hack-ink rounded-lg shadow-sm transition-all"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-hack-coral text-[10px] font-mono font-bold text-white shadow-sm animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[340px] sm:w-[420px] border border-hack-muted/30 bg-hack-surface shadow-hack-dialog p-0 overflow-hidden z-50 rounded-2xl"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-hack-muted/20 bg-hack-sand/50 text-hack-ink">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-wide">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.2 font-mono text-[10px] font-bold bg-hack-coral text-white rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead} 
                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-hack-forest hover:text-hack-coral transition-colors"
              >
                <Check className="w-3 h-3" /> Mark read
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                onClick={handleClearAll} 
                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-hack-subtext hover:text-hack-coral transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Notification List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-hack-muted/20 bg-hack-surface">
          {notifications.length === 0 ? (
            <div className="py-12 px-4 text-center font-mono text-xs text-hack-subtext flex flex-col items-center gap-2">
              <Bell className="w-8 h-8 opacity-30 text-hack-forest" />
              <p className="font-bold text-hack-ink">No notifications right now.</p>
              <p className="text-[11px] text-hack-subtext">You&apos;re all caught up with deadlines!</p>
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
                      ? "bg-hack-surface hover:bg-hack-sand/40" 
                      : isCritical
                        ? "bg-hack-coral/5 hover:bg-hack-coral/10 border-l-3 border-l-hack-coral"
                        : "bg-hack-sand/30 hover:bg-hack-sand/60 border-l-3 border-l-hack-gold"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getUrgencyBadge(notification.title)}
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-hack-coral inline-block" />
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      className="opacity-0 group-hover:opacity-100 text-hack-subtext hover:text-hack-coral p-0.5 transition-opacity"
                      title="Dismiss notification"
                      aria-label="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className={cn(
                    "font-display text-xs font-bold leading-snug line-clamp-2",
                    isCritical ? "text-hack-coral" : "text-hack-ink"
                  )}>
                    {notification.title}
                  </h4>

                  {notification.body && (
                    <p className="font-mono text-[11px] text-hack-subtext line-clamp-2 leading-normal">
                      {notification.body}
                    </p>
                  )}

                  <div className="flex items-center justify-between font-mono text-[10px] text-hack-subtext font-medium mt-0.5">
                    <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                    {notification.link && (
                      <span className="text-hack-forest group-hover:text-hack-coral font-semibold">View &rarr;</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-hack-muted/20 bg-hack-sand/30 flex items-center justify-between font-mono text-[10px] text-hack-subtext">
            <span>Showing {notifications.length} notification{notifications.length > 1 ? 's' : ''}</span>
            <span>Real-time updates active</span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
