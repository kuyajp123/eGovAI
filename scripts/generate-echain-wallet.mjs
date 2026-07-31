import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Wallet } from 'ethers'

const environmentPath = resolve(process.cwd(), '.env.local')
const current = existsSync(environmentPath) ? readFileSync(environmentPath, 'utf8') : ''
if (/^ECHAIN_PRIVATE_KEY=/m.test(current)) {
  console.error('ECHAIN_PRIVATE_KEY already exists in .env.local. No wallet was generated.')
  process.exitCode = 1
} else {
  const wallet = Wallet.createRandom()
  const separator = current && !current.endsWith('\n') ? '\n' : ''
  const configuration = [
    'ECHAIN_RPC_URL=https://hackathon-blockchain.e.gov.ph',
    'ECHAIN_EXPLORER_URL=https://hackathon-explorer.e.gov.ph',
    'ECHAIN_EXPLORER_TX_URL_TEMPLATE=https://hackathon-explorer.e.gov.ph/tx/{txHash}',
    'ECHAIN_CHAIN_ID=13371',
    `ECHAIN_PRIVATE_KEY=${wallet.privateKey}`,
  ].join('\n')
  writeFileSync(environmentPath, `${current}${separator}${configuration}\n`, { encoding: 'utf8', mode: 0o600 })
  console.log(`Created a dedicated eGovChain prototype signer: ${wallet.address}`)
  console.log('The private key was written to .env.local and was not printed.')
  console.log('Copy the same ECHAIN_* values to Vercel server environment variables before deploying.')
}
