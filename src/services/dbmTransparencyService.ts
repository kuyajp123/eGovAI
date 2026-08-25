// ============================================================
// dbmTransparencyService.ts — DBM Transparency Portal API
// Secure client for SAAODB, NCA, SARO, and LGSF records
// from the Compass API (api.compassdbm.ph via proxy).
// All requests are authenticated via X-API-Key header.
// ============================================================

const BASE_URL = '/compass-api'
const API_KEY = (import.meta.env.VITE_COMPASS_TOKEN || import.meta.env.VITE_COMPASS_API_KEY || '') as string

// ── Shared pagination wrapper ─────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]   // API returns "items", not "data"
  total: number
  page: number
  limit: number
}

// ── SAAODB types ──────────────────────────────────────────────────────────────

export type SaaodbPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY'
export type SaaodbClass = 'PS' | 'MOOE' | 'FINEX' | 'CO'
export type SaaodbScope = 'summary' | 'agency' | 'sucs'

export interface SaaodbRecord {
  id: string
  fileVersionId: string
  sourceRow: number
  sheetScope: SaaodbScope
  reportYear: number
  asOfDate: string
  period: SaaodbPeriod
  isPreliminary: boolean
  entityName: string
  fundSource: string
  class: SaaodbClass
  appropriations: number
  adjustments: number
  totalAvailableAppropriations: number
  allotments: number
  obligations: number
  unobligatedAllotments: number
  disbursements: number
  unpaidObligationsDue: number
  unpaidObligationsNotDue: number
  unpaidObligationsTotal: number
  createdAt: string
}

export interface SaaodbParams {
  reportYear: number
  period: SaaodbPeriod
  class?: SaaodbClass
  sheetScope?: SaaodbScope
  entityName?: string
  page: number
  limit: number
}

// Dashboard summary
export interface SaaodbCascade {
  appropriations: number
  adjustments: number
  totalAvailable: number
  allotments: number
  obligations: number
  unobligated: number
  disbursements: number
  unreleased: number
}

export interface SaaodbRates {
  obligationRate: number
  disbRateOblig: number
  disbRateAppro: number
}

export interface SaaodbClassBreakdown {
  class: SaaodbClass
  amount: number
}

export interface SaaodbAppropriationSplit {
  currentYear: number
  continuing: number
  hasSplit: boolean
}

export interface SaaodbDashboard {
  reportYear: number
  sheetScope: SaaodbScope
  cascade: SaaodbCascade
  rates: SaaodbRates
  classBreakdown: SaaodbClassBreakdown[]
  appropriationSplit: SaaodbAppropriationSplit
  topEntities: unknown[]
}

export interface SaaodbDashboardParams {
  reportYear: number
  sheetScope: SaaodbScope
}

// Hierarchical entities
export interface SaaodbEntitiesParams {
  reportYear: number
  sheetScope: Exclude<SaaodbScope, 'summary'>
  expandParent?: string
  expandEntity?: string
  expandEntityParent?: string
}

// ── NCA types ─────────────────────────────────────────────────────────────────

export interface NcaRecord {
  id: string
  budgetYear: number
  deptCode: string
  agencyCode: string
  operatingUnitCode: string
  expenseClass: string
  amount: number
  dateIssued: string
  [key: string]: unknown
}

export interface NcaParams {
  budgetYear: number
  deptCode?: string
  agencyCode?: string
  operatingUnitCode?: string
  expenseClass?: string
  page?: number
  limit?: number
}

// ── SARO types ────────────────────────────────────────────────────────────────

export interface SaroRecord {
  saroNo: string
  deptCode: string
  agencyCode: string
  expenseClass: string
  amount: number
  releasedDate: string   // API uses releasedDate, not dateIssued
}

export interface SaroParams {
  saroNo?: string
  deptCode?: string
  agencyCode?: string
  expenseClass?: string
  page?: number
  limit?: number
}

