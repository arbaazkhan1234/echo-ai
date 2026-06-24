import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#1A1A1A">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}
function MetaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function FloatingDeco() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: '#FFD6EC', opacity: 0.65, filter: 'blur(55px)' }} />
      <div style={{ position: 'absolute', top: -50, right: -70, width: 260, height: 260, borderRadius: '50%', background: '#C8CCFF', opacity: 0.55, filter: 'blur(50px)' }} />
      <div style={{ position: 'absolute', bottom: -70, right: -50, width: 280, height: 280, borderRadius: '50%', background: '#FFE8B8', opacity: 0.55, filter: 'blur(50px)' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -70, width: 240, height: 240, borderRadius: '50%', background: '#C8F0E0', opacity: 0.50, filter: 'blur(48px)' }} />
      <svg style={{ position: 'absolute', top: '7%', right: '9%', opacity: 0.85 }} width="24" height="24" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#FFD8A8"/></svg>
      <svg style={{ position: 'absolute', top: '13%', left: '7%', opacity: 0.72 }} width="16" height="16" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#C8B4FF"/></svg>
      <svg style={{ position: 'absolute', bottom: '16%', right: '7%', opacity: 0.68 }} width="18" height="18" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#FFB4D4"/></svg>
      <svg style={{ position: 'absolute', bottom: '20%', left: '6%', opacity: 0.65 }} width="14" height="14" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#A8F0D0"/></svg>
      <div style={{ position: 'absolute', top: '23%', left: '4%', width: 42, height: 42, borderRadius: '50%', background: '#FFD6EC', boxShadow: 'inset 0 -4px 8px rgba(180,50,100,0.18),inset 0 4px 8px rgba(255,255,255,0.70)' }} />
      <div style={{ position: 'absolute', top: '28%', right: '5%', width: 34, height: 34, borderRadius: '50%', background: '#C8D8FF', boxShadow: 'inset 0 -3px 6px rgba(60,80,200,0.16),inset 0 3px 6px rgba(255,255,255,0.70)' }} />
      <div style={{ position: 'absolute', bottom: '28%', left: '5%', width: 28, height: 28, borderRadius: '50%', background: '#FFE8B0', boxShadow: 'inset 0 -3px 6px rgba(180,120,0,0.16),inset 0 3px 6px rgba(255,255,255,0.70)' }} />
    </div>
  )
}

/* ── Clay input ── */
function ClayInput({ label, type = 'text', value, onChange, icon: Icon, error, disabled, autoComplete, children }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: error ? '0.1rem' : '0.5rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        background: focused ? '#EAE0FF' : '#F0E8FF',
        borderRadius: 14, padding: '0 13px', height: 44,
        boxShadow: error
          ? 'inset 0 4px 10px rgba(200,40,40,0.14),inset 0 -3px 6px rgba(255,255,255,0.72)'
          : focused
            ? 'inset 0 4px 10px rgba(110,60,200,0.16),inset 0 -3px 6px rgba(255,255,255,0.80),0 0 0 3px rgba(154,110,216,0.18)'
            : 'inset 0 4px 10px rgba(110,60,200,0.10),inset 0 -3px 6px rgba(255,255,255,0.75)',
        border: error ? '1.5px solid rgba(200,40,40,0.28)' : 'none',
        transition: 'all 0.2s',
      }}>
        {Icon && <Icon size={16} color={error ? '#C03030' : focused ? '#7A50C8' : '#9878C8'} strokeWidth={2} style={{ flexShrink: 0 }} />}
        <input type={type} value={value} onChange={onChange} disabled={disabled} autoComplete={autoComplete} placeholder={label}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: "'Jost',sans-serif", fontSize: '0.86rem', color: '#2A1A50', fontWeight: 400 }} />
        {children}
      </div>
      {error && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', color: '#C03030', margin: '3px 0 5px 4px' }}>{error}</p>}
    </div>
  )
}

