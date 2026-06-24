import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import WaitlistModal from '../WaitlistModal'

const PLANS = [
  {
    name:    'Free',
    price:   '$0',
    period:  'forever',
    tagline: 'Start preserving today',
    features: [
      { text: '10 meaningful questions to start',        locked: false },
      { text: 'Private memory archive',                  locked: false },
      { text: 'Search and browse your answers',          locked: false },
      { text: 'Add photos to memories',                  locked: false },
      { text: '3 Echo conversations to try it',          locked: false },
      { text: 'Unlimited Echo conversations',            locked: true  },
      { text: 'Export your complete archive',            locked: true  },
    ],
    cta:    'Get Started',
    href:   '/signup',
    accent: false,
    clay:   { bg: 'linear-gradient(160deg, #ffffff 0%, #EEF4FB 100%)', shadow: 'rgba(140,180,220,0.35)' },
  },
  {
    name:    'Basic',
    price:   '$9.99',
    period:  'per month',
    tagline: 'For dedicated memory keepers',
    features: [
      { text: 'Everything in Free',                      locked: false },
      { text: 'Unlimited Echo conversations',            locked: false },
      { text: 'Echo grows deeper with every answer',     locked: false },
      { text: 'Export your complete archive',            locked: false },
      { text: 'Priority support',                        locked: false },
    ],
    cta:    'Join the Waitlist',
    accent: true,
    clay:   { bg: 'linear-gradient(160deg, #FFF9F0 0%, #FFF0D4 100%)', shadow: 'rgba(196,151,90,0.4)' },
  },
  {
    name:    'Family',
    price:   '$19.99',
    period:  'per month',
    tagline: "Your entire family's legacy",
    features: [
      { text: 'Everything in Basic',                                                              locked: false },
      { text: 'Share Echo with up to 5 family members',                                          locked: false },
      { text: 'Each member has their own archive',                                                locked: false },
      { text: 'Echo speaks in your voice, trained on your real memories and stories',             locked: false },
      { text: 'Memorial mode',                                                                    locked: false },
    ],
    cta:    'Join the Waitlist',
    href:   '/signup',
    accent: false,
    clay:   { bg: 'linear-gradient(160deg, #ffffff 0%, #EEF4FB 100%)', shadow: 'rgba(140,180,220,0.35)' },
  },
]

const FAQS = [
  {
    q: 'How does the voice preservation work?',
    a: 'Echo records your conversations with loved ones, then uses advanced processing to create beautiful transcripts, summaries, and organised memory archives. The recordings are stored securely and privately.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes, absolutely. Cancel at any time from your account settings. Your memories and recordings are always yours. We provide full data export whenever you need it.',
  },
  {
    q: "Is my family's data private and secure?",
    a: "Your memories are encrypted end-to-end and stored on private servers. We never use your data for training or share it with third parties. This is your family's legacy. It stays yours.",
  },
  {
    q: 'What happens after a loved one passes?',
    a: 'Nothing changes. All recordings and memories remain accessible to designated family members forever, as long as your account is active. We also offer a legacy preservation plan for permanent storage.',
  },
]

/* ── Clay morphism shadow helper ── */
const clayShadow = (color) => `
  0 2px 4px rgba(255,255,255,0.85) inset,
  0 -5px 8px rgba(0,0,0,0.07) inset,
  0 16px 48px -8px ${color},
  0 6px 20px rgba(0,0,0,0.08),
  0 1px 0 rgba(255,255,255,0.9)
`

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      borderRadius: '18px',
      background: 'linear-gradient(160deg, #f8fbff 0%, #eef4fb 100%)',
      boxShadow: `0 1px 0 rgba(255,255,255,0.9) inset, 0 -3px 6px rgba(0,0,0,0.05) inset, 0 6px 24px rgba(100,160,220,0.14), 0 2px 8px rgba(0,0,0,0.05)`,
      marginBottom: '12px',
      overflow: 'hidden',
      transition: 'box-shadow 200ms ease',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '22px 28px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', gap: '16px', textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: '"DM Sans", Arial, sans-serif',
          fontSize: 'clamp(14px, 1.4vw, 16px)', fontWeight: 500,
          color: '#1C2A3A', lineHeight: 1.4,
        }}>{q}</span>
        <span style={{
          flexShrink: 0, width: '28px', height: '28px',
          background: open ? '#4A90D9' : 'rgba(74,144,217,0.12)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 280ms ease',
          transform: open ? 'rotate(45deg)' : 'none',
          color: open ? '#fff' : '#4A90D9', fontSize: '20px', lineHeight: 1,
        }}>+</span>
      </button>
      {open && (
        <p style={{
          fontFamily: '"DM Sans", Arial, sans-serif',
          fontSize: '14px', fontWeight: 300, color: '#5A7A96',
          lineHeight: 1.75, padding: '0 28px 22px', margin: 0,
        }}>{a}</p>
      )}
    </div>
  )
}

