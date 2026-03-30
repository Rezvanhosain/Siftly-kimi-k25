import prisma from '@/lib/db'

// Simple fallback categorization for bookmarks that fail AI
export async function fallbackCategorize() {
  console.log('Running fallback categorization...')
  
  // Get bookmarks with no categories
  const uncategorized = await prisma.bookmark.findMany({
    where: {
      categories: {
        none: {}
      }
    },
    select: {
      id: true,
      text: true,
      mediaItems: {
        select: { type: true }
      }
    }
  })
  
  console.log(`Found ${uncategorized.length} uncategorized bookmarks for fallback`)
  
  // Get or create "General" category
  let generalCategory = await prisma.category.findUnique({
    where: { slug: 'general' }
  })
  
  if (!generalCategory) {
    generalCategory = await prisma.category.create({
      data: {
        name: 'General',
        slug: 'general',
        color: '#6b7280',
        description: 'Miscellaneous bookmarks that don\'t fit other categories'
      }
    })
  }
  
  let categorized = 0
  
  for (const bookmark of uncategorized) {
    try {
      // Check if it's a video
      const hasVideo = bookmark.mediaItems.some(m => m.type === 'video')
      
      if (hasVideo) {
        // Get Videos category
        let videoCategory = await prisma.category.findUnique({
          where: { slug: 'videos' }
        })
        
        if (videoCategory) {
          await prisma.bookmarkCategory.create({
            data: {
              bookmarkId: bookmark.id,
              categoryId: videoCategory.id,
              confidence: 0.9
            }
          })
          categorized++
          continue
        }
      }
      
      // Simple keyword matching for fallback
      const text = bookmark.text.toLowerCase()
      let categoryId = generalCategory.id
      let confidence = 0.6
      
      // Quick keyword checks
      if (text.includes('ai') || text.includes('gpt') || text.includes('chat')) {
        const aiCat = await prisma.category.findUnique({ where: { slug: 'ai-resources' } })
        if (aiCat) { categoryId = aiCat.id; confidence = 0.7 }
      } else if (text.includes('crypto') || text.includes('bitcoin') || text.includes('eth')) {
        const cryptoCat = await prisma.category.findUnique({ where: { slug: 'finance-crypto' } })
        if (cryptoCat) { categoryId = cryptoCat.id; confidence = 0.7 }
      } else if (text.includes('code') || text.includes('dev') || text.includes('app')) {
        const devCat = await prisma.category.findUnique({ where: { slug: 'dev-tools' } })
        if (devCat) { categoryId = devCat.id; confidence = 0.7 }
      }
      
      // Assign to category
      await prisma.bookmarkCategory.create({
        data: {
          bookmarkId: bookmark.id,
          categoryId,
          confidence
        }
      })
      
      categorized++
    } catch (err) {
      console.error(`Failed to categorize ${bookmark.id}:`, err)
    }
  }
  
  console.log(`✓ Fallback categorized ${categorized} bookmarks`)
  return { categorized }
}
