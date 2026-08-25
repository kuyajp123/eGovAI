import process from 'node:process'

const DEFAULT_RPC_URL = 'https://hackathon-blockchain.e.gov.ph'
const DEFAULT_EXPLORER_URL = 'https://hackathon-explorer.e.gov.ph'
const DEFAULT_CHAIN_ID = 13_371
const DEFAULT_EGOVPAY_URL = 'https://platforms-api.e.gov.ph/egovpay'

export class EChainServerError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode = 500, code = 'ECHAIN_ERROR') {
    super(message)
    this.name = 'EChainServerError'
    this.statusCode = statusCode
    this.code = code
  }
}

export interface EChainConfiguration {
  rpcUrl: string
  explorerUrl: string
  explorerTransactionTemplate: string
  chainId: number
  privateKey: string
}

export interface VerifiedPayment {
  uuid: string
  transactionId: string
  referenceNumber: string
  amount: number
  status: string
}

export interface SubmittedAnchor {
  transactionHash: string
  signerAddress: string
  chainId: number
  explorerUrl: string
  submittedAt: string
}

export interface AnchorTransactionStatus {
  transactionHash: string
  status: 'submitted' | 'confirmed' | 'failed'
  chainId: number
  explorerUrl: string
  blockNumber?: number
  confirmations?: number
  confirmedAt?: string
}

const requiredEnvironmentValue = (names: string[], message: string): string => {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  throw new EChainServerError(message, 503, 'ECHAIN_NOT_CONFIGURED')
}

export const getEChainConfiguration = (): EChainConfiguration => {
  const chainId = Number.parseInt(process.env.ECHAIN_CHAIN_ID || String(DEFAULT_CHAIN_ID), 10)
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new EChainServerError('ECHAIN_CHAIN_ID must be a positive integer.', 503, 'ECHAIN_NOT_CONFIGURED')
  }

  const privateKeyValue = requiredEnvironmentValue(
    ['ECHAIN_PRIVATE_KEY'],
    'eGovChain signing is not configured. Add ECHAIN_PRIVATE_KEY as a server-only Vercel environment variable.'
  )
  const privateKey = privateKeyValue.startsWith('0x') ? privateKeyValue : `0x${privateKeyValue}`
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new EChainServerError('ECHAIN_PRIVATE_KEY is not a valid 32-byte private key.', 503, 'ECHAIN_NOT_CONFIGURED')
  }

  const explorerUrl = (process.env.ECHAIN_EXPLORER_URL || DEFAULT_EXPLORER_URL).replace(/\/$/, '')
  return {
    rpcUrl: process.env.ECHAIN_RPC_URL?.trim() || DEFAULT_RPC_URL,
    explorerUrl,
    explorerTransactionTemplate:
      process.env.ECHAIN_EXPLORER_TX_URL_TEMPLATE?.trim() || `${explorerUrl}/tx/{txHash}`,
    chainId,
    privateKey,
  }
}

export const isSha256Hex = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-fA-F]{64}$/.test(value.trim())

export const isTransactionHash = (value: unknown): value is string =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value.trim())

const buildExplorerTransactionUrl = (template: string, txHash: string): string =>
  template.replace('{txHash}', txHash)

const isTemporaryNodeFailure = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes('fetch') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('network')
  )
}

export const verifyPaidEGovPayTransaction = async (
  paymentId: string,
  expectedAmount: number
): Promise<VerifiedPayment> => {
  const rawApiKey = requiredEnvironmentValue(
    ['EGOVPAY_TOKEN', 'VITE_EGOVPAY_TOKEN', 'EGOVPAY_API_KEY', 'VITE_EGOVPAY_API_KEY'],
    'Server-side eGovPay verification is not configured. Add EGOVPAY_TOKEN or VITE_EGOVPAY_TOKEN.'
  )
  const apiKey = rawApiKey.startsWith('test_') ? rawApiKey : `test_${rawApiKey}`
  const baseUrl = (process.env.EGOVPAY_API_URL || process.env.VITE_EGOVPAY_URL || DEFAULT_EGOVPAY_URL).replace(/\/$/, '')
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/v1/transaction/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-eGovPay-Token': apiKey,
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  } catch {
    throw new EChainServerError('The server could not contact eGovPay to verify this donation.', 502, 'EGOVPAY_UNAVAILABLE')
  }

  const payload = await response.json().catch(() => null) as {
    data?: {
      uuid?: string
      txnid?: string
      refno?: string
      amount?: string | number
      payment_status?: string
    }
    message?: string
  } | null

  if (!response.ok || !payload?.data) {
    throw new EChainServerError(
      payload?.message || `eGovPay verification failed with HTTP ${response.status}.`,
      response.status === 401 ? 503 : 502,
      'EGOVPAY_VERIFICATION_FAILED'
    )
  }

  const status = String(payload.data.payment_status || '').toUpperCase()
  if (status !== 'PAID' && status !== 'SUCCESS') {
    throw new EChainServerError('eGovPay has not verified this donation as paid.', 409, 'PAYMENT_NOT_CONFIRMED')
  }

  const amount = Number(payload.data.amount)
  if (!Number.isFinite(amount) || Math.round(amount * 100) !== Math.round(expectedAmount * 100)) {
    throw new EChainServerError('The donation amount does not match the eGovPay transaction.', 409, 'PAYMENT_AMOUNT_MISMATCH')
  }

  return {
    uuid: payload.data.uuid || paymentId,
    transactionId: payload.data.txnid || paymentId,
    referenceNumber: payload.data.refno || payload.data.txnid || paymentId,
    amount,
    status,
  }
}

