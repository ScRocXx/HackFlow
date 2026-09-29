import { EventStage } from '@/lib/supabase/types'

/**
 * Computes the currently active stage for an event in a unified way.
 * Resolves discrepancies across Dashboard, EventCard, and EventDetailContent.
 */
export function computeActiveStage(
  stages?: EventStage[] | null,
  activeStageId?: string | null
): EventStage | null {
  if (!stages || stages.length === 0) return null
  const now = Date.now()

  const parseDeadline = (s: EventStage): number | null => {
    const raw = s.actionable_deadline || s.window_end || s.deadline
    if (!raw) return null
    const ts = new Date(raw).getTime()
    return isNaN(ts) ? null : ts
  }

  // 1. Try explicit activeStageId if it's not completed and deadline hasn't passed
  if (activeStageId) {
    const explicit = stages.find(s => s.id === activeStageId)
    if (explicit && !explicit.is_completed) {
      const ts = parseDeadline(explicit)
      if (ts === null || ts > now) {
        return explicit
      }
    }
  }

  // 2. Look for upcoming uncompleted stages with future deadlines, sorted by earliest deadline
  const upcomingWithDeadline = stages
    .filter(s => {
      if (s.is_completed) return false
      const ts = parseDeadline(s)
      return ts !== null && ts > now
    })
    .sort((a, b) => (parseDeadline(a) ?? 0) - (parseDeadline(b) ?? 0))

  if (upcomingWithDeadline.length > 0) {
    return upcomingWithDeadline[0]
  }

  // 3. Fallback to first uncompleted stage (even if deadline passed or missing)
  const firstUncompleted = stages.find(s => !s.is_completed)
  if (firstUncompleted) {
    return firstUncompleted
  }

  // 4. Fallback to explicit stage if found
  if (activeStageId) {
    const explicit = stages.find(s => s.id === activeStageId)
    if (explicit) return explicit
  }

  // 5. Final fallback: first stage in list
  return stages[0] || null
}
