/**
 * EchoProgress — replaces the old ProgressRing unlock widget.
 * Shows Echo "learning" through 4 visual stages as answers grow.
 * Unlocks with a sparkle bar + CTA button when threshold is reached.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

const GOLD    = '#C9A84C'
const SURFACE = '#13111F'
const BORDER  = 'rgba(255,255,255,0.07)'
const GOLD_A  = 'rgba(201,168,76,0.22)'
const TEXT    = '#F5EDE0'
const MUTED   = 'rgba(245,237,224,0.42)'
const DIM     = 'rgba(245,237,224,0.16)'

function getStage(total, unlockAt) {
  const pct = total / unlockAt        // 0 → 1+

  if (total === 0) return {
    label:    'Echo is waiting to meet you',
    sub:      'Answer your first question to begin',
    fillPct:  0,
    barColor: DIM,
    glow:     false,
    pulse:    false,
    unlocked: false,
  }

  if (pct < 0.4) return {
    label:    'Echo is just getting started',
    sub:      'Keep sharing — Echo is listening',
    fillPct:  pct * 100,
    barColor: 'rgba(201,168,76,0.45)',
    glow:     false,
    pulse:    false,
    unlocked: false,
  }

  if (pct < 0.7) return {
    label:    'Echo is starting to understand you',
    sub:      'Your roots and relationships are forming',
    fillPct:  pct * 100,
    barColor: 'rgba(201,168,76,0.72)',
    glow:     false,
    pulse:    false,
    unlocked: false,
  }

  if (pct < 1) return {
    label:    'Echo almost knows who you are',
    sub:      `Just ${unlockAt - total} more ${unlockAt - total === 1 ? 'answer' : 'answers'}…`,
    fillPct:  pct * 100,
    barColor: GOLD,
    glow:     false,
    pulse:    true,     // shimmer sweep while approaching
    unlocked: false,
  }

  // Unlocked (total >= unlockAt)
  return {
    label:    'Echo is ready to speak',
    sub:      'Open Echo Chat to hear their voice',
    fillPct:  100,
    barColor: GOLD,
    glow:     true,
    pulse:    false,
    unlocked: true,
  }
}

export default function EchoProgress({ total, unlockAt, onOpenEchoChat }) {
  const { label, sub, fillPct, glow, pulse, unlocked } = getStage(total, unlockAt)
  const display = Math.min(total, unlockAt)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background:   unlocked ? '#FFE8C8' : '#FFF0D8',
        borderRadius: 24,
        padding:      '1rem 1.25rem',
        border:       'none',
        boxShadow:    unlocked
          ? 'inset 0 -10px 20px rgba(200,120,20,0.16),inset 0 10px 20px rgba(255,255,255,0.88),0 16px 40px rgba(220,150,40,0.26)'
          : 'inset 0 -10px 20px rgba(180,110,20,0.12),inset 0 10px 20px rgba(255,255,255,0.88),0 14px 36px rgba(200,140,40,0.18)',
        transition:   'box-shadow 0.4s',
      }}
    >
      {/* ── Top row: label + counter ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: 8 }}>
        <span style={{
          fontFamily: "'Jost',sans-serif",
          fontSize:   '0.78rem',
          fontWeight: unlocked ? 700 : 500,
          color:      unlocked ? '#A06010' : '#8A5A10',
          lineHeight: 1.3,
        }}>
          {label}
        </span>
        <span style={{
          fontFamily:   "'Jost',sans-serif",
          fontSize:     '0.66rem',
          fontWeight:   700,
          color:        '#A06010',
          background:   'rgba(255,255,255,0.55)',
          padding:      '2px 8px',
          borderRadius: 999,
          flexShrink:   0,
          boxShadow:    'inset 0 -2px 4px rgba(180,100,0,0.10),inset 0 2px 4px rgba(255,255,255,0.85)',
        }}>
          {display}/{unlockAt}
        </span>
      </div>

      {/* ── Progress bar track — clay pill ── */}
      <div style={{
        height:       10,
        borderRadius: 99,
        background:   'rgba(255,255,255,0.50)',
        overflow:     'hidden',
        position:     'relative',
        boxShadow:    'inset 0 3px 8px rgba(160,90,10,0.18),inset 0 -2px 4px rgba(255,255,255,0.60)',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
          style={{
            height:       '100%',
            borderRadius: 99,
            background:   unlocked ? '#F0A030' : '#E8B848',
            boxShadow:    glow
              ? 'inset 0 3px 6px rgba(255,255,255,0.45),0 0 16px rgba(240,160,40,0.60)'
              : 'inset 0 3px 6px rgba(255,255,255,0.40)',
            position:     'relative',
            overflow:     'hidden',
          }}
        >
          {(pulse || glow) && (
            <motion.div
              animate={{ x: ['-110%', '210%'] }}
              transition={{ duration: pulse ? 1.8 : 2.4, repeat: Infinity, ease: 'linear', repeatDelay: pulse ? 1.2 : 2.0 }}
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)', borderRadius: 99 }}
            />
          )}
        </motion.div>
      </div>

      {/* ── Bottom row: subtext + optional CTA ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem', gap: 8 }}>
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', color: '#9A6A18', lineHeight: 1.45, opacity: 0.80 }}>
          {sub}
        </span>

        <AnimatePresence>
          {unlocked && (
            <motion.button
              key="echo-cta"
              type="button"
              onClick={onOpenEchoChat}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              whileHover={{ scale: 1.05, transition: { type: 'spring', stiffness: 400, damping: 18 } }}
              whileTap={{ scale: 0.93 }}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          5,
                padding:      '6px 14px',
                background:   '#F0A030',
                border:       'none',
                borderRadius: 999,
                cursor:       'pointer',
                fontFamily:   "'Jost',sans-serif",
                fontSize:     '0.72rem',
                fontWeight:   700,
                color:        '#FFFFFF',
                flexShrink:   0,
                whiteSpace:   'nowrap',
                touchAction:  'manipulation',
                boxShadow:    'inset 0 -4px 8px rgba(160,70,0,0.22),inset 0 4px 8px rgba(255,255,255,0.35),0 8px 20px rgba(220,130,20,0.35)',
              }}
            >
              <Sparkles size={11} strokeWidth={2} />
              Open Echo Chat
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
