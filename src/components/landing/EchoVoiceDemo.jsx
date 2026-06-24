import { useEffect, useRef, useState } from 'react'
import { useInView } from '../../hooks/useInView'

/* ─────────────────────────────────────────────────────────
   CONVERSATION SCRIPT
───────────────────────────────────────────────────────── */
const SCRIPT = [
  { role: 'user',  text: "Dad, what would you have done if you were in my position?" },
  { role: 'echo',  text: "You know, I always believed the hardest decisions reveal the most about who we are. When I was your age, I faced something similar…" },
  { role: 'user',  text: "I miss you so much." },
  { role: 'echo',  text: "I'm always here. That's the whole point of this." },
]

// Timing (ms from sequence start)
const TIMING = [
  { action: 'add',      index: 0, at: 400   },
  { action: 'thinking', show: true,  at: 1300  },
  { action: 'thinking', show: false, at: 3100  },
  { action: 'add',      index: 1, at: 3200  },
  { action: 'wave',     show: true,  at: 3250  },
  { action: 'wave',     show: false, at: 7200  },
  { action: 'add',      index: 2, at: 8000  },
  { action: 'thinking', show: true,  at: 9000  },
  { action: 'thinking', show: false, at: 10600 },
  { action: 'add',      index: 3, at: 10700 },
  { action: 'wave',     show: true,  at: 10750 },
  { action: 'wave',     show: false, at: 13200 },
  { action: 'fade',               at: 14800 },
  { action: 'reset',              at: 16200 },
]

/* ─────────────────────────────────────────────────────────
   VOICE WAVEFORM — pure CSS animated bars
───────────────────────────────────────────────────────── */
const WAVE_DELAYS  = [0, 0.12, 0.25, 0.08, 0.20, 0.36, 0.15, 0.28, 0.43, 0.06, 0.33, 0.18, 0.38, 0.10, 0.22, 0.45]
const WAVE_DURATIONS = [0.72, 0.88, 0.76, 1.02, 0.84, 0.94, 0.78, 1.08, 0.82, 0.96, 0.74, 0.90, 0.80, 0.86, 0.70, 0.92]

