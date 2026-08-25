// ============================================================
// aiTransparencyService.ts — DBM Transparency Intent Detection
// Detects when a user asks about budget, appropriations,
// allotments, obligations, disbursements, SARO, NCA, or LGSF,
// then fetches live data from the DBM Compass API and returns
// a structured result for rendering in the AI chat.
// ============================================================

import {
  getLgsfDashboard,
  getLgsfRecords,
  getNcaRecords,
  getSaaodbDashboard,
  getSaaodbRecords,
  getSaroRecords,
  LgsfDashboard,
  LgsfProgramCode,
  LgsfRecord,
  NcaRecord,
  SaaodbClass,
  SaaodbDashboard,
  SaaodbRecord,
  SaaodbScope,
  SaroRecord,
} from './dbmTransparencyService'

// ── Result types ──────────────────────────────────────────────────────────────

export type TransparencyQueryType =
  | 'dataset_overview'
  | 'saaodb_dashboard'
  | 'saaodb_records'
  | 'nca_records'
  | 'saro_records'
  | 'lgsf_dashboard'
  | 'lgsf_records'

export interface TransparencyResult {
  isTransparencyIntent: boolean
  queryType?: TransparencyQueryType
  /** Short assistant narrative shown above the data card */
  aiSummaryText?: string
  /** Dashboard payload — present for saaodb_dashboard / lgsf_dashboard */
  saaodbDashboard?: SaaodbDashboard
  /** Records payload — present for saaodb_records */
  saaodbRecords?: SaaodbRecord[]
  saaodbTotal?: number
  /** NCA records */
  ncaRecords?: NcaRecord[]
  ncaTotal?: number
  /** SARO records */
  saroRecords?: SaroRecord[]
  saroTotal?: number
  /** LGSF dashboard */
  lgsfDashboard?: LgsfDashboard
  /** LGSF records */
  lgsfRecords?: LgsfRecord[]
  lgsfTotal?: number
  /** Detected parameters used for the query */
  params?: Record<string, unknown>
  /** Any fetch error message */
  error?: string
}

// ── Keyword banks ─────────────────────────────────────────────────────────────

const SAAODB_KEYWORDS = [
  'saaodb',
  'appropriations',
  'allotments',
  'obligations',
  'disbursements',
  'budget execution',
  'unobligated',
  'unpaid obligations',
  'dbm report',
  'dbm budget',
  'budget utilization',
  'obligation rate',
  'disbursement rate',
  'fund source',
  'capital outlay',
  'personal services',
  'maintenance and other',
  'mooe',
  'finex',
  'financial expenses',
  'statement of appropriation',
]

const NCA_KEYWORDS = [
  'nca',
  'notice of cash allocation',
  'cash allocation',
  'cash release',
  'treasury release',
]

const SARO_KEYWORDS = [
  'saro',
  'special allotment release order',
  'allotment release order',
  'saro number',
  'saro-bmb',
  'allotment order',
]

const LGSF_KEYWORDS = [
  'lgsf',
  'local government support fund',
  'falgu',
  'gef',
  'ggg',
  'sbdp',
  'safpb',
  'lgu fund',
  'municipal fund',
  'provincial fund',
  'barangay fund',
  'lgu support',
  'local government fund',
  'lgu allocation',
  'lgu release',
]

// General transparency / DBM open data query (no specific dataset mentioned)
const GENERAL_TRANSPARENCY_KEYWORDS = [
  'transparency',
  'government transparency',
  'open data',
  'dbm data',
  'compass',
  'dbm transparency portal',
  'transparency portal',
  'budget data',
  'government budget',
  'public finance',
  'fiscal transparency',
  'government spending',
  'available datasets',
  'available data',
  'what data is available',
  'budget transparency',
  'financial transparency',
]

const DASHBOARD_KEYWORDS = [  'summary',
  'overview',
  'dashboard',
  'total',
  'aggregate',
  'overall',
  'how much',
  'breakdown',
  'utilization',
  'rate',
  'performance',
  'status',
]

const FISCAL_YEAR_PATTERN = /\b(20\d{2})\b/
const QUARTER_PATTERN = /\b(q[1-4]|fy|full.?year|annual)\b/i
const DEPT_CODE_PATTERN = /\b(\d{12})\b/
const SARO_NO_PATTERN = /\bsaro-\w+-\w+-\d{2}-\d{7}\b/i
const LGSF_PROGRAM_PATTERN = /\b(falgu|gef|ggg|sbdp|safpb)\b/i
const ENTITY_PATTERN =
  /\b(agriculture|finance|education|health|dpwh|doh|deped|dilg|dswd|neda|dfa|dost|dti|dot|dnd|doj|dole|da|denr|lgu|region\s*\w+)\b/i
