import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params
  const pathStr = path.join('/')
  const url = `${BACKEND_URL}/api/${pathStr}${req.nextUrl.search}`

  const headers: Record<string, string> = {}
  const auth = req.headers.get('authorization')
  if (auth) headers['authorization'] = auth
  const contentType = req.headers.get('content-type')
  if (contentType) headers['content-type'] = contentType

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // For multipart (file uploads), pass body as-is
    if (contentType?.includes('multipart')) {
      fetchOptions.body = await req.arrayBuffer()
    } else {
      fetchOptions.body = await req.text()
    }
  }

  const res = await fetch(url, fetchOptions)

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params)
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params)
}