function VoiceWaveform({ active, barCount = 16, height = 40 }) {
  return (
    <div
      className="flex items-end gap-[3px] transition-opacity duration-500"
      style={{ height, opacity: active ? 1 : 0.2 }}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="wave-bar rounded-full flex-shrink-0"
          style={{
            width:             3,
            height:            '100%',
            transformOrigin:   'bottom',
            background:        'linear-gradient(to top, #A8854E, #DFC090)',
            animationDuration: `${WAVE_DURATIONS[i % WAVE_DURATIONS.length]}s`,
            animationDelay:    `${WAVE_DELAYS[i % WAVE_DELAYS.length]}s`,
            animationPlayState: active ? 'running' : 'paused',
          }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   RECORD BUTTON
───────────────────────────────────────────────────────── */
function RecordInterface() {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <p className="font-sans text-xs font-medium tracking-widest uppercase" style={{ color: '#665E56' }}>
        Answer today&apos;s question
      </p>

      {/* Question card */}
      <div
        className="rounded-2xl px-5 py-4 max-w-[240px] text-center"
        style={{
          background: 'rgba(201,169,110,0.07)',
          border:     '1px solid rgba(201,169,110,0.18)',
        }}
      >
        <p className="font-serif text-base italic leading-relaxed" style={{ color: '#D4CFC6' }}>
          &ldquo;What is the most important lesson your life has taught you?&rdquo;
        </p>
      </div>

      {/* Record button */}
      <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
        {/* Pulsing rings */}
        {[0, 0.6, 1.2].map((delay, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full record-ring"
            style={{
              border:            '1px solid rgba(201,169,110,0.4)',
              animationDelay:    `${delay}s`,
            }}
          />
        ))}
        {/* Button */}
        <button
          className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #A8854E, #C9A96E)' }}
          aria-label="Record answer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F0E17" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8"  y1="23" x2="16" y2="23"/>
          </svg>
        </button>
      </div>

      {/* Input waveform */}
      <VoiceWaveform active barCount={14} height={32} />

      <p className="font-sans text-xs" style={{ color: '#665E56' }}>
        Your voice. Your words.{' '}
        <span style={{ color: '#A89F94' }}>Preserved forever.</span>
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   CHAT WINDOW
───────────────────────────────────────────────────────── */
function ThinkingBubble() {
  return (
    <div className="flex gap-2 items-end">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(201,169,110,0.18)' }}
      >
        <span className="font-serif text-[9px]" style={{ color: '#C9A96E' }}>E</span>
      </div>
      <div
        className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background:      '#C9A96E',
              animation:       `thinkingDot 1.2s ease-in-out infinite`,
              animationDelay:  `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ChatMessage({ msg, showWaveform }) {
  const isEcho = msg.role === 'echo'
  return (
    <div
      className={`flex gap-2 msg-enter ${isEcho ? 'items-end' : 'justify-end'}`}
    >
      {isEcho && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(201,169,110,0.18)' }}
        >
          <span className="font-serif text-[9px]" style={{ color: '#C9A96E' }}>E</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-[82%]">
        <div
          className="rounded-2xl px-3.5 py-2.5"
          style={{
            background:   isEcho ? 'rgba(255,255,255,0.06)' : 'rgba(201,169,110,0.18)',
            borderRadius: isEcho ? '1rem 1rem 1rem 0.25rem' : '1rem 1rem 0.25rem 1rem',
          }}
        >
          <p className="font-sans text-sm leading-relaxed" style={{ color: '#D4CFC6' }}>
            {msg.text}
          </p>
        </div>

        {/* Waveform under Echo messages */}
        {isEcho && (
          <div className="ml-1">
            <VoiceWaveform active={showWaveform} barCount={14} height={28} />
          </div>
        )}
      </div>
    </div>
  )
}

function ChatWindow({ messages, isThinking, showWaveform, isFading }) {
  // Ref to the scrollable messages container — scroll ONLY inside it, never the page
  const scrollContainerRef = useRef()

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, isThinking])

  return (
    <div
      className="relative rounded-3xl overflow-hidden transition-opacity duration-700"
      style={{
        background: '#12111C',
        border:     '1px solid rgba(255,255,255,0.08)',
        boxShadow:  '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,169,110,0.06)',
        opacity:    isFading ? 0 : 1,
        maxWidth:   380,
        width:      '100%',
      }}
    >
      {/* Chat header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3.5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #A8854E, #C9A96E)' }}
        >
          <span className="font-serif text-sm font-light" style={{ color: '#0F0E17' }}>E</span>
        </div>
        <div>
          <p className="font-sans text-sm font-medium" style={{ color: '#F5F0E8' }}>Echo AI</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="font-sans text-xs" style={{ color: '#665E56' }}>Dad&apos;s memories · Live</p>
          </div>
        </div>
        {/* three dots */}
        <div className="ml-auto flex gap-1">
          {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full" style={{ background: '#3A3530' }} />)}
        </div>
      </div>

      {/* Messages — overflow scrolls inside this div only, never hijacks page scroll */}
      <div
        ref={scrollContainerRef}
        className="flex flex-col gap-3.5 p-4 overflow-y-auto"
        style={{ minHeight: 240, maxHeight: 300 }}
      >
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            msg={msg}
            showWaveform={showWaveform && msg.role === 'echo' && i === messages.length - 1}
          />
        ))}
        {isThinking && (
          <div className="msg-enter">
            <ThinkingBubble />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="flex items-center gap-2 mx-4 mb-4 mt-1 rounded-xl px-4 py-2.5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span className="font-sans text-sm flex-1" style={{ color: '#3A3530' }}>
          Ask something…
        </span>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(201,169,110,0.3)' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2.5" strokeLinecap="round">
            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   MAIN SECTION
───────────────────────────────────────────────────────── */
export default function EchoVoiceDemo() {
  const [sectionRef, inView] = useInView({ threshold: 0.25 })
  const [messages,   setMessages]   = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const [showWave,   setShowWave]   = useState(false)
  const [isFading,   setIsFading]   = useState(false)
  const [loopKey,    setLoopKey]    = useState(0)
  const [started,    setStarted]    = useState(false)
  const timers = useRef([])

  // Start conversation once section enters view
  useEffect(() => {
    if (inView && !started) setStarted(true)
  }, [inView, started])

  // Run the conversation sequence
  useEffect(() => {
    if (!started) return
    timers.current.forEach(clearTimeout)
    timers.current = []

    setMessages([])
    setIsThinking(false)
    setShowWave(false)
    setIsFading(false)

    TIMING.forEach(({ action, index, show, at }) => {
      const t = setTimeout(() => {
        switch (action) {
          case 'add':
            setMessages(prev => [...prev, SCRIPT[index]])
            break
          case 'thinking':
            setIsThinking(show)
            break
          case 'wave':
            setShowWave(show)
            break
          case 'fade':
            setIsFading(true)
            break
          case 'reset':
            setLoopKey(k => k + 1)
            break
        }
      }, at)
      timers.current.push(t)
    })

    return () => timers.current.forEach(clearTimeout)
  }, [started, loopKey])

  return (
    <section
      id="echo-demo"
      className="relative py-28 md:py-36 overflow-hidden"
      style={{ background: '#0F0E17' }}
    >
      {/* Warm radial glow behind the demo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(201,169,110,0.07) 0%, transparent 65%)',
        }}
      />

      <div className="section-container relative z-10" ref={sectionRef}>

        {/* Heading */}
        <div
          className="text-center mb-14"
          style={{
            opacity:   inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(32px)',
            transition:'opacity 0.9s ease-out, transform 0.9s ease-out',
          }}
        >
          <p className="font-sans text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#C9A96E' }}>
            The Echo Experience
          </p>
          <h2 className="section-heading mb-4">
            Hear them. Feel them.{' '}
            <span className="italic" style={{ color: '#C9A96E' }}>Always.</span>
          </h2>
          <p className="font-sans text-base leading-relaxed max-w-xl mx-auto" style={{ color: '#A89F94' }}>
            Echo doesn&apos;t just store memories. It speaks them, in their actual voice,
            to the people they love.
          </p>
        </div>

        {/* Two-panel demo */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">

          {/* ── LEFT / TOP: Chat Interface ── */}
          <div
            style={{
              opacity:   inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(40px)',
              transition:'opacity 1s ease-out 0.2s, transform 1s ease-out 0.2s',
            }}
          >
            <ChatWindow
              messages={messages}
              isThinking={isThinking}
              showWaveform={showWave}
              isFading={isFading}
            />
          </div>

          {/* ── Divider / connector ── */}
          <div className="hidden lg:flex flex-col items-center gap-3">
            <div className="w-px h-16" style={{ background: 'linear-gradient(to bottom, transparent, rgba(201,169,110,0.3), transparent)' }} />
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
            </div>
            <div className="w-px h-16" style={{ background: 'linear-gradient(to bottom, transparent, rgba(201,169,110,0.3), transparent)' }} />
          </div>

          {/* ── RIGHT / BOTTOM: Record Interface ── */}
          <div
            style={{
              opacity:   inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(40px)',
              transition:'opacity 1s ease-out 0.4s, transform 1s ease-out 0.4s',
            }}
          >
            <div
              className="rounded-3xl p-8 flex flex-col items-center"
              style={{
                background: '#12111C',
                border:     '1px solid rgba(255,255,255,0.07)',
                boxShadow:  '0 24px 60px rgba(0,0,0,0.4)',
                maxWidth:   340,
                width:      '100%',
              }}
            >
              <RecordInterface />
            </div>
          </div>
        </div>

        {/* Voice label */}
        <div
          className="text-center mt-10"
          style={{
            opacity:   inView ? 1 : 0,
            transition:'opacity 1s ease-out 0.7s',
          }}
        >
          <div
            className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5"
            style={{
              background: 'rgba(201,169,110,0.07)',
              border:     '1px solid rgba(201,169,110,0.18)',
            }}
          >
            <span className="text-base">🎙</span>
            <div className="text-left">
              <p className="font-sans text-sm font-medium animate-shimmer-gold" style={{ color: '#C9A96E' }}>
                Echo responds in their actual voice
              </p>
              <p className="font-sans text-xs" style={{ color: '#665E56' }}>
                Powered by voice cloning, so it truly sounds like them
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
