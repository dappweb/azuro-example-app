import { type NextRequest, NextResponse } from 'next/server'


export async function POST(request: NextRequest) {
  try {
    // 从请求头中获取原始目标 URL
    const originalUrl = request.headers.get('X-Original-URL')

    console.log('[GraphQL Proxy] Received request')
    console.log('[GraphQL Proxy] Original URL:', originalUrl)

    if (!originalUrl) {
      console.error('[GraphQL Proxy] Missing X-Original-URL header')

      return NextResponse.json(
        { error: 'Missing X-Original-URL header' },
        { status: 400 }
      )
    }

    // 获取请求体
    const body = await request.text()

    console.log('[GraphQL Proxy] Request body length:', body.length)

    // 构建请求头
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/graphql-response+json',
      'User-Agent': 'Mozilla/5.0 (compatible; AzuroProxy/1.0)',
    }

    console.log('[GraphQL Proxy] Forwarding request to:', originalUrl)

    // 转发请求到真实的 GraphQL 端点
    const response = await fetch(originalUrl, {
      method: 'POST',
      headers,
      body,
    })

    console.log('[GraphQL Proxy] Response status:', response.status)
    console.log('[GraphQL Proxy] Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()

      console.error('[GraphQL Proxy] Request failed:', response.status, errorText)

      return NextResponse.json(
        {
          error: 'GraphQL request failed',
          status: response.status,
          details: errorText.substring(0, 500),
        },
        { status: response.status }
      )
    }

    // 获取响应数据
    const data = await response.json()

    console.log('[GraphQL Proxy] Response data received, keys:', Object.keys(data))

    // 返回响应，保持原始结构
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  catch (error) {
    console.error('[GraphQL Proxy] Error:', error)

    return NextResponse.json(
      {
        error: 'Internal proxy error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
