import React from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description
}) => {
  return (
    <label className="flex items-center justify-between cursor-pointer group py-1.5 select-none">
      {(label || description) && (
        <div className="flex flex-col pr-4">
          {label && <span className="text-xs font-medium text-white group-hover:text-neutral-200">{label}</span>}
          {description && <span className="text-[11px] text-neutral-400 mt-0.5">{description}</span>}
        </div>
      )}
      <div className="relative inline-flex items-center shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0A84FF] border border-white/10" />
      </div>
    </label>
  )
}
