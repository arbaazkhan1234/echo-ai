/**
 * PhoneMockup — CSS-only phone showing Echo AI in action.
 * Has a gentle bob animation and subtle 3D perspective tilt.
 * Purely decorative.
 */
export default function PhoneMockup() {
  return (
    /* Perspective wrapper */
    <div className="phone-perspective flex items-center justify-center py-8">
      {/* Bob animation wrapper */}
      <div className="animate-bob" style={{ animationDuration: '5s' }}>
        {/* Phone shell — 3D tilted */}
        <div
          className="relative w-60 sm:w-64 rounded-[38px] overflow-hidden shadow-2xl"
          style={{
            transform:       'rotateY(-10deg) rotateX(6deg)',
            background:      '#12111C',
            border:          '3px solid rgba(255,255,255,0.08)',
            height:          '520px',
            boxShadow:
              '0 40px 80px rgba(30,21,14,0.55), 0 0 0 1px rgba(255,200,120,0.06), inset 0 1px 0 rgba(255,200,120,0.08)',
          }}
        >
          {/* Dynamic island / notch */}
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full z-20"
            style={{ width: 100, height: 20, background: '#0e0905' }}
          />

          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-8 pb-1">
            <span className="font-sans text-[9px] text-darkwarm-text opacity-60">9:41</span>
            <div className="flex gap-1 opacity-60">
              {/* Signal bars */}
              {[3,4,5].map(h => (
                <div key={h} className="w-0.5 rounded-sm bg-darkwarm-text" style={{ height: h }} />
              ))}
              {/* Battery */}
              <div className="w-4 h-2 rounded-sm border border-darkwarm-text flex items-center px-px ml-1">
                <div className="h-full rounded-sm bg-darkwarm-text" style={{ width: '70%' }} />
              </div>
            </div>
          </div>

          {/* Header bar */}
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 border-b"
            style={{ background: '#241808', borderColor: 'rgba(58,42,26,0.6)' }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(176,106,85,0.25)', border: '1px solid rgba(176,106,85,0.3)' }}
            >
              <span className="font-serif text-sm" style={{ color: '#d4956a' }}>E</span>
            </div>
            <div>
              <p className="font-serif text-xs font-medium leading-tight" style={{ color: '#e8d4b8' }}>
                Echo AI
              </p>
              <p className="font-sans text-[9px] leading-tight" style={{ color: '#8a7060' }}>
                Dad's memories · Active
              </p>
            </div>
            {/* Three dots */}
            <div className="ml-auto flex gap-0.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1 h-1 rounded-full" style={{ background: '#6a5040' }} />
              ))}
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex flex-col gap-3 px-3 py-3 overflow-hidden" style={{ height: 370 }}>

            {/* Echo message */}
            <div className="flex gap-2 items-end max-w-[88%]">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(176,106,85,0.2)' }}
              >
                <span className="font-serif text-[8px]" style={{ color: '#d4956a' }}>E</span>
              </div>
              <div
                className="rounded-2xl rounded-bl-sm px-3 py-2"
                style={{ background: '#2a1e10' }}
              >
                <p className="font-sans text-[11px] leading-relaxed" style={{ color: '#e8d4b8' }}>
                  What is one memory of your father that still makes you smile?
                </p>
              </div>
            </div>

            {/* User message */}
            <div className="flex justify-end">
              <div
                className="max-w-[80%] rounded-2xl rounded-br-sm px-3 py-2"
                style={{ background: 'rgba(176,106,85,0.3)' }}
              >
                <p className="font-sans text-[11px] leading-relaxed" style={{ color: '#f0dcc8' }}>
                  The way he laughed. He had the best laugh. Big and completely unguarded.
                </p>
              </div>
            </div>

            {/* Echo response */}
            <div className="flex gap-2 items-end max-w-[88%]">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(176,106,85,0.2)' }}
              >
                <span className="font-serif text-[8px]" style={{ color: '#d4956a' }}>E</span>
              </div>
              <div
                className="rounded-2xl rounded-bl-sm px-3 py-2"
                style={{ background: '#2a1e10' }}
              >
                <p className="font-sans text-[11px] leading-relaxed" style={{ color: '#e8d4b8' }}>
                  That kind of joy is rare. It sounds like he gave it freely. What would make him laugh like that?
                </p>
              </div>
            </div>

            {/* Typing indicator */}
            <div className="flex gap-2 items-end max-w-[40%]">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(176,106,85,0.2)' }}
              >
                <span className="font-serif text-[8px]" style={{ color: '#d4956a' }}>E</span>
              </div>
              <div
                className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center"
                style={{ background: '#2a1e10' }}
              >
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-typing-dot typing-dot"
                    style={{ background: '#b06a55', animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div
            className="absolute bottom-0 left-0 right-0 px-3 pb-5 pt-2 border-t"
            style={{ background: '#1a1108', borderColor: 'rgba(58,42,26,0.5)' }}
          >
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2"
              style={{ background: '#241808', border: '1px solid rgba(58,42,26,0.8)' }}
            >
              <span
                className="font-sans text-[11px] flex-1 text-left"
                style={{ color: '#6a5040' }}
              >
                Share a memory…
              </span>
              {/* Send button */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(176,106,85,0.5)' }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="#e8d4b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {/* Home indicator */}
            <div
              className="w-20 h-1 rounded-full mx-auto mt-2.5"
              style={{ background: '#3a2a1a' }}
            />
          </div>
        </div>

        {/* Soft glow under phone */}
        <div
          className="mx-auto mt-3 rounded-full blur-xl opacity-30"
          style={{
            width:      160,
            height:     20,
            background: 'radial-gradient(ellipse, #d4956a, transparent)',
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
