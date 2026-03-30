import { NextRequest, NextResponse } from 'next/server'
import { categorizeOnlyUncategorized } from '@/lib/uncategorized-finder'

export async function GET() {
  const result = await categorizeOnlyUncategorized()
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  try {
    const { useAI = true } = await request.json()
    
    // Get uncategorized bookmarks
    const result = await categorizeOnlyUncategorized()
    
    if (result.uncategorizedCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'All bookmarks already categorized!',
        categorized: 0
      })
    }
    
    if (useAI && result.bookmarkIds.length > 0) {
      console.log(`Triggering AI for ${result.bookmarkIds.length} uncategorized bookmarks...`)
      
      // Trigger AI categorization only for uncategorized
      const aiResponse = await fetch('http://localhost:3000/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmarkIds: result.bookmarkIds,
          force: false  // Don't force, only categorize these specific ones
        })
      })
      
      if (!aiResponse.ok) {
        const error = await aiResponse.json()
        throw new Error(error.error || 'Failed to trigger AI categorization')
      }
      
      const aiResult = await aiResponse.json()
      
      return NextResponse.json({
        success: true,
        message: `AI categorization started for ${result.uncategorizedCount} uncategorized bookmarks`,
        uncategorizedCount: result.uncategorizedCount,
        bookmarkIds: result.bookmarkIds,
        aiStatus: aiResult
      })
    }
    
    return NextResponse.json({
      success: true,
      message: `Found ${result.uncategorizedCount} uncategorized bookmarks`,
      uncategorizedCount: result.uncategorizedCount,
      bookmarkIds: result.bookmarkIds
    })
  } catch (error) {
    console.error('Error categorizing uncategorized:', error)
    return NextResponse.json(
      { error: 'Failed to categorize', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
