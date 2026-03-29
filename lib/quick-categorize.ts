import prisma from '@/lib/db'

// Auto-categorize videos to a "Videos" category
// Skip expensive AI vision analysis
export async function autoCategorizeVideos() {
  console.log('Starting video auto-categorization...')
  
  // Get or create Videos category
  let videoCategory = await prisma.category.findUnique({
    where: { slug: 'videos' }
  })
  
  if (!videoCategory) {
    videoCategory = await prisma.category.create({
      data: {
        name: 'Videos',
        slug: 'videos',
        color: '#ef4444', // Red color for videos
        description: 'Video content from Twitter/X bookmarks',
        isAiGenerated: false
      }
    })
    console.log('Created Videos category')
  }
  
  // Find all bookmarks with video media
  const bookmarksWithVideo = await prisma.bookmark.findMany({
    where: {
      mediaItems: {
        some: {
          type: 'video'
        }
      },
      // Not already categorized as Videos
      categories: {
        none: {
          categoryId: videoCategory.id
        }
      }
    },
    select: {
      id: true,
      tweetId: true,
      text: true,
      mediaItems: {
        select: {
          id: true,
          type: true,
          url: true
        }
      }
    }
  })
  
  console.log(`Found ${bookmarksWithVideo.length} video bookmarks to categorize`)
  
  let categorized = 0
  
  for (const bookmark of bookmarksWithVideo) {
    try {
      // Add to Videos category
      await prisma.bookmarkCategory.upsert({
        where: {
          bookmarkId_categoryId: {
            bookmarkId: bookmark.id,
            categoryId: videoCategory.id
          }
        },
        update: {
          confidence: 1.0 // High confidence since we know it's a video
        },
        create: {
          bookmarkId: bookmark.id,
          categoryId: videoCategory.id,
          confidence: 1.0
        }
      })
      
      // Mark as enriched so AI skips it
      await prisma.bookmark.update({
        where: { id: bookmark.id },
        data: {
          enrichedAt: new Date(),
          semanticTags: JSON.stringify(['video'])
        }
      })
      
      categorized++
      
      if (categorized % 50 === 0) {
        console.log(`Categorized ${categorized}/${bookmarksWithVideo.length} videos...`)
      }
    } catch (err) {
      console.error(`Failed to categorize video ${bookmark.id}:`, err)
    }
  }
  
  console.log(`✓ Auto-categorized ${categorized} videos!`)
  return {
    total: bookmarksWithVideo.length,
    categorized,
    categoryId: videoCategory.id
  }
}

// Extract hashtags from bookmarks and use for categorization
export async function categorizeByHashtags() {
  console.log('Categorizing by hashtags...')
  
  // Find bookmarks with hashtags in entities
  const bookmarksWithHashtags = await prisma.bookmark.findMany({
    where: {
      entities: {
        not: null
      },
      categories: {
        none: {} // Not yet categorized
      }
    },
    select: {
      id: true,
      entities: true
    }
  })
  
  console.log(`Found ${bookmarksWithHashtags.length} bookmarks with hashtags`)
  
  // Category mappings based on common hashtags
  const hashtagToCategory: Record<string, { slug: string, name: string, color: string }> = {
    'ai': { slug: 'ai-resources', name: 'AI & Machine Learning', color: '#8b5cf6' },
    'ml': { slug: 'ai-resources', name: 'AI & Machine Learning', color: '#8b5cf6' },
    'artificialintelligence': { slug: 'ai-resources', name: 'AI & Machine Learning', color: '#8b5cf6' },
    'chatgpt': { slug: 'ai-resources', name: 'AI & Machine Learning', color: '#8b5cf6' },
    'claude': { slug: 'ai-resources', name: 'AI & Machine Learning', color: '#8b5cf6' },
    'openai': { slug: 'ai-resources', name: 'AI & Machine Learning', color: '#8b5cf6' },
    
    'crypto': { slug: 'finance-crypto', name: 'Crypto & Web3', color: '#f59e0b' },
    'bitcoin': { slug: 'finance-crypto', name: 'Crypto & Web3', color: '#f59e0b' },
    'ethereum': { slug: 'finance-crypto', name: 'Crypto & Web3', color: '#f59e0b' },
    'defi': { slug: 'finance-crypto', name: 'Crypto & Web3', color: '#f59e0b' },
    'nft': { slug: 'finance-crypto', name: 'Crypto & Web3', color: '#f59e0b' },
    
    'coding': { slug: 'dev-tools', name: 'Dev Tools & Engineering', color: '#06b6d4' },
    'programming': { slug: 'dev-tools', name: 'Dev Tools & Engineering', color: '#06b6d4' },
    'developer': { slug: 'dev-tools', name: 'Dev Tools & Engineering', color: '#06b6d4' },
    'github': { slug: 'dev-tools', name: 'Dev Tools & Engineering', color: '#06b6d4' },
    'python': { slug: 'dev-tools', name: 'Dev Tools & Engineering', color: '#06b6d4' },
    'javascript': { slug: 'dev-tools', name: 'Dev Tools & Engineering', color: '#06b6d4' },
    
    'startup': { slug: 'startups-business', name: 'Startups & Business', color: '#f97316' },
    'entrepreneur': { slug: 'startups-business', name: 'Startups & Business', color: '#f97316' },
    'business': { slug: 'startups-business', name: 'Startups & Business', color: '#f97316' },
    'saas': { slug: 'startups-business', name: 'Startups & Business', color: '#f97316' },
    
    'news': { slug: 'news', name: 'News & Updates', color: '#3b82f6' },
    'breaking': { slug: 'news', name: 'News & Updates', color: '#3b82f6' }
  }
  
  let categorized = 0
  
  for (const bookmark of bookmarksWithHashtags) {
    try {
      if (!bookmark.entities) continue
      
      const entities = JSON.parse(bookmark.entities)
      const hashtags: string[] = entities.hashtags || []
      
      // Find matching categories
      const matchedCategories = new Set<string>()
      
      for (const hashtag of hashtags) {
        const lowerTag = hashtag.toLowerCase()
        
        for (const [key, category] of Object.entries(hashtagToCategory)) {
          if (lowerTag.includes(key)) {
            matchedCategories.add(JSON.stringify(category))
          }
        }
      }
      
      if (matchedCategories.size > 0) {
        // Create categories and assign
        for (const catJson of matchedCategories) {
          const cat = JSON.parse(catJson)
          
          // Get or create category
          let category = await prisma.category.findUnique({
            where: { slug: cat.slug }
          })
          
          if (!category) {
            category = await prisma.category.create({
              data: {
                name: cat.name,
                slug: cat.slug,
                color: cat.color,
                isAiGenerated: false
              }
            })
          }
          
          // Assign bookmark to category
          await prisma.bookmarkCategory.upsert({
            where: {
              bookmarkId_categoryId: {
                bookmarkId: bookmark.id,
                categoryId: category.id
              }
            },
            update: {},
            create: {
              bookmarkId: bookmark.id,
              categoryId: category.id,
              confidence: 0.8
            }
          })
        }
        
        categorized++
      }
    } catch (err) {
      console.error(`Failed to process bookmark ${bookmark.id}:`, err)
    }
  }
  
  console.log(`✓ Categorized ${categorized} bookmarks by hashtags!`)
  return { categorized }
}
