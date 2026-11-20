import React from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (val: T) => void
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md'
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm'

  return (
    <div className="inline-flex p-1 bg-white/[0.06] border border-white/[0.08] rounded-lg">
      {options.map((opt) => {
        const isSelected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-center gap-1.5 rounded-md font-medium transition-all ${
              isSm ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
            } ${
              isSelected
                ? 'bg-white/20 text-white shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
