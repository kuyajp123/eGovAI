import { FeeItem } from './eGovPayService'

export type SSSServiceType = 'contribution' | 'salary_loan' | 'record_verification'

export interface SSSServiceConfig {
  id: SSSServiceType
  icon: string
  title: string
  subtitle: string
  agency: string
  defaultFees: FeeItem[]
  color: string
  bgColor: string
}

const configuredRecordVerificationFee = Number(
  import.meta.env.VITE_SSS_RECORD_VERIFICATION_FEE ?? 1
)

export const SSS_RECORD_VERIFICATION_FEE =
  Number.isFinite(configuredRecordVerificationFee) && configuredRecordVerificationFee > 0
    ? configuredRecordVerificationFee
    : 1

export const SSS_SERVICES: SSSServiceConfig[] = [
  {
    id: 'contribution',
    icon: 'payments',
    title: 'SSS Voluntary Contribution',
    subtitle: 'Pay monthly or quarterly contributions as Voluntary/Self-Employed/OFW',
    agency: 'Social Security System (SSS)',
    defaultFees: [
      { label: 'SSS Monthly Contribution (MSC ₱10,000)', amount: 1400 },
      { label: "Workers' Investment & Savings Program (WISP)", amount: 150 },
    ],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'salary_loan',
    icon: 'account_balance',
    title: 'Salary Loan Amortization',
    subtitle: 'Pay your monthly SSS Salary Loan balance',
    agency: 'Social Security System (SSS)',
    defaultFees: [
      { label: 'SSS Salary Loan Monthly Amortization', amount: 1850 },
      { label: 'Processing Fee', amount: 50 },
    ],
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
  },
  {
    id: 'record_verification',
    icon: 'verified_user',
    title: 'SSS Member Record Verification',
    subtitle: 'Verify and link your SSS CRN with your PhilSys National ID via eVerify',
    agency: 'Social Security System (SSS)',
    defaultFees: [
      {
        label: 'Identity Verification & Sync Fee (eGovPay Test Mode)',
        amount: SSS_RECORD_VERIFICATION_FEE,
      },
    ],
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
]

export const SSS_MEMBERSHIP_TYPES = [
  'Voluntary / Self-Employed',
  'OFW (Overseas Filipino Worker)',
  'Non-Working Spouse',
]

const monthName = (monthIndex: number): string =>
  new Intl.DateTimeFormat('en-PH', { month: 'long' }).format(new Date(2020, monthIndex, 1))

export const getSSSApplicablePeriods = (now = new Date()): string[] => {
  const year = now.getFullYear()
  const month = now.getMonth()
  const currentQuarter = Math.floor(month / 3) + 1
  const currentQuarterStart = (currentQuarter - 1) * 3
  const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1
  const nextQuarterYear = currentQuarter === 4 ? year + 1 : year
  const nextQuarterStart = (nextQuarter - 1) * 3

  return [
    `Current Month (${monthName(month)} ${year})`,
    `Q${currentQuarter} ${year} (${monthName(currentQuarterStart)} - ${monthName(currentQuarterStart + 2)})`,
    `Q${nextQuarter} ${nextQuarterYear} (${monthName(nextQuarterStart)} - ${monthName(nextQuarterStart + 2)})`,
  ]
}

export const SSS_APPLICABLE_PERIODS = getSSSApplicablePeriods()

export const getSSSServiceConfig = (serviceType?: SSSServiceType): SSSServiceConfig | undefined =>
  SSS_SERVICES.find(service => service.id === serviceType)

export const normalizeSSSNumber = (value: string): string | undefined => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 11)}-${digits.slice(11)}`
  }
  return undefined
}

export const isValidSSSNumber = (value?: string): boolean => !!value && !!normalizeSSSNumber(value)

export const normalizeSSSPRN = (value: string): string | undefined => {
  const normalized = value.toUpperCase().replace(/\s+/g, '').trim()
  if (normalized.length < 8 || normalized.length > 40) return undefined
  if (!/^[A-Z0-9-]+$/.test(normalized) || !/\d/.test(normalized)) return undefined
  return normalized
}

export const maskSSSNumber = (value: string): string => {
  const normalized = normalizeSSSNumber(value) || value
  const digits = normalized.replace(/\D/g, '')
  if (digits.length < 4) return normalized
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
}

export const resolveSSSMembershipType = (message: string): string | undefined => {
  const normalized = message.toLowerCase()
  if (/\b(?:ofw|overseas filipino worker)\b/.test(normalized)) return SSS_MEMBERSHIP_TYPES[1]
  if (/\b(?:non[- ]?working spouse|spouse)\b/.test(normalized)) return SSS_MEMBERSHIP_TYPES[2]
  if (/\b(?:voluntary|self[- ]?employed|self employed)\b/.test(normalized)) return SSS_MEMBERSHIP_TYPES[0]
  return SSS_MEMBERSHIP_TYPES.find(type => type.toLowerCase() === normalized.trim())
}

export const resolveSSSApplicablePeriod = (message: string): string | undefined => {
  const normalized = message.toLowerCase().trim()
  const exact = SSS_APPLICABLE_PERIODS.find(period => period.toLowerCase() === normalized)
  if (exact) return exact
  if (/\b(?:current|this)\s+month\b/.test(normalized)) return SSS_APPLICABLE_PERIODS[0]
  if (/\b(?:current|this)\s+quarter\b/.test(normalized)) return SSS_APPLICABLE_PERIODS[1]
  if (/\bnext\s+quarter\b/.test(normalized)) return SSS_APPLICABLE_PERIODS[2]
  return SSS_APPLICABLE_PERIODS.find(period =>
    normalized.includes(period.slice(0, period.indexOf(' (')).toLowerCase())
  )
}

