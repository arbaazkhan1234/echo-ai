import { Link } from 'react-router-dom'

const LINKS = {
  Product: [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing',      href: '#pricing'      },
    { label: 'Dashboard',    to:   '/dashboard'    },
  ],
  Company: [
    { label: 'About',   href: '#' },
    { label: 'Privacy', href: '#' },
    { label: 'Terms',   href: '#' },
  ],
  Connect: [
    { label: 'Sign Up',  to: '/signup'  },
    { label: 'Sign In',  to: '/signin'  },
    { label: 'Support',  href: '#'      },
  ],
}

export default function Footer() {
  const handleScroll = (href) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <footer style={{
      background:  '#291210',
      borderTop:   '1px solid rgba(255,255,255,0.06)',
      padding:     'clamp(48px, 7vw, 80px) 0 40px',
    }}>
      <div className="echo-container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: 'clamp(32px, 4vw, 60px)',
          marginBottom: 'clamp(40px, 6vw, 64px)',
        }}>
          {/* Brand column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link
              to="/"
              style={{
                fontFamily:    '"DM Sans", Arial, sans-serif',
                fontStyle:     'normal',
                fontSize:      '28px',
                fontWeight:    300,
                color:         '#F0EDE6',
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              Echo
            </Link>
            <p style={{
              fontFamily: '"DM Sans", Arial, sans-serif',
              fontSize:   '14px',
              fontWeight: 300,
              color:      'rgba(240,220,210,0.5)',
              lineHeight: 1.6,
              maxWidth:   '240px',
              margin:     0,
            }}>
              Preserve the voices, stories, and wisdom of the people you love, before they fade.
            </p>
            {/* Green rule */}
            <div style={{ width: '32px', height: '1px', background: 'rgba(220,160,140,0.4)' }} />
          </div>

          {/* Nav columns */}
          {Object.entries(LINKS).map(([category, items]) => (
            <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                fontFamily:    '"DM Sans", Arial, sans-serif',
                fontSize:      '11px',
                fontWeight:    600,
                letterSpacing: '0.12em',
                color:         'rgba(220,160,140,0.7)',
                textTransform: 'uppercase',
                marginBottom:  '4px',
              }}>{category}</div>

              {items.map(({ label, href, to }) =>
                to ? (
                  <Link
                    key={label}
                    to={to}
                    style={{
                      fontFamily: '"DM Sans", Arial, sans-serif',
                      fontSize:   '14px',
                      fontWeight: 300,
                      color:      'rgba(240,220,210,0.5)',
                      cursor: 'pointer',
                      transition: 'color 200ms ease',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F0EDE6'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,220,210,0.5)'}
                  >
                    {label}
                  </Link>
                ) : (
                  <button
                    key={label}
                    onClick={() => href.startsWith('#') ? handleScroll(href) : undefined}
                    style={{
                      fontFamily:  '"DM Sans", Arial, sans-serif',
                      fontSize:    '14px',
                      fontWeight:  300,
                      color:       'rgba(240,220,210,0.5)',
                      background:  'none',
                      border:      'none',
                      padding:     0,
                      cursor: 'pointer',
                      textAlign:   'left',
                      transition:  'color 200ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F0EDE6'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,220,210,0.5)'}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop:      '1px solid rgba(255,255,255,0.06)',
          paddingTop:     '32px',
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          flexWrap:       'wrap',
          gap:            '12px',
        }}>
          <span style={{
            fontFamily: '"DM Sans", Arial, sans-serif',
            fontSize:   '13px',
            color:      'rgba(240,220,210,0.35)',
          }}>
            © {new Date().getFullYear()} Echo. All rights reserved.
          </span>
          <span style={{
            fontFamily:    '"DM Sans", Arial, sans-serif',
            fontSize:      '12px',
            color:         'rgba(240,220,210,0.28)',
            letterSpacing: '0.04em',
          }}>
            Memory lives on.
          </span>
        </div>
      </div>
    </footer>
  )
}
