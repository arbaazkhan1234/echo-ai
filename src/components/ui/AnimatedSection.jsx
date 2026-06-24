import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { viewVariant } from '../../lib/motion'

/**
 * AnimatedSection — wraps any content and animates it in on scroll.
 * Powered by Framer Motion (400-600ms, liquid ease curves per design system).
 *
 * Props:
 *   from      'bottom' | 'left' | 'right' | 'scale' | 'none'
 *   delay     ms — stagger offset, default 0
 *   duration  ms — override default 550ms
 *   className extra classes
 *   threshold amount visible before trigger (0-1), default 0.12
 */
export default function AnimatedSection({
  children,
  from      = 'bottom',
  delay     = 0,
  duration  = 550,
  className = '',
  threshold = 0.12,
}) {
  const ref    = useRef(null)
  const inView = useInView(ref, {
    once:   true,
    margin: '0px 0px -60px 0px',
    amount: threshold,
  })

  const base    = viewVariant(from)
  const variant = {
    hidden:  base.hidden,
    visible: {
      ...base.visible,
      transition: {
        ...base.visible?.transition,
        duration: duration / 1000,
        delay:    delay / 1000,
      },
    },
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variant}
    >
      {children}
    </motion.div>
  )
}
