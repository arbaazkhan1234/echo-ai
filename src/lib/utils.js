import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn — merge Tailwind class names safely.
 * Combines clsx (conditional classes) and tailwind-merge (deduplication).
 * Use everywhere instead of template literals.
 *
 * Example:
 *   cn('px-4 py-2', isActive && 'bg-gold', className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
