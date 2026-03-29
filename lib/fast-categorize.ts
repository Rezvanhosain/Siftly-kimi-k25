import prisma from '@/lib/db'

// Fast keyword-based categorization rules
const KEYWORD_RULES: { keywords: string[]; category: { slug: string; name: string; color: string } }[] = [
  {
    keywords: ['AI', 'artificial intelligence', 'machine learning', 'ML', 'LLM', 'GPT', 'ChatGPT', 'Claude', 'Gemini', 'OpenAI', 'neural network', 'deep learning', 'model', 'transformer', 'fine-tuning', 'RAG', 'prompt', 'agent', 'LLaMA', 'Mistral', 'stable diffusion', 'midjourney', 'DALL-E'],
    category: { slug: 'ai-resources', name: 'AI & Machine Learning', color: '#8b5cf6' }
  },
  {
    keywords: ['crypto', 'bitcoin', 'ethereum', 'BTC', 'ETH', 'blockchain', 'DeFi', 'NFT', 'token', 'altcoin', 'web3', 'smart contract', 'wallet', 'mining', 'staking', 'Solana', 'Cardano', 'trading', 'bull', 'bear', 'HODL', 'airdrop'],
    category: { slug: 'finance-crypto', name: 'Crypto & Web3', color: '#f59e0b' }
  },
  {
    keywords: ['code', 'coding', 'programming', 'developer', 'dev', 'GitHub', 'API', 'framework', 'library', 'JavaScript', 'Python', 'TypeScript', 'Rust', 'Go', 'React', 'Vue', 'Node.js', 'Docker', 'Kubernetes', 'CI/CD', 'backend', 'frontend', 'fullstack', 'software', 'app', 'database', 'SQL', 'cloud', 'AWS', 'Vercel', 'server'],
    category: { slug: 'dev-tools', name: 'Dev Tools & Engineering', color: '#06b6d4' }
  },
  {
    keywords: ['startup', 'founder', 'entrepreneur', 'business', 'SaaS', 'product', 'revenue', 'growth', 'marketing', 'sales', 'VC', 'investor', 'funding', 'bootstrap', 'MVP', 'product-market fit', 'B2B', 'B2C', 'YC', 'Y Combinator', 'scale'],
    category: { slug: 'startups-business', name: 'Startups & Business', color: '#f97316' }
  },
  {
    keywords: ['stock', 'investing', 'trading', 'market', 'finance', 'economy', 'Federal Reserve', 'Fed', 'inflation', 'recession', 'portfolio', 'dividend', 'ETF', 'index fund', 'SP500', 'NASDAQ', 'Wall Street'],
    category: { slug: 'finance-investing', name: 'Finance & Investing', color: '#10b981' }
  },
  {
    keywords: ['news', 'breaking', 'update', 'announced', 'report', 'latest', 'today', 'just', 'release', 'launched', 'new'],
    category: { slug: 'news', name: 'News & Updates', color: '#3b82f6' }
  },
  {
    keywords: ['tutorial', 'how to', 'guide', 'learn', 'course', 'book', 'resource', 'documentation', 'example', 'template', 'cheatsheet', 'tips', 'tricks', 'best practice'],
    category: { slug: 'learning', name: 'Learning Resources', color: '#ec4899' }
  },
  {
    keywords: ['job', 'hiring', 'career', 'remote', 'salary', 'interview', 'resume', 'LinkedIn', 'opportunity', 'position', 'role', 'apply'],
    category: { slug: 'career', name: 'Career & Jobs', color: '#14b8a6' }
  },
  {
    keywords: ['meme', 'funny', 'lol', 'joke', 'humor', 'sarcasm', 'viral', 'trend', 'laugh'],
    category: { slug: 'funny-memes', name: 'Funny & Memes', color: '#eab308' }
  }
]

