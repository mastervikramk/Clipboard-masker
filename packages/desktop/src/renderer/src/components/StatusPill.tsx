import React from 'react'
import type { EngineStatus } from '../../../shared/types'

interface StatusPillProps {
  status: EngineStatus | null
  onClick?: () => void
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, onClick }) => {
  if (!status) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-neutral-400">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
        Initializing...
      </div>
    )
  }

  let dotColor = 'bg-emerald-400'
  let textColor = 'text-emerald-400'
  let label = 'GLiNER2 AI Active'

  if (status.isProtectionPaused) {
    dotColor = 'bg-amber-400'
    textColor = 'text-amber-400'
    label = 'Protection Paused'
  } else if (status.dockerStatus !== 'connected') {
    dotColor = 'bg-amber-400'
    textColor = 'text-amber-300'
    label = 'Fallback Engine Active'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-colors focus:outline-none cursor-pointer"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-[0_0_8px_currentColor]`} />
      <span className={textColor}>{label}</span>
    </button>
  )
}
