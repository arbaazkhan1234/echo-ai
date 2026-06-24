import { useEffect, useState } from 'react'

/**
 * PageLoader — full-screen entrance animation.
 * "Echo" wordmark fades in, then the entire loader dissolves.
 */
export default function PageLoader({ onDone }) {
  const [phase, setPhase] = useState('in') // 'in' | 'hold' | 'out'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 700)
    const t2 = setTimeout(() => setPhase('out'),  1600)
    const t3 = setTimeout(() => onDone?.(),       2300)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [onDone])

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{
        background:    '#0F0C08',
        opacity:       phase === 'out' ? 0 : 1,
        transition:    phase === 'out' ? 'opacity 0.65s ease-out' : 'none',
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      {/* Warm radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 55% 38% at 50% 50%, rgba(168,130,58,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Wordmark */}
      <div
        className="relative text-center"
        style={{
          opacity:   phase === 'in' ? 0 : 1,
          transform: phase === 'in' ? 'translateY(12px)' : 'translateY(0)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <h1
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontWeight: 400,
            fontSize: '2.8rem',
            letterSpacing: '0.08em',
            color: '#EDE5D0',
            fontStyle: 'italic',
            userSelect: 'none',
          }}
        >
          Echo
        </h1>
        {/* Gold underline that grows in */}
        <div
          className="mx-auto mt-3 rounded-full"
          style={{
            height: 1,
            background: 'linear-gradient(to right, transparent, #A8823A, transparent)',
            width:     phase === 'in' ? 0 : 100,
            transition: 'width 0.6s ease-out 0.2s',
          }}
        />
      </div>
    </div>
  )
}
