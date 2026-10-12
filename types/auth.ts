export type UserRole = 'SUPER' | 'PROPERTY_LAWYER' | 'LITIGATION_LAWYER' | 'CA'

export interface User {
  id: string
  name: string
  email: string
  mobile: string
  role: UserRole
  isActive: boolean
  firmName?: string | null
  firmAddress?: string | null
  firmPhone?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  user: User
  token?: string
}

export interface ApiErrorResponse {
  error: string
  details?: Record<string, string[]>
}

export interface FirmSettingsInput {
  firmName?: string
  firmAddress?: string
  firmPhone?: string
}
