import { NextResponse } from 'next/server'

// Lightweight liveness probe for the compose healthcheck (no DB round-trip).
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ status: 'ok', service: 'lovedis-cms' })
}
