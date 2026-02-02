const fs = require('fs');
const path = require('path');

console.log('[Patch Worker] Starting to patch .open-next/worker.js...');

const workerPath = path.join(process.cwd(), '.open-next', 'worker.js');

if (!fs.existsSync(workerPath)) {
  console.error('[Patch Worker] Error: .open-next/worker.js not found!');
  process.exit(1);
}

// Read the original worker
let workerContent = fs.readFileSync(workerPath, 'utf8');

console.log('[Patch Worker] Original worker size:', workerContent.length, 'bytes');

// Find the export default statement
const exportMatch = workerContent.match(/export default\s+{[\s\S]*?fetch\s*\([^)]*\)\s*{/);

if (!exportMatch) {
  console.error('[Patch Worker] Error: Could not find export default fetch pattern!');
  process.exit(1);
}

// Create the patched fetch function
const patchedFetch = `
// ===== PATCHED BY GRAPHQL PROXY =====
async function handleGraphQLProxy(request) {
  try {
    const url = new URL(request.url);
    
    // Only handle /api/graphql-proxy requests
    if (url.pathname !== '/api/graphql-proxy' || request.method !== 'POST') {
      return null; // Let OpenNext handle it
    }

    console.log('[Worker Proxy] Intercepted request to /api/graphql-proxy');

    const originalUrl = request.headers.get('X-Original-URL');
    console.log('[Worker Proxy] Original URL:', originalUrl);

    if (!originalUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing X-Original-URL header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.text();
    console.log('[Worker Proxy] Request body length:', body.length);

    const response = await fetch(originalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/graphql-response+json',
        'User-Agent': 'Mozilla/5.0 (compatible; AzuroProxy/1.0)',
      },
      body: body,
    });

    console.log('[Worker Proxy] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Worker Proxy] Request failed:', response.status, errorText.substring(0, 200));
      
      return new Response(
        JSON.stringify({
          error: 'GraphQL request failed',
          status: response.status,
          details: errorText.substring(0, 500),
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('[Worker Proxy] Response data received');

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Worker Proxy] Error:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal proxy error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
// ===== END PATCH =====

${exportMatch[0]}
  // Try to handle GraphQL proxy first
  const proxyResponse = await handleGraphQLProxy(request);
  if (proxyResponse) {
    return proxyResponse;
  }
  
  // Otherwise, continue with original OpenNext logic
`;

// Replace the export default fetch
workerContent = workerContent.replace(
  /export default\s+{[\s\S]*?fetch\s*\([^)]*\)\s*{/,
  patchedFetch
);

// Write the patched worker
fs.writeFileSync(workerPath, workerContent, 'utf8');

console.log('[Patch Worker] ✅ Successfully patched worker!');
console.log('[Patch Worker] New worker size:', workerContent.length, 'bytes');
