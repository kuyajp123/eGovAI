declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined
  }
  interface Process {
    env: ProcessEnv
    cwd: () => string
  }
}

declare const process: NodeJS.Process

declare const Buffer: {
  isBuffer: (obj: unknown) => boolean
  from: (data: unknown) => { length: number; toString: (encoding?: string) => string }
}

declare module 'node:process' {
  const process: NodeJS.Process
  export default process
}

declare module 'node:http' {
  export interface IncomingHttpHeaders {
    [header: string]: string | string[] | undefined
  }
  export interface IncomingMessage extends AsyncIterable<Uint8Array | string | Buffer> {
    url?: string
    method?: string
    headers: IncomingHttpHeaders
  }
  export interface ServerResponse {
    statusCode: number
    headersSent: boolean
    setHeader: (name: string, value: string) => void
    end: (chunk?: unknown) => void
    writableEnded?: boolean
  }
}

declare module 'ethers' {
  export class JsonRpcProvider {
    constructor(url: string, chainId?: number)
    getNetwork(): Promise<{ chainId: bigint | number }>
    getTransactionReceipt(txHash: string): Promise<{
      status: number | null
      blockNumber: number
      confirmations: () => Promise<number>
    } | null>
  }
  export class Wallet {
    constructor(privateKey: string, provider?: unknown)
    address: string
    sendTransaction(tx: {
      to: string
      value: bigint
      data: string
      gasPrice: bigint
      gasLimit: bigint
      type: number
      chainId: number
    }): Promise<{ hash: string }>
  }
}
