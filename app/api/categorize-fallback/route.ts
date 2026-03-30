import { NextRequest, NextResponse } from 'next/server'
import { fallbackCategorize } from '@/lib/fallback-categorize'

export async function POST() {
  try {
    const result = await fallbackCategorize()
    return NextResponse.json({
      success: true,
      message: `Fallback categorization complete! Categorized ${result.categorized} bookmarks.`,
      categorized: result.categorized
    })
  } catch (error) {
    console.error('Fallback categorization error:', error)
    return NextResponse.json(
      { error: 'Failed to categorize', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to run fallback categorization on uncategorized bookmarks'
  })
}
