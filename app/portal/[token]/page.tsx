import { serverFetch } from '@/lib/serverApi'
import { PortalView, PortalInfo } from './PortalView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function PortalPage({ params }: PageProps) {
  const { token } = await params

  const initialInfo = await serverFetch<PortalInfo>(`/api/portal/${token}`)

  return <PortalView token={token} initialInfo={initialInfo} />
}