const REGION_PATTERN = /\b(region\s*[iii|ii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|car|barmm|\d]+)\b/i
const PROVINCE_PATTERN =
  /\b(bulacan|batangas|laguna|cavite|rizal|pampanga|cebu|davao|iloilo|pangasinan|nueva\s*ecija|quezon|tarlac|zamboanga|misamis|cagayan|isabela|leyte|samar|albay|camarines)\b/i
const MUNICIPALITY_PATTERN =
  /\b(malolos|calamba|lipa|bacoor|antipolo|angeles|san\s*jose|taguig|makati|pasig|manila|cebu\s*city|davao\s*city|iloilo\s*city)\b/i

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const containsAny = (text: string, keywords: string[]) =>
  keywords.some((kw) => text.includes(kw))

const extractYear = (text: string): number => {
  const match = text.match(FISCAL_YEAR_PATTERN)
  return match ? parseInt(match[1], 10) : new Date().getFullYear()
}

const extractPeriod = (text: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY' => {
  const match = text.match(QUARTER_PATTERN)
  if (!match) return 'FY'
  const raw = match[1].toLowerCase()
  if (raw === 'q1') return 'Q1'
  if (raw === 'q2') return 'Q2'
  if (raw === 'q3') return 'Q3'
  if (raw === 'q4') return 'Q4'
  return 'FY'
}

const extractExpenseClass = (text: string): SaaodbClass | undefined => {
  if (/\bps\b|personal\s*services/.test(text)) return 'PS'
  if (/\bmooe\b|maintenance/.test(text)) return 'MOOE'
  if (/\bfinex\b|financial\s*expenses/.test(text)) return 'FINEX'
  if (/\bco\b|capital\s*outlay/.test(text)) return 'CO'
  return undefined
}

const extractScope = (text: string): SaaodbScope => {
  if (/\bsucs\b|state\s*university|college/.test(text)) return 'sucs'
  if (/\bagency\b|department\b/.test(text)) return 'agency'
  return 'summary'
}

const extractLgsfProgram = (text: string): LgsfProgramCode | undefined => {
  const match = text.match(LGSF_PROGRAM_PATTERN)
  if (!match) return undefined
  return match[1].toUpperCase() as LgsfProgramCode
}

const extractEntityName = (text: string): string | undefined => {
  const match = text.match(ENTITY_PATTERN)
  return match ? match[1] : undefined
}

const extractDeptCode = (text: string): string | undefined => {
  const match = text.match(DEPT_CODE_PATTERN)
  return match ? match[1] : undefined
}

const extractSaroNo = (text: string): string | undefined => {
  const match = text.match(SARO_NO_PATTERN)
  return match ? match[0].toUpperCase() : undefined
}

const formatPHP = (amount: number): string =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const pct = (rate: number): string => `${(rate * 100).toFixed(2)}%`

// ── Summary text builders ─────────────────────────────────────────────────────

const buildSaaodbDashboardSummary = (
  d: SaaodbDashboard,
  entityHint: string | undefined,
): string => {
  const entityLabel = entityHint
    ? `for entities matching **${entityHint}**`
    : `across all government agencies`

  return (
    `Here is the **DBM Budget Execution Summary** ${entityLabel} for **FY ${d.reportYear}** ` +
    `(scope: *${d.sheetScope}*).\n\n` +
    `**Budget at a Glance (PHP):**\n` +
    `• Appropriations: ${formatPHP(d.cascade.appropriations)}\n` +
    `• Total Available: ${formatPHP(d.cascade.totalAvailable)}\n` +
    `• Allotments Released: ${formatPHP(d.cascade.allotments)}\n` +
    `• Obligations Incurred: ${formatPHP(d.cascade.obligations)}\n` +
    `• Disbursements: ${formatPHP(d.cascade.disbursements)}\n` +
    `• Unobligated Balance: ${formatPHP(d.cascade.unobligated)}\n\n` +
    `**Utilization Rates:**\n` +
    `• Obligation Rate: ${pct(d.rates.obligationRate)}\n` +
    `• Disbursement Rate (vs Obligations): ${pct(d.rates.disbRateOblig)}\n` +
    `• Disbursement Rate (vs Appropriations): ${pct(d.rates.disbRateAppro)}\n\n` +
    `**By Expense Class:**\n` +
    d.classBreakdown
      .map((c) => `• ${c.class}: ${formatPHP(c.amount)}`)
      .join('\n') +
    `\n\n*Data sourced live from the DBM Transparency Portal (Compass API).*`
  )
}

