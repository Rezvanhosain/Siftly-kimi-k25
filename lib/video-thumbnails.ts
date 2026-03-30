// Video thumbnail extraction using external APIs
// Since Twitter doesn't expose thumbnails easily, we'll use alternative methods

export interface VideoInfo {
  thumbnailUrl: string | null
  duration: string | null
  title: string | null
}

// Cache for video metadata
const videoCache = new Map<string, VideoInfo>()

/**
 * Extract video ID from Twitter video URL
 */
function extractVideoId(url: string): string | null {
  // Pattern: amplify_video/[ID]/...
  const amplifyMatch = url.match(/\/amplify_video\/(\d+)\//)
  if (amplifyMatch) return amplifyMatch[1]
  
  // Pattern: ext_tw_video/[ID]/...
  const extMatch = url.match(/\/ext_tw_video\/(\d+)\//)
  if (extMatch) return extMatch[1]
  
  return null
}

/**
 * Generate a thumbnail URL using Microlink API
 * This service can extract thumbnails from Twitter videos
 */
export async function getVideoThumbnailWithMicrolink(tweetUrl: string): Promise<VideoInfo> {
  const cacheKey = tweetUrl
  
  if (videoCache.has(cacheKey)) {
    return videoCache.get(cacheKey)!
  }
  
  const result: VideoInfo = {
    thumbnailUrl: null,
    duration: null,
    title: null
  }
  
  try {
    // Use Microlink API to get video metadata
    // Note: This requires a Microlink API key for production use
    const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(tweetUrl)}&video=true`)
    
    if (response.ok) {
      const data = await response.json()
      
      if (data.data?.image?.url) {
        result.thumbnailUrl = data.data.image.url
      }
      
      if (data.data?.video?.duration) {
        const duration = data.data.video.duration
        const minutes = Math.floor(duration / 60000)
        const seconds = Math.floor((duration % 60000) / 1000)
        result.duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
      
      if (data.data?.title) {
        result.title = data.data.title
      }
    }
  } catch (err) {
    console.log('Microlink fetch failed:', err)
  }
  
  videoCache.set(cacheKey, result)
  return result
}

/**
 * Try multiple strategies to get video thumbnail
 */
export async function getVideoThumbnail(tweetId: string, videoUrl: string, tweetUrl: string): Promise<VideoInfo> {
  // Strategy 1: Try Microlink API
  const microlinkResult = await getVideoThumbnailWithMicrolink(tweetUrl)
  if (microlinkResult.thumbnailUrl) {
    return microlinkResult
  }
  
  // Strategy 2: Return null and let the UI handle it
  return {
    thumbnailUrl: null,
    duration: null,
    title: null
  }
}

/**
 * Generate a unique visual identifier for a video based on its URL
 * This creates consistent "identicon-like" patterns for videos without thumbnails
 */
export function generateVideoVisualHash(videoUrl: string): {
  gradient: string
  pattern: string
  iconColor: string
} {
  let hash = 0
  for (let i = 0; i < videoUrl.length; i++) {
    hash = videoUrl.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Generate gradient colors
  const hue1 = Math.abs(hash % 360)
  const hue2 = (hue1 + 40 + Math.abs((hash >> 8) % 60)) % 360
  const saturation = 50 + Math.abs((hash >> 16) % 30)
  const lightness1 = 20 + Math.abs((hash >> 24) % 15)
  const lightness2 = 15 + Math.abs((hash >> 32) % 10)
  
  return {
    gradient: `linear-gradient(135deg, hsl(${hue1}, ${saturation}%, ${lightness1}%), hsl(${hue2}, ${saturation}%, ${lightness2}%))`,
    pattern: generatePattern(hash),
    iconColor: `hsl(${hue1}, 80%, 60%)`
  }
}

function generatePattern(hash: number): string {
  // Generate SVG pattern based on hash
  const patternType = Math.abs(hash % 4)
  
  switch (patternType) {
    case 0:
      // Dots pattern
      return `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='rgba(255,255,255,0.1)'/%3E%3C/svg%3E")`
    case 1:
      // Lines pattern
      return `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20h40' stroke='rgba(255,255,255,0.05)' stroke-width='1'/%3E%3C/svg%3E")`
    case 2:
      // Grid pattern
      return `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 15h30M15 0v30' stroke='rgba(255,255,255,0.05)' stroke-width='1'/%3E%3C/svg%3E")`
    default:
      // Diagonal lines
      return `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20L20 0' stroke='rgba(255,255,255,0.05)' stroke-width='1'/%3E%3C/svg%3E")`
  }
}
