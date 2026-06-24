import { useEffect, useRef } from 'react'

/* ── Custom cursor: 12px green dot, lerp 0.08, scales to 40px on hover ── */
export default function CustomCursor() {
  const dotRef  = useRef(null)
  const posRef  = useRef({ x: -100, y: -100 })
  const lerpRef = useRef({ x: -100, y: -100 })
  const rafRef  = useRef(null)
  const isHover = useRef(false)

  useEffect(() => {
    /* Hide on touch/mobile */
    if (window.matchMedia('(hover: none)').matches) return
    if (window.innerWidth < 768) return

    const dot = dotRef.current

    const onMove = (e) => {
      posRef.current.x = e.clientX
      posRef.current.y = e.clientY
    }

    const onEnter = () => { isHover.current = true }
    const onLeave = () => { isHover.current = false }

    /* Attach hover listeners to all interactive elements */
    const bindHover = () => {
      document.querySelectorAll('a, button, [role="button"], input, textarea, select, label[for]')
        .forEach(el => {
          el.addEventListener('mouseenter', onEnter)
          el.addEventListener('mouseleave', onLeave)
        })
    }
    bindHover()

    /* RAF loop — lerp toward mouse */
    const animate = () => {
      lerpRef.current.x += (posRef.current.x - lerpRef.current.x) * 0.08
      lerpRef.current.y += (posRef.current.y - lerpRef.current.y) * 0.08

      const size   = isHover.current ? 40 : 12
      const offset = size / 2

      dot.style.transform = `translate(${lerpRef.current.x - offset}px, ${lerpRef.current.y - offset}px) scale(1)`
      dot.style.width     = `${size}px`
      dot.style.height    = `${size}px`
      dot.style.opacity   = isHover.current ? '0.6' : '1'

      rafRef.current = requestAnimationFrame(animate)
    }
    animate()

    window.addEventListener('mousemove', onMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
      document.querySelectorAll('a, button, [role="button"], input, textarea, select, label[for]')
        .forEach(el => {
          el.removeEventListener('mouseenter', onEnter)
          el.removeEventListener('mouseleave', onLeave)
        })
    }
  }, [])

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      style={{
        position:       'fixed',
        top:            0,
        left:           0,
        width:          12,
        height:         12,
        borderRadius:   '50%',
        background:     '#C4975A',
        pointerEvents:  'none',
        zIndex:         99999,
        mixBlendMode:   'difference',
        transition:     'width 300ms cubic-bezier(0.25,0.46,0.45,0.94), height 300ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 200ms ease',
        willChange:     'transform',
      }}
    />
  )
}
