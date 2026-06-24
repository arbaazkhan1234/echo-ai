import { useEffect, useRef, useState } from 'react'

/**
 * useInView — fires once when an element enters the viewport.
 * Returns [ref, inView]. Once inView becomes true it never goes back to false.
 *
 * @param {object} options  IntersectionObserver options
 * @param {number} options.threshold  0–1, defaults to 0.12
 * @param {string} options.rootMargin  defaults to '0px 0px -40px 0px' (trigger before fully in view)
 */
export function useInView(options = {}) {
  const ref     = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el) // fire once only
        }
      },
      {
        threshold:   options.threshold  ?? 0.12,
        rootMargin:  options.rootMargin ?? '0px 0px -40px 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [options.threshold, options.rootMargin])

  return [ref, inView]
}
