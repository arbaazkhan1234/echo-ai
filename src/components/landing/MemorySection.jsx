import { motion } from 'framer-motion'

const EASE = [0.25, 0.1, 0.25, 1]
const GOLD = '#A8823A'
const BG   = '#F2EBD9'
const DARK = '#1A1208'

const FEATURES = [
  {
    label: 'Daily Questions',
    description: 'One meaningful question, every day. Gets deeper over time. Never repeats.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
    ),
    size: 'normal',
  },
  {
    label: 'Private Archive',
    description: 'All answers stored securely. Browse by Family, Values, Career, Life Lessons, Stories.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    size: 'normal',
  },
  {
    label: 'Echo Conversation',
    description: 'After 30 answers, family can speak with someone who responds only from your real memories, in your words.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    size: 'featured', gold: true,
  },
  {
    label: 'Add Photos',
    description: 'Attach photos and captions to any answer.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    size: 'normal',
  },
  {
    label: 'Family Access',
    description: 'Invite up to 5 family members. Control who sees what.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    size: 'normal',
  },
  {
    label: 'Voice Cloning',
    description: 'Coming soon. Hear their actual voice answer your questions.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
      </svg>
    ),
    size: 'normal', soon: true,
  },
]

function FeatureCard({ feature, index }) {
  const isFeatured = feature.size === 'featured'

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: EASE }}
      className={`relative rounded-2xl p-6 cursor-pointer group ${isFeatured ? 'lg:col-span-2' : ''}`}
      style={{
        /* Skeuomorphic parchment card */
        background: isFeatured
          ? 'linear-gradient(145deg, #EDE5D0 0%, #E0D4BA 100%)'
          : '#EDE5D0',
        border: isFeatured
          ? `1px solid rgba(168,130,58,0.3)`
          : '1px solid rgba(168,130,58,0.12)',
        boxShadow: isFeatured
          ? 'inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(168,130,58,0.12), 0 8px 32px rgba(26,18,8,0.12), 0 2px 6px rgba(26,18,8,0.08)'
          : 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(168,130,58,0.08), 0 4px 16px rgba(26,18,8,0.07), 0 1px 3px rgba(26,18,8,0.05)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
      whileHover={{
        y: -4,
        boxShadow: isFeatured
          ? 'inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(168,130,58,0.12), 0 16px 48px rgba(26,18,8,0.14), 0 4px 10px rgba(26,18,8,0.1)'
          : 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(168,130,58,0.08), 0 12px 32px rgba(26,18,8,0.1), 0 2px 6px rgba(26,18,8,0.07)',
      }}
    >
      {/* Grain texture overlay */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        opacity: 0.015, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '180px 180px',
      }} />

      {/* Soon badge */}
      {feature.soon && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em',
          color: '#8A7A68',
          background: 'rgba(26,18,8,0.06)',
          border: '1px solid rgba(26,18,8,0.08)',
          borderRadius: 999, padding: '0.15rem 0.6rem',
        }}>Soon</span>
      )}

      {/* Icon */}
      <div
        className="mb-5 transition-transform duration-300 group-hover:scale-110"
        style={{ color: isFeatured ? GOLD : '#8A7A68' }}
      >
        {feature.icon}
      </div>

      {/* Label */}
      <h3 style={{
        fontFamily: "'EB Garamond', Georgia, serif",
        fontWeight: 400,
        fontSize: isFeatured ? 'clamp(1.4rem, 2.5vw, 1.9rem)' : '1.15rem',
        color: DARK, marginBottom: '0.6rem', letterSpacing: '-0.01em',
      }}>{feature.label}</h3>

      {/* Description */}
      <p style={{
        fontFamily: "'Lora', Georgia, serif",
        fontSize: '0.9rem', fontWeight: 400,
        lineHeight: 1.72, color: '#5C4E3C',
        maxWidth: isFeatured ? '480px' : undefined,
      }}>{feature.description}</p>

      {/* Unlock indicator (featured) */}
      {isFeatured && (
        <div className="flex items-center gap-2 mt-5">
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: GOLD,
            animation: 'glowPulse 2.5s ease-in-out infinite',
            boxShadow: `0 0 8px rgba(168,130,58,0.5)`,
          }} />
          <span style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '0.78rem', fontWeight: 500,
            color: '#7A6A58', letterSpacing: '0.03em',
          }}>Unlocks after 30 answers</span>
        </div>
      )}
    </motion.div>
  )
}

export default function MemorySection() {
  return (
    <section id="memories" style={{ background: BG, paddingTop: '7rem', paddingBottom: '7rem' }}>
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-14"
        >
          <p style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '0.68rem', fontWeight: 600,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: GOLD, marginBottom: '1rem',
          }}>Everything Included</p>
          <h2 style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontWeight: 400,
            fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)',
            lineHeight: 1.15, color: DARK,
            letterSpacing: '-0.02em', maxWidth: '520px',
          }}>
            Built for the stories<br />
            <em style={{ color: GOLD }}>that matter most.</em>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
