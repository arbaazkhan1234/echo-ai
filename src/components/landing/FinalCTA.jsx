import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from 'react-router-dom'

export default function FinalCTA() {
  const sectionRef = useRef(null)
  const textRef    = useRef(null)
  const ctaRef     = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        [textRef.current, ctaRef.current],
        { opacity: 0, y: 32 },
        {
          opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
        }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      style={{
        background: '#ffffff',
        padding: 'clamp(40px, 6vw, 72px) 0',
      }}
    >
      <div className="echo-container">

      {/* Image box — rounded except bottom-right */}
      <div
        style={{
          position: 'relative',
          borderRadius: '28px 28px 0 28px',
          overflow: 'hidden',
          minHeight: 'clamp(460px, 65vh, 780px)',
          display: 'flex',
          alignItems: 'flex-start',
        }}
      >
        {/* The photo */}
        <img
          src="/footer.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center center',
            display: 'block',
          }}
        />

        {/* Very light top-left vignette for text legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.28) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        {/* Content — top-left */}
        <div
          style={{ position: 'relative', zIndex: 2, padding: 'clamp(36px, 5vw, 60px)' }}
        >
        <div style={{ maxWidth: '480px' }}>

          <span style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(240,237,230,0.45)',
            display: 'block', marginBottom: '20px',
          }}>
            Begin Today
          </span>

          <h2
            ref={textRef}
            style={{
              fontFamily: '"DM Sans", Arial, sans-serif',
              fontSize:   'clamp(30px, 4vw, 58px)',
              fontWeight: 200,
              color:      '#F0EDE6',
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
              margin: '0 0 32px',
            }}
          >
            The stories you save today<br />
            outlive everything else.
          </h2>

          <div
            ref={ctaRef}
            style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}
          >
            <Link
              to="/signup"
              style={{
                fontFamily:   '"DM Sans", Arial, sans-serif',
                fontSize:     '14px', fontWeight: 600,
                color:        '#1C1C1A', background: '#C4975A',
                border:       'none', borderRadius: '999px',
                padding:      '15px 36px', cursor: 'pointer',
                transition:   'all 280ms ease',
                textDecoration: 'none',
                boxShadow:    '0 4px 20px rgba(196,151,90,0.3)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(196,151,90,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(196,151,90,0.3)' }}
            >
              Start Free. No Credit Card.
            </Link>
            <Link
              to="/signin"
              style={{
                fontFamily: '"DM Sans", Arial, sans-serif',
                fontSize: '14px', fontWeight: 400,
                color: 'rgba(240,237,230,0.7)',
                border: '1px solid rgba(240,237,230,0.22)',
                borderRadius: '999px', padding: '15px 32px',
                cursor: 'pointer', transition: 'all 280ms ease',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(240,237,230,0.5)'; e.currentTarget.style.color = '#F0EDE6' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(240,237,230,0.22)'; e.currentTarget.style.color = 'rgba(240,237,230,0.7)' }}
            >
              Sign in
            </Link>
          </div>

          <p style={{
            fontFamily: '"DM Sans", sans-serif', fontSize: '12px',
            color: 'rgba(240,237,230,0.35)', marginTop: '20px', marginBottom: 0,
          }}>
            Free forever. No credit card required.
          </p>
        </div>{/* maxWidth */}
        </div>{/* content padding */}
      </div>{/* image box */}
      </div>{/* echo-container */}
    </section>
  )
}
