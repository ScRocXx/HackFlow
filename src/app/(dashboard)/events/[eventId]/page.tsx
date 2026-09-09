import { getEventWithDetails } from '@/app/actions/events'
import { EventDetailContent } from '@/components/events/EventDetailContent'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const result = await getEventWithDetails(params.eventId)
  
  if (!result.success || !result.data) {
    notFound()
  }

  return <EventDetailContent event={result.data as any} />
}
