import prisma from '@/lib/db'

export async function categorizeOnlyUncategorized() {
  console.log('Finding uncategorized bookmarks...')
  
  // Get bookmarks with NO categories at all
  const uncategorizedBookmarks = await prisma.bookmark.findMany({
    where: {
      categories: {
        none: {}
      }
    },
    select: {
      id: true,
      text: true,
      tweetId: true,
      authorHandle: true
    }
  })
  
  console.log(`Found ${uncategorizedBookmarks.length} completely uncategorized bookmarks`)
  
  if (uncategorizedBookmarks.length === 0) {
    return {
      success: true,
      message: 'All bookmarks are already categorized!',
      uncategorizedCount: 0,
      bookmarkIds: []
    }
  }
  
  // Return the IDs so AI can process them
  return {
    success: true,
    message: `Found ${uncategorizedBookmarks.length} uncategorized bookmarks`,
    uncategorizedCount: uncategorizedBookmarks.length,
    bookmarkIds: uncategorizedBookmarks.map(b => b.id)
  }
}
