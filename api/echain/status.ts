import type { IncomingHttpHeaders } from 'node:http'
import {
  EChainServerError,
  getAnchorTransactionStatus,
  isTransactionHash,
} from '../../server/eChainServer.js'

interface ApiRequest {
  method?: string
  headers: IncomingHttpHeaders
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  status: (statusCode: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'method_not_allowed', message: 'Use GET to check an eGovChain transaction.' })
    return
  }

  const value = Array.isArray(request.query.txHash) ? request.query.txHash[0] : request.query.txHash
  if (!value || !isTransactionHash(value)) {
    response.status(400).json({ error: 'invalid_transaction_hash', message: 'A valid eGovChain transaction hash is required.' })
    return
  }

  try {
    response.status(200).json({ data: await getAnchorTransactionStatus(value) })
  } catch (error) {
    const known = error instanceof EChainServerError
      ? error
      : new EChainServerError('The eGovChain transaction status could not be checked.', 500, 'ECHAIN_ERROR')
    if (known.code === 'ECHAIN_NODE_UNAVAILABLE') response.setHeader('Retry-After', '30')
    response.status(known.statusCode).json({ error: known.code.toLowerCase(), message: known.message })
  }
}