export default function Pricing() {
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  return (
    <section
      id="pricing"
      style={{
        position: 'relative',
        background: '#ffffff',
        padding: 'clamp(80px, 12vh, 140px) 0',
        overflow: 'hidden',
      }}
    >
      {/* Soft background blobs */}
      <div aria-hidden="true" style={{ position:'absolute', top:'-8%', right:'-4%', width:'480px', height:'480px', borderRadius:'50%', background:'rgba(168,200,232,0.18)', filter:'blur(90px)', pointerEvents:'none' }} />
      <div aria-hidden="true" style={{ position:'absolute', bottom:'-8%', left:'-4%', width:'400px', height:'400px', borderRadius:'50%', background:'rgba(168,200,232,0.14)', filter:'blur(80px)', pointerEvents:'none' }} />

      <div className="echo-container" style={{ position:'relative', zIndex:1 }}>

        {/* Outer clay box — straight bottom-right corner */}
        <div style={{
          borderRadius: '32px 32px 0 32px',
          background: 'linear-gradient(160deg, #C8DFF5 0%, #A8C8E8 60%, #B8D4EE 100%)',
          boxShadow: `
            0 2px 6px rgba(255,255,255,0.75) inset,
            0 -6px 12px rgba(80,140,200,0.12) inset,
            0 24px 80px -12px rgba(100,160,220,0.25),
            0 8px 32px rgba(0,0,0,0.06)
          `,
          padding: 'clamp(36px, 6vw, 72px) clamp(24px, 5vw, 60px)',
        }} className="pricing-box">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(48px, 7vw, 80px)' }}>
          <p style={{ fontFamily:'"DM Sans",sans-serif', fontSize:'11px', fontWeight:600, letterSpacing:'0.2em', color:'rgba(28,60,100,0.55)', textTransform:'uppercase', marginBottom:'16px' }}>
            Pricing
          </p>
          <h2 style={{ fontFamily:'"DM Sans",Arial,sans-serif', fontSize:'clamp(32px,5vw,60px)', fontWeight:200, color:'#1C2A3A', margin:0, lineHeight:1.15, letterSpacing:'-0.01em' }}>
            Simple pricing.<br />
            <span style={{ fontWeight:300, color:'rgba(28,60,100,0.45)' }}>Priceless memories.</span>
          </h2>
        </div>

        {/* Plan cards */}
        <div className="plans-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '24px',
          marginBottom: 'clamp(64px, 10vw, 120px)',
          alignItems: 'start',
        }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`plan-card${plan.accent ? ' plan-card-accent' : ''}`}
              style={{
                padding: 'clamp(28px, 3.5vw, 44px)',
                borderRadius: '28px',
                background: plan.clay.bg,
                boxShadow: clayShadow(plan.clay.shadow),
                position: 'relative',
                display: 'flex', flexDirection: 'column', gap: '22px',
                transform: plan.accent ? 'translateY(-10px) scale(1.02)' : 'none',
                border: 'none',
              }}
            >
              {plan.accent && (
                <div style={{
                  position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #C4975A 0%, #E8C97A 100%)',
                  color: '#fff',
                  fontSize: '10px', fontFamily: '"DM Sans", sans-serif', fontWeight: 700,
                  letterSpacing: '0.12em',
                  padding: '6px 18px', borderRadius: '999px',
                  boxShadow: '0 4px 16px rgba(196,151,90,0.45)',
                }}>MOST POPULAR</div>
              )}

              {/* Plan name + price */}
              <div>
                <div style={{
                  fontFamily: '"DM Sans", sans-serif', fontSize: '12px', fontWeight: 600,
                  color: plan.accent ? '#C4975A' : 'rgba(28,60,100,0.5)',
                  letterSpacing: '0.1em', marginBottom: '10px', textTransform: 'uppercase',
                }}>{plan.name}</div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="plan-price" style={{
                    fontFamily: '"DM Sans", Arial, sans-serif',
                    fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 300,
                    color: '#1C2A3A', lineHeight: 1,
                  }}>{plan.price}</span>
                  <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '13px', color: 'rgba(28,60,100,0.45)' }}>
                    / {plan.period}
                  </span>
                </div>
                <p style={{
                  fontFamily: '"DM Sans", sans-serif', fontSize: '13px',
                  color: 'rgba(28,60,100,0.5)', marginTop: '6px', marginBottom: 0,
                }}>{plan.tagline}</p>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: plan.accent ? 'rgba(196,151,90,0.2)' : 'rgba(140,180,220,0.3)', borderRadius:'2px' }} />

              {/* Features */}
              <ul className="plan-features" style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:'11px', flex:1 }}>
                {plan.features.map((f, fi) => (
                  <li key={fi} style={{ display:'flex', alignItems:'flex-start', gap:'10px', opacity: f.locked ? 0.4 : 1 }}>
                    <span style={{
                      flexShrink: 0, marginTop: '2px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: f.locked
                        ? 'rgba(0,0,0,0.08)'
                        : plan.accent ? 'rgba(196,151,90,0.15)' : 'rgba(74,144,217,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px',
                      color: f.locked ? 'rgba(0,0,0,0.3)' : plan.accent ? '#C4975A' : '#4A90D9',
                    }}>{f.locked ? '🔒' : '✓'}</span>
                    <span style={{
                      fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
                      color: f.locked ? 'rgba(42,61,82,0.5)' : '#2A3D52',
                      lineHeight: 1.5, fontWeight: 300,
                      display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
                    }}>
                      {f.text}
                      {f.soon && (
                        <span style={{
                          fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em',
                          color: plan.accent ? '#C4975A' : '#4A90D9',
                          background: plan.accent ? 'rgba(196,151,90,0.12)' : 'rgba(74,144,217,0.1)',
                          borderRadius: '999px', padding: '2px 7px',
                          textTransform: 'uppercase',
                        }}>Soon</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.cta === 'Join the Waitlist' ? (
                <button
                  onClick={() => setWaitlistOpen(true)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'center', padding: '15px 24px',
                    borderRadius: '999px',
                    background: 'rgba(74,144,217,0.12)',
                    boxShadow: '0 2px 8px rgba(74,144,217,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
                    color: '#2A6099',
                    fontFamily: '"DM Sans", sans-serif', fontSize: '14px', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 250ms ease', marginTop: 'auto',
                    border: '1px solid rgba(74,144,217,0.25)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'none' }}
                >
                  {plan.cta}
                </button>
              ) : (
                <Link
                  to={plan.href}
                  style={{
                    display: 'block', textAlign: 'center', padding: '15px 24px',
                    borderRadius: '999px',
                    background: plan.accent
                      ? 'linear-gradient(135deg, #C4975A 0%, #E0B870 100%)'
                      : 'rgba(74,144,217,0.12)',
                    boxShadow: plan.accent
                      ? '0 4px 20px rgba(196,151,90,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                      : '0 2px 8px rgba(74,144,217,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
                    color: plan.accent ? '#fff' : '#2A6099',
                    fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
                    fontWeight: plan.accent ? 600 : 500,
                    cursor: 'pointer', transition: 'all 250ms ease',
                    textDecoration: 'none', marginTop: 'auto',
                    border: plan.accent ? 'none' : '1px solid rgba(74,144,217,0.25)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'none' }}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h3 style={{
            fontFamily: '"DM Sans", Arial, sans-serif',
            fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 300,
            color: '#1C2A3A', marginBottom: '32px', textAlign: 'center',
          }}>Questions</h3>
          {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
        </div>

        {/* /outer clay box */}
        </div>
      </div>

      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      <style>{`
        @media (max-width: 767px) {
          /* outer box tighter padding */
          #pricing .pricing-box { padding: 24px 18px !important; }

          /* stack plan cards 1 column */
          #pricing .plans-grid { grid-template-columns: 1fr !important; gap: 16px !important; }

          /* un-elevate accent card on mobile */
          #pricing .plan-card-accent { transform: none !important; }

          /* compact card padding */
          #pricing .plan-card { padding: 22px 20px !important; gap: 16px !important; }

          /* tighter feature list */
          #pricing .plan-features { gap: 8px !important; }

          /* smaller price number */
          #pricing .plan-price { font-size: 40px !important; }
        }
      `}</style>
    </section>
  )
}
