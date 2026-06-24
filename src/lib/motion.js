/**
 * Shared Framer Motion variants for Echo AI
 * Follows design system: 400-600ms, cubic-bezier(0.25, 0.1, 0.25, 1)
 * "Liquid Glass" style — fluid, unhurried, premium
 */

// ── Core easing ──────────────────────────────────────────────────────────
export const EASE     = [0.25, 0.1, 0.25, 1]       // smooth cubic
export const EASE_OUT = [0, 0, 0.2, 1]              // quick start, slow settle
export const SPRING   = { type: 'spring', stiffness: 260, damping: 28 }
export const SPRING_SOFT = { type: 'spring', stiffness: 180, damping: 24 }

// ── Fade variants ────────────────────────────────────────────────────────
export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.55, ease: EASE } },
}

export const fadeInUp = {
  hidden:  { opacity: 0, y: 32, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE } },
}

export const fadeInLeft = {
  hidden:  { opacity: 0, x: -44 },
  visible: { opacity: 1, x: 0,   transition: { duration: 0.55, ease: EASE } },
}

export const fadeInRight = {
  hidden:  { opacity: 0, x: 44 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.55, ease: EASE } },
}

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.92, filter: 'blur(4px)' },
  visible: { opacity: 1, scale: 1,    filter: 'blur(0px)', transition: { duration: 0.5, ease: EASE } },
}

// ── Stagger container ────────────────────────────────────────────────────
export const stagger = (delay = 0.1, childDelay = 0.05) => ({
  hidden:  {},
  visible: { transition: { staggerChildren: delay, delayChildren: childDelay } },
})

// ── Card item for staggered grids ────────────────────────────────────────
export const cardItem = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.5, ease: EASE } },
}

// ── Hover interactions ────────────────────────────────────────────────────
export const hoverLift   = { y: -6, transition: { duration: 0.25, ease: EASE_OUT } }
export const hoverScale  = { scale: 1.03, transition: { duration: 0.25, ease: EASE_OUT } }
export const tapScale    = { scale: 0.97 }

// ── Message pop in (chat) ────────────────────────────────────────────────
export const messageIn = {
  initial:  { opacity: 0, y: 16, scale: 0.96 },
  animate:  { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.38, ease: [0.34, 1.56, 0.64, 1] } },
  exit:     { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.22, ease: EASE } },
}

// ── Hero word reveal ─────────────────────────────────────────────────────
export const wordReveal = {
  hidden:  { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.5, ease: EASE } },
}

// ── Page / section reveal utility ────────────────────────────────────────
export function viewVariant(from = 'bottom') {
  const map = {
    bottom: fadeInUp,
    left:   fadeInLeft,
    right:  fadeInRight,
    scale:  scaleIn,
    none:   fadeIn,
  }
  return map[from] ?? fadeInUp
}
