/**
 * Fetch polyfill to intercept GraphQL requests and redirect them to our proxy
 * This solves CORS issues when calling third-party GraphQL endpoints from the browser
 */

// List of domains that should be proxied
const PROXY_DOMAINS = [
  'thegraph',
  'onchainfeed.org',
  'azuro',
]

// Check if a URL should be proxied
const shouldProxy = (url: string | URL | Request): boolean => {
  const urlString = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()

  return PROXY_DOMAINS.some(domain => urlString.includes(domain))
}

// Initialize the fetch polyfill
export const initFetchPolyfill = () => {
  if (typeof window === 'undefined') {
    // Only run on client side
    return
  }

  // Check if already initialized
  if ((window as any).__fetchPolyfillInitialized) {
    console.log('[Fetch Polyfill] Already initialized, skipping')

    return
  }

  // Store the original fetch
  const originalFetch = window.fetch

  // Override global fetch
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Convert input to URL string
    let url: string
    let requestInit = init || {}

    if (typeof input === 'string') {
      url = input
    }
    else if (input instanceof URL) {
      url = input.toString()
    }
    else if (input instanceof Request) {
      url = input.url
      // Merge request init with Request properties
      requestInit = {
        ...requestInit,
        method: input.method,
        headers: input.headers,
        body: input.body,
      }
    }
    else {
      // Fallback for any other case
      url = String(input)
    }

    // Check if this request should be proxied
    if (shouldProxy(url)) {
      console.log('[Fetch Polyfill] Intercepted request to:', url)
      console.log('[Fetch Polyfill] Redirecting to /api/graphql-proxy')

      // Redirect to our proxy API
      const proxyUrl = '/api/graphql-proxy'

      // Add the original URL as a header
      const headers = new Headers(requestInit.headers)

      headers.set('X-Original-URL', url)

      return originalFetch(proxyUrl, {
        ...requestInit,
        headers,
      })
    }

    // For non-proxied requests, use original fetch
    return originalFetch(input, init)
  }

  // Mark as initialized
  (window as any).__fetchPolyfillInitialized = true

  console.log('[Fetch Polyfill] ✅ Initialized - GraphQL requests will be proxied')
  console.log('[Fetch Polyfill] Proxied domains:', PROXY_DOMAINS)
}
