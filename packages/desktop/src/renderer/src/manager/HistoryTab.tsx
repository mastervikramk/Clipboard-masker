import React, { useState } from 'react'
import { Search, Trash2, Pin, Eye, EyeOff, Copy, Check, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '../components/Button'
import { MaskedText, formatEntityType } from '../components/MaskedText'
import type { ClipboardItem, PIIEntity } from '../../../shared/types'

interface HistoryTabProps {
  items: ClipboardItem[]
  onRefresh: () => void
  api: any
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ items, onRefresh, api }) => {
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<ClipboardItem | null>(items[0] || null)
  const [revealed, setRevealed] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.maskedText.toLowerCase().includes(q) ||
      item.originalText.toLowerCase().includes(q) ||
      item.detectedEntities.some((e: PIIEntity) => e.type.toLowerCase().includes(q))
    )
  })

  const handleCopy = async (id: string, useOriginal: boolean) => {
    if (!api) return
    await api.copyItem(id, useOriginal)
    setCopyFeedback(useOriginal ? 'Copied Raw!' : 'Copied Masked!')
    setTimeout(() => setCopyFeedback(null), 1500)
  }

  const handleDelete = async (id: string) => {
    if (!api) return
    await api.deleteItem(id)
    onRefresh()
    if (selectedItem?.id === id) {
      setSelectedItem(null)
    }
  }

  const handleTogglePin = async (id: string) => {
    if (!api) return
    await api.togglePin(id)
    onRefresh()
  }

  const handleClearAll = async () => {
    if (!api) return
    if (window.confirm('Are you sure you want to clear unpinned clipboard history?')) {
      await api.clearHistory()
      onRefresh()
      setSelectedItem(null)
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left List Pane */}
      <div className="w-80 border-r border-[var(--border-subtle)] flex flex-col bg-[var(--bg-sidebar)]">
        {/* Search header */}
        <div className="p-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#0A84FF]"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            title="Clear unpinned clips"
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Clear
          </Button>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">No clips found</div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item)
                    setRevealed(false)
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[var(--border-hover)] border-[var(--border-hover)] shadow-sm'
                      : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                    <span className="flex items-center gap-1 font-medium">
                      {item.hasPII ? (
                        <span className="text-[var(--accent-red)] flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          Masked · {item.detectedEntities.length}
                        </span>
                      ) : (
                        <span className="text-[var(--accent-green)] flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Clean
                        </span>
                      )}
                    </span>
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <MaskedText
                    text={item.maskedText}
                    className="text-[13px] leading-snug text-[var(--text-primary)] line-clamp-2 break-words"
                  />
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Detail Pane */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[var(--bg-app)]">
        {selectedItem ? (
          <div className="max-w-2xl flex flex-col gap-5">
            {/* Detail Top bar */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Clip Inspector</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Captured {new Date(selectedItem.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTogglePin(selectedItem.id)}
                  icon={<Pin className={`w-3.5 h-3.5 ${selectedItem.isPinned ? 'text-amber-400 fill-amber-400' : ''}`} />}
                >
                  {selectedItem.isPinned ? 'Pinned' : 'Pin'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(selectedItem.id)}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Sanitized Version (Default Safe View) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Masked text
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCopy(selectedItem.id, false)}
                  icon={copyFeedback === 'Copied Masked!' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                >
                  {copyFeedback === 'Copied Masked!' ? 'Copied!' : 'Copy Masked'}
                </Button>
              </div>
              <MaskedText
                text={selectedItem.maskedText}
                className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[13px] leading-relaxed text-[var(--text-primary)] select-text whitespace-pre-wrap break-words"
              />
            </div>

            {/* Original Raw Version with Reveal Protection */}
            {selectedItem.hasPII && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-500">
                      Original text
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevealed(!revealed)}
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {revealed ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  {revealed && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopy(selectedItem.id, true)}
                      icon={copyFeedback === 'Copied Raw!' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    >
                      {copyFeedback === 'Copied Raw!' ? 'Copied Raw!' : 'Copy Raw Text'}
                    </Button>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-amber-500/20 text-[13px] leading-relaxed text-[var(--text-primary)] select-text whitespace-pre-wrap break-words">
                  {revealed ? (
                    selectedItem.originalText
                  ) : (
                    <span className="text-[var(--text-muted)] select-none">
                      Hidden. Click Reveal to show the original text.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Detected Entities List */}
            {selectedItem.detectedEntities.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Detected
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedItem.detectedEntities.map((ent: PIIEntity, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                    >
                      <span className="text-[var(--text-primary)] font-medium">
                        {formatEntityType(ent.type)}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {(ent.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)]">
            Select a clip on the left to inspect details
          </div>
        )}
      </div>
    </div>
  )
}
