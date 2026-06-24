import { useEffect, useRef } from 'react'

/**
 * HeroParticles — custom canvas particle system.
 * Warm gold + white particles that drift slowly and connect with faint
 * lines when close. Mouse hover gently repulses nearby particles.
 * No dependencies — pure canvas + requestAnimationFrame.
 */

const COLORS = [
  [201, 169, 110],   // gold
  [223, 192, 144],   // gold light
  [245, 240, 232],   // fog 100
  [168, 133,  78],   // gold dark
  [232, 223, 208],   // fog 200
]

const PARTICLE_COUNT     = 110
const LINK_DISTANCE      = 130
const LINK_OPACITY_MAX   = 0.14
const REPULSE_RADIUS     = 100
const REPULSE_STRENGTH   = 3.5

function mkParticle(w, h, scatter = false) {
  const c = COLORS[Math.floor(Math.random() * COLORS.length)]
  return {
    x:   Math.random() * w,
    y:   scatter ? Math.random() * h : h + Math.random() * 40,
    vx:  (Math.random() - 0.5) * 0.38,
    vy:  (Math.random() - 0.5) * 0.38,
    r:   Math.random() * 1.8 + 0.3,
    op:  scatter ? Math.random() * 0.4 + 0.05 : 0,
    targetOp: Math.random() * 0.4 + 0.08,
    color: c,
  }
}

export default function HeroParticles() {
  const canvasRef = useRef(null)
  const mouse     = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let rafId
    let particles = []

    function resize() {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        mkParticle(canvas.width, canvas.height, true)
      )
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function onMouseLeave() {
      mouse.current = { x: -9999, y: -9999 }
    }
    canvas.addEventListener('mousemove', onMouseMove, { passive: true })
    canvas.addEventListener('mouseleave', onMouseLeave)

    function draw() {
      const { width: W, height: H } = canvas
      ctx.clearRect(0, 0, W, H)

      // ── Update particles ──────────────────────────────────
      for (const p of particles) {
        // Repulse from mouse
        const dx = p.x - mouse.current.x
        const dy = p.y - mouse.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < REPULSE_RADIUS && dist > 0) {
          const force = (REPULSE_RADIUS - dist) / REPULSE_RADIUS
          p.x += (dx / dist) * force * REPULSE_STRENGTH * 0.06
          p.y += (dy / dist) * force * REPULSE_STRENGTH * 0.06
        }

        p.x += p.vx
        p.y += p.vy

        // Bounce walls
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
        p.x = Math.max(0, Math.min(W, p.x))
        p.y = Math.max(0, Math.min(H, p.y))

        // Fade lifecycle
        if (p.op < p.targetOp) p.op = Math.min(p.op + 0.003, p.targetOp)
      }

      // ── Draw links ───────────────────────────────────────
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < LINK_DISTANCE) {
            const alpha = LINK_OPACITY_MAX * (1 - dist / LINK_DISTANCE) * Math.min(a.op, b.op) / 0.45
            ctx.save()
            ctx.globalAlpha = Math.max(0, alpha)
            ctx.strokeStyle = `rgba(201,169,110,1)`
            ctx.lineWidth   = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      // ── Draw particles ───────────────────────────────────
      for (const p of particles) {
        const [r, g, b] = p.color
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.op)
        ctx.shadowBlur  = p.r * 7
        ctx.shadowColor = `rgba(${r},${g},${b},0.5)`
        ctx.fillStyle   = `rgb(${r},${g},${b})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ display: 'block', zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
