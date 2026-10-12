import { UserRole } from '@/types/auth'

export interface FieldDefinition {
  name: string
  label?: string
  type?: 'text' | 'select'
  placeholder?: string
  required: boolean
  options?: readonly string[]
  pattern?: string
}

export interface RoleConfigItem {
  label: string
  matterTypes: readonly string[]
  createFields: readonly FieldDefinition[]
  keyDateLabels: readonly string[]
  documentCategories: readonly string[]
  metrics: readonly string[]
}

export type ProfessionalRole = 'PROPERTY_LAWYER' | 'LITIGATION_LAWYER' | 'CA'

export const ROLE_CONFIG: Record<ProfessionalRole, RoleConfigItem> = {
  PROPERTY_LAWYER: {
    label: 'Property Attorney',
    matterTypes: ['Sale Deed', 'Leave & License', 'Title Verification', 'Society Registration', 'Gift Deed'],
    createFields: [
      { name: 'propertyRef', label: 'Property Survey No. / Area', type: 'text', required: true, placeholder: 'e.g. Survey 45/2, Baner, Pune' },
    ],
    keyDateLabels: ['Sub-Registrar appointment', 'Search report due', 'Execution date'],
    documentCategories: ['ID Proofs', 'Property Deeds', 'Tax Receipts', 'Society Documents', 'Other'],
    metrics: ['pendingSaleDeeds', 'searchReportsDue', 'subRegistrarThisWeek'],
  },
  LITIGATION_LAWYER: {
    label: 'Litigation Lawyer',
    matterTypes: ['Litigation'],
    createFields: [
      { name: 'jurisdiction', label: 'Case Jurisdiction', type: 'text', placeholder: 'e.g. Pune District Court', required: true },
      { name: 'opposingParty', label: 'Opposing Party', type: 'text', placeholder: 'e.g. Zenith Logistics LLP', required: true },
    ],
    keyDateLabels: ['Next hearing', 'Filing due'],
    documentCategories: ['ID Proofs', 'Pleadings', 'Evidence', 'Court Orders', 'Other'],
    metrics: ['upcomingHearings', 'urgentFilings', 'activeCases'],
  },
  CA: {
    label: 'Chartered Accountant',
    matterTypes: ['ITR', 'GST', 'Audit'],
    createFields: [
      { name: 'entityType', label: 'Entity Type', type: 'select', options: ['Individual', 'Pvt Ltd', 'Trust'], required: true },
      { name: 'pan', label: 'PAN', type: 'text', required: true, placeholder: 'ABCDE1234F', pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$' },
      { name: 'gstin', label: 'GSTIN', type: 'text', required: false, placeholder: '27AAACN1234A1Z5', pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$' },
    ],
    keyDateLabels: ['Filing deadline', 'GST return due', 'Audit due'],
    documentCategories: ['ID Proofs', 'Tax Returns', 'Bank Statements', 'GST Documents', 'Other'],
    metrics: ['impendingTaxDeadlines', 'pendingGstReturns', 'unbilledTasks'],
  },
}

export function isProfessionalRole(role?: string): role is ProfessionalRole {
  return role === 'PROPERTY_LAWYER' || role === 'LITIGATION_LAWYER' || role === 'CA'
}

export function getRoleConfig(role?: UserRole): RoleConfigItem | null {
  if (role && isProfessionalRole(role)) {
    return ROLE_CONFIG[role]
  }
  return null
}
