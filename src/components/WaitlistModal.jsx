import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sanitizeText, validateEmail, LIMITS } from '../lib/sanitize'

const ENDPOINT =
  'https://docs.google.com/forms/u/0/d/e/1FAIpQLScrVAzS7o9hNDdBmdo8JiR8l8hh6q0brblH5nlh23dfSXHO8A/formResponse'

const OPTIONS = [
  'My parents or grandparents',
  'Myself',
  'My whole family',
  'Other',
]

const INPUT_STYLE = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '11px 14px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '14px',
  color: '#F0EDE6',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.18s',
}

export default function WaitlistModal({ open, onClose }) {
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [option,    setOption]    = useState('')
  const [otherText, setOtherText] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)

  const reset = () => {
    setName(''); setEmail(''); setOption(''); setOtherText('')
    setLoading(false); setSuccess(false)
  }

  const handleClose = () => { onClose(); setTimeout(reset, 300) }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate before sending
    const cleanName  = sanitizeText(name,  LIMITS.NAME)
    const cleanEmail = sanitizeText(email, LIMITS.EMAIL)
    const cleanOther = sanitizeText(otherText, 200)
    if (!cleanName)                    return
    if (!validateEmail(cleanEmail))    return
    if (option === 'Other' && !cleanOther) return

    setLoading(true)

    const questionValue = option === 'Other' ? cleanOther : option

    const formData = new URLSearchParams()
    formData.append('entry.2035103360', cleanName)
    formData.append('entry.689995910',  cleanEmail)
    formData.append('entry.1460311985', questionValue)

    await fetch(ENDPOINT, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    formData,
    })

    setLoading(false)
    setSuccess(true)
    // Auto-close after 3 s
    setTimeout(handleClose, 3000)
  }

  const canSubmit = name.trim() && email.trim() && option &&
    (option !== 'Other' || otherText.trim())

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '440px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#1C1914',
              borderRadius: '22px',
              border: '1px solid rgba(196,151,90,0.22)',
              padding: '24px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(196,151,90,0.08)',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'rgba(240,237,230,0.45)', fontSize: '18px', lineHeight: 1,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#F0EDE6' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(240,237,230,0.45)' }}
            >×</button>

            <AnimatePresence mode="wait">

              {/* ── SUCCESS STATE ── */}
              {success ? (
                <motion.div key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{    opacity: 0 }}
                  style={{ textAlign: 'center', padding: '24px 0' }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: 'rgba(106,182,106,0.15)',
                      border: '1px solid rgba(106,182,106,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6AB66A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '20px', fontWeight: 500, color: '#F0EDE6', margin: '0 0 8px' }}>
                    You're on the list.
                  </p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '13px', color: 'rgba(240,237,230,0.45)', margin: 0 }}>
                    We'll reach out when it's ready.
                  </p>
                </motion.div>

              ) : (

              /* ── FORM ── */
              <motion.form key="form" onSubmit={handleSubmit}
                initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                {/* Header */}
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,151,90,0.7)', margin: '0 0 6px' }}>
                    Early Access
                  </p>
                  <h3 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '20px', fontWeight: 300, color: '#F0EDE6', margin: '0 0 4px', lineHeight: 1.2 }}>
                    Join the waitlist
                  </h3>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '12px', fontWeight: 300, color: 'rgba(240,237,230,0.45)', margin: 0, lineHeight: 1.5 }}>
                    Be first to know when Family Access and Voice Memories launch.
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '12px', fontWeight: 500, color: 'rgba(240,237,230,0.55)', display: 'block', marginBottom: '6px' }}>
                    Your name
                  </label>
                  <input
                    type="text" required value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    style={INPUT_STYLE}
                    onFocus={e => e.target.style.borderColor = 'rgba(196,151,90,0.5)'}
                    onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '12px', fontWeight: 500, color: 'rgba(240,237,230,0.55)', display: 'block', marginBottom: '6px' }}>
                    Email address
                  </label>
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    style={INPUT_STYLE}
                    onFocus={e => e.target.style.borderColor = 'rgba(196,151,90,0.5)'}
                    onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                </div>

                {/* Who are you preserving memories for */}
                <div>
                  <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '12px', fontWeight: 500, color: 'rgba(240,237,230,0.55)', display: 'block', marginBottom: '10px' }}>
                    Who are you preserving memories for?
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {OPTIONS.map(opt => (
                      <label key={opt} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                        background: option === opt ? 'rgba(196,151,90,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${option === opt ? 'rgba(196,151,90,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        transition: 'all 0.15s',
                      }}>
                        <input
                          type="radio" name="who" value={opt}
                          checked={option === opt}
                          onChange={() => setOption(opt)}
                          style={{ accentColor: '#C4975A', width: '15px', height: '15px', flexShrink: 0 }}
                        />
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '13px', color: option === opt ? '#F0EDE6' : 'rgba(240,237,230,0.6)', fontWeight: option === opt ? 400 : 300 }}>
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Free-text for Other */}
                  <AnimatePresence>
                    {option === 'Other' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden', marginTop: '8px' }}
                      >
                        <input
                          type="text" required value={otherText}
                          onChange={e => setOtherText(e.target.value)}
                          placeholder="Tell us who..."
                          style={INPUT_STYLE}
                          onFocus={e => e.target.style.borderColor = 'rgba(196,151,90,0.5)'}
                          onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={!canSubmit || loading}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    height: '48px', borderRadius: '999px', border: 'none',
                    background: canSubmit ? 'linear-gradient(135deg,#C4975A,#E0B870)' : 'rgba(196,151,90,0.2)',
                    color: canSubmit ? '#1C1A14' : 'rgba(196,151,90,0.4)',
                    fontFamily: "'DM Sans',sans-serif", fontSize: '14px', fontWeight: 600,
                    cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: canSubmit ? '0 4px 20px rgba(196,151,90,0.3)' : 'none',
                  }}
                >
                  {loading
                    ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(28,26,20,0.3)', borderTopColor: '#1C1A14', borderRadius: '50%' }} />Submitting…</>
                    : 'Join the Waitlist'}
                </motion.button>
              </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