const buildSaaodbRecordsSummary = (
  records: SaaodbRecord[],
  total: number,
  params: Record<string, unknown>,
): string => {
  const shown = records.length
  const entityHint = params.entityName ? ` matching **${params.entityName}**` : ''
  const classHint = params.class ? ` (${params.class})` : ''
  return (
    `Found **${total.toLocaleString()} SAAODB record${total !== 1 ? 's' : ''}**${entityHint}${classHint} ` +
    `for **FY ${params.reportYear}** — showing ${shown} on page ${params.page}.\n\n` +
    `*Source: DBM Transparency Portal via Compass API.*`
  )
}

const buildNcaSummary = (records: NcaRecord[], total: number, year: number): string =>
  `Found **${total.toLocaleString()} NCA (Notice of Cash Allocation) record${total !== 1 ? 's' : ''}** ` +
  `for budget year **${year}** — showing ${records.length} on page 1.\n\n` +
  `*Source: DBM Transparency Portal via Compass API.*`

const buildSaroSummary = (records: SaroRecord[], total: number): string => {
  const topItems = records.slice(0, 5)
  const lines = topItems.map(
    (r) =>
      `• **${r.saroNo}** — ${formatPHP(r.amount)} (${r.releasedDate?.split('T')[0] ?? 'N/A'})`,
  )
  return (
    `Found **${total.toLocaleString()} SARO record${total !== 1 ? 's' : ''}**. ` +
    `Here are the top results:\n\n` +
    lines.join('\n') +
    `\n\n*Source: DBM Transparency Portal via Compass API.*`
  )
}

