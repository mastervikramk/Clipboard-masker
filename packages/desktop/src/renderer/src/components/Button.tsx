import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none select-none active:scale-[0.98]'
  
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs gap-1.5' : 'px-3 py-1.5 text-xs gap-2'

  let variantClasses = ''
  switch (variant) {
    case 'primary':
      variantClasses = 'bg-[#0A84FF] hover:bg-[#0071E3] text-white shadow-sm font-semibold'
      break
    case 'secondary':
      variantClasses = 'bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200 hover:text-white border border-white/[0.08]'
      break
    case 'ghost':
      variantClasses = 'bg-transparent hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-200'
      break
    case 'danger':
      variantClasses = 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20'
      break
  }

  const disabledClasses = disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
