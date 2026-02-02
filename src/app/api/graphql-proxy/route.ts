import { type NextRequest, NextResponse } from 'next/server'


export async function POST(request: NextRequest) {
  try {
    // 从请求头中获取原始目标 URL
    const originalUrl = request.headers.get('X-Original-URL')

    if (!originalUrl) {
      return NextResponse.json(
        { error: 'Missing X-Original-URL header' },
        { status: 400 }
      )
    }

    // 获取请求体
    const body = await request.text()

    // 获取其他请求头（排除一些不需要转发的）
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/graphql-response+json',
    }

    // 转发请求到真实的 GraphQL 端点
    const response = await fetch(originalUrl, {
      method: 'POST',
      headers,
      body,
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'GraphQL request failed', status: response.status },
        { status: response.status }
      )
    }

    // 获取响应数据
    const data = await response.json()

    // 返回响应，保持原始结构
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  catch (error) {
    console.error('GraphQL Proxy Error:', error)

    return NextResponse.json(
      { error: 'Internal proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
