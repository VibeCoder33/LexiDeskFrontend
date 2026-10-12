import { headers } from 'next/headers'
import { User } from '@/types/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export async function serverFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const headersList = await headers()
    const cookie = headersList.get('cookie') || ''

    const url = `${BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        ...options?.headers,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch (error) {
    console.error(`serverFetch failed for ${endpoint}:`, error)
    return null
  }
}

export async function getServerUser(): Promise<User | null> {
  return serverFetch<User>('/api/auth/me')
}
