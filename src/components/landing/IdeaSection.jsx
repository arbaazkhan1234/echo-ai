import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

const PHOTO = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=90&auto=format&fit=crop'

/* Steps revealed after the card slams in
   1  badge
   2  bubble-1
   3  typing-dots-A  (disappears at step 4)
   4  bubble-2
   5  typing-dots-B  (disappears at step 6)
   6  bubble-3
   7  heading-line-1
   8  heading-line-2
   9  heading-line-3
   10 body
*/
const STEPS = 10

/* Custom per-step delays (ms, relative to onComplete + 300ms base) */
const STEP_DELAYS = [200, 520, 1040, 1860, 2280, 2960, 3380, 3640, 3900, 4180]

function Airplane() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
      <ellipse cx="21" cy="21" rx="3.5" ry="11" fill="#C4975A"/>
      <path d="M21 17 L37 27 L21 24 L5 27 Z" fill="#C4975A"/>
      <path d="M21 29 L29 37 L21 34.5 L13 37 Z" fill="#C4975A" opacity="0.85"/>
      <ellipse cx="21" cy="17" rx="1.5" ry="2" fill="rgba(255,255,255,0.4)"/>
    </svg>
  )
}

/* Animated typing dots */
function TypingDots() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: 'rgba(255,255,255,0.08)', borderRadius: '999px',
      padding: '10px 16px', width: 'fit-content',
    }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'rgba(240,237,230,0.45)',
          display: 'inline-block',
          animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }}/>
      ))}
    </div>
  )
}

