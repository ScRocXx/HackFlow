import { getUserEvents } from '@/app/actions/events'
import { DashboardContent } from '@/components/events/DashboardContent'

export default async function DashboardPage() {
  const result = await getUserEvents()
  const events = result.success && result.data ? result.data : []

  return <DashboardContent events={events as any} />
}
