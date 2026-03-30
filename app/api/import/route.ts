import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseBookmarksJson } from '@/lib/parser'
import { extractVideoThumbnail } from '@/lib/video-thumbnail-extractor'
import { generateThumbnailFromVideoUrl } from '@/lib/video-thumbnail-extractor'

export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
  }

  const sourceParam = (formData.get('source') as string | null)?.trim()
  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: 'Missing required field: file' },
      { status: 400 }
    )
  }

  const filename =
    file instanceof File ? file.name : 'bookmarks.json'

  let jsonString: string
  try {
    jsonString = await file.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read file content' }, { status: 400 })
  }

  // Create an import job to track progress
  const importJob = await prisma.importJob.create({
    data: {
      filename,
      status: 'processing',
      totalCount: 0,
      processedCount: 0,
    },
  })

  let parsedBookmarks
  try {
    parsedBookmarks = parseBookmarksJson(jsonString)
  } catch (err) {
    await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    })
    return NextResponse.json(
      { error: `Failed to parse bookmarks JSON: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    )
  }

  // Determine source: formData param > JSON field > default "bookmark"
  let jsonSource: string | undefined
  try {
    const parsed = JSON.parse(jsonString)
    if (typeof parsed?.source === 'string') jsonSource = parsed.source
  } catch { /* already parsed above */ }
  const source = (sourceParam === 'like' || sourceParam === 'bookmark')
    ? sourceParam
    : (jsonSource === 'like' ? 'like' : 'bookmark')

  await prisma.importJob.update({
    where: { id: importJob.id },
    data: { totalCount: parsedBookmarks.length },
  })

  let importedCount = 0
  let skippedCount = 0

  for (const bookmark of parsedBookmarks) {
    try {
      const existing = await prisma.bookmark.findUnique({
        where: { tweetId: bookmark.tweetId },
        select: { id: true },
      })

      if (existing) {
        skippedCount++
        continue
      }

      const created = await prisma.bookmark.create({
        data: {
          tweetId: bookmark.tweetId,
          text: bookmark.text,
          authorHandle: bookmark.authorHandle,
          authorName: bookmark.authorName,
          tweetCreatedAt: bookmark.tweetCreatedAt,
          rawJson: bookmark.rawJson,
          source,
        },
      })

      if (bookmark.media.length > 0) {
        // Process each media item, extracting thumbnails for videos
        for (const media of bookmark.media) {
          let thumbnailUrl = media.thumbnailUrl
          
          // If it's a video without a valid thumbnail, try to extract one
          if (media.type === 'video' && (!thumbnailUrl || thumbnailUrl.includes('.mp4'))) {
            try {
              const tweetUrl = `https://twitter.com/i/status/${bookmark.tweetId}`
              const result = await extractVideoThumbnail(
                bookmark.tweetId,
                media.url,
                tweetUrl
              )
              if (result.thumbnailUrl) {
                thumbnailUrl = result.thumbnailUrl
              } else {
                // Fallback: try URL pattern generation
                const patternUrl = generateThumbnailFromVideoUrl(media.url)
                if (patternUrl) {
                  thumbnailUrl = patternUrl
                }
              }
            } catch (err) {
              console.log(`Failed to extract thumbnail for ${bookmark.tweetId}:`, err)
              // Fallback to pattern generation
              const patternUrl = generateThumbnailFromVideoUrl(media.url)
              if (patternUrl) {
                thumbnailUrl = patternUrl
              }
            }
          }
          
          await prisma.mediaItem.create({
            data: {
              bookmarkId: created.id,
              type: media.type,
              url: media.url,
              thumbnailUrl: thumbnailUrl ?? null,
            },
          })
        }
      }

      importedCount++
    } catch (err) {
      console.error(`Failed to import tweet ${bookmark.tweetId}:`, err)
      skippedCount++
    }
  }

  await prisma.importJob.update({
    where: { id: importJob.id },
    data: {
      status: 'done',
      processedCount: importedCount,
    },
  })

  return NextResponse.json({
    jobId: importJob.id,
    imported: importedCount,
    skipped: skippedCount,
    parsed: parsedBookmarks.length,
  })
}
