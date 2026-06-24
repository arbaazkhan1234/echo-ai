import { useEffect, useRef, useState } from 'react'

const CARDS = [
  {
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=90&auto=format&fit=crop&crop=face',
    quote: "I sat with my father for two hours and talked about things we'd never discussed. Echo turned that into something I'll treasure forever. He passed away three months later.",
    name:  'SARAH M.',
    role:  'DAUGHTER, PORTLAND OR',
  },
  {
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=90&auto=format&fit=crop&crop=face',
    quote: "My grandchildren live in another country. I recorded my stories. The war, the farm, the years before I immigrated. Now they know who they came from. That's everything to me.",
    name:  'JAMES K.',
    role:  'GRANDFATHER, 74, CHICAGO IL',
  },
  {
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=90&auto=format&fit=crop&crop=face',
    quote: "My mother couldn't write but she had so much to say. We spent four Sundays just talking. Echo preserved every word. My kids will grow up knowing their grandmother's voice.",
    name:  'RACHEL T.',
    role:  'DAUGHTER & MOTHER, AUSTIN TX',
  },
  {
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=90&auto=format&fit=crop&crop=face',
    quote: "I never thought I had interesting stories to tell. After three weeks with Echo, I had 40 memories recorded. My daughter cried reading through them. I finally felt understood.",
    name:  'MICHAEL B.',
    role:  'FATHER OF THREE, SEATTLE WA',
  },
]

/* ── Canvas halftone renderer ── */
function HalftonePortrait({ photo }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      const cw  = canvas.offsetWidth
      const ch  = canvas.offsetHeight
      canvas.width  = cw * dpr
      canvas.height = ch * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      /* Peach background */
      ctx.fillStyle = '#F5C09A'
      ctx.fillRect(0, 0, cw, ch)

      /* Draw source image into temp canvas to sample pixels */
      const tmp   = document.createElement('canvas')
      tmp.width   = cw
      tmp.height  = ch
      const tctx  = tmp.getContext('2d')

      /* Cover-fit the image */
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const ir = iw / ih
      const cr = cw / ch
      let sw, sh, sx, sy
      if (ir > cr) { sh = ch; sw = sh * ir; sx = (cw - sw) / 2; sy = 0 }
      else         { sw = cw; sh = sw / ir; sx = 0; sy = (ch - sh) / 2 }
      tctx.drawImage(img, sx, sy, sw, sh)

      const pix     = tctx.getImageData(0, 0, cw, ch).data
      const spacing = 5          /* dot grid spacing in px */
      const maxR    = spacing * 0.54

      for (let y = spacing / 2; y < ch; y += spacing) {
        for (let x = spacing / 2; x < cw; x += spacing) {
          const px  = Math.min(Math.floor(x), cw - 1)
          const py  = Math.min(Math.floor(y), ch - 1)
          const i   = (py * cw + px) * 4
          /* Luminance */
          const lum = (0.299 * pix[i] + 0.587 * pix[i + 1] + 0.114 * pix[i + 2]) / 255
          const r   = maxR * (1 - lum)   /* dark = big dot, light = tiny / invisible */

          if (r > 0.4) {
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(35, 12, 2, 0.88)'
            ctx.fill()
          }
        }
      }
    }

    const img   = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = render
    img.onerror = () => {
      /* Fallback: just fill peach */
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) { ctx.fillStyle = '#F5C09A'; ctx.fillRect(0, 0, 9999, 9999) }
    }
    img.src = photo

    const obs = new ResizeObserver(render)
    obs.observe(canvas)
    return () => obs.disconnect()
  }, [photo])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

/* ── Main section ── */
export default function Testimonials() {
  const [current, setCurrent] = useState(0)
  const [locked,  setLocked]  = useState(false)
  const timerRef              = useRef(null)

  const goTo = (idx) => {
    if (locked) return
    setLocked(true)
    setCurrent((idx + CARDS.length) % CARDS.length)
    setTimeout(() => setLocked(false), 620)
  }

  /* Auto-advance every 4 s */
  useEffect(() => {
    timerRef.current = setTimeout(() => goTo(current + 1), 4000)
    return () => clearTimeout(timerRef.current)
  }, [current])

  return (
    <section style={{ background: '#FEF0E8', padding: 'clamp(64px, 10vh, 120px) 0', overflow: 'hidden' }}>
      <div className="echo-container">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px, 6vw, 64px)' }}>
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(28,26,23,0.4)', textTransform: 'uppercase', marginBottom: '16px', margin: '0 0 16px' }}>
            Real Stories
          </p>
          <h2 style={{ fontFamily: '"DM Sans", Arial, sans-serif', fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 200, color: '#1C1A17', margin: 0, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            People who didn't wait.
          </h2>
        </div>

        {/* Arrows */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '36px' }}>
          {[{ fn: () => goTo(current - 1), icon: '‹' }, { fn: () => goTo(current + 1), icon: '›' }].map(({ fn, icon }, i) => (
            <button key={i} onClick={fn} style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'transparent', border: '1px solid rgba(28,26,23,0.22)',
              color: 'rgba(28,26,23,0.55)', fontSize: '24px', lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(28,26,23,0.07)'; e.currentTarget.style.borderColor = 'rgba(28,26,23,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(28,26,23,0.22)' }}
            >{icon}</button>
          ))}
        </div>

        {/* Sliding track */}
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            display: 'flex', gap: '20px',
            transform: `translateX(calc(-${current * 100}% - ${current * 20}px))`,
            transition: 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
            willChange: 'transform',
          }}>
            {CARDS.map((card, i) => (
              <div key={i} onClick={() => goTo(i)} className="tcard" style={{
                flex: '0 0 100%',
                background: '#ffffff',
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'stretch',
                cursor: i !== current ? 'pointer' : 'default',
                opacity: i === current ? 1 : 0.4,
                transform: i === current ? 'scale(1)' : 'scale(0.97)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
                boxShadow: i === current ? '0 12px 48px rgba(0,0,0,0.09)' : 'none',
              }}>

                {/* Portrait */}
                <div className="tcard-portrait" style={{ flex: '0 0 clamp(130px, 26%, 240px)', overflow: 'hidden' }}>
                  <HalftonePortrait photo={card.photo} />
                </div>

                {/* Quote */}
                <div className="tcard-body" style={{
                  flex: 1, padding: 'clamp(20px, 4vw, 48px)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px',
                }}>
                  <p style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: 'clamp(14px, 1.6vw, 20px)',
                    fontWeight: 300, color: '#1C1A17', lineHeight: 1.65, margin: 0,
                  }}>
                    "{card.quote}"
                  </p>
                  <p style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '11px', fontWeight: 600,
                    letterSpacing: '0.12em', color: 'rgba(28,26,23,0.45)', margin: 0,
                  }}>
                    {card.name}, {card.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '28px' }}>
          {CARDS.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{
              width: i === current ? '24px' : '8px', height: '8px',
              borderRadius: '999px',
              background: i === current ? '#1C1A17' : 'rgba(28,26,23,0.2)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

      </div>

      <style>{`
        @media (max-width: 600px) {
          .tcard { flex-direction: column !important; }
          .tcard-portrait {
            flex: none !important;
            width: 100% !important;
            height: 160px !important;
          }
          .tcard-body {
            padding: 20px !important;
            gap: 12px !important;
          }
          .tcard-body p:first-child {
            font-size: 14px !important;
            line-height: 1.6 !important;
          }
        }
      `}</style>
    </section>
  )
}
