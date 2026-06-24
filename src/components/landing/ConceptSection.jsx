import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const EASE   = [0.25, 0.1, 0.25, 1]
const GOLD   = '#A8823A'
const BG     = '#F2EBD9'
const DARK   = '#1A1208'

function CountUp({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref    = useRef()
  const inView = useInView(ref, { once: true, amount: 0.5 })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const steps     = 60
    const increment = target / steps
    const interval  = duration / steps
    const timer = setInterval(() => {
      start += increment
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, interval)
    return () => clearInterval(timer)
  }, [inView, target, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

const STATS = [
  { value: 30,   suffix: '+', label: 'questions to unlock your Echo' },
  { value: 2400, suffix: '+', label: 'families preserving their stories' },
  { value: 5,    suffix: '',  label: 'family members can share access' },
]

export default function ConceptSection() {
  return (
    <section style={{ background: BG, paddingTop: '7rem', paddingBottom: '7rem' }}>
      <div className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left — stats */}
          <div className="flex flex-col gap-12">
            {STATS.map(({ value, suffix, label }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.65, delay: i * 0.12, ease: EASE }}
                className="flex items-start gap-6"
              >
                {/* Brass vertical rule */}
                <div style={{
                  width: 2, minHeight: '3.5rem', flexShrink: 0, marginTop: '0.4rem',
                  background: `linear-gradient(to bottom, ${GOLD}, transparent)`,
                  borderRadius: 2,
                  boxShadow: `0 0 8px rgba(168,130,58,0.3)`,
                }} />
                <div>
                  <div style={{
                    fontFamily: "'EB Garamond', Georgia, serif",
                    fontSize: 'clamp(3rem, 6vw, 4.5rem)',
                    fontWeight: 400, lineHeight: 1,
                    color: DARK, letterSpacing: '-0.02em',
                  }}>
                    <CountUp target={value} suffix={suffix} />
                  </div>
                  <p style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.9rem', fontWeight: 400,
                    color: '#6A5C48', marginTop: '0.35rem', letterSpacing: '0.01em',
                  }}>
                    {label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right — editorial copy */}
          <div>
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '0.68rem', fontWeight: 600,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: GOLD, display: 'block', marginBottom: '1.5rem',
              }}
            >
              The Idea
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontWeight: 400,
                fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
                lineHeight: 1.2, color: DARK,
                letterSpacing: '-0.01em', marginBottom: '1.75rem',
              }}
            >
              You've lived a whole life.
              <br />
              <em style={{ color: GOLD }}>Echo captures it.</em>
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.65, delay: 0.2, ease: EASE }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              {[
                'One honest question a day. Answered in your own words, at your own pace, by voice or text.',
                'Your answers build a private archive, organised by life category: Family, Values, Career, Lessons, Stories.',
                'After 30 answers, your Echo awakens. Family can speak with someone that responds only from your real memories, in your voice, in your words.',
                'Nothing invented. Nothing generic. Only you.',
              ].map((text, i) => (
                <p key={i} style={{
                  fontFamily: i === 3
                    ? "'EB Garamond', Georgia, serif"
                    : "'Lora', Georgia, serif",
                  fontSize: i === 3 ? '1.05rem' : '1rem',
                  fontWeight: 400,
                  lineHeight: 1.78,
                  color: i === 3 ? DARK : '#5C4E3C',
                  fontStyle: i === 3 ? 'italic' : 'normal',
                }}>
                  {text}
                </p>
              ))}
            </motion.div>

            <motion.a
              href="#how-it-works"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
              className="inline-flex items-center gap-2 cursor-pointer"
              style={{
                marginTop: '2.25rem',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '0.88rem', fontWeight: 500,
                color: GOLD, letterSpacing: '0.02em',
                textDecoration: 'none', transition: 'gap 0.3s ease',
              }}
              whileHover={{ gap: '0.75rem' }}
            >
              See how it works
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </motion.a>
          </div>
        </div>
      </div>
    </section>
  )
}