// ── LGSF types ────────────────────────────────────────────────────────────────

export type LgsfProgramCode = 'FALGU' | 'GEF' | 'GGG' | 'SBDP' | 'SAFPB'

export interface LgsfRecord {
  id: string
  fiscalYear: number
  programCode: LgsfProgramCode
  regionCode: string
  province: string
  cityMunicipality: string
  amount: number
  [key: string]: unknown
}

export interface LgsfParams {
  fiscalYear?: number
  programCode?: LgsfProgramCode
  regionCode?: string
  province?: string
  cityMunicipality?: string
  page?: number
  limit?: number
}

export interface LgsfKpis {
  totalReleased: number
  projectCount: number
  lguCount: number
  barangayCount: number
  regionCount: number
  provinceCount: number
  fiscalYearCount: number
}

export interface LgsfProjectsPage {
  rows: LgsfRecord[]
  total: number
  page: number
  pageSize: number
}

export interface LgsfDashboard {
  programCode: LgsfProgramCode
  reportYear: number | null
  kpis: LgsfKpis
  trend: unknown[]
  projects: LgsfProjectsPage
}

export interface LgsfDashboardParams {
  programCode: LgsfProgramCode
  reportYear?: number
  region?: string
  province?: string
  municipality?: string
  page?: number
  limit?: number
}

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function dbmFetch<T>(path: string, params: Record<string, unknown>): Promise<T> {
  // Strip undefined/null params before building query string
  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      clean[k] = String(v)
    }
  }

  const qs = new URLSearchParams(clean).toString()
  const url = `${BASE_URL}/api/v1/records/${path}${qs ? `?${qs}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`DBM API error ${response.status}: ${errorBody}`)
  }

  return response.json() as Promise<T>
}

// ── SAAODB endpoints ──────────────────────────────────────────────────────────

/** Paginated SAAODB records */
export const getSaaodbRecords = (
  params: SaaodbParams,
): Promise<PaginatedResponse<SaaodbRecord>> =>
  dbmFetch<PaginatedResponse<SaaodbRecord>>('saaodb', params as unknown as Record<string, unknown>)

/** SAAODB dashboard summary */
export const getSaaodbDashboard = (
  params: SaaodbDashboardParams,
): Promise<SaaodbDashboard> =>
  dbmFetch<SaaodbDashboard>('saaodb/dashboard', params as unknown as Record<string, unknown>)

/** SAAODB hierarchical entity tree */
export const getSaaodbEntities = (
  params: SaaodbEntitiesParams,
): Promise<unknown> =>
  dbmFetch<unknown>('saaodb/entities', params as unknown as Record<string, unknown>)

// ── NCA endpoints ─────────────────────────────────────────────────────────────

/** Paginated NCA records */
export const getNcaRecords = (
  params: NcaParams,
): Promise<PaginatedResponse<NcaRecord>> =>
  dbmFetch<PaginatedResponse<NcaRecord>>('nca', params as unknown as Record<string, unknown>)

// ── SARO endpoints ────────────────────────────────────────────────────────────

/** Paginated SARO records */
export const getSaroRecords = (
  params: SaroParams,
): Promise<PaginatedResponse<SaroRecord>> =>
  dbmFetch<PaginatedResponse<SaroRecord>>('saro', params as unknown as Record<string, unknown>)

// ── LGSF endpoints ────────────────────────────────────────────────────────────

/** Paginated LGSF records */
export const getLgsfRecords = (
  params: LgsfParams,
): Promise<PaginatedResponse<LgsfRecord>> =>
  dbmFetch<PaginatedResponse<LgsfRecord>>('lgsf', params as unknown as Record<string, unknown>)

/** LGSF dashboard summary */
export const getLgsfDashboard = (
  params: LgsfDashboardParams,
): Promise<LgsfDashboard> =>
  dbmFetch<LgsfDashboard>('lgsf/dashboard', params as unknown as Record<string, unknown>)
