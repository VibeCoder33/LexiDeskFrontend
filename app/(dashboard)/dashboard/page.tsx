import { serverFetch } from '@/lib/serverApi'
import { DashboardData } from '@/lib/api'
import { DashboardView } from './DashboardView'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const initialData = await serverFetch<DashboardData>('/api/dashboard')

  return <DashboardView initialData={initialData} />
}
