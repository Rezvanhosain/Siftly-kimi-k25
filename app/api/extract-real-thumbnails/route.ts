import { NextRequest, NextResponse } from 'next/server'
import { getRealVideoThumbnail, saveThumbnailToDatabase } from '@/lib/real-video-thumbnails'
import prisma from '@/lib/db'

// POST /api/extract-real-thumbnails
// Extract REAL video thumbnails using screenshot APIs
export async function POST(): Promise<NextResponse> {
  try {
    // Find videos without proper thumbnails
    const videos = await prisma.mediaItem.findMany({
      where: {
        type: 'video',
        OR: [
          { thumbnailUrl: null },
          { thumbnailUrl: { contains: '.mp4' } },
          { thumbnailUrl: { not: { startsWith: 'http' } } }
        ]
      },
      include: {
        bookmark: {
          select: {
            id: true,
            tweetId: true
          }
        }
      },
      take: 50 // Process in small batches to avoid rate limits
    })
    
    console.log(`Found ${videos.length} videos needing real thumbnails`)
    
    let success = 0
    let failed = 0
    
    for (const video of videos) {
      try {
        console.log(`Processing video ${video.id} (tweet: ${video.bookmark.tweetId})`)
        
        const result = await getRealVideoThumbnail(
          video.bookmark.tweetId,
          video.url
        )
        
        if (result.thumbnailUrl) {
          await saveThumbnailToDatabase(video.id, result.thumbnailUrl)
          console.log(`  ✓ Got thumbnail from ${result.source}: ${result.thumbnailUrl.substring(0, 80)}...`)
          success++
        } else {
          console.log(`  ✗ No thumbnail available from any source`)
          failed++
        }
        
        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`  ✗ Error processing video ${video.id}:`, error)
        failed++
      }
    }
    
    return NextResponse.json({
      processed: videos.length,
      success,
      failed,
      message: `Extracted ${success} real thumbnails, ${failed} failed`
    })
    
  } catch (error) {
    console.error('Thumbnail extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract thumbnails' },
      { status: 500 }
    )
  }
}

// GET /api/extract-real-thumbnails?mediaItemId=xxx
// Extract thumbnail for a specific video
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const mediaItemId = searchParams.get('mediaItemId')
  
  if (!mediaItemId) {
    return NextResponse.json(
      { error: 'Missing mediaItemId' },
      { status: 400 }
    )
  }
  
  try {
    const mediaItem = await prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
      include: {
        bookmark: {
          select: { tweetId: true }
        }
      }
    })
    
    if (!mediaItem || mediaItem.type !== 'video') {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }
    
    const result = await getRealVideoThumbnail(
      mediaItem.bookmark.tweetId,
      mediaItem.url
    )
    
    if (result.thumbnailUrl) {
      await saveThumbnailToDatabase(mediaItemId, result.thumbnailUrl)
    }
    
    return NextResponse.json({
      success: !!result.thumbnailUrl,
      thumbnailUrl: result.thumbnailUrl,
      source: result.source
    })
    
  } catch (error) {
    console.error('Single thumbnail extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract thumbnail' },
      { status: 500 }
    )
  }
}
