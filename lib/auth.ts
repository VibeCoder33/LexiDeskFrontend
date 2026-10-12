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
  } catch {
    // Continue to redirect even on network error
  } finally {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
}