// URL patterns for instant categorization
const URL_RULES: { patterns: RegExp[]; category: { slug: string; name: string; color: string } }[] = [
  {
    patterns: [/github\.com/, /stackoverflow\.com/, /dev\.to/, /gitlab\.com/, /npmjs\.com/, /docs\.dev/],
    category: { slug: 'dev-tools', name: 'Dev Tools & Engineering', color: '#06b6d4' }
  },
  {
    patterns: [/openai\.com/, /platform\.moonshot/, /anthropic\.com/, /claude\.ai/, /gemini\.google/, /huggingface\.co/],
    category: { slug: 'ai-resources', name: 'AI & Machine Learning', color: '#8b5cf6' }
  },
  {
    patterns: [/youtube\.com/, /youtu\.be/, /tiktok\.com/, /vimeo\.com/],
    category: { slug: 'videos', name: 'Videos', color: '#ef4444' }
  },
  {
    patterns: [/medium\.com/, /substack\.com/, /blog/, /article/],
    category: { slug: 'reading', name: 'Articles & Reading', color: '#8b5cf6' }
  }
]

// Known AI/tech Twitter handles for instant categorization
const HANDLE_RULES: Record<string, string> = {
  'OpenAI': 'ai-resources',
  'sama': 'ai-resources',
  'ylecun': 'ai-resources',
  'karpathy': 'ai-resources',
  'AndrewYNg': 'ai-resources',
  'elonmusk': 'startups-business',
  'naval': 'startups-business',
  'paulg': 'startups-business',
  'levelsio': 'startups-business',
  'tferriss': 'learning',
  'github': 'dev-tools',
  'vercel': 'dev-tools'
}

export async function fastCategorizeByRules() {
  console.log('Starting fast rule-based categorization...')
  
  // Get uncategorized bookmarks (excluding videos which we already did)
  const bookmarks = await prisma.bookmark.findMany({
    where: {
      categories: {
        none: {}
      }
    },
    select: {
      id: true,
      text: true,
      authorHandle: true,
      entities: true
    }
  })
  
  console.log(`Found ${bookmarks.length} uncategorized bookmarks`)
  
  let categorized = 0
  let categorizedIds: string[] = []
  
  for (const bookmark of bookmarks) {
    const matches: Set<string> = new Set()
    const text = bookmark.text.toLowerCase()
    const handle = bookmark.authorHandle.toLowerCase()
    
    // Check keyword rules
    for (const rule of KEYWORD_RULES) {
      for (const keyword of rule.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matches.add(JSON.stringify(rule.category))
          break
        }
      }
    }
    
    // Check URL patterns in text
    for (const rule of URL_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          matches.add(JSON.stringify(rule.category))
          break
        }
      }
    }
    
    // Check handle rules
    for (const [knownHandle, categorySlug] of Object.entries(HANDLE_RULES)) {
      if (handle.includes(knownHandle.toLowerCase())) {
        // Find the category
        const cat = KEYWORD_RULES.find(r => r.category.slug === categorySlug)?.category
        if (cat) {
          matches.add(JSON.stringify(cat))
        }
      }
    }
    
    // Apply categories
    if (matches.size > 0) {
      for (const catJson of matches) {
        const cat = JSON.parse(catJson)
        
        // Create category if doesn't exist
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
        
        // Assign bookmark
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
            confidence: 0.85
          }
        })
      }
      
      // Mark as processed
      await prisma.bookmark.update({
        where: { id: bookmark.id },
        data: { enrichedAt: new Date() }
      })
      
      categorized++
      categorizedIds.push(bookmark.id)
      
      if (categorized % 50 === 0) {
        console.log(`Categorized ${categorized}/${bookmarks.length}...`)
      }
    }
  }
  
  console.log(`✓ Rule-based categorization complete: ${categorized} bookmarks`)
  
  return {
    total: bookmarks.length,
    categorized,
    remaining: bookmarks.length - categorized,
    categorizedIds
  }
}

// Get bookmarks that still need AI categorization
export async function getUncategorizedForAI() {
  return await prisma.bookmark.findMany({
    where: {
      categories: {
        none: {}
      }
    },
    select: {
      id: true,
      text: true,
      tweetId: true
    },
    take: 100 // Process in batches
  })
}