export default function IdeaSection() {
  const sectionRef   = useRef(null)
  const leftCardRef  = useRef(null)
  const rightCardRef = useRef(null)
  const planeRef     = useRef(null)
  const svgRef       = useRef(null)
  const pathRef      = useRef(null)
  const hasRun       = useRef(false)
  const [step, setStep] = useState(0)

  useLayoutEffect(() => {
    if (rightCardRef.current)
      gsap.set(rightCardRef.current, { opacity: 0, x: 0, y: 24, scale: 0.94 })
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hasRun.current) return
      hasRun.current = true
      observer.disconnect()

      const sRect = sectionRef.current.getBoundingClientRect()
      const lRect = leftCardRef.current.getBoundingClientRect()
      const rRect = rightCardRef.current.getBoundingClientRect()

      const startX = lRect.left + lRect.width  / 2 - sRect.left
      const startY = lRect.top  + lRect.height / 2 - sRect.top
      const endX   = rRect.left + rRect.width  / 2 - sRect.left
      const endY   = rRect.top  + rRect.height / 2 - sRect.top
      const midX   = (startX + endX) / 2
      const midY   = Math.min(startY, endY) - 160

      const isVertical         = endY > startY + 80
      const planeStartRotation = isVertical ? 180 : 90
      const planeMidRotation   = isVertical ? 175 : 92
      const planeEndRotation   = isVertical ? 165 : 112

      const pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`
      svgRef.current.setAttribute('viewBox', `0 0 ${sRect.width} ${sRect.height}`)
      pathRef.current.setAttribute('d', pathD)
      const totalLen = pathRef.current.getTotalLength()

      gsap.set(pathRef.current, { strokeDasharray: totalLen, strokeDashoffset: totalLen, opacity: 1 })
      gsap.set(planeRef.current, {
        x: startX, y: startY,
        xPercent: -50, yPercent: -50,
        rotation: planeStartRotation, opacity: 0, scale: 0.6,
      })

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(pathRef.current, { opacity: 0, duration: 0.6, delay: 0.3 })
          /* Reveal card content step by step */
          STEP_DELAYS.forEach((delay, idx) => {
            setTimeout(() => setStep(idx + 1), 300 + delay)
          })
        },
      })

      tl.to(planeRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' })
        .to(pathRef.current,  { strokeDashoffset: 0, duration: 2.8, ease: 'power1.inOut' }, '+=0.15')
        .to(planeRef.current, { x: midX, y: midY, rotation: planeMidRotation, duration: 1.5, ease: 'power1.inOut' }, '<')
        .to(planeRef.current, { x: endX, y: endY, rotation: planeEndRotation, duration: 1.3, ease: 'power2.in' })
        .to(planeRef.current, { scale: 0.4, opacity: 0, duration: 0.22, ease: 'power3.in' })
        .to(rightCardRef.current, { opacity: 1, scale: 1.04, x: 0, y: 0, duration: 0.22, ease: 'power4.out' })
        .to(rightCardRef.current, { scale: 1, duration: 0.14, ease: 'power2.out' })
        .to(rightCardRef.current, { y: -8, duration: 0.06 })
        .to(rightCardRef.current, { y:  6, duration: 0.06 })
        .to(rightCardRef.current, { y: -4, duration: 0.05 })
        .to(rightCardRef.current, { y:  2, duration: 0.04 })
        .to(rightCardRef.current, { y:  0, duration: 0.04 })

    }, { threshold: 0.25 })

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  /* Slide + fade in from step n onward */
  const show = (n) => ({
    opacity:    step >= n ? 1 : 0,
    transform:  step >= n ? 'translateY(0)' : 'translateY(14px)',
    transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.4,0.64,1)',
  })

  /* Typing dots: visible only while step === n, then collapse away */
  const showDots = (n) => ({
    opacity:    step === n ? 1 : 0,
    maxHeight:  step > n ? '0px' : '52px',
    overflow:   'hidden',
    transition: step > n
      ? 'opacity 0.18s ease, max-height 0.22s ease 0.16s'
      : 'opacity 0.3s ease',
    pointerEvents: 'none',
  })

  return (
    <section
      ref={sectionRef}
      style={{ background: '#ffffff', padding: 'clamp(16px, 2.5vw, 32px)', position: 'relative', overflow: 'hidden' }}
    >
      {/* Flight path SVG */}
      <svg ref={svgRef} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6, overflow: 'visible' }}>
        <path ref={pathRef} d="" fill="none" stroke="rgba(196,151,90,0.55)" strokeWidth="2" strokeDasharray="7 5" strokeLinecap="round" opacity="0"/>
      </svg>

      {/* Airplane */}
      <div ref={planeRef} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, zIndex: 8, pointerEvents: 'none', opacity: 0, filter: 'drop-shadow(0 3px 10px rgba(196,151,90,0.55))' }}>
        <Airplane />
      </div>

      {/* Grid */}
      <div className="idea-grid" style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(10px, 1.5vw, 16px)',
        maxWidth: '1280px', margin: '0 auto',
        height: 'clamp(560px, 84vh, 820px)',
      }}>

        {/* Left card — photo */}
        <div ref={leftCardRef} style={{ position: 'relative', borderRadius: '20px 20px 0 20px', overflow: 'hidden', background: '#111' }}>
          <img src={PHOTO} alt="Friends outdoors" loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,6,4,0.82) 0%, rgba(8,6,4,0.2) 45%, transparent 70%)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{
              fontFamily: '"DM Sans", Arial, sans-serif',
              fontSize: 'clamp(42px, 7vw, 110px)', fontWeight: 700, lineHeight: 1,
              letterSpacing: '-0.03em', color: '#F0EDE6', margin: 0,
              textShadow: '0 2px 32px rgba(0,0,0,0.5)',
            }}>The Idea</h2>
          </div>
        </div>

        {/* Right card — chat UI */}
        <div ref={rightCardRef} style={{
          borderRadius: '20px 20px 0 20px', background: '#435435',
          padding: 'clamp(22px, 3.5vw, 44px)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden', position: 'relative',
        }}>

          {/* Top — badge */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', ...show(1) }}>
            <span style={{
              fontFamily: '"DM Sans", sans-serif', fontSize: '12px', fontWeight: 500,
              color: 'rgba(240,237,230,0.6)',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '999px', padding: '8px 18px',
            }}>Begin Free</span>
          </div>

          {/* Middle — chat bubbles */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', padding: 'clamp(12px, 2vw, 24px) 0', overflow: 'hidden' }}>

            {/* Bubble 1 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', ...show(2) }}>
              <div style={{
                background: '#F0EDE6',
                borderRadius: '18px 18px 4px 18px',
                padding: 'clamp(10px, 1.5vw, 16px) clamp(12px, 2vw, 20px)',
                maxWidth: '85%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
              }}>
                <p style={{
                  fontFamily: '"DM Sans", sans-serif', fontSize: 'clamp(12px, 1.3vw, 15px)',
                  fontWeight: 400, color: '#1C1A17', lineHeight: 1.6, margin: 0,
                }}>
                  Every morning, Echo asks you something real. Your childhood. Your proudest moment. What you wish you'd said.
                </p>
              </div>
            </div>

            {/* Typing indicator A (between bubble 1 → 2) */}
            <div style={{ ...showDots(3) }}>
              <TypingDots />
            </div>

            {/* Bubble 2 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', ...show(4) }}>
              <div style={{
                background: '#F0EDE6',
                borderRadius: '18px 18px 4px 18px',
                padding: 'clamp(10px, 1.5vw, 16px) clamp(12px, 2vw, 20px)',
                maxWidth: '85%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
              }}>
                <p style={{
                  fontFamily: '"DM Sans", sans-serif', fontSize: 'clamp(12px, 1.3vw, 15px)',
                  fontWeight: 400, color: '#1C1A17', lineHeight: 1.6, margin: 0,
                }}>
                  You answer in your own words, by voice or by typing. At your own pace. No pressure. No performance.
                </p>
              </div>
            </div>

            {/* Typing indicator B (between bubble 2 → 3) */}
            <div style={{ ...showDots(5) }}>
              <TypingDots />
            </div>

            {/* Bubble 3 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', ...show(6) }}>
              <div style={{
                background: 'rgba(196,151,90,0.15)',
                border: '1px solid rgba(196,151,90,0.3)',
                borderRadius: '18px 18px 4px 18px',
                padding: 'clamp(10px, 1.5vw, 16px) clamp(12px, 2vw, 20px)',
                maxWidth: '85%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
              }}>
                <p style={{
                  fontFamily: '"DM Sans", sans-serif', fontSize: 'clamp(12px, 1.3vw, 15px)',
                  fontWeight: 400, color: '#C4975A', lineHeight: 1.6, margin: 0,
                }}>
                  Over time, your answers become something extraordinary.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom — heading + body */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 'clamp(14px, 2vw, 24px)' }}>
            <h3 style={{
              fontFamily: '"DM Sans", Arial, sans-serif',
              fontSize: 'clamp(18px, 2vw, 30px)', fontWeight: 600,
              color: '#F0EDE6', lineHeight: 1.2, letterSpacing: '-0.02em',
              margin: '0 0 8px',
            }}>
              <span style={{ display: 'block', ...show(7) }}>One question.</span>
              <span style={{ display: 'block', ...show(8) }}>One answer.</span>
              <span style={{ display: 'block', color: '#C4975A', fontWeight: 300, ...show(9) }}>One piece of you.</span>
            </h3>
            <p style={{
              fontFamily: '"DM Sans", sans-serif', fontSize: 'clamp(11px, 1.1vw, 13px)',
              fontWeight: 300, color: 'rgba(240,237,230,0.45)', lineHeight: 1.7, margin: 0,
              ...show(10),
            }}>
              Echo asks the questions you never knew to write down.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.45; }
          30%            { transform: translateY(-5px); opacity: 1;    }
        }
        @media (max-width: 767px) {
          .idea-grid {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
          .idea-grid > div:first-child {
            height: 54vw !important;
            min-height: 220px !important;
          }
        }
      `}</style>
    </section>
  )
}
