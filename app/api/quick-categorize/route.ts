import { NextRequest, NextResponse } from 'next/server'
import { autoCategorizeVideos, categorizeByHashtags } from '@/lib/quick-categorize'

export async function POST(request: NextRequest) {
  try {
    const { type = 'all' } = await request.json()
    
    const results: any = {}
    
    if (type === 'videos' || type === 'all') {
      results.videos = await autoCategorizeVideos()
    }
    
    if (type === 'hashtags' || type === 'all') {
      results.hashtags = await categorizeByHashtags()
    }
    
    return NextResponse.json({
      success: true,
      message: 'Quick categorization complete!',
      results
    })
  } catch (error) {
    console.error('Quick categorization error:', error)
    return NextResponse.json(
      { error: 'Failed to categorize', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to /api/quick-categorize with { type: "videos" | "hashtags" | "all" }'
  })
}
