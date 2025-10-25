import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/auth/token
 * Returns the access token from HttpOnly cookies for WebSocket authentication
*/
export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value
    // console.log('🔐 accessToken', accessToken)

    if (!accessToken) return NextResponse.json({ error: 'No access token found' }, { status: 401 })

    return NextResponse.json({
      accessToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    })
  } catch (error) {
    console.error('Error getting token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
