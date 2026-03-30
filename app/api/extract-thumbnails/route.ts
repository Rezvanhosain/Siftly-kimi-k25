import { NextRequest, NextResponse } from 'next/server'
import { 
  extractVideoThumbnail, 
  updateVideoThumbnail,
  processAllVideoThumbnails 
} from '@/lib/video-thumbnail-extractor'
import prisma from '@/lib/db'

// POST /api/extract-thumbnails
// Extract thumbnails for all videos without them
export async function POST(): Promise<NextResponse> {
  try {
    console.log('Starting video thumbnail extraction...')
    const result = await processAllVideoThumbnails()
    
    return NextResponse.json({
      message: `Processed ${result.processed} videos: ${result.success} success, ${result.failed} failed`,
      ...result
    })
  } catch (error) {
    console.error('Thumbnail extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract thumbnails', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// GET /api/extract-thumbnails?tweetId=xxx&videoUrl=xxx
// Extract thumbnail for a specific video
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const tweetId = searchParams.get('tweetId')
  const videoUrl = searchParams.get('videoUrl')
  
  if (!tweetId || !videoUrl) {
    return NextResponse.json(
      { error: 'Missing tweetId or videoUrl' },
      { status: 400 }
    )
  }
  
  try {
    const tweetUrl = `https://twitter.com/i/status/${tweetId}`
    const result = await extractVideoThumbnail(tweetId, videoUrl, tweetUrl)
    
    return NextResponse.json({
      success: !!result.thumbnailUrl,
      thumbnailUrl: result.thumbnailUrl,
      width: result.width,
      height: result.height
    })
  } catch (error) {
    console.error('Single thumbnail extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract thumbnail', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