function SocialBtn({ children, onClick, disabled }) {
  return (
    <motion.button type="button" onClick={onClick} disabled={disabled}
      whileHover={{ scale: 1.07, transition: { type: 'spring', stiffness: 400, damping: 18 } }}
      whileTap={{ scale: 0.93 }}
      style={{ width: 50, height: 50, borderRadius: 15, border: 'none', background: '#FFFFFF', cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 -4px 8px rgba(120,80,200,0.10),inset 0 4px 8px rgba(255,255,255,0.90),0 7px 18px rgba(120,80,200,0.16)' }}>
      {children}
    </motion.button>
  )
}

/* ── Forgot password ── */
function ForgotPanel({ onBack }) {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSend = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setError(''); setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/dashboard` })
      if (err) setError(err.message)
      else setSent(true)
    } catch { setError('Something went wrong.') }
    setLoading(false)
  }

  return (
    <div style={{ background: '#FDF8FF', borderRadius: 32, padding: '28px 24px 24px', boxShadow: 'inset 0 -12px 24px rgba(120,70,200,0.12),inset 0 12px 24px rgba(255,255,255,0.92),0 20px 50px rgba(140,90,210,0.26)' }}>
      <button type="button" onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, color: 'rgba(42,26,80,0.45)', fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', padding: '0 0 1.1rem', transition: 'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#7A50C8'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(42,26,80,0.45)'}>
        <ArrowLeft size={13} strokeWidth={2}/> Back to sign in
      </button>
      {!sent ? (
        <>
          <h1 style={{ fontFamily: "'Jost',sans-serif", fontWeight: 800, fontSize: '1.3rem', color: '#2A1A50', margin: '0 0 0.25rem' }}>Reset Password</h1>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.80rem', color: 'rgba(42,26,80,0.50)', margin: '0 0 1.2rem' }}>We'll send a reset link to your email</p>
          {error && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', color: '#C03030', background: 'rgba(200,40,40,0.06)', borderRadius: 10, padding: '7px 11px', marginBottom: '0.7rem' }}>{error}</p>}
          <form onSubmit={handleSend} noValidate>
            <ClayInput label="Email address" type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} icon={Mail} autoComplete="email" disabled={loading} />
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ width: '100%', height: 50, borderRadius: 25, border: 'none', background: '#9A6ED8', color: '#FFF', fontFamily: "'Jost',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '0.5rem', boxShadow: 'inset 0 -5px 10px rgba(80,30,160,0.22),inset 0 5px 10px rgba(255,255,255,0.20),0 10px 26px rgba(130,80,210,0.34)' }}>
              {loading ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.85, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={16}/></motion.div>Sending…</> : 'Send Reset Link'}
            </motion.button>
          </form>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: '#D8F0C8', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 -4px 8px rgba(60,140,60,0.14),inset 0 4px 8px rgba(255,255,255,0.85),0 7px 18px rgba(80,180,80,0.20)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2A8040" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ fontFamily: "'Jost',sans-serif", fontWeight: 800, fontSize: '1.2rem', color: '#2A1A50', margin: '0 0 0.4rem' }}>Check your email</h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.80rem', color: 'rgba(42,26,80,0.50)', margin: '0 0 1rem', lineHeight: 1.55 }}>Reset link sent to <span style={{ color: '#9A6ED8', fontWeight: 700 }}>{email}</span></p>
          <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.80rem', color: 'rgba(42,26,80,0.40)', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#9A6ED8'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(42,26,80,0.40)'}>
            ← Back to sign in
          </button>
        </div>
      )}
    </div>
  )
}

function mapError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials')) return { field: 'general', text: 'Wrong email or password. Please try again.' }
  if (m.includes('email not confirmed')) return { field: 'general', text: 'Please verify your email before signing in.' }
  if (m.includes('too many') || m.includes('rate limit')) return { field: 'general', text: 'Too many attempts. Please wait a moment.' }
  return { field: 'general', text: msg || 'Something went wrong. Please try again.' }
}

export default function SignIn() {
  const navigate = useNavigate()
  const [stage, setStage]           = useState('form')
  const [email, setEmail]           = useState('')
  const [pw, setPw]                 = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [oauthLoad, setOauthLoad]   = useState(false)
  const [errors, setErrors]         = useState({})
  const [rememberMe, setRememberMe] = useState(true)

  const clear = (f) => setErrors(p => ({ ...p, [f]: '' }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format'
    if (!pw) errs.pw = 'Password is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({}); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) { const { field, text } = mapError(error.message); setErrors({ [field]: text }) }
      else {
        if (!rememberMe) {
          const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
          if (k) { sessionStorage.setItem(k, localStorage.getItem(k)); localStorage.removeItem(k) }
        }
        navigate('/dashboard')
      }
    } catch { setErrors({ general: 'Something went wrong. Please try again.' }) }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setOauthLoad(true)
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } })
    setOauthLoad(false)
  }

  return (
    <div style={{
      height: '100svh', overflow: 'hidden',
      background: 'linear-gradient(160deg, #FADFF5 0%, #EDD5FF 45%, #D5C8FF 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '16px 20px', position: 'relative',
      fontFamily: "'Jost', sans-serif",
    }}>
      <FloatingDeco />

      <div style={{ position: 'relative', width: '100%', maxWidth: 390, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <AnimatePresence mode="wait">
          {stage === 'forgot' ? (
            <motion.div key="forgot" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} style={{ width: '100%' }}>
              <ForgotPanel onBack={() => setStage('form')} />
            </motion.div>
          ) : (
            <motion.div key="signin" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

              {/* ── Echo AI clay badge ── */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 9, background: '#9A6ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 -3px 6px rgba(80,30,160,0.28),inset 0 3px 6px rgba(255,255,255,0.22),0 5px 14px rgba(130,80,210,0.35)', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', color: '#FFF', fontSize: '0.8rem', fontWeight: 700 }}>E</span>
                </div>
                <span style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: '1.15rem', color: '#2A1A50', letterSpacing: '0.01em' }}>
                  Echo <em style={{ color: '#9A6ED8', fontStyle: 'italic' }}>AI</em>
                </span>
              </div>

              {/* Character */}
              <div style={{ marginBottom: -42, position: 'relative', zIndex: 2 }}>
                <motion.img src="/cartoon.jfif" alt="Echo AI character"
                  animate={{ y: [-3, 3, -3] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ width: 88, height: 88, objectFit: 'cover', objectPosition: 'top', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.92)', boxShadow: '0 8px 22px rgba(140,80,220,0.24)', mixBlendMode: 'multiply', display: 'block' }} />
              </div>

              {/* Clay card */}
              <div style={{ background: '#FDF8FF', borderRadius: 28, padding: '50px 22px 18px', width: '100%', boxSizing: 'border-box', boxShadow: 'inset 0 -12px 24px rgba(120,70,200,0.12),inset 0 12px 24px rgba(255,255,255,0.92),0 20px 50px rgba(140,90,210,0.26)' }}>

                {/* Heading */}
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 3 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#FFD080"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                    <h1 style={{ margin: 0, fontFamily: "'Jost',sans-serif", fontWeight: 800, fontSize: '1.4rem', color: '#2A1A50', letterSpacing: '-0.02em' }}>Welcome Back!</h1>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(42,26,80,0.50)', fontWeight: 400 }}>Sign in to your Echo memories</p>
                </div>

                <AnimatePresence>
                  {errors.general && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ background: 'rgba(200,40,40,0.06)', border: '1px solid rgba(200,40,40,0.20)', borderRadius: 12, padding: '8px 12px', marginBottom: '0.7rem' }}>
                      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: '#C03030', margin: 0 }}>{errors.general}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} noValidate>
                  <ClayInput label="Email address" type="email" value={email} onChange={e => { setEmail(e.target.value); clear('email') }} icon={Mail} error={errors.email} autoComplete="email" disabled={loading} />
                  <ClayInput label="Password" type={showPw ? 'text' : 'password'} value={pw} onChange={e => { setPw(e.target.value); clear('pw') }} icon={Lock} error={errors.pw} autoComplete="current-password" disabled={loading}>
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'rgba(42,26,80,0.32)', transition: 'color 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#7A50C8'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(42,26,80,0.32)'}
                      aria-label={showPw ? 'Hide' : 'Show'}>
                      {showPw ? <EyeOff size={15} strokeWidth={1.6}/> : <Eye size={15} strokeWidth={1.6}/>}
                    </button>
                  </ClayInput>

                  {/* Remember me + Forgot */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                      <div onClick={() => setRememberMe(v => !v)}
                        style={{ width: 18, height: 18, borderRadius: 6, background: rememberMe ? '#9A6ED8' : '#EFE8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s', boxShadow: rememberMe ? 'inset 0 -2px 5px rgba(80,30,160,0.22),inset 0 2px 5px rgba(255,255,255,0.18)' : 'inset 0 3px 6px rgba(110,60,200,0.12),inset 0 -2px 4px rgba(255,255,255,0.75)', flexShrink: 0 }}>
                        {rememberMe && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(42,26,80,0.52)', fontWeight: 500 }}>Remember me</span>
                    </label>
                    <button type="button" onClick={() => setStage('forgot')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#9A6ED8', padding: 0, fontFamily: "'Jost',sans-serif", transition: 'opacity 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.65'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      Forgot password?
                    </button>
                  </div>

                  {/* Sign In button */}
                  <motion.button type="submit" disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02, transition: { type: 'spring', stiffness: 400, damping: 18 } }}
                    whileTap={{ scale: loading ? 1 : 0.97 }}
                    style={{ width: '100%', height: 46, borderRadius: 23, border: 'none', background: '#9A6ED8', color: '#FFF', fontFamily: "'Jost',sans-serif", fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.02em', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.7rem', boxShadow: 'inset 0 -5px 10px rgba(80,30,160,0.24),inset 0 5px 10px rgba(255,255,255,0.20),0 10px 28px rgba(130,80,210,0.36)' }}>
                    {loading ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.85, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={16}/></motion.div>Signing in…</> : 'Sign In'}
                  </motion.button>

                  {/* OR divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(42,26,80,0.10)' }} />
                    <span style={{ fontSize: '0.65rem', color: 'rgba(42,26,80,0.36)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600, whiteSpace: 'nowrap' }}>or continue with</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(42,26,80,0.10)' }} />
                  </div>

                  {/* Social buttons */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: '0.75rem' }}>
                    <SocialBtn onClick={handleGoogle} disabled={oauthLoad}>
                      {oauthLoad ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.85, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={15} color="#9A6ED8"/></motion.div> : <GoogleIcon />}
                    </SocialBtn>
                    <SocialBtn><AppleIcon /></SocialBtn>
                    <SocialBtn><MetaIcon /></SocialBtn>
                  </div>

                  <p style={{ textAlign: 'center', margin: 0, fontSize: '0.78rem', color: 'rgba(42,26,80,0.50)', fontWeight: 500 }}>
                    Don't have an account?{' '}
                    <Link to="/signup" style={{ color: '#9A6ED8', fontWeight: 800, textDecoration: 'none' }}>Sign Up</Link>
                  </p>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
