import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/serverApi'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getServerUser()
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
