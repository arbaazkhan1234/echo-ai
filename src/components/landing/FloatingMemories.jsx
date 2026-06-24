import { useInView } from '../../hooks/useInView'

/* ─────────────────────────────────────────────────────────────────────────
   FLOATING MEMORY CARDS  — positioned around a central person figure
───────────────────────────────────────────────────────────────────────── */

const MEMORIES = [
  { text: '"The day I met your mother…"',           top: '4%',  left: '3%',  anim: 'animate-float-slow',   delay: '0s',    rotate: '-4deg' },
  { text: '"My proudest moment as a parent…"',      top: '2%',  left: '55%', anim: 'animate-float-medium', delay: '1.2s',  rotate: '3deg' },
  { text: '"What love really means…"',              top: '28%', left: '0%',  anim: 'animate-float-slow',   delay: '2s',    rotate: '-2deg' },
  { text: '"The place I call home…"',               top: '25%', left: '72%', anim: 'animate-float-medium', delay: '0.6s',  rotate: '5deg' },
  { text: '"If I could live one day again…"',       top: '55%', left: '2%',  anim: 'animate-float-fast',   delay: '1.8s',  rotate: '-3deg' },
  { text: '"What I would tell my younger self…"',   top: '60%', left: '65%', anim: 'animate-float-slow',   delay: '3s',    rotate: '2deg' },
  { text: '"My greatest hope for you…"',            top: '78%', left: '12%', anim: 'animate-float-medium', delay: '0.4s',  rotate: '-5deg' },
  { text: '"The lesson no school can teach…"',      top: '82%', left: '58%', anim: 'animate-float-slow',   delay: '2.4s',  rotate: '4deg' },
]

function MemoryCard({ text, top, left, anim, delay, rotate, visible }) {
  return (
    <div
      className={`absolute ${anim}`}
      style={{
        top, left,
        animationDelay: delay,
        opacity:        visible ? 1 : 0,
        transform:      visible ? `rotate(${rotate})` : `rotate(${rotate}) translateY(20px)`,
        transition:     'opacity 0.9s ease-out, transform 0.9s ease-out',
        zIndex:         2,
        maxWidth:       190,
        minWidth:       140,
      }}
    >
      <div
        className="px-4 py-3 rounded-xl"
        style={{
          background:   'rgba(26,25,40,0.92)',
          border:       '1px solid rgba(201,169,110,0.25)',
          backdropFilter: 'blur(8px)',
          boxShadow:    '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <p className="font-serif text-xs italic leading-relaxed" style={{ color: '#DFC090' }}>
          {text}
        </p>
      </div>
    </div>
  )
}


/* ─────────────────────────────────────────────────────────────────────────
   SECTION
───────────────────────────────────────────────────────────────────────── */
export default function FloatingMemories() {
  const [ref, inView] = useInView({ threshold: 0.15 })

  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{ background: '#0F0E17' }}
    >
      {/* Radial glow — centre atmosphere */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(201,169,110,0.07) 0%, transparent 65%)' }}
      />

      <div className="section-container relative z-10">

        {/* Heading */}
        <div
          className="text-center mb-16"
          style={{
            opacity:    inView ? 1 : 0,
            transform:  inView ? 'translateY(0)' : 'translateY(28px)',
            transition: 'opacity 0.9s ease-out, transform 0.9s ease-out',
          }}
        >
          <p className="font-sans text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#C9A96E' }}>
            Your Archive
          </p>
          <h2
            className="font-serif font-light leading-tight mb-4"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#F5F0E8' }}
          >
            Every memory you share{' '}
            <span className="italic" style={{ color: '#C9A96E' }}>lives on</span>
          </h2>
          <p className="font-sans text-base leading-relaxed max-w-lg mx-auto" style={{ color: '#A89F94' }}>
            Your words orbit around you, preserved, searchable, and ready to speak to the people you love.
          </p>
        </div>

        {/* Visual stage */}
        <div
          ref={ref}
          className="relative mx-auto"
          style={{ height: 520, maxWidth: 800 }}
        >
          {/* Floating memory cards */}
          {MEMORIES.map((m, i) => (
            <MemoryCard key={i} {...m} visible={inView} />
          ))}

          {/* Central person — real portrait, circular crop, warm glow */}
          <div
            className="absolute"
            style={{
              top:       '50%',
              left:      '50%',
              width:     160,
              height:    160,
              transform: 'translate(-50%, -50%)',
              zIndex:    3,
              opacity:   inView ? 1 : 0,
              transition:'opacity 1.2s ease-out 0.3s',
            }}
          >
            {/* Pulsing glow rings behind the photo */}
            <div
              className="absolute rounded-full animate-pulse-soft"
              style={{
                inset:      -20,
                background: 'radial-gradient(circle, rgba(201,169,110,0.25) 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute rounded-full"
              style={{
                inset:      -4,
                background: 'linear-gradient(135deg, rgba(201,169,110,0.5), rgba(168,133,78,0.3))',
                borderRadius: '50%',
              }}
              aria-hidden="true"
            />

            {/* Portrait photo */}
            <div
              className="relative w-full h-full rounded-full overflow-hidden"
              style={{ border: '3px solid rgba(201,169,110,0.6)' }}
            >
              <img
                src="https://randomuser.me/api/portraits/men/60.jpg"
                alt="A person preserving their memories"
                loading="lazy"
                style={{
                  width:         '100%',
                  height:        '100%',
                  objectFit:     'cover',
                  objectPosition:'top center',
                  filter:        'sepia(15%) saturate(0.9) brightness(0.92)',
                  display:       'block',
                }}
              />
              {/* Warm overlay */}
              <div
                className="absolute inset-0 pointer-events-none rounded-full"
                style={{ background:'rgba(201,169,110,0.12)', mixBlendMode:'multiply' }}
              />
            </div>

            {/* Radiating dashed lines */}
            <svg
              className="absolute pointer-events-none"
              style={{ inset: -60, width:'calc(100% + 120px)', height:'calc(100% + 120px)' }}
              aria-hidden="true"
            >
              {[0,45,90,135,180,225,270,315].map((deg, i) => {
                const r = (deg * Math.PI) / 180
                const cx = 140, cy = 140, r1 = 85, r2 = 128
                return (
                  <line key={i}
                    x1={cx + Math.cos(r)*r1} y1={cy + Math.sin(r)*r1}
                    x2={cx + Math.cos(r)*r2} y2={cy + Math.sin(r)*r2}
                    stroke="#C9A96E" strokeWidth="0.7"
                    strokeDasharray="3 5" opacity="0.3"
                  />
                )
              })}
            </svg>
          </div>
        </div>

        {/* Bottom label */}
        <div
          className="text-center mt-8"
          style={{
            opacity:    inView ? 1 : 0,
            transition: 'opacity 1s ease-out 0.8s',
          }}
        >
          <p className="font-serif text-base italic" style={{ color: '#665E56' }}>
            Organised. Searchable. Yours forever.
          </p>
        </div>
      </div>
    </section>
  )
}
