import { NextRequest, NextResponse } from 'next/server'
import { checkOverdueItems } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    // You might want to add authentication here to ensure only authorized calls
    // For example, check for a specific API key or internal service token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.INTERNAL_API_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const success = await checkOverdueItems()
    
    if (success) {
      return NextResponse.json({ message: 'Successfully checked for overdue items' })
    } else {
      return NextResponse.json({ error: 'Failed to check overdue items' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in overdue check API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Overdue items check endpoint. Use POST to trigger check.' 
  })
}