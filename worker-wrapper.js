// Custom Cloudflare Worker wrapper to handle GraphQL proxy
// This wraps the OpenNext worker and intercepts /api/graphql-proxy requests

import worker from './.open-next/worker.js'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Intercept /api/graphql-proxy requests
    if (url.pathname === '/api/graphql-proxy' && request.method === 'POST') {
      try {
        console.log('[Worker Proxy] Intercepted request to /api/graphql-proxy')

        // Get the original URL from headers
        const originalUrl = request.headers.get('X-Original-URL')

        console.log('[Worker Proxy] Original URL:', originalUrl)

        if (!originalUrl) {
          return new Response(
            JSON.stringify({ error: 'Missing X-Original-URL header' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        // Get the request body
        const body = await request.text()

        console.log('[Worker Proxy] Request body length:', body.length)

        // Forward the request to the original URL
        const response = await fetch(originalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/graphql-response+json',
            'User-Agent': 'Mozilla/5.0 (compatible; AzuroProxy/1.0)',
          },
          body: body,
        })

        console.log('[Worker Proxy] Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()

          console.error('[Worker Proxy] Request failed:', response.status, errorText)

          return new Response(
            JSON.stringify({
              error: 'GraphQL request failed',
              status: response.status,
              details: errorText.substring(0, 500),
            }),
            {
              status: response.status,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        // Get response data
        const data = await response.json()

        console.log('[Worker Proxy] Response data received')

        // Return the response
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }
      catch (error) {
        console.error('[Worker Proxy] Error:', error)

        return new Response(
          JSON.stringify({
            error: 'Internal proxy error',
            details: error.message,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // For all other requests, pass to OpenNext worker
    return worker.fetch(request, env, ctx)
  },
}
