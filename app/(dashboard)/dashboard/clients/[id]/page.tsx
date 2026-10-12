import { notFound } from 'next/navigation'
import { serverFetch } from '@/lib/serverApi'
import { ClientDetailResponse } from '@/lib/api'
import { ClientWorkspaceView } from './ClientWorkspaceView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientWorkspacePage({ params }: PageProps) {
  const { id } = await params

  const initialData = await serverFetch<ClientDetailResponse>(`/api/clients/${id}`)

  if (!initialData) {
    notFound()
  }

  return <ClientWorkspaceView clientId={id} initialData={initialData} />
}
