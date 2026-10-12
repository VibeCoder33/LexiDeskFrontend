import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/serverApi'
import { CreateClientView } from './CreateClientView'

export const dynamic = 'force-dynamic'

export default async function CreateClientPage() {
  const user = await getServerUser()
  if (!user) {
    redirect('/login')
  }

  return <CreateClientView user={user} />
}
