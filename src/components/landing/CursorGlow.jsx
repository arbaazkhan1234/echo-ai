import { useEffect, useRef } from 'react'

/**
 * CursorGlow — soft warm light that follows the cursor on desktop.
 * Uses direct DOM manipulation via ref for max performance (no React re-renders).
 */
export default function CursorGlow() {
  const glowRef = useRef(null)

  useEffect(() => {
    // Skip on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return

    const target = { x: -300, y: -300 }
    const pos    = { x: -300, y: -300 }
    let rafId

    function onMouseMove(e) {
      target.x = e.clientX
      target.y = e.clientY
    }

    function lerp(a, b, t) { return a + (b - a) * t }

    function animate() {
      pos.x = lerp(pos.x, target.x, 0.07)
      pos.y = lerp(pos.y, target.y, 0.07)

      if (glowRef.current) {
        glowRef.current.style.left = (pos.x - 180) + 'px'
        glowRef.current.style.top  = (pos.y - 180) + 'px'
      }

      rafId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    rafId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="pointer-events-none fixed z-[998] rounded-full"
      style={{
        width:      360,
        height:     360,
        background: 'radial-gradient(circle, rgba(168,130,58,0.055) 0%, rgba(168,130,58,0.018) 40%, transparent 70%)',
        willChange: 'left, top',
      }}
    />
  )
}
