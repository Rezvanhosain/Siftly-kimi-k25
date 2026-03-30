// Video thumbnail extraction service
// This module provides multiple strategies for extracting video thumbnails from Twitter

import prisma from './db'

export interface ThumbnailResult {
  thumbnailUrl: string | null
  width?: number
  height?: number
}

/**
 * Extract video thumbnail using Twitter's oEmbed API
 * This is the most reliable method for getting actual video thumbnails
 */
export async function extractThumbnailFromOEmbed(tweetId: string): Promise<ThumbnailResult> {
  try {
    // Twitter's oEmbed endpoint
    const oembedUrl = `https://publish.twitter.com/oembed?url=https://twitter.com/i/status/${tweetId}&omit_script=true&dnt=true`
    
    const response = await fetch(oembedUrl)
    if (!response.ok) {
      throw new Error(`oEmbed request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const html = data.html || ''
    
    // Try to extract image URL from the HTML
    // Twitter embeds usually contain an image in the HTML
    const imgMatch = html.match(/<img[^>]+src="([^"]+)"/i)
    if (imgMatch) {
      let imageUrl = imgMatch[1]
      
      // Fix relative URLs
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      }
      
      return { thumbnailUrl: imageUrl }
    }
    
    return { thumbnailUrl: null }
  } catch (error) {
    console.error('oEmbed extraction failed:', error)
    return { thumbnailUrl: null }
  }
}

/**
 * Use Microlink API to extract video metadata and thumbnail
 * Free tier: 100 requests/day, 10 req/min
 */
export async function extractThumbnailWithMicrolink(tweetUrl: string): Promise<ThumbnailResult> {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(tweetUrl)}&screenshot=true&video=true&embed=videohtml`
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Siftly/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Microlink request failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Check for screenshot
    if (data.data?.screenshot?.url) {
      return {
        thumbnailUrl: data.data.screenshot.url,
        width: data.data.screenshot.width,
        height: data.data.screenshot.height
      }
    }
    
    // Check for image
    if (data.data?.image?.url) {
      return {
        thumbnailUrl: data.data.image.url
      }
    }
    
    return { thumbnailUrl: null }
  } catch (error) {
    console.error('Microlink extraction failed:', error)
    return { thumbnailUrl: null }
  }
}

/**
 * Generate thumbnail URL from Twitter video URL patterns
 * This uses known Twitter video thumbnail patterns
 */
export function generateThumbnailFromVideoUrl(videoUrl: string): string | null {
  // Pattern 1: amplify_video
  // Original: https://video.twimg.com/amplify_video/123456/vid/avc1/1080x1080/filename.mp4
  // Thumbnail: https://video.twimg.com/amplify_video/123456/img/filename.jpg
  
  const amplifyMatch = videoUrl.match(/\/amplify_video\/(\d+)\/vid\/[^/]+\/[^/]+\/([^/?]+)\.mp4/)
  if (amplifyMatch) {
    const [, videoId, filename] = amplifyMatch
    return `https://video.twimg.com/amplify_video/${videoId}/img/${filename}.jpg`
  }
  
  // Pattern 2: ext_tw_video
  // Original: https://video.twimg.com/ext_tw_video/123456/pu/vid/avc1/720x720/filename.mp4
  // Thumbnail: https://video.twimg.com/ext_tw_video/123456/pu/img/filename.jpg
  
  const extMatch = videoUrl.match(/\/ext_tw_video\/(\d+)\/pu\/vid\/[^/]+\/[^/]+\/([^/?]+)\.mp4/)
  if (extMatch) {
    const [, videoId, filename] = extMatch
    return `https://video.twimg.com/ext_tw_video/${videoId}/pu/img/${filename}.jpg`
  }
  
  // Pattern 3: Try to get the poster image from video.twimg.com structure
  // Some videos have thumbnails in the /img/ directory
  if (videoUrl.includes('video.twimg.com')) {
    // Extract the base video ID
    const videoIdMatch = videoUrl.match(/\/(?:amplify_video|ext_tw_video)\/(\d+)\//)
    if (videoIdMatch) {
      const videoId = videoIdMatch[1]
      // Try common thumbnail patterns
      const patterns = [
        `https://video.twimg.com/amplify_video/${videoId}/img/0.jpg`,
        `https://video.twimg.com/ext_tw_video/${videoId}/pu/img/0.jpg`,
      ]
      return patterns[0] // Return first pattern to try
    }
  }
  
  return null
}

/**
 * Test if a thumbnail URL is valid by making a HEAD request
 */
export async function testThumbnailUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    return response.ok && response.headers.get('content-type')?.includes('image') || false
  } catch {
    return false
  }
}

/**
 * Main function to extract video thumbnail using multiple strategies
 */
export async function extractVideoThumbnail(
  tweetId: string,
  videoUrl: string,
  tweetUrl: string
): Promise<ThumbnailResult> {
  console.log(`Extracting thumbnail for tweet ${tweetId}...`)
  
  // Strategy 1: Try oEmbed (most reliable for Twitter)
  console.log('  Trying oEmbed...')
  const oembedResult = await extractThumbnailFromOEmbed(tweetId)
  if (oembedResult.thumbnailUrl) {
    console.log('  ✓ Got thumbnail from oEmbed')
    return oembedResult
  }
  
  // Strategy 2: Try URL pattern generation
  console.log('  Trying URL pattern...')
  const patternUrl = generateThumbnailFromVideoUrl(videoUrl)
  if (patternUrl) {
    const isValid = await testThumbnailUrl(patternUrl)
    if (isValid) {
      console.log('  ✓ Got thumbnail from URL pattern')
      return { thumbnailUrl: patternUrl }
    }
  }
  
  // Strategy 3: Try Microlink API (external service)
  console.log('  Trying Microlink...')
  const microlinkResult = await extractThumbnailWithMicrolink(tweetUrl)
  if (microlinkResult.thumbnailUrl) {
    console.log('  ✓ Got thumbnail from Microlink')
    return microlinkResult
  }
  
  console.log('  ✗ No thumbnail found')
  return { thumbnailUrl: null }
}

/**
 * Update media item with extracted thumbnail
 */
export async function updateVideoThumbnail(
  mediaItemId: string,
  thumbnailUrl: string
): Promise<void> {
  await prisma.mediaItem.update({
    where: { id: mediaItemId },
    data: { thumbnailUrl }
  })
}

/**
 * Process all videos without thumbnails and extract them
 */
export async function processAllVideoThumbnails(): Promise<{
  processed: number
  success: number
  failed: number
}> {
  const videos = await prisma.mediaItem.findMany({
    where: {
      type: 'video',
      OR: [
        { thumbnailUrl: null },
        { thumbnailUrl: { contains: '.mp4' } }
      ]
    },
    include: {
      bookmark: {
        select: {
          tweetId: true
        }
      }
    },
    take: 100 // Process in batches
  })
  
  console.log(`Found ${videos.length} videos without thumbnails`)
  
  let success = 0
  let failed = 0
  
  for (const video of videos) {
    try {
      const tweetUrl = `https://twitter.com/i/status/${video.bookmark.tweetId}`
      const result = await extractVideoThumbnail(
        video.bookmark.tweetId,
        video.url,
        tweetUrl
      )
      
      if (result.thumbnailUrl) {
        await updateVideoThumbnail(video.id, result.thumbnailUrl)
        success++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`Failed to process video ${video.id}:`, error)
      failed++
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return { processed: videos.length, success, failed }
}
