import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePWAInstall } from '../../hooks/usePWAInstall'

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Memories',     href: '#memories'     },
  { label: 'Pricing',      href: '#pricing'      },
]

/* Warm wood-toned pill box */
const woodBox = {
  background:     'rgba(101, 67, 33, 0.35)',
  border:         '1px solid rgba(196,151,90,0.28)',
  borderRadius:   '999px',
  backdropFilter: 'blur(16px) saturate(140%)',
  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
  boxShadow:      'inset 0 1px 0 rgba(196,151,90,0.12), 0 2px 16px rgba(0,0,0,0.25)',
}

export default function Navbar() {
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [showTip,   setShowTip]   = useState(false)
  const lastY    = useRef(0)
  const [visible, setVisible] = useState(true)
  const { canInstall, isIOS, install, promptEvt } = usePWAInstall()

  const handleInstallClick = () => {
    if (promptEvt) { install(); return }
    setShowTip(t => !t)
  }

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setVisible(y < lastY.current || y < 120)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNav = (href) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          position:   'fixed',
          top:        0,
          left:       0,
          right:      0,
          zIndex:     1000,
          padding:    '0 clamp(24px, 5vw, 60px)',
          height:     '72px',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          transform:  visible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 650ms cubic-bezier(0.25,0.46,0.45,0.94)',
          animation:  'navReveal 1s cubic-bezier(0.25,0.46,0.45,0.94) 2.8s both',
        }}
      >
        {/* ── Logo — prominent, living brand name ── */}
        <Link
          to="/"
          aria-label="Echo home"
          style={{
            fontFamily:         '"Cormorant Garamond", Georgia, serif',
            fontStyle:          'italic',
            fontSize:           '32px',
            fontWeight:         600,
            letterSpacing:      '0.06em',
            cursor:             'pointer',
            flexShrink:         0,
            /* Gold shimmer sweep */
            background:         'linear-gradient(90deg, #C4975A 0%, #F0EDE6 30%, #E8C97A 50%, #F0EDE6 70%, #C4975A 100%)',
            backgroundSize:     '300% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip:     'text',
            animation:          'echoShimmer 4s linear infinite, echoBreathe 3s ease-in-out infinite',
            display:            'inline-block',
          }}
        >
          Echo
        </Link>

        {/* ── Center nav — wooden pill box ── */}
        <div
          className="hidden md:flex items-center"
          style={{
            ...woodBox,
            gap:     '4px',
            padding: '6px 8px',
          }}
        >
          {NAV_LINKS.map(({ label, href }) => (
            <button
              key={label}
              onClick={() => handleNav(href)}
              style={{
                fontFamily:    '"DM Sans", Arial, sans-serif',
                fontSize:      '12px',
                fontWeight:    500,
                letterSpacing: '0.04em',
                color:         'rgba(240,237,230,0.72)',
                background:    'none',
                border:        'none',
                cursor:        'pointer',
                padding:       '7px 16px',
                borderRadius:  '999px',
                transition:    'background 200ms ease, color 200ms ease',
                minHeight:     '36px',
                whiteSpace:    'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(196,151,90,0.14)'
                e.currentTarget.style.color      = '#F0EDE6'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color      = 'rgba(240,237,230,0.72)'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Right actions — wooden pill box ── */}
        <div
          className="hidden md:flex items-center"
          style={{
            ...woodBox,
            gap:     '4px',
            padding: '6px 8px',
          }}
        >
          <Link
            to="/signin"
            style={{
              fontFamily:  '"DM Sans", Arial, sans-serif',
              fontSize:    '12px',
              fontWeight:  400,
              color:       'rgba(240,237,230,0.65)',
              cursor:      'pointer',
              padding:     '7px 16px',
              borderRadius:'999px',
              transition:  'background 200ms ease, color 200ms ease',
              minHeight:   '36px',
              display:     'flex',
              alignItems:  'center',
              whiteSpace:  'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(196,151,90,0.14)'
              e.currentTarget.style.color      = '#F0EDE6'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color      = 'rgba(240,237,230,0.65)'
            }}
          >
            Sign in
          </Link>

          {canInstall && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={isIOS ? undefined : handleInstallClick}
                title={isIOS ? 'Tap Share → Add to Home Screen' : 'Install Echo as an app'}
                style={{
                  fontFamily:   '"DM Sans", Arial, sans-serif',
                  fontSize:     '12px',
                  fontWeight:   600,
                  color:        '#1C1A17',
                  background:   '#C4975A',
                  border:       'none',
                  borderRadius: '999px',
                  padding:      '7px 16px',
                  cursor:       'pointer',
                  minHeight:    '36px',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '5px',
                  whiteSpace:   'nowrap',
                  transition:   'background 200ms ease, transform 150ms ease',
                  boxShadow:    '0 2px 8px rgba(196,151,90,0.35)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#D4A96A'
                  e.currentTarget.style.transform  = 'scale(1.03)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#C4975A'
                  e.currentTarget.style.transform  = 'scale(1)'
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Get App
              </button>
              {showTip && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  background: '#1A1530', border: '1px solid rgba(201,168,76,0.3)',
                  borderRadius: 14, padding: '12px 14px', width: 230,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  fontFamily: '"DM Sans", Arial, sans-serif', zIndex: 999,
                }}>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#F0EDE6' }}>Install Echo</p>
                  {isIOS
                    ? <p style={{ margin: 0, fontSize: 12, color: 'rgba(240,237,230,0.6)', lineHeight: 1.5 }}>Tap the <strong style={{ color: '#C9A84C' }}>Share</strong> button in Safari, then <strong style={{ color: '#C9A84C' }}>Add to Home Screen</strong>.</p>
                    : <p style={{ margin: 0, fontSize: 12, color: 'rgba(240,237,230,0.6)', lineHeight: 1.5 }}>Look for the <strong style={{ color: '#C9A84C' }}>install icon ⊕</strong> in your browser's address bar and click it.</p>
                  }
                  <button onClick={() => setShowTip(false)} style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(240,237,230,0.35)', padding: 0 }}>Dismiss</button>
                </div>
              )}
            </div>
          )}

          <Link
            to="/signup"
            style={{
              fontFamily:    '"DM Sans", Arial, sans-serif',
              fontSize:      '12px',
              fontWeight:    500,
              color:         '#1C1A17',
              background:    '#C4975A',
              borderRadius:  '999px',
              padding:       '7px 20px',
              cursor:        'pointer',
              transition:    'background 250ms ease, transform 150ms ease',
              minHeight:     '36px',
              display:       'flex',
              alignItems:    'center',
              whiteSpace:    'nowrap',
              boxShadow:     '0 2px 8px rgba(196,151,90,0.35)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#D4A96A'
              e.currentTarget.style.transform  = 'scale(1.03)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#C4975A'
              e.currentTarget.style.transform  = 'scale(1)'
            }}
          >
            Start Free
          </Link>
        </div>

        {/* ── Hamburger — mobile ── */}
        <button
          className="flex md:hidden flex-col justify-center items-center"
          style={{ width: '44px', height: '44px', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              display: 'block', width: '22px', height: '1.5px',
              background: '#F0EDE6', borderRadius: '99px', transition: 'all 300ms ease',
              opacity:   i === 1 && menuOpen ? 0 : 1,
              transform: menuOpen && i === 0 ? 'translateY(6.5px) rotate(45deg)' :
                         menuOpen && i === 2 ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
            }} />
          ))}
        </button>
      </nav>

      {/* ── Mobile full-screen menu ── */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(10,9,7,0.97)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px',
        }}>
          {NAV_LINKS.map(({ label, href }) => (
            <button key={label} onClick={() => handleNav(href)} style={{
              fontFamily: '"DM Sans", Arial, sans-serif', fontSize: '32px', fontWeight: 300,
              color: '#F0EDE6', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
            }}>
              {label}
            </button>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginTop: '24px' }}>
            <Link to="/signin" onClick={() => setMenuOpen(false)}
              style={{ fontFamily: '"DM Sans",sans-serif', fontSize: '14px', color: 'rgba(240,237,230,0.55)', cursor: 'pointer' }}>
              Sign in
            </Link>
            <Link to="/signup" onClick={() => setMenuOpen(false)}
              style={{ fontFamily: '"DM Sans",sans-serif', fontSize: '14px', fontWeight: 500, color: '#1C1A17', background: '#C4975A', borderRadius: '999px', padding: '14px 40px', cursor: 'pointer' }}>
              Start Free
            </Link>
            {canInstall && (
              <button
                onClick={() => { setMenuOpen(false); isIOS ? null : install() }}
                style={{ fontFamily: '"DM Sans",sans-serif', fontSize: '13px', color: 'rgba(196,151,90,0.8)', background: 'rgba(196,151,90,0.1)', border: '1px solid rgba(196,151,90,0.25)', borderRadius: '999px', padding: '10px 28px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {isIOS ? 'Add to Home Screen' : 'Install Echo'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
