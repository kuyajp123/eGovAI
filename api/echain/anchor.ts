import type { IncomingHttpHeaders } from 'node:http'
import {
  EChainServerError,
  isSha256Hex,
  submitDonationBlockHash,
  verifyPaidEGovPayTransaction,
} from '../../server/eChainServer.js'

interface ApiRequest {
  method?: string
  headers: IncomingHttpHeaders
  body?: unknown
}

interface ApiResponse {
  status: (statusCode: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  end: () => void
}

interface AnchorRequestBody {
  blockHash?: string
  blockId?: string
  donationId?: string
  paymentId?: string
  amount?: number
  event?: string
  verificationSource?: string
}

const parseBody = (body: unknown): AnchorRequestBody => {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as AnchorRequestBody
    } catch {
      return {}
    }
  }
  return body && typeof body === 'object' ? body as AnchorRequestBody : {}
}

const safeIdentifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9._:-]{1,160}$/.test(value)

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'method_not_allowed', message: 'Use POST to submit a donation anchor.' })
    return
  }

  try {
    const body = parseBody(request.body)
    if (!body.blockHash || !isSha256Hex(body.blockHash)) {
      response.status(400).json({ error: 'invalid_block_hash', message: 'A valid SHA-256 donation block hash is required.' })
      return
    }
    if (!safeIdentifier(body.blockId) || !safeIdentifier(body.donationId) || !safeIdentifier(body.paymentId)) {
      response.status(400).json({ error: 'invalid_anchor_context', message: 'Valid donation, block, and payment identifiers are required.' })
      return
    }
    if (body.event !== 'payment_confirmed' || body.verificationSource !== 'egovpay_api') {
      response.status(409).json({ error: 'unverified_event', message: 'Only an eGovPay API-verified payment confirmation can be anchored.' })
      return
    }
    if (!Number.isFinite(body.amount) || Number(body.amount) <= 0) {
      response.status(400).json({ error: 'invalid_amount', message: 'A valid donation amount is required.' })
      return
    }

    const payment = await verifyPaidEGovPayTransaction(body.paymentId, Number(body.amount))
    const anchor = await submitDonationBlockHash(body.blockHash)
    response.status(201).json({
      data: {
        ...anchor,
        blockHash: body.blockHash.toLowerCase(),
        blockId: body.blockId,
        donationId: body.donationId,
        paymentId: payment.uuid,
        paymentReference: payment.referenceNumber,
        paymentStatus: payment.status,
        status: 'submitted',
      },
    })
  } catch (error) {
    const known = error instanceof EChainServerError
      ? error
      : new EChainServerError('The eGovChain anchor could not be created.', 500, 'ECHAIN_ERROR')
    if (known.code === 'ECHAIN_NODE_UNAVAILABLE') response.setHeader('Retry-After', '30')
    response.status(known.statusCode).json({ error: known.code.toLowerCase(), message: known.message })
  }
}
