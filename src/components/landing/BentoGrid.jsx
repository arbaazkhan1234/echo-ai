/* Clay morphism blue card */
const CLAY_SHADOW = `
  0 2px 5px rgba(255,255,255,0.82) inset,
  0 -5px 10px rgba(80,140,200,0.13) inset,
  0 20px 56px -8px rgba(100,160,220,0.32),
  0 6px 20px rgba(0,0,0,0.07),
  0 1px 0 rgba(255,255,255,0.9)
`

function ClayCard({ children, style = {} }) {
  return (
    <div style={{
      borderRadius: '24px',
      background: 'linear-gradient(160deg, #C8DFF5 0%, #A8C8E8 60%, #B8D4EE 100%)',
      boxShadow: CLAY_SHADOW,
      minHeight: '260px',
      padding: 'clamp(24px, 3vw, 40px)',
      display: 'flex', flexDirection: 'column',
      ...style,
    }}>
      {children}
    </div>
  )
}

/* Texture photos for the 4 top cards */
const TEXTURES = {
  paper:   'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=85&auto=format&fit=crop',
  leather: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=85&auto=format&fit=crop',
  fabric:  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=85&auto=format&fit=crop',
  linen:   'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=600&q=85&auto=format&fit=crop',
}

function Waveform({ bars = 48 }) {
  const heights = Array.from({ length: bars }, (_, i) => {
    const seed  = Math.sin(i * 2.4) * 0.5 + 0.5
    const seed2 = Math.sin(i * 0.7 + 1.3) * 0.5 + 0.5
    return 15 + seed * seed2 * 75
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '72px', padding: '0 8px' }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          flex: '0 0 auto', width: '3px', height: `${h}%`,
          background:   'rgba(28,60,100,0.28)',
          borderRadius: '2px',
          animation:    `waveBar ${0.6 + (i % 7) * 0.12}s ease-in-out ${(i % 5) * 0.08}s infinite alternate`,
        }} />
      ))}
    </div>
  )
}

function TextureCard({ texture, title, body, style }) {
  return (
    <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', aspectRatio: '1 / 1', background: '#181614', ...style }}>
      <img src={texture} alt="" aria-hidden="true" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,14,6,0.72) 0%, rgba(8,14,6,0.1) 60%, transparent 100%)' }} />
      <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(16px, 2vw, 24px)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 600, color: '#F0EDE6', margin: '0 0 6px', lineHeight: 1.2 }}>{title}</h3>
        <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 300, color: 'rgba(240,237,230,0.6)', margin: 0, lineHeight: 1.5 }}>{body}</p>
      </div>
    </div>
  )
}

export default function BentoGrid() {
  return (
    <section id="memories" style={{ background: '#ffffff', padding: 'clamp(64px, 10vh, 120px) 0' }}>
      <div className="echo-container">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px, 6vw, 64px)' }}>
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px', fontWeight: 500, letterSpacing: '0.2em', color: 'rgba(28,26,23,0.45)', textTransform: 'uppercase', marginBottom: '20px' }}>
            Everything Included
          </p>
          <h2 style={{ fontFamily: '"DM Sans", Arial, sans-serif', fontSize: 'clamp(36px, 5.5vw, 72px)', fontWeight: 200, lineHeight: 1.05, color: '#1C1A17', margin: 0, letterSpacing: '-0.02em' }}>
            Built for the stories that matter most.
          </h2>
        </div>

        {/* Grid */}
        <div>
          {/* Top row: 4 texture cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <TextureCard texture={TEXTURES.paper}   title="Daily Questions" body="One meaningful question, every day. Gets deeper over time. Never repeats." />
            <TextureCard texture={TEXTURES.leather} title="Private Archive"  body="Browse by Family, Values, Career, Lessons, Stories." />
            <TextureCard texture={TEXTURES.fabric}  title="Add Photos"       body="Attach images and captions to any memory." />
            <TextureCard texture={TEXTURES.linen}   title="Family Access"    body="Invite up to 5 family members. Control who sees what." />
          </div>

          {/* Bottom row: 2 feature cards */}
          {/* Premium label above the two cards */}
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '15px', fontWeight: 500, letterSpacing: '0.04em', color: 'rgba(28,26,23,0.75)', textTransform: 'none', marginBottom: '16px' }}>
            Premium features that make Echo different
          </p>

          {/* Clay blue premium cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            {/* Echo Conversation */}
            <ClayCard style={{ justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(28,60,100,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Echo Conversation</span>
              <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 'clamp(18px, 2.2vw, 26px)', fontWeight: 400, color: '#1C2A3A', margin: '0 0 10px', lineHeight: 1.25 }}>
                After 10 memories, your family can have a real conversation with your Echo.
              </h3>
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 300, color: 'rgba(28,60,100,0.55)', margin: '0 0 22px', lineHeight: 1.7, maxWidth: '360px' }}>
                Trained on your stories, your experiences, your way of thinking. Not a summary. It responds as you, because it learned from you.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '999px', padding: '6px 14px', boxShadow: '0 2px 8px rgba(100,160,220,0.18)' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4A90D9', boxShadow: '0 0 8px rgba(74,144,217,0.7)', display: 'inline-block' }} />
                <span style={{ fontFamily: '"DM Sans",sans-serif', fontSize: '12px', color: '#2A6099', fontWeight: 500 }}>Unlocks after 10 memories</span>
              </div>
            </ClayCard>

            {/* Voice Memories */}
            <ClayCard style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: '"DM Sans",sans-serif', fontSize: '11px', fontWeight: 600, background: 'rgba(255,255,255,0.55)', color: '#2A6099', border: '1px solid rgba(255,255,255,0.8)', padding: '5px 14px', borderRadius: '999px', boxShadow: '0 2px 8px rgba(100,160,220,0.15)' }}>Coming Soon</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <Waveform bars={44} />
              </div>
              <div>
                <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(28,60,100,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Voice Memories</span>
                <h3 style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 'clamp(18px, 2.2vw, 26px)', fontWeight: 400, color: '#1C2A3A', margin: '0 0 10px', lineHeight: 1.25 }}>
                  They hear your actual voice. Answering questions you were never asked.
                </h3>
                <p style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 300, color: 'rgba(28,60,100,0.55)', margin: 0, lineHeight: 1.7 }}>
                  Your voice, trained on your real memories. Your family can ask anything and hear you answer, in your own words, in your own voice.
                </p>
              </div>
            </ClayCard>
          </div>{/* end clay premium cards */}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          #memories .echo-container > div > div:first-child { grid-template-columns: repeat(2, 1fr) !important; }
          #memories .echo-container > div > div:last-child  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
