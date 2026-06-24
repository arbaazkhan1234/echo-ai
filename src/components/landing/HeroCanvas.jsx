import { useEffect, useRef } from 'react'

/**
 * HeroCanvas — warm golden dust particle system.
 * Particles float upward slowly, wobble gently, glow softly.
 * Purely canvas-based, no dependencies.
 */

// Warm palette: [r, g, b]
const COLORS = [
  [212, 149, 106],   // amber-warm
  [232, 180, 138],   // amber-light
  [236, 219, 176],   // cream-300
  [201, 133, 110],   // terra-light
  [212, 165, 160],   // rose-dust
  [232, 200, 160],   // warm gold
]

const PARTICLE_COUNT = 90

function makeParticle(w, h, scatter = false) {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  return {
    x:            Math.random() * w,
    y:            scatter ? Math.random() * h : h + Math.random() * 80,
    size:         Math.random() * 2.2 + 0.4,
    vy:           -(Math.random() * 0.35 + 0.08),
    vx:           (Math.random() - 0.5) * 0.08,
    opacity:      scatter ? Math.random() * 0.35 : 0,
    maxOpacity:   Math.random() * 0.45 + 0.08,
    color,
    wobbleOffset: Math.random() * Math.PI * 2,
    wobbleSpeed:  Math.random() * 0.012 + 0.004,
  }
}

function resetParticle(p, w, h) {
  Object.assign(p, makeParticle(w, h, false))
}

export default function HeroCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let rafId
    let particles = []

    function resize() {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      // Rebuild particles on resize so they fill new dimensions
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        makeParticle(canvas.width, canvas.height, true)
      )
    }

    // Draw a single frame
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        // Move
        p.wobbleOffset += p.wobbleSpeed
        p.x += p.vx + Math.sin(p.wobbleOffset) * 0.18
        p.y += p.vy

        // Fade lifecycle
        const topBoundary = canvas.height * 0.12
        if (p.y < topBoundary) {
          p.opacity -= 0.004
        } else if (p.opacity < p.maxOpacity) {
          p.opacity += 0.003
        }

        // Respawn when faded near top
        if (p.opacity <= 0 && p.y < canvas.height * 0.4) {
          resetParticle(p, canvas.width, canvas.height)
          continue
        }

        // Draw with soft glow
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        const [r, g, b] = p.color
        ctx.shadowBlur  = p.size * 8
        ctx.shadowColor = `rgba(${r},${g},${b},0.6)`
        ctx.fillStyle   = `rgb(${r},${g},${b})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      rafId = requestAnimationFrame(draw)
    }

    // Observe element resize
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    draw()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
      aria-hidden="true"
    />
  )
}
