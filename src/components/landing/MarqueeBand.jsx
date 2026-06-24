import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const ITEMS = [
  'Their Voice', 'Their Wisdom', 'Your Legacy', 'Their Stories',
  'Live On', 'Their Laughter', 'Their Lessons', 'Your Memory',
]

function MarqueeContent() {
  return (
    <>
      {ITEMS.map((item, i) => (
        <span
          key={i}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '24px', marginRight: '24px' }}
        >
          <span style={{
            fontFamily:    '"DM Sans", Arial, sans-serif',
            fontStyle:     'normal',
            fontSize:      '20px',
            fontWeight:    300,
            color:         '#9A9488',
            letterSpacing: '0.02em',
            whiteSpace:    'nowrap',
          }}>
            {item}
          </span>
          <span style={{
            width:        '7px',
            height:       '7px',
            borderRadius: '50%',
            background:   '#C4975A',
            display:      'inline-block',
            flexShrink:   0,
            boxShadow:    '0 0 8px rgba(196,151,90,0.6)',
          }} />
        </span>
      ))}
    </>
  )
}

export default function MarqueeBand() {
  const sectionRef = useRef(null)
  const trackRef   = useRef(null)

  useEffect(() => {
    /* Pause animation when section is out of viewport */
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start:   'top bottom',
      end:     'bottom top',
      onEnter:      () => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running' },
      onLeave:      () => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused' },
      onEnterBack:  () => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running' },
      onLeaveBack:  () => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused' },
    })
    return () => st.kill()
  }, [])

  return (
    <div
      ref={sectionRef}
      aria-hidden="true"
      style={{
        height:     '72px',
        overflow:   'hidden',
        background: '#252522',
        position:   'relative',
        borderTop:  '1px solid rgba(196,151,90,0.15)',
      }}
    >
      {/* Top green line */}
      <div style={{
        position:   'absolute',
        top:        0,
        left:       0,
        right:      0,
        height:     '1px',
        background: 'rgba(196,151,90,0.3)',
      }} />

      {/* Fade edges */}
      <div style={{
        position:   'absolute',
        top:        0,
        left:       0,
        bottom:     0,
        width:      '80px',
        background: 'linear-gradient(to right, #252522, transparent)',
        zIndex:     2,
        pointerEvents: 'none',
      }} />
      <div style={{
        position:   'absolute',
        top:        0,
        right:      0,
        bottom:     0,
        width:      '80px',
        background: 'linear-gradient(to left, #252522, transparent)',
        zIndex:     2,
        pointerEvents: 'none',
      }} />

      {/* Scrolling track — 4 copies for seamless loop */}
      <div
        ref={trackRef}
        className="marquee-track-v2"
        style={{ height: '100%', alignItems: 'center', animationDuration: '28s' }}
      >
        <MarqueeContent />
        <MarqueeContent />
        <MarqueeContent />
        <MarqueeContent />
      </div>
    </div>
  )
}
