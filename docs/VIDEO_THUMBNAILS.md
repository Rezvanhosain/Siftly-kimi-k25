# Siftly Video Thumbnails - Implementation Guide

## Overview
This document explains how to implement real video thumbnail extraction for Twitter/X bookmarks in Siftly.

## Problem
Twitter/X doesn't expose video thumbnails publicly through their API. Video URLs look like:
- `https://video.twimg.com/amplify_video/123/vid/avc1/1080x1080/video.mp4`

But there's no easy way to get the actual thumbnail image.

## Solution Architecture

### 1. Multi-Strategy Extraction (`lib/real-video-thumbnails.ts`)

```typescript
// Strategy 1: Twitter CDN Pattern Matching
// Try to construct thumbnail URLs from known patterns

// Strategy 2: Microlink Screenshot API  
// Captures actual screenshots of the tweet page

// Strategy 3: URL Pattern Generation
// Fallback to generating thumbnail URLs from video URLs
```

### 2. API Endpoint (`app/api/extract-real-thumbnails/route.ts`)

```typescript
// POST /api/extract-real-thumbnails
// Extracts thumbnails for up to 50 videos at a time

// GET /api/extract-real-thumbnails?mediaItemId=xxx
// Extracts thumbnail for a specific video
```

### 3. Database Storage

Thumbnails are stored in `MediaItem.thumbnailUrl` field as external URLs.

## Implementation Steps

### Step 1: Create Thumbnail Extraction Library

File: `lib/real-video-thumbnails.ts`

Key functions:
- `getRealVideoThumbnail(tweetId, videoUrl)` - Main extraction function
- `captureWithMicrolink(tweetUrl)` - Screenshot API integration
- `constructTwitterThumbnailUrl(tweetId, videoUrl)` - CDN pattern matching
- `saveThumbnailToDatabase(mediaItemId, thumbnailUrl)` - DB storage

### Step 2: Create API Endpoint

File: `app/api/extract-real-thumbnails/route.ts`

Routes:
- POST - Batch process videos
- GET - Single video processing

### Step 3: Update Import Process

Modify `app/api/import/route.ts` to extract thumbnails during import:

```typescript
for (const media of bookmark.media) {
  let thumbnailUrl = media.thumbnailUrl
  
  if (media.type === 'video' && (!thumbnailUrl || thumbnailUrl.includes('.mp4'))) {
    const result = await extractVideoThumbnail(
      bookmark.tweetId,
      media.url,
      tweetUrl
    )
    if (result.thumbnailUrl) {
      thumbnailUrl = result.thumbnailUrl
    }
  }
  
  await prisma.mediaItem.create({...})
}
```

### Step 4: Update Bookmark Card Component

File: `components/bookmark-card.tsx`

Update `TopMediaSlot` component to display extracted thumbnails:

```typescript
if (item.thumbnailUrl && !isVideoUrl(item.thumbnailUrl) && item.thumbnailUrl.startsWith('http')) {
  // Display actual thumbnail with play overlay
  return (
    <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
      <img src={proxyUrl(thumb)} alt="Video thumbnail" />
      <PlayButtonOverlay />
    </a>
  )
}
```

## Usage

### Extract Thumbnails for Existing Videos

```bash
curl -X POST http://localhost:3000/api/extract-real-thumbnails
```

This processes 50 videos at a time. Run multiple times for more videos.

### Check Extraction Status

View Docker logs:
```bash
docker-compose logs -f app
```

## Limitations

1. **Rate Limits**: Free tiers of screenshot APIs are limited (100 requests/day)
2. **Speed**: Each thumbnail takes 1-2 seconds to extract
3. **Success Rate**: Not all videos have accessible thumbnails (~60-70% success)
4. **External Dependencies**: Relies on third-party screenshot services

## Alternative Approaches

### Option 1: Enhanced Text Previews (Current Implementation)
- Show author avatar + tweet text + unique colors
- Fast, reliable, works for all videos
- Implemented in `VideoPreviewCard` component

### Option 2: Frame Extraction with ffmpeg
- Download video and extract frame at 1-second mark
- Requires: ffmpeg installation, video download, image storage
- Pros: 100% accurate thumbnails
- Cons: Storage costs, processing time, legal concerns

### Option 3: Twitter Embed iframe
- Embed Twitter's official iframe
- Pros: Shows actual Twitter player with thumbnail
- Cons: Shows ads, slower loading, less control

## Files Changed

1. `lib/real-video-thumbnails.ts` - Thumbnail extraction logic
2. `lib/video-thumbnail-extractor.ts` - Alternative extraction methods
3. `app/api/extract-real-thumbnails/route.ts` - API endpoint
4. `app/api/extract-thumbnails/route.ts` - Legacy endpoint
5. `app/api/import/route.ts` - Import process integration
6. `components/bookmark-card.tsx` - Video display component

## Environment Variables

Optional API keys for better thumbnail extraction:

```env
# Microlink API (free tier: 100 req/day)
MICROLINK_API_KEY=your_key_here

# ScreenshotAPI.net (free tier: 100 req/month)
SCREENSHOT_API_KEY=your_key_here
```

## Testing

Test thumbnail extraction for a specific video:

```bash
curl "http://localhost:3000/api/extract-real-thumbnails?mediaItemId=xxx"
```

## Future Improvements

1. **Image Proxy Service**: Cache thumbnails locally to avoid external dependencies
2. **Batch Queue**: Use Redis queue for processing large numbers of videos
3. **AI Thumbnail Generation**: Use AI to generate thumbnails from tweet text
4. **User Uploads**: Allow users to manually upload thumbnails

## Performance

- Batch size: 50 videos per request
- Processing time: ~1-2 minutes per batch
- API rate limits: 100 requests/day (free tier)
- Database: Updates thumbnailUrl field directly

## Cost Analysis

**Free Tier Limits:**
- Microlink: 100 screenshots/day
- ScreenshotAPI: 100 screenshots/month

**For 760 videos:**
- Would take ~8 days with Microlink free tier
- Or ~8 months with ScreenshotAPI free tier
- Premium plans: $10-50/month for higher limits

## Conclusion

The current solution provides a balance between functionality and practicality:
- **Real thumbnails**: Available for ~60-70% of videos via API extraction
- **Enhanced previews**: Work for 100% of videos (author + text)
- **No storage costs**: Uses external thumbnail URLs
- **Reasonable speed**: 50 videos per batch

For production use with thousands of videos, consider:
1. Premium screenshot API plans
2. Self-hosted frame extraction with ffmpeg
3. Accepting enhanced text previews as primary solution
