import React, { useState } from 'react'
import { Check, Copy, Eye, EyeOff, Pin, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { MaskedText, formatEntityType } from '../components/MaskedText'
import type { ClipboardItem, PIIEntity } from '../../../shared/types'

interface ClipboardCardProps {
  item: ClipboardItem
  onCopyMasked: (id: string) => void
  onCopyOriginal: (id: string) => void
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
}

export const ClipboardCard: React.FC<ClipboardCardProps> = ({
  item,
  onCopyMasked,
  onCopyOriginal,
  onTogglePin,
  onDelete
}) => {
  const [showOriginal, setShowOriginal] = useState(false)
  const [copiedType, setCopiedType] = useState<'masked' | 'original' | null>(null)

  const handleCopy = (useOriginal: boolean) => {
    if (useOriginal) {
      onCopyOriginal(item.id)
      setCopiedType('original')
    } else {
      onCopyMasked(item.id)
      setCopiedType('masked')
    }
    setTimeout(() => setCopiedType(null), 1500)
  }

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  // Unique entity types, so "Email address, Email address" doesn't show twice
  const entityTypes = Array.from(new Set(item.detectedEntities.map((e: PIIEntity) => e.type)))

  const bodyClass =
    'text-[13px] leading-relaxed text-[var(--text-primary)] line-clamp-3 select-text cursor-pointer whitespace-pre-wrap break-words bg-[var(--bg-input)] px-2.5 py-2 rounded-lg border border-[var(--border-subtle)]'

  return (
    <div className="group relative rounded-xl p-3 glass-panel-interactive transition-all">
      {/* Top Header: PII Tags, Time, Pin */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
          {item.hasPII ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-[var(--accent-red)]">
              <ShieldAlert className="w-3 h-3" />
              Masked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-[var(--accent-green)]">
              <ShieldCheck className="w-3 h-3" />
              Clean
            </span>
          )}

          {entityTypes.slice(0, 2).map((type) => (
            <span
              key={type}
              className="px-1.5 py-0.5 rounded-md text-[11px] text-[var(--text-secondary)] bg-[var(--border-subtle)]"
            >
              {formatEntityType(type)}
            </span>
          ))}
          {entityTypes.length > 2 && (
            <span className="text-[11px] text-[var(--text-muted)]">+{entityTypes.length - 2}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-[var(--text-muted)]">{formatTime(item.timestamp)}</span>
          <button
            type="button"
            title={item.isPinned ? 'Unpin' : 'Pin to top'}
            onClick={() => onTogglePin(item.id)}
            className={`p-1 rounded hover:bg-[var(--border-subtle)] transition-colors ${
              item.isPinned ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Delete snippet"
            onClick={() => onDelete(item.id)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--border-subtle)] transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Snippet Content Area */}
      {showOriginal ? (
        <div className={bodyClass} onClick={() => handleCopy(false)} title="Click to copy masked text">
          {item.originalText}
        </div>
      ) : (
        <MaskedText
          text={item.maskedText}
          className={bodyClass}
          onClick={() => handleCopy(false)}
          title="Click to copy masked text"
        />
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[var(--border-subtle)]">
        {item.hasPII ? (
          <button
            type="button"
            onClick={() => setShowOriginal(!showOriginal)}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none"
          >
            {showOriginal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showOriginal ? 'Hide raw' : 'Show raw'}
          </button>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">Nothing to mask</span>
        )}

        <div className="flex items-center gap-1.5">
          {item.hasPII && (
            <button
              type="button"
              onClick={() => handleCopy(true)}
              title="Copy original text"
              className="px-2 py-1 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--border-subtle)] hover:bg-[var(--border-hover)] transition-colors"
            >
              {copiedType === 'original' ? 'Copied' : 'Copy raw'}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleCopy(false)}
            title="Copy masked text"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0A84FF] hover:bg-[#0071E3] text-white shadow transition-all active:scale-95"
          >
            {copiedType === 'masked' ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy masked
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
