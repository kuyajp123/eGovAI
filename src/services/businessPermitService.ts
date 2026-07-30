import { FeeItem, getBusinessPermitFees } from './eGovPayService'

export const BUSINESS_PERMIT_TYPES = [
  'Retail / Sari-Sari Store',
  'Food & Beverage',
  'Services / Repair Shop',
  'Manufacturing',
  'Real Estate',
  'IT / Tech Services',
  'Healthcare',
  'Education',
  'Construction',
  'Other',
] as const

export type BusinessPermitDocumentType =
  | 'previous_permit'
  | 'official_receipt'
  | 'barangay_clearance'
  | 'registration_certificate'
  | 'financial_statement'

export interface BusinessPermitDocumentRequirement {
  id: BusinessPermitDocumentType
  label: string
  description: string
}

export const BUSINESS_PERMIT_RENEWAL_DOCUMENTS: BusinessPermitDocumentRequirement[] = [
  {
    id: 'previous_permit',
    label: 'Previous Business Permit',
    description: 'Clear scan or photo of the latest permit.',
  },
  {
    id: 'official_receipt',
    label: 'Official Receipt of Last Payment',
    description: 'Receipt issued for the previous permit period.',
  },
  {
    id: 'barangay_clearance',
    label: 'Barangay Business Clearance',
    description: 'Current clearance for the business location.',
  },
  {
    id: 'registration_certificate',
    label: 'DTI / SEC / CDA Registration',
    description: 'Registration document applicable to the business.',
  },
  {
    id: 'financial_statement',
    label: 'Latest ITR or Financial Statement',
    description: 'Most recent available tax return or financial statement.',
  },
]

export interface BusinessPermitDocumentAttachment {
  id: BusinessPermitDocumentType
  fileName: string
  mimeType: string
  size: number
  attachedAt: string
}

export interface BusinessPermitRenewalDraft {
  permitNumber: string
  businessName: string
  lgu: string
  businessAddress: string
  businessType: string
  tin: string
  renewalYear: number
  verificationId: string
  documents: BusinessPermitDocumentAttachment[]
  fees: FeeItem[]
  totalAmount: number
}

export interface BusinessPermitRenewalApplication extends BusinessPermitRenewalDraft {
  id: string
  trackingId: string
  applicantName: string
  applicantEmail: string
  applicantMobile: string
  agency: string
  status: 'Submitted - Payment Pending' | 'Payment Confirmed - Under Assessment'
  submittedAt: string
}

export interface SubmitBusinessPermitRenewalPayload {
  draft: BusinessPermitRenewalDraft
  applicantName: string
  applicantEmail?: string
  applicantMobile?: string
}

const STORAGE_KEY = 'egov_business_permit_renewals'
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
const ACCEPTED_DOCUMENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

export const getBusinessPermitRenewalFees = (): FeeItem[] =>
  getBusinessPermitFees('renewal').map(fee => ({ ...fee }))

export const getBusinessPermitRenewalYears = (now = new Date()): number[] => [
  now.getFullYear(),
  now.getFullYear() + 1,
]

export const normalizePermitNumber = (value: string): string | undefined => {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '-')
  return /^[A-Z0-9][A-Z0-9/-]{4,39}$/.test(normalized) ? normalized : undefined
}

export const normalizeTIN = (value: string): string | undefined => {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 9 && digits.length !== 12) return undefined
  return digits.length === 9
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 12)}`
}

export const resolveBusinessPermitType = (value: string): string | undefined => {
  const normalized = value.toLowerCase()
  const aliases: Array<[RegExp, string]> = [
    [/retail|sari|store|shop/, 'Retail / Sari-Sari Store'],
    [/food|restaurant|cafe|beverage|catering/, 'Food & Beverage'],
    [/repair|service/, 'Services / Repair Shop'],
    [/manufactur/, 'Manufacturing'],
    [/real estate|property/, 'Real Estate'],
    [/\bit\b|tech|software|digital/, 'IT / Tech Services'],
    [/health|clinic|medical|pharmacy/, 'Healthcare'],
    [/school|education|tutorial|training/, 'Education'],
    [/construct|contractor/, 'Construction'],
    [/\bother\b/, 'Other'],
  ]
  return aliases.find(([pattern]) => pattern.test(normalized))?.[1]
}

export const validateBusinessPermitDocument = (
  file: Pick<File, 'name' | 'size' | 'type'>
): string | null => {
  if (!ACCEPTED_DOCUMENT_TYPES.has(file.type)) return 'Use a PDF, JPG, PNG, or WebP file.'
  if (file.size <= 0) return 'The selected file is empty.'
  if (file.size > MAX_DOCUMENT_SIZE) return 'Each document must be 10 MB or smaller.'
  return null
}

export const getMissingBusinessPermitDocuments = (
  attachments: BusinessPermitDocumentAttachment[]
): BusinessPermitDocumentRequirement[] => {
  const attached = new Set(attachments.map(item => item.id))
  return BUSINESS_PERMIT_RENEWAL_DOCUMENTS.filter(item => !attached.has(item.id))
}

export const submitBusinessPermitRenewal = async (
  payload: SubmitBusinessPermitRenewalPayload
): Promise<BusinessPermitRenewalApplication> => {
  const now = new Date()
  const suffix = Math.floor(10000 + Math.random() * 90000)
  const application: BusinessPermitRenewalApplication = {
    ...payload.draft,
    id: `bpr-${Date.now()}`,
    trackingId: `BPR-${now.getFullYear()}-${suffix}`,
    applicantName: payload.applicantName,
    applicantEmail: payload.applicantEmail || '',
    applicantMobile: payload.applicantMobile || '',
    agency: `${payload.draft.lgu} Business Permit and Licensing Office`,
    status: 'Submitted - Payment Pending',
    submittedAt: now.toISOString(),
  }

  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const applications = Array.isArray(existing) ? existing : []
    localStorage.setItem(STORAGE_KEY, JSON.stringify([application, ...applications]))
  } catch (error) {
    console.warn('Could not store the business permit renewal locally:', error)
  }

  return application
}