// Helper to load ethers dynamically without hard build dependency
interface EthersModule {
  JsonRpcProvider: new (url: string, chainId?: number) => {
    getNetwork: () => Promise<{ chainId: bigint | number }>
    getTransactionReceipt: (txHash: string) => Promise<{
      status: number | null
      blockNumber: number
      confirmations: () => Promise<number>
    } | null>
  }
  Wallet: new (privateKey: string, provider: unknown) => {
    address: string
    sendTransaction: (tx: {
      to: string
      value: bigint
      data: string
      gasPrice: bigint
      gasLimit: bigint
      type: number
      chainId: number
    }) => Promise<{ hash: string }>
  }
}

const loadEthersModule = async (): Promise<EthersModule> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ethers = (await import('ethers')) as any
    return ethers
  } catch {
    throw new EChainServerError(
      'ethers library is not installed. Install ethers to enable eGovChain ledger anchoring.',
      500,
      'ETHERS_NOT_AVAILABLE'
    )
  }
}

export const submitDonationBlockHash = async (blockHash: string): Promise<SubmittedAnchor> => {
  if (!isSha256Hex(blockHash)) {
    throw new EChainServerError('A valid 64-character SHA-256 block hash is required.', 400, 'INVALID_BLOCK_HASH')
  }

  const configuration = getEChainConfiguration()
  const ethers = await loadEthersModule()
  const provider = new ethers.JsonRpcProvider(configuration.rpcUrl, configuration.chainId)
  const wallet = new ethers.Wallet(configuration.privateKey, provider)

  try {
    const network = await provider.getNetwork()
    if (Number(network.chainId) !== configuration.chainId) {
      throw new EChainServerError(
        `The configured eGovChain node returned chain ID ${network.chainId.toString()}, expected ${configuration.chainId}.`,
        502,
        'ECHAIN_NETWORK_MISMATCH'
      )
    }

    const transaction = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data: `0x${blockHash.toLowerCase()}`,
      gasPrice: 0n,
      gasLimit: 50_000n,
      type: 0,
      chainId: configuration.chainId,
    })

    return {
      transactionHash: transaction.hash,
      signerAddress: wallet.address,
      chainId: configuration.chainId,
      explorerUrl: buildExplorerTransactionUrl(configuration.explorerTransactionTemplate, transaction.hash),
      submittedAt: new Date().toISOString(),
    }
  } catch (error) {
    if (error instanceof EChainServerError) throw error
    if (isTemporaryNodeFailure(error)) {
      throw new EChainServerError(
        'The official eGovChain test node is temporarily unavailable. Your paid donation and local ledger remain valid; retry the anchor when the node is online.',
        503,
        'ECHAIN_NODE_UNAVAILABLE'
      )
    }
    throw new EChainServerError(
      'eGovChain rejected the signed transaction. Confirm that the test signer is permitted on chain ID 13371, then retry.',
      502,
      'ECHAIN_SUBMISSION_FAILED'
    )
  }
}

export const getAnchorTransactionStatus = async (transactionHash: string): Promise<AnchorTransactionStatus> => {
  if (!isTransactionHash(transactionHash)) {
    throw new EChainServerError('A valid eGovChain transaction hash is required.', 400, 'INVALID_TRANSACTION_HASH')
  }

  const configuration = getEChainConfiguration()
  const ethers = await loadEthersModule()
  const provider = new ethers.JsonRpcProvider(configuration.rpcUrl, configuration.chainId)
  try {
    const receipt = await provider.getTransactionReceipt(transactionHash)
    const explorerUrl = buildExplorerTransactionUrl(configuration.explorerTransactionTemplate, transactionHash)
    if (!receipt) {
      return { transactionHash, status: 'submitted', chainId: configuration.chainId, explorerUrl }
    }

    const confirmed = receipt.status === 1
    return {
      transactionHash,
      status: confirmed ? 'confirmed' : 'failed',
      chainId: configuration.chainId,
      explorerUrl,
      blockNumber: receipt.blockNumber,
      confirmations: await receipt.confirmations(),
      confirmedAt: confirmed ? new Date().toISOString() : undefined,
    }
  } catch (error) {
    if (isTemporaryNodeFailure(error)) {
      throw new EChainServerError(
        'The official eGovChain test node is temporarily unavailable. The submitted transaction status will be checked again later.',
        503,
        'ECHAIN_NODE_UNAVAILABLE'
      )
    }
    throw new EChainServerError('The eGovChain transaction receipt could not be retrieved.', 502, 'ECHAIN_STATUS_FAILED')
  }
}
