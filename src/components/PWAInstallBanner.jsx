import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share } from 'lucide-react'

const DISMISSED_KEY = 'echo_pwa_banner_dismissed'

export default function PWAInstallBanner() {
  const [prompt,    setPrompt]    = useState(null)   // BeforeInstallPromptEvent
  const [show,      setShow]      = useState(false)
  const [isIOS,     setIsIOS]     = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    /* Already installed — running as standalone */
    if (window.matchMedia('(display-mode: standalone)').matches) return

    /* Already dismissed this session */
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    if (ios) {
      /* iOS: no beforeinstallprompt, show manual instructions after 3s */
      const t = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(t)
    }

    /* Chrome / Edge / Samsung: capture the prompt */
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    /* Hide if user installs via browser UI */
    window.addEventListener('appinstalled', () => {
      setShow(false)
      setInstalled(true)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    setShow(false)
    sessionStorage.setItem(DISMISSED_KEY, '1')
  }

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShow(false)
  }

  if (installed) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{    y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          style={{
            position:        'fixed',
            bottom:          'env(safe-area-inset-bottom, 16px)',
            left:            '50%',
            transform:       'translateX(-50%)',
            marginBottom:    16,
            width:           'calc(100% - 32px)',
            maxWidth:        420,
            zIndex:          9999,
            background:      'rgba(10,9,20,0.96)',
            backdropFilter:  'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border:          '1px solid rgba(201,168,76,0.25)',
            borderRadius:    20,
            padding:         '14px 16px',
            boxShadow:       '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.08)',
            display:         'flex',
            alignItems:      'center',
            gap:             12,
          }}
        >
          {/* App icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#0A0914',
            border: '1px solid rgba(201,168,76,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 64 64" width="28" height="28">
              <rect x="14" y="11" width="8"  height="42" rx="2" fill="#C9A84C"/>
              <rect x="14" y="11" width="36" height="8"  rx="2" fill="#C9A84C"/>
              <rect x="14" y="28" width="28" height="7"  rx="2" fill="#C9A84C"/>
              <rect x="14" y="45" width="36" height="8"  rx="2" fill="#C9A84C"/>
            </svg>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: '0.92rem', color: '#F0EDE6', lineHeight: 1.2 }}>
              Add Echo to your home screen
            </p>
            <p style={{ margin: '3px 0 0', fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', color: 'rgba(240,237,230,0.45)', lineHeight: 1.4 }}>
              {isIOS
                ? 'Tap the share button, then "Add to Home Screen"'
                : 'Install for quick access, offline support & full-screen'}
            </p>
          </div>

          {/* Action */}
          {isIOS ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Share size={16} color="rgba(240,237,230,0.45)" strokeWidth={1.8} />
              <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(240,237,230,0.4)', display: 'flex' }}>
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <motion.button
                onClick={install}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 34, padding: '0 14px',
                  background: 'linear-gradient(135deg,#A8854E,#C9A84C)',
                  border: 'none', borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', fontWeight: 700,
                  color: '#0A0914', letterSpacing: '0.02em',
                }}
              >
                <Download size={13} strokeWidth={2.5} />
                Install
              </motion.button>
              <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(240,237,230,0.4)', display: 'flex' }}>
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
