import { serverFetch } from '@/lib/serverApi'
import { ClientsListResponse } from '@/lib/api'
import { ClientsView } from './ClientsView'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const initialData = await serverFetch<ClientsListResponse>('/api/clients?limit=50')

  return <ClientsView initialData={initialData} />
}
