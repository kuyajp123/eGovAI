import type { Plugin } from 'vite'
import anchorHandler from '../api/echain/anchor.js'
import statusHandler from '../api/echain/status.js'

const MAX_REQUEST_BYTES = 64 * 1024

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJsonBody = async (request: any): Promise<unknown> => {
  const chunks: string[] = []
  let totalBytes = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    totalBytes += buffer.length
    if (totalBytes > MAX_REQUEST_BYTES) throw new Error('Request body is too large.')
    chunks.push(buffer.toString('utf8'))
  }
  if (!chunks.length) return {}
  return JSON.parse(chunks.join('')) as unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createResponseAdapter = (response: any) => {
  const adapter = {
    status(statusCode: number) {
      response.statusCode = statusCode
      return adapter
    },
    json(body: unknown) {
      if (!response.headersSent) response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify(body))
    },
    setHeader(name: string, value: string) {
      response.setHeader(name, value)
    },
    end() {
      response.end()
    },
  }
  return adapter
}

export const eChainLocalApiPlugin = (): Plugin => ({
  name: 'egovchain-local-api',
  apply: 'serve',
  configureServer(server) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.middlewares.use(async (request: any, response: any, next: any) => {
      const requestUrl = new URL(request.url || '/', 'http://localhost')
      const isAnchorRoute = requestUrl.pathname === '/api/echain/anchor'
      const isStatusRoute = requestUrl.pathname === '/api/echain/status'
      if (!isAnchorRoute && !isStatusRoute) {
        next()
        return
      }

      try {
        const responseAdapter = createResponseAdapter(response)
        if (isAnchorRoute) {
          await anchorHandler({
            method: request.method,
            headers: request.headers,
            body: await readJsonBody(request),
          }, responseAdapter)
          return
        }

        await statusHandler({
          method: request.method,
          headers: request.headers,
          query: { txHash: requestUrl.searchParams.get('txHash') || undefined },
        }, responseAdapter)
      } catch (error) {
        if (response.writableEnded) return
        response.statusCode = error instanceof SyntaxError ? 400 : 500
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({
          error: 'local_api_error',
          message: error instanceof Error ? error.message : 'The local eGovChain API failed.',
        }))
      }
    })
  },
})
