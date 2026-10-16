import { getCurrentUser, logoutUser } from './api'
import { User } from '@/types/auth'

export async function checkSession(): Promise<User | null> {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}

export async function performLogout(): Promise<void> {
  try {
    await logoutUser()
  } catch (err) {
    console.error('Logout error:', err)
  } finally {
    if (typeof document !== 'undefined') {
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;'
      document.cookie = `auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname};`
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login?logout=true'
    }
  }
}
