import { NextRequest, NextResponse } from 'next/server'
import { fastCategorizeByRules, getUncategorizedForAI } from '@/lib/fast-categorize'

export async function POST(request: NextRequest) {
  try {
    const { useAI = true } = await request.json()
    
    console.log('Starting optimized categorization pipeline...')
    
    // Phase 1: Fast rule-based categorization (instant)
    const ruleResults = await fastCategorizeByRules()
    
    let aiResults = null
    
    // Phase 2: AI categorization for remaining (only if requested and needed)
    if (useAI && ruleResults.remaining > 0) {
      const remainingBookmarks = await getUncategorizedForAI()
      
      if (remainingBookmarks.length > 0) {
        console.log(`Triggering AI for ${remainingBookmarks.length} remaining bookmarks...`)
        
        // Trigger AI categorization via internal API call
        const aiResponse = await fetch('http://localhost:3000/api/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookmarkIds: remainingBookmarks.map(b => b.id),
            force: true
          })
        })
        
        if (aiResponse.ok) {
          aiResults = await aiResponse.json()
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Categorization complete!',
      stats: {
        ruleBased: ruleResults,
        aiProcessing: aiResults
      }
    })
  } catch (error) {
    console.error('Optimized categorization error:', error)
    return NextResponse.json(
      { error: 'Failed to categorize', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Get current stats
  const totalBookmarks = await prisma.bookmark.count()
  const categorizedBookmarks = await prisma.bookmark.count({
    where: { categories: { some: {} } }
  })
  const uncategorizedBookmarks = totalBookmarks - categorizedBookmarks
  
  return NextResponse.json({
    stats: {
      total: totalBookmarks,
      categorized: categorizedBookmarks,
      uncategorized: uncategorizedBookmarks,
      percentComplete: Math.round((categorizedBookmarks / totalBookmarks) * 100)
    },
    message: 'POST to start optimized categorization'
  })
}

import prisma from '@/lib/db'
