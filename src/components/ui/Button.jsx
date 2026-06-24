/**
 * Warm-styled button with gentle hover animation.
 * variant: 'primary' | 'ghost'
 */
export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  loading,
  className = '',
}) {
  const base = `
    relative inline-flex items-center justify-center
    w-full px-6 py-3.5 rounded-xl
    font-sans font-medium text-sm
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    select-none
  `

  const variants = {
    primary: `
      bg-gradient-to-r from-terra to-amber-warm text-white
      hover:from-terra-deep hover:to-terra
      hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/25
      active:translate-y-0 active:shadow-md
      focus:ring-terra/40
    `,
    ghost: `
      bg-transparent border border-terra/40 text-terra
      hover:bg-terra/5 hover:border-terra
      hover:-translate-y-0.5
      active:translate-y-0
      focus:ring-terra/30
    `,
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {loading}
        </span>
      ) : children}
    </button>
  )
}