const buildLgsfDashboardSummary = (d: LgsfDashboard, params: { programCode: LgsfProgramCode; reportYear?: number; region?: string; province?: string; municipality?: string }): string => {
  const scopeLabel = [params.region, params.province, params.municipality]
    .filter(Boolean)
    .join(', ')
  const locationLabel = scopeLabel ? ` in **${scopeLabel}**` : ''
  const yearLabel = params.reportYear ? ` for **FY ${params.reportYear}**` : ''

  return (
    `Here is the **LGSF ${d.programCode} Dashboard**${locationLabel}${yearLabel}.\n\n` +
    `**Key Performance Indicators:**\n` +
    `• Total Released: ${formatPHP(d.kpis.totalReleased)}\n` +
    `• Projects: ${d.kpis.projectCount.toLocaleString()}\n` +
    `• LGUs Covered: ${d.kpis.lguCount.toLocaleString()}\n` +
    `• Barangays: ${d.kpis.barangayCount.toLocaleString()}\n` +
    `• Regions: ${d.kpis.regionCount}\n` +
    `• Provinces: ${d.kpis.provinceCount}\n` +
    `• Fiscal Years: ${d.kpis.fiscalYearCount}\n\n` +
    `Showing **${d.projects.rows.length}** of ${d.projects.total.toLocaleString()} projects.\n\n` +
    `*Source: DBM Transparency Portal via Compass API.*`
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Analyse the user message for DBM transparency intent.
 * If detected, fetches live data from the Compass API and
 * returns a structured TransparencyResult for the chat UI.
 *
 * Returns `{ isTransparencyIntent: false }` when no match.
 */
export const processTransparencyIntent = async (
  userMessage: string,
): Promise<TransparencyResult> => {
  const text = normalize(userMessage)

  // General transparency / open-data question — no specific dataset yet.
  // Return immediately with a dataset_overview so the UI can show the
  // available DBM Compass datasets instead of a CTA.
  if (containsAny(text, GENERAL_TRANSPARENCY_KEYWORDS)) {
    return {
      isTransparencyIntent: true,
      queryType: 'dataset_overview',
      aiSummaryText:
        'I have access to live budget transparency data from the **DBM Compass Portal**. ' +
        'Here are the datasets you can explore:',
    }
  }

  const hasSaaodb = containsAny(text, SAAODB_KEYWORDS)
  const hasNca = containsAny(text, NCA_KEYWORDS)
  const hasSaro = containsAny(text, SARO_KEYWORDS)
  const hasLgsf = containsAny(text, LGSF_KEYWORDS)

  if (!hasSaaodb && !hasNca && !hasSaro && !hasLgsf) {
    return { isTransparencyIntent: false }
  }

  const year = extractYear(text)
  const period = extractPeriod(text)
  const expenseClass = extractExpenseClass(text)
  const scope = extractScope(text)
  const entityName = extractEntityName(text)
  const deptCode = extractDeptCode(text)
  const saroNo = extractSaroNo(text)
  const lgsfProgram = extractLgsfProgram(text)
  const isDashboardQuery = containsAny(text, DASHBOARD_KEYWORDS)

  // ── Region / province / municipality for LGSF ────────────────────────────
  const regionMatch = text.match(REGION_PATTERN)
  const provinceMatch = text.match(PROVINCE_PATTERN)
  const municipalityMatch = text.match(MUNICIPALITY_PATTERN)
  const region = regionMatch ? regionMatch[1] : undefined
  const province = provinceMatch ? provinceMatch[1] : undefined
  const municipality = municipalityMatch ? municipalityMatch[1] : undefined

  try {
    // ── LGSF ────────────────────────────────────────────────────────────────
    if (hasLgsf) {
      const program: LgsfProgramCode = lgsfProgram ?? 'FALGU'

      if (isDashboardQuery || !lgsfProgram) {
        const dashParams = {
          programCode: program,
          reportYear: year,
          region,
          province,
          municipality,
          page: 1,
          limit: 25,
        }
        const dashboard = await getLgsfDashboard(dashParams)
        return {
          isTransparencyIntent: true,
          queryType: 'lgsf_dashboard',
          lgsfDashboard: dashboard,
          aiSummaryText: buildLgsfDashboardSummary(dashboard, dashParams),
          params: dashParams as Record<string, unknown>,
        }
      }

      const lgsfParams = {
        fiscalYear: year,
        programCode: program,
        regionCode: region,
        province,
        cityMunicipality: municipality,
        page: 1,
        limit: 25,
      }
      const result = await getLgsfRecords(lgsfParams)
      return {
        isTransparencyIntent: true,
        queryType: 'lgsf_records',
        lgsfRecords: result.items,
        lgsfTotal: result.total,
        aiSummaryText:
          `Found **${result.total.toLocaleString()} LGSF ${program} record${result.total !== 1 ? 's' : ''}** ` +
          `for FY ${year}. Showing ${result.items.length} results.\n\n` +
          `*Source: DBM Transparency Portal.*`,
        params: lgsfParams as Record<string, unknown>,
      }
    }

    // ── SARO ────────────────────────────────────────────────────────────────
    if (hasSaro) {
      const saroParams = {
        saroNo,
        deptCode,
        page: 1,
        limit: 50,
      }
      const result = await getSaroRecords(saroParams)
      return {
        isTransparencyIntent: true,
        queryType: 'saro_records',
        saroRecords: result.items,
        saroTotal: result.total,
        aiSummaryText: buildSaroSummary(result.items, result.total),
        params: saroParams as Record<string, unknown>,
      }
    }

    // ── NCA ─────────────────────────────────────────────────────────────────
    if (hasNca) {
      const ncaParams = {
        budgetYear: year,
        deptCode,
        page: 1,
        limit: 50,
      }
      const result = await getNcaRecords(ncaParams)
      return {
        isTransparencyIntent: true,
        queryType: 'nca_records',
        ncaRecords: result.items,
        ncaTotal: result.total,
        aiSummaryText: buildNcaSummary(result.items, result.total, year),
        params: ncaParams as Record<string, unknown>,
      }
    }

    // ── SAAODB ──────────────────────────────────────────────────────────────
    if (hasSaaodb) {
      if (isDashboardQuery && scope !== 'agency') {
        // Dashboard summary is the fastest, most useful response
        const dashParams = { reportYear: year, sheetScope: scope }
        const dashboard = await getSaaodbDashboard(dashParams)
        return {
          isTransparencyIntent: true,
          queryType: 'saaodb_dashboard',
          saaodbDashboard: dashboard,
          aiSummaryText: buildSaaodbDashboardSummary(dashboard, entityName),
          params: dashParams as Record<string, unknown>,
        }
      }

      // Paginated records with optional filters
      const recParams = {
        reportYear: year,
        period,
        class: expenseClass,
        sheetScope: scope,
        entityName,
        page: 1,
        limit: 50,
      }
      const result = await getSaaodbRecords(recParams)

      // If the result set is large and no entity filter was applied, also
      // fetch dashboard for a high-level summary to accompany the records.
      let dashboard: SaaodbDashboard | undefined
      if (result.total > 5 && !entityName) {
        try {
          dashboard = await getSaaodbDashboard({ reportYear: year, sheetScope: scope })
        } catch {
          // Non-fatal — dashboard is supplementary
        }
      }

      return {
        isTransparencyIntent: true,
        queryType: 'saaodb_records',
        saaodbRecords: result.items,
        saaodbTotal: result.total,
        saaodbDashboard: dashboard,
        aiSummaryText: buildSaaodbRecordsSummary(result.items, result.total, recParams as Record<string, unknown>),
        params: recParams as Record<string, unknown>,
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[aiTransparencyService] fetch error:', msg)
    return {
      isTransparencyIntent: true,
      error: msg,
      aiSummaryText:
        `I detected a budget transparency request, but encountered an issue retrieving the official records (*${msg}*). ` +
        `Please try again shortly or refine your query.`,
    }
  }

  return { isTransparencyIntent: false }
}
