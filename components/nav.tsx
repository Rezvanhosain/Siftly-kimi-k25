'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import ThemeToggle from './theme-toggle'
import {
  LayoutDashboard,
  Upload,
  Search,
  Tag,
  GitBranch,
  Settings,
  Sparkles,
  ChevronRight,
  Command,
  Bookmark,
  Copy,
  Check,
  Coffee,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ai-search', label: 'AI Search', icon: Sparkles },
  { href: '/bookmarks', label: 'Browse', icon: Search },
  { href: '/mindmap', label: 'Mindmap', icon: GitBranch },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const DONATION_ADDRESS = '0xcF10B967a9e422753812004Cd59990f62E360760'
const BUILDER_X = 'https://x.com/viperr'

function SupportFooter() {
  const [copied, setCopied] = useState(false)

  function copyAddress() {
    void navigator.clipboard.writeText(DONATION_ADDRESS).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mx-3 mt-auto mb-3 pt-3 border-t border-zinc-800/50">
      {/* Builder credit */}
      <a
        href={BUILDER_X}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all group mb-1"
      >
        <span className="text-[13px]">𝕏</span>
        <span className="text-[11px] font-medium">Built by @viperr</span>
      </a>

      {/* Donate card */}
      <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/30 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Coffee size={12} className="text-amber-400 shrink-0" />
          <span className="text-[11px] font-semibold text-zinc-300">Support Siftly</span>
        </div>
        <p className="text-[10px] text-zinc-600 mb-2 leading-relaxed">
          If Siftly saves you time, consider leaving a tip ☕
        </p>
        <button
          onClick={copyAddress}
          title="Copy ETH address"
          className="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-700/40 hover:border-amber-500/40 hover:bg-zinc-900 transition-all group"
        >
          <span className="text-[9.5px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors truncate">
            {DONATION_ADDRESS.slice(0, 10)}…{DONATION_ADDRESS.slice(-6)}
          </span>
          {copied
            ? <Check size={11} className="text-emerald-400 shrink-0" />
            : <Copy size={11} className="text-zinc-600 group-hover:text-amber-400 shrink-0 transition-colors" />
          }
        </button>
      </div>
    </div>
  )
}

interface CategoryItem {
  name: string
  slug: string
  color: string
  bookmarkCount: number
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

interface PipelineStatus {
  status: 'idle' | 'running' | 'stopping'
  stage: string | null
  done: number
  total: number
}

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  vision: 'Analyzing images',
  entities: 'Extracting entities',
  enrichment: 'Generating tags',
  categorize: 'Categorizing',
  parallel: 'Processing in parallel',
}

export default function Nav() {
  const pathname = usePathname()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [totalBookmarks, setTotalBookmarks] = useState<number | null>(null)
  const [showAllCats, setShowAllCats] = useState(false)
  const [collectionsOpen, setCollectionsOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('nav-collections-open') !== 'false'
  })
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null)
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 228
    return parseInt(localStorage.getItem('sidebar-width') || '228', 10)
  })
  const [isResizing, setIsResizing] = useState(false)

  function toggleCollections() {
    setCollectionsOpen((v) => {
      const next = !v
      localStorage.setItem('nav-collections-open', String(next))
      return next
    })
  }

  function openSearch() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
  }

  // Resize handlers
  function startResizing(e: React.MouseEvent) {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizing) return
      const newWidth = Math.max(180, Math.min(400, e.clientX))
      setSidebarWidth(newWidth)
    }

    function stopResizing() {
      if (isResizing) {
        setIsResizing(false)
        localStorage.setItem('sidebar-width', String(sidebarWidth))
      }
    }

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', stopResizing)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopResizing)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, sidebarWidth])

  useEffect(() => {
    function handleCleared() {
      setCategories([])
      setTotalBookmarks(0)
    }
    window.addEventListener('siftly:cleared', handleCleared)
    return () => window.removeEventListener('siftly:cleared', handleCleared)
  }, [])

  // Function to refresh categories and stats
  function refreshData() {
    // Fetch stats
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d: { totalBookmarks?: number }) => {
        if (d.totalBookmarks !== undefined) setTotalBookmarks(d.totalBookmarks)
      })
      .catch(() => {})

    // Fetch categories with counts
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d: { categories: CategoryItem[] }) => setCategories(d.categories ?? []))
      .catch(() => {})
  }

  useEffect(() => {
    // Initial load
    refreshData()

    // Poll pipeline status every 3s to show global indicator
    function pollPipeline() {
      fetch('/api/categorize')
        .then((r) => r.json())
        .then((d: PipelineStatus) => {
          setPipeline(d)
          // Refresh categories when pipeline completes
          if (d.status === 'idle' && pipeline?.status === 'running') {
            refreshData()
          }
        })
        .catch(() => {})
    }
    pollPipeline()
    const interval = setInterval(pollPipeline, 3000)
    
    // Listen for custom refresh event
    function handleRefresh() {
      refreshData()
    }
    window.addEventListener('siftly:refresh-categories', handleRefresh)
    
    // Refresh when pathname changes (user navigates)
    refreshData()
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('siftly:refresh-categories', handleRefresh)
    }
  }, [pathname])

  const visibleCats = showAllCats ? categories : categories.slice(0, 8)

  return (
    <>
      <aside 
        className="flex flex-col bg-zinc-900 border-r border-zinc-800/50 shrink-0 h-screen overflow-y-auto relative" 
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
      >

      {/* Brand */}
      <div className="flex items-center justify-center gap-3 px-4 py-3.5 border-b border-zinc-800/50">
        <img src="/logo.svg" alt="Siftly" className="w-9 h-9 shrink-0" />
        <span className="text-zinc-100 font-bold text-[17px] tracking-tight">
          Sift<span style={{ color: '#F5A623' }}>ly</span>
        </span>
        <div className="shrink-0 flex items-center">
          <ThemeToggle />
        </div>
      </div>

      {/* Pipeline running indicator — hidden on /categorize and /import */}
      {pipeline && (pipeline.status === 'running' || pipeline.status === 'stopping') &&
       pathname !== '/categorize' && pathname !== '/import' && (
        <Link
          href="/categorize"
          className="mx-3 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-colors"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          <span className="text-[11px] font-medium text-indigo-300 truncate">
            {pipeline.stage ? (PIPELINE_STAGE_LABELS[pipeline.stage] ?? pipeline.stage) : 'AI pipeline'}
            {pipeline.stage === 'categorize' && pipeline.total > 0
              ? ` ${pipeline.done}/${pipeline.total}`
              : '…'}
          </span>
        </Link>
      )}

      {/* Ctrl+K search trigger */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={openSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600/60 transition-all text-xs"
        >
          <Search size={12} className="shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="flex items-center gap-0.5 text-[10px] text-zinc-600 font-mono">
            <Command size={9} />K
          </kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-px px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                active
                  ? 'bg-blue-500/12 text-blue-400'
                  : 'text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-200'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-zinc-800/50" />

      {/* Categories section */}
      {categories.length > 0 && (
        <div className="px-2 py-3 flex-1 min-h-0 flex flex-col">
          <button
            onClick={toggleCollections}
            className="flex items-center justify-between px-2 mb-2 w-full group"
          >
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
              Collections
            </p>
            <div className="flex items-center gap-1.5">
              <Link
                href="/categories"
                onClick={(e) => e.stopPropagation()}
                className="text-zinc-700 hover:text-zinc-400 transition-colors p-0.5 rounded"
                title="Manage categories"
              >
                <Tag size={11} />
              </Link>
              <ChevronRight
                size={10}
                className={`text-zinc-600 transition-transform duration-200 ${collectionsOpen ? 'rotate-90' : ''}`}
              />
            </div>
          </button>

          {collectionsOpen && (
            <>
              <div className="flex flex-col gap-px overflow-y-auto flex-1 min-h-0 max-h-64">
                {visibleCats.map((cat) => {
                  const catActive = pathname === `/categories/${cat.slug}`
                  return (
                    <Link
                      key={cat.slug}
                      href={`/categories/${cat.slug}`}
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-all group ${
                        catActive
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                      }`}
                    >
                      <Bookmark
                        size={12}
                        className="flex-shrink-0 transition-colors"
                        style={{ color: cat.color, fill: cat.color }}
                      />
                      <span className="truncate flex-1">{cat.name}</span>
                      <span className="text-[11px] text-zinc-600 group-hover:text-zinc-500 tabular-nums font-normal">
                        {cat.bookmarkCount}
                      </span>
                    </Link>
                  )
                })}
              </div>

              {categories.length > 8 && (
                <button
                  onClick={() => setShowAllCats((v) => !v)}
                  className="flex items-center gap-1.5 px-2 mt-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <ChevronRight
                    size={10}
                    className={`transition-transform ${showAllCats ? 'rotate-90' : ''}`}
                  />
                  {showAllCats ? 'Show less' : `${categories.length - 8} more`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <SupportFooter />
      
      {/* Resize handle - make it visible */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500/70 transition-colors z-50 group"
        onMouseDown={startResizing}
        style={{ 
          background: isResizing ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.1)',
        }}
      >
        {/* Visual indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-zinc-600 group-hover:bg-indigo-400 transition-colors" />
      </div>
    </aside>
    </>
  )
}
