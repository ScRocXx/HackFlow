'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface EventRoomHandlers {
  onDeliverableChange?: (payload: any) => void
  onStageChange?: (payload: any) => void
  onParticipantChange?: (payload: any) => void
  onResourceChange?: (payload: any) => void
}

/**
 * Multiplexed hook for subscribing to Realtime changes on an Event Room channel.
 * Channel name: `event-room:${eventId}`
 * Multiplexes deliverables, stages, participants, and resources into a single WebSocket channel.
 */
export function useEventRoom(eventId: string, handlers: EventRoomHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!eventId) return

    const supabase = createClient()
    const channelName = `event-room:${eventId}`

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stage_deliverables',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          handlersRef.current.onDeliverableChange?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_stages',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          handlersRef.current.onStageChange?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          handlersRef.current.onParticipantChange?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_resources',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          handlersRef.current.onResourceChange?.(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])
}
