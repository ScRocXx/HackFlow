import { getUserEvents } from '@/app/actions/events'
import { DashboardContent } from '@/components/events/DashboardContent'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const result = await getUserEvents()
  const events = result.success && result.data ? result.data : []

  return <DashboardContent events={events as any} />
}
