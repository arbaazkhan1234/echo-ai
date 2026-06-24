import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const WORDS = ['Preserve', 'your', 'memories', 'and', 'legacy', 'across', 'generations.']

export default function HeroSection() {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const [videoStopped, setVideoStopped] = useState(false)
  const [revealed,     setRevealed]     = useState(false)
  const [wordCount,    setWordCount]    = useState(0)
  const [ctaVisible,   setCtaVisible]   = useState(false)

  /* ── Video canvas loop ── */
  useEffect(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const cw = canvas.offsetWidth
        const ch = canvas.offsetHeight
        const vr = video.videoWidth / video.videoHeight
        const cr = cw / ch
        let sw, sh, sx, sy
        if (vr > cr) { sh = ch; sw = sh * vr; sx = (cw - sw) / 2; sy = 0 }
        else         { sw = cw; sh = sw / vr; sx = 0; sy = (ch - sh) / 2 }
        ctx.drawImage(video, sx, sy, sw, sh)
      }
      animId = requestAnimationFrame(draw)
    }

    const onPlay    = () => setVideoStopped(false)
    const onPause   = () => setVideoStopped(true)
    const onStall   = () => setVideoStopped(true)
    const onWaiting = () => setVideoStopped(true)
    video.addEventListener('play',    onPlay)
    video.addEventListener('pause',   onPause)
    video.addEventListener('stalled', onStall)
    video.addEventListener('waiting', onWaiting)

    video.play().catch(() => setVideoStopped(true))
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      video.removeEventListener('play',    onPlay)
      video.removeEventListener('pause',   onPause)
      video.removeEventListener('stalled', onStall)
      video.removeEventListener('waiting', onWaiting)
    }
  }, [])

  /* ── Reveal sequence ── */
  useEffect(() => {
    /* Overlay fades in at 2.4s */
    const t1 = setTimeout(() => setRevealed(true), 2400)

    /* Words drop in one by one starting at 2.7s, every 90ms */
    const wordTimers = WORDS.map((_, i) =>
      setTimeout(() => setWordCount(i + 1), 2700 + i * 90)
    )

    /* CTA appears after last word + 200ms */
    const t2 = setTimeout(() => setCtaVisible(true), 2700 + WORDS.length * 90 + 200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      wordTimers.forEach(clearTimeout)
    }
  }, [])

  const isMobile   = typeof window !== 'undefined' && window.innerWidth < 768
  const showOverlay = revealed && (videoStopped || isMobile)

  return (
    <section
      id="hero"
      style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#0A0907' }}
    >
      {/* Hidden video */}
      <video
        ref={videoRef}
        muted loop playsInline disablePictureInPicture
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, top: '-1px', left: '-1px', pointerEvents: 'none' }}
      >
        <source src="/hero2.mp4" type="video/mp4" />
      </video>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      />

      {/* Dark gradient — fades in with overlay */}
      <div style={{
        position:   'absolute',
        inset:      0,
        zIndex:     2,
        background: 'linear-gradient(to bottom, rgba(10,9,7,0.30) 0%, rgba(10,9,7,0.18) 40%, rgba(10,9,7,0.65) 100%)',
        opacity:    revealed ? 1 : 0,
        transition: 'opacity 1.2s ease',
        pointerEvents: 'none',
      }} />

      {/* Text content */}
      <div style={{
        position:       'absolute',
        inset:          0,
        zIndex:         3,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        'clamp(24px, 8vw, 80px)',
        textAlign:      'center',
        pointerEvents:  ctaVisible ? 'auto' : 'none',
      }}>
        {/* Word-by-word headline */}
        <h1 style={{
          fontFamily:    '"DM Sans", Arial, sans-serif',
          fontSize:      'clamp(32px, 5.5vw, 68px)',
          fontWeight:    200,
          lineHeight:    1.15,
          letterSpacing: '-0.01em',
          color:         '#F0EDE6',
          margin:        '0 0 clamp(20px, 3vw, 36px)',
          maxWidth:      '680px',
        }}>
          {WORDS.map((word, i) => (
            <span
              key={i}
              style={{
                display:    'inline-block',
                marginRight: i < WORDS.length - 1 ? '0.28em' : 0,
                opacity:    i < wordCount ? 1 : 0,
                transform:  i < wordCount ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
                color:      word === 'memories' || word === 'legacy' ? '#C4975A' : '#F0EDE6',
              }}
            >
              {word}
            </span>
          ))}
        </h1>

        {/* CTA */}
        <div style={{
          opacity:    ctaVisible ? 1 : 0,
          transform:  ctaVisible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          <Link
            to="/signup"
            style={{
              fontFamily:    '"DM Sans", sans-serif',
              fontSize:      '13px',
              fontWeight:    400,
              color:         '#F0EDE6',
              background:    'transparent',
              border:        '1px solid rgba(196,151,90,0.55)',
              borderRadius:  '999px',
              padding:       '12px 38px',
              cursor:        'pointer',
              textDecoration:'none',
              letterSpacing: '0.04em',
              transition:    'all 300ms ease',
              display:       'inline-block',
              backdropFilter:'blur(8px)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background  = '#C4975A'
              e.currentTarget.style.color       = '#1C1A17'
              e.currentTarget.style.borderColor = '#C4975A'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background  = 'transparent'
              e.currentTarget.style.color       = '#F0EDE6'
              e.currentTarget.style.borderColor = 'rgba(196,151,90,0.55)'
            }}
          >
            Begin your story
          </Link>
        </div>
      </div>
    </section>
  )
}
