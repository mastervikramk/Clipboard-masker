import React, { useState, useEffect } from 'react'
import { Settings, X, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { ClipboardCard } from './ClipboardCard'
import { StatusPill } from '../components/StatusPill'
import { AppLogo } from '../components/AppLogo'
import type { ClipboardItem, EngineStatus, PIIEntity } from '../../../shared/types'

export const HUDView: React.FC = () => {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [status, setStatus] = useState<EngineStatus | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'pii' | 'pinned'>('all')

  const api = (window as any).clipboardMasker

  useEffect(() => {
    if (!api) return

    // Fetch initial state
    api.getHistory().then(setItems)
    api.getEngineStatus().then(setStatus)

    // Listen to real-time events
    const unsubClip = api.onClipboardChanged((newItem: ClipboardItem) => {
      setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)])
    })

    const unsubStatus = api.onStatusChanged((newStatus: EngineStatus) => {
      setStatus(newStatus)
    })

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        api.closeHUD()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unsubClip()
      unsubStatus()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [api])

  const handleCopyMasked = async (id: string) => {
    if (api) await api.copyItem(id, false)
  }

  const handleCopyOriginal = async (id: string) => {
    if (api) await api.copyItem(id, true)
  }

  const handleTogglePin = async (id: string) => {
    if (!api) return
    await api.togglePin(id)
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isPinned: !item.isPinned } : item))
    )
  }

  const handleDelete = async (id: string) => {
    if (!api) return
    await api.deleteItem(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeFilter === 'pii' && !item.hasPII) return false
    if (activeFilter === 'pinned' && !item.isPinned) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        item.maskedText.toLowerCase().includes(q) ||
        item.originalText.toLowerCase().includes(q) ||
        item.detectedEntities.some((e: PIIEntity) => e.type.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="w-full h-screen p-3 flex flex-col overflow-hidden bg-transparent">
      {/* Floating Glass Shell */}
      <div className="flex-1 flex flex-col rounded-2xl glass-panel shadow-apple-popover overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        
        {/* Header Bar */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-subtle)] drag-region bg-[var(--bg-header)]">
          <div className="flex items-center gap-2.5 no-drag-region">
            <AppLogo className="w-6 h-6 rounded-lg shadow-sm" />
            <div>
              <h1 className="text-[13px] font-semibold text-[var(--text-primary)]">Clipboard Masker</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 no-drag-region">
            <StatusPill status={status} onClick={() => api?.openManager()} />
            <button
              type="button"
              title="Open Dashboard & Settings"
              onClick={() => api?.openManager()}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Close (Esc)"
              onClick={() => api?.closeHUD()}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-3.5 pt-3 pb-2 flex flex-col gap-2 border-b border-[var(--border-subtle)]">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search clipboard history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#0A84FF]/60 focus:ring-1 focus:ring-[#0A84FF]/40 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-[var(--border-hover)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('pii')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeFilter === 'pii'
                  ? 'bg-[var(--border-hover)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              Masked ({items.filter((i) => i.hasPII).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('pinned')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeFilter === 'pinned'
                  ? 'bg-[var(--border-hover)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              Pinned ({items.filter((i) => i.isPinned).length})
            </button>
          </div>
        </div>

        {/* Scrollable Clips List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
          {filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)]">
              <div className="w-10 h-10 rounded-full bg-[var(--border-subtle)] flex items-center justify-center mb-3 text-[var(--text-muted)]">
                <Sparkles className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">No clips found</p>
              <p className="text-xs text-[var(--text-muted)] max-w-[240px] mt-1">
                Copy text with Ctrl+C anywhere. PII like emails, phones, and cards are automatically sanitized.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <ClipboardCard
                key={item.id}
                item={item}
                onCopyMasked={handleCopyMasked}
                onCopyOriginal={handleCopyOriginal}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Footer info pill */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-header)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--border-subtle)] font-sans text-[11px] text-[var(--text-secondary)]">Alt + V</kbd>
            to toggle
          </span>
          <span>Click a clip to copy masked text</span>
        </div>

      </div>
    </div>
  )
}
