import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, ImagePlus, Home, Archive, MessageCircle, Settings,
  LogOut, ChevronDown, Flame, Lock, Check, Search, X, ChevronRight,
  Loader2, Calendar, BookOpen, Bell, Shield, Users, Heart,
  AlertCircle, Sparkles, Send, Edit3, Trash2, Camera, Mail, Sun,
  Download, Share2,
} from 'lucide-react'
import { supabase }                              from '../lib/supabase'
import { validateImageFile, LIMITS }            from '../lib/sanitize'
import WaitlistModal                             from '../components/WaitlistModal'
import { usePWAInstall }                        from '../hooks/usePWAInstall'
import { getTodaysQuestion, getTodaysBonusQuestion, categorizeAnswer } from '../lib/questionGenerator'
import EchoProgress                              from '../components/dashboard/EchoProgress'
import { ensureProfile, updateStreak }           from '../lib/streakManager'
import { callGemini }                            from '../lib/gemini'
import {
  cloneVoice, generateVoiceAudio, previewVoice,
  deleteElevenLabsVoice, getVoiceUsage, addVoiceUsage,
} from '../lib/elevenLabs'

/* ── Photo utilities (module-level, no React deps) ── */
function compressImage(file) {
  return new Promise((resolve) => {
    const MAX = 1200
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round(height * MAX / width); width = MAX }
        else                  { width  = Math.round(width  * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.82)
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

async function uploadPhotoToStorage(blob, userId, originalName = 'photo') {
  const safeName = originalName.replace(/[^a-z0-9.]/gi, '_').toLowerCase()
  const path = `${userId}/${Date.now()}_${safeName}`
  const { error } = await supabase.storage
    .from('memory-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('memory-photos').getPublicUrl(path)
  return publicUrl
}

/* ══════════════════════════════════════════════════════════════
   VOICE RECORDER HOOK
   — MediaRecorder for audio file
   — Web Speech API for live transcript
   — Web Audio API for waveform visualisation
══════════════════════════════════════════════════════════════ */
function useVoiceRecorder({ setAnswer, addToast }) {
  const [recording,     setRecording]     = useState(false)
  const [transcribing,  setTranscribing]  = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [waveformData,  setWaveformData]  = useState(new Array(24).fill(0))
  const [audioBlob,     setAudioBlob]     = useState(null)

  const mediaRecorderRef = useRef(null)
  const streamRef        = useRef(null)
  const audioCtxRef      = useRef(null)
  const analyserRef      = useRef(null)
  const animFrameRef     = useRef(null)
  const chunksRef        = useRef([])

  /* ── Timer while recording ── */
  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setRecordingTime(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [recording])

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  /* ── Whisper transcription via groq-proxy edge function ── */
  const transcribeWithGroq = async (blob) => {
    setTranscribing(true)
    try {
      // Convert blob → base64 so it can travel as JSON through the edge function
      const arrayBuffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const audio_base64 = btoa(binary)

      const { data, error } = await supabase.functions.invoke('groq-proxy', {
        body: { action: 'transcribe', audio_base64, audio_filename: 'recording.webm' },
      })

      if (error) throw new Error(error.message)
      const text = data?.text?.trim()

      if (text) {
        setAnswer(text)
        addToast('Voice transcribed. Review and save when ready.', 'success', Check)
      } else {
        addToast('No speech detected — please try again.', 'error', AlertCircle)
      }
    } catch (err) {
      console.error('Transcription error:', err)
      addToast('Transcription failed. You can still type your answer.', 'error', AlertCircle)
    }
    setTranscribing(false)
  }

  /* ── Start recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      /* MediaRecorder — collects audio chunks */
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        await transcribeWithGroq(blob)   // send to Groq Whisper
      }
      mr.start(100)
      mediaRecorderRef.current = mr

      /* Web Audio API — waveform visualisation only */
      const ctx      = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      ctx.createMediaStreamSource(stream).connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser

      const dataArr = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(dataArr)
        setWaveformData([...dataArr.slice(0, 24)])
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()

      setRecording(true)
      setRecordingTime(0)
      setAudioBlob(null)

    } catch (err) {
      addToast(
        err.name === 'NotAllowedError'
          ? 'Microphone access denied — allow it in browser settings and try again.'
          : 'Could not start recording. Please try again.',
        'error', AlertCircle
      )
    }
  }

  /* ── Stop recording (triggers Groq transcription via onstop) ── */
  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null

    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    cancelAnimationFrame(animFrameRef.current)
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null

    setRecording(false)
    setRecordingTime(0)
    setWaveformData(new Array(24).fill(0))
  }

  const toggleRecording = () => recording ? stopRecording() : startRecording()

  /* Clean up on unmount */
  useEffect(() => () => { if (recording) stopRecording() }, [])

  return { recording, transcribing, recordingTime, waveformData, formatTime, audioBlob, setAudioBlob, toggleRecording }
}

/* ══════════════════════════════════════════════════════════════
   ONLINE STATUS HOOK
══════════════════════════════════════════════════════════════ */
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  useEffect(() => {
    const goOnline  = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return isOnline
}

/* ══════════════════════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════════════════════ */
const GOLD     = '#C96282'
const GOLD_DIM = 'rgba(201,98,130,0.10)'
const GOLD_A   = 'rgba(201,98,130,0.20)'
const BG       = '#FAF5FD'
const SURFACE  = '#FFFFFF'
const SURF_UP  = '#F5EDF9'
const BORDER   = 'rgba(0,0,0,0.10)'
const BORDER_A = 'rgba(201,98,130,0.22)'
const TEXT     = '#1A1530'
const MUTED    = 'rgba(26,21,48,0.58)'
const DIM      = 'rgba(26,21,48,0.28)'
const SUCCESS  = '#4DAA57'
const ECHO_AT  = import.meta.env.VITE_DEV_MODE === 'true' ? 3 : 10
const MIN_ANSWER_CHARS = 50

/* ══════════════════════════════════════════════════════════════
   CATEGORY STYLES  (matches Gemini output categories)
══════════════════════════════════════════════════════════════ */
const CAT_STYLES = {
  'Family':        { bg: 'rgba(201,98,130,0.10)',  text: '#C96282' },
  'Relationships': { bg: 'rgba(155,126,222,0.12)', text: '#7C5CB8' },
  'Happiness':     { bg: 'rgba(255,167,38,0.10)',  text: '#D4820A' },
  'Wisdom':        { bg: 'rgba(38,198,218,0.10)',  text: '#0097A7' },
  'Hardship':      { bg: 'rgba(107,140,174,0.12)', text: '#4A6A8A' },
  'Identity':      { bg: 'rgba(141,110,99,0.10)',  text: '#6D4C41' },
  'Regrets':       { bg: 'rgba(120,80,120,0.10)',  text: '#7B3F7B' },
}
const catStyle = (cat) => CAT_STYLES[cat] || { bg: GOLD_DIM, text: MUTED }

const ALL_CATEGORIES = ['All', 'Family', 'Relationships', 'Hardship', 'Happiness', 'Wisdom', 'Identity', 'Regrets']

const NAV = [
  { id: 'home',     label: 'Home',      Icon: Home          },
  { id: 'archive',  label: 'Archive',   Icon: Archive       },
  { id: 'echo',     label: 'Echo Chat', Icon: MessageCircle },
  { id: 'settings', label: 'Settings',  Icon: Settings      },
]

/* ══════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════ */
function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtShort(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function getGreeting(name) {
  const h = new Date().getHours()
  if (h < 5)  return `Still up, ${name}?`
  if (h < 12) return `Good morning, ${name}`
  if (h < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}
function todayISO() {
  return new Date().toISOString().split('T')[0]
}

/* ══════════════════════════════════════════════════════════════
   PHOTO PROMPT MODAL
   Shown when user saves without selecting a photo
══════════════════════════════════════════════════════════════ */
function PhotoPromptModal({ onSelectPhoto, onSkip }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,9,20,0.88)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 24px' }}>
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '1.75rem 1.5rem', maxWidth: 420, width: '100%', boxShadow: '0 -8px 48px rgba(0,0,0,0.4)' }}>

        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: GOLD_DIM, border: `1px solid ${BORDER_A}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImagePlus size={22} color={GOLD} strokeWidth={1.5} />
          </div>
        </div>

        <h3 style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: '1.3rem', color: TEXT, margin: '0 0 0.5rem', textAlign: 'center' }}>
          Add a photo?
        </h3>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.85rem', color: MUTED, lineHeight: 1.7, margin: '0 0 1.5rem', textAlign: 'center' }}>
          Photos make memories richer. Pick one from your camera, gallery, or files — or skip and save as is.
        </p>

        {/* Add photo — label wraps hidden input (works for camera + gallery + files) */}
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, background: `linear-gradient(135deg,#A8854E,${GOLD})`, borderRadius: 13, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.9rem', fontWeight: 700, color: '#0A0914', marginBottom: 10, touchAction: 'manipulation' }}>
          <input type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { onSelectPhoto(f); e.target.value = '' } }}
          />
          <ImagePlus size={17} strokeWidth={2} />
          Add a photo
        </label>

        <button type="button" onClick={onSkip}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 50, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 13, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.88rem', color: MUTED, touchAction: 'manipulation', transition: 'background 0.18s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
          Save without photo
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   DEV RESET BUTTON
   Only renders when VITE_DEV_MODE=true in .env
   Deletes all test data for the current user in one click
══════════════════════════════════════════════════════════════ */
function DevResetButton({ onReset, loading }) {
  const [stage, setStage] = useState('idle') // idle | confirm | resetting

  if (import.meta.env.VITE_DEV_MODE !== 'true') return null

  return (
    <div style={{
      position: 'fixed', bottom: 76, right: 14, zIndex: 500,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
    }}>
      <AnimatePresence mode="wait">

        {stage === 'idle' && (
          <motion.button key="idle"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
            type="button" onClick={() => setStage('confirm')}
            title="Developer reset — deletes all test data"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', background: 'rgba(10,9,20,0.92)', border: '1px solid rgba(224,82,82,0.35)', borderRadius: 8, cursor: 'pointer', backdropFilter: 'blur(12px)', color: 'rgba(224,82,82,0.7)', fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(224,82,82,0.7)'; e.currentTarget.style.color = '#E05252' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(224,82,82,0.35)'; e.currentTarget.style.color = 'rgba(224,82,82,0.7)' }}>
            <AlertCircle size={12} strokeWidth={2} />
            Dev Reset
          </motion.button>
        )}

        {stage === 'confirm' && (
          <motion.div key="confirm"
            initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            style={{ background: 'rgba(10,9,20,0.96)', border: '1px solid rgba(224,82,82,0.4)', borderRadius: 12, padding: '0.85rem 1rem', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: 220 }}>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: '#F5EDE0', margin: '0 0 4px', fontWeight: 600 }}>
              Delete all test data?
            </p>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', color: MUTED, margin: '0 0 0.85rem', lineHeight: 1.5 }}>
              Wipes answers, question log, streak, echo history. Cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 7 }}>
              <button type="button"
                onClick={() => { setStage('resetting'); onReset().then(() => setStage('idle')) }}
                style={{ flex: 1, padding: '7px 0', background: 'rgba(224,82,82,0.15)', border: '1px solid rgba(224,82,82,0.4)', borderRadius: 7, cursor: 'pointer', color: '#E05252', fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', fontWeight: 700, transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(224,82,82,0.15)'}>
                Yes, reset
              </button>
              <button type="button"
                onClick={() => setStage('idle')}
                style={{ flex: 1, padding: '7px 0', background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 7, cursor: 'pointer', color: MUTED, fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'resetting' && (
          <motion.div key="resetting"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'rgba(10,9,20,0.92)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, backdropFilter: 'blur(12px)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
              <Loader2 size={13} color="rgba(224,82,82,0.7)" strokeWidth={2} />
            </motion.div>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', color: 'rgba(224,82,82,0.7)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Resetting…
            </span>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PHOTO LIGHTBOX
══════════════════════════════════════════════════════════════ */
function Lightbox({ url, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
      <button type="button" onClick={onClose}
        style={{ position: 'absolute', top: 18, right: 18, background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer', color: TEXT, padding: 8, display: 'flex', zIndex: 1 }}>
        <X size={18} strokeWidth={1.8} />
      </button>
      <motion.img
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        src={url} alt="Memory photo"
        style={{ maxWidth: '92vw', maxHeight: '90vh', borderRadius: 14, objectFit: 'contain', cursor: 'default', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      />
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
══════════════════════════════════════════════════════════════ */
function ToastContainer({ toasts, remove }) {
  return (
    <div style={{ position: 'fixed', top: 66, right: 14, zIndex: 400, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', maxWidth: 320 }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 64, scale: 0.94 }}
            animate={{ opacity: 1, x: 0,  scale: 1    }}
            exit={{ opacity: 0,   x: 64, scale: 0.94  }}
            transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: SURFACE, borderRadius: 13,
              border: `1px solid ${t.type === 'error' ? 'rgba(224,82,82,0.3)' : t.type === 'milestone' ? BORDER_A : 'rgba(106,182,106,0.3)'}`,
              padding: '11px 14px', boxShadow: '0 10px 36px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(16px)', pointerEvents: 'auto',
            }}>
            {t.Icon && (
              <t.Icon size={16} strokeWidth={2}
                color={t.type === 'error' ? '#E05252' : t.type === 'milestone' ? GOLD : SUCCESS}
                style={{ flexShrink: 0, marginTop: 1 }}
              />
            )}
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.83rem', color: TEXT, lineHeight: 1.5, flex: 1 }}>{t.message}</span>
            <button type="button" onClick={() => remove(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 0, display: 'flex', flexShrink: 0 }}>
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   AMBIENT GLOW
══════════════════════════════════════════════════════════════ */
function AmbientGlow() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(252,188,210,0.45) 0%,transparent 65%)', filter: 'blur(70px)' }} />
      <div style={{ position: 'absolute', bottom: '5%', left: '-15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(200,180,240,0.35) 0%,transparent 65%)', filter: 'blur(70px)' }} />
      <div style={{ position: 'absolute', top: '40%', right: '20%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle,rgba(180,220,255,0.25) 0%,transparent 65%)', filter: 'blur(60px)' }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PROGRESS RING
══════════════════════════════════════════════════════════════ */
function ProgressRing({ value, max, size = 72, stroke = 5 }) {
  const id   = `gr${size}${stroke}`
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct  = Math.min(value / max, 1)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#A8854E" />
            <stop offset="100%" stopColor="#DFC090" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={stroke} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - circ * pct }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'Bodoni Moda',serif", fontSize: size < 55 ? '0.8rem' : '1.05rem', color: TEXT, lineHeight: 1 }}>{value}</span>
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.5rem', color: MUTED, letterSpacing: '0.06em', marginTop: 1 }}>/{max}</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   BADGE
══════════════════════════════════════════════════════════════ */
function Badge({ cat }) {
  const s = catStyle(cat)
  return (
    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: s.bg, color: s.text, borderRadius: 999, padding: '0.2rem 0.65rem', display: 'inline-block', flexShrink: 0 }}>
      {cat}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════
   ACTIVITY DOTS  (7-day strip)
══════════════════════════════════════════════════════════════ */
function ActivityDots({ memories }) {
  const today = new Date()
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d  = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    return { ds, answered: memories.some(m => m.created_at?.slice(0, 10) === ds), isToday: i === 6, label: ['S','M','T','W','T','F','S'][d.getDay()] }
  })
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
      {days.map(({ ds, answered, isToday, label }, i) => (
        <div key={ds} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20, delay: i * 0.06 }}
            style={{ width: isToday ? 11 : 9, height: isToday ? 11 : 9, borderRadius: '50%', background: answered ? (isToday ? GOLD : 'rgba(201,168,76,0.65)') : (isToday ? 'rgba(201,168,76,0.18)' : BORDER), border: isToday ? `1.5px solid ${GOLD}` : 'none', boxShadow: answered && isToday ? '0 0 8px rgba(201,168,76,0.5)' : 'none' }}
          />
          <span style={{ fontSize: '0.5rem', color: isToday ? GOLD : DIM, fontFamily: "'Jost',sans-serif" }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   CATEGORY BREAKDOWN  (mini bar chart)
══════════════════════════════════════════════════════════════ */
function CategoryBreakdown({ memories }) {
  if (!memories.length) return null
  const counts = {}
  memories.forEach(m => { const c = m.category || 'Wisdom'; counts[c] = (counts[c] || 0) + 1 })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxVal = sorted[0]?.[1] || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {sorted.map(([cat, count]) => {
        const s = catStyle(cat)
        return (
          <div key={cat}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.7rem', color: s.text, fontFamily: "'Jost',sans-serif", fontWeight: 500 }}>{cat}</span>
              <span style={{ fontSize: '0.66rem', color: MUTED, fontFamily: "'Jost',sans-serif" }}>{count}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: BORDER, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / maxVal) * 100}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.5 }}
                style={{ height: '100%', borderRadius: 2, background: s.text }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   QUESTION CARD SKELETON  (shown while Gemini generates)
══════════════════════════════════════════════════════════════ */
function QuestionCardSkeleton() {
  const shimmer = { animate: { opacity: [0.35, 0.65, 0.35] }, transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '0.9rem 1.25rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <motion.div {...shimmer} style={{ width: 13, height: 13, borderRadius: '50%', background: BORDER }} />
        <motion.div {...shimmer} style={{ width: 130, height: 9, background: BORDER, borderRadius: 4 }} />
      </div>
      <div style={{ padding: '1.25rem 1.25rem 1.1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <motion.div {...shimmer} style={{ height: 18, background: BORDER, borderRadius: 4, width: '88%' }} />
        <motion.div {...shimmer} style={{ height: 18, background: BORDER, borderRadius: 4, width: '72%' }} />
      </div>
      <div style={{ height: 1, background: BORDER }} />
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[100, 85, 65, 75, 50].map((w, i) => (
          <motion.div key={i} {...shimmer} style={{ height: 12, background: BORDER, borderRadius: 3, width: `${w}%` }} />
        ))}
      </div>
      <div style={{ height: 1, background: BORDER }} />
      <div style={{ padding: '0.75rem 1.1rem', display: 'flex', gap: 9 }}>
        <motion.div {...shimmer} style={{ width: 84, height: 44, background: BORDER, borderRadius: 10 }} />
        <motion.div {...shimmer} style={{ flex: 1, height: 44, background: BORDER, borderRadius: 11 }} />
        <motion.div {...shimmer} style={{ width: 84, height: 44, background: BORDER, borderRadius: 10 }} />
      </div>
      <div style={{ padding: '0.5rem 1.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
          <Loader2 size={13} color={GOLD} strokeWidth={2} />
        </motion.div>
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', color: MUTED }}>Personalizing your question…</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ANSWERED TODAY CARD
══════════════════════════════════════════════════════════════ */
function AnsweredTodayCard({ question, todayAnswer, total, onAddPhoto, uploadingPhoto, onDevNextQuestion }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: SURFACE, border: '1px solid rgba(106,182,106,0.22)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg,rgba(106,182,106,0.55),transparent)', borderRadius: '18px 18px 0 0' }} />

      {/* Header */}
      <div style={{ padding: '0.9rem 1.25rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(106,182,106,0.12)', border: '1px solid rgba(106,182,106,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={12} color={SUCCESS} strokeWidth={2.5} />
        </div>
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', color: SUCCESS, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Memory saved today
        </span>
      </div>

      {/* Question */}
      <div style={{ padding: '1.1rem 1.25rem 0.75rem' }}>
        <p style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', color: TEXT, lineHeight: 1.45, margin: 0, opacity: 0.75 }}>
          {question?.question_text}
        </p>
      </div>

      {/* Answer preview */}
      {todayAnswer?.answer_text && (
        <>
          <div style={{ height: 1, background: BORDER }} />
          <div style={{ padding: '0.85rem 1.25rem' }}>
            <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.88rem', color: MUTED, lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>
              "{todayAnswer.answer_text.length > 240
                ? todayAnswer.answer_text.slice(0, 240) + '…'
                : todayAnswer.answer_text}"
            </p>
          </div>
        </>
      )}

      {/* Add photo section */}
      <div style={{ height: 1, background: BORDER }} />
      {todayAnswer?.photo_url ? (
        /* Photo saved — small passport thumbnail */
        <div style={{ padding: '0.7rem 1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 56, height: 56, borderRadius: 9, overflow: 'hidden', flexShrink: 0, cursor: 'zoom-in' }}
            onClick={() => window.open(todayAnswer.photo_url, '_blank')}>
            <img src={todayAnswer.photo_url} alt="Memory"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: MUTED, margin: 0, lineHeight: 1.5 }}>
            Photo saved with this memory
          </p>
        </div>
      ) : (
        /* No photo yet — offer to add one */
        <div style={{ padding: '0.75rem 1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: uploadingPhoto ? 'not-allowed' : 'pointer', width: 'fit-content' }}>
            <input type="file" accept="image/*" capture="environment"
              style={{ display: 'none' }}
              disabled={uploadingPhoto}
              onChange={e => { const f = e.target.files?.[0]; if (f) { onAddPhoto(f); e.target.value = '' } }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 9, transition: 'border-color 0.18s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = BORDER_A}
              onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
              {uploadingPhoto
                ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={14} color={GOLD} /></motion.span>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.8rem', color: GOLD }}>Uploading…</span></>
                : <><ImagePlus size={14} color={MUTED} strokeWidth={1.8} />
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.8rem', color: MUTED }}>Add a photo to this memory</span></>
              }
            </div>
          </label>
        </div>
      )}

      {/* Come back tomorrow */}
      <div style={{ height: 1, background: BORDER }} />
      <div style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Calendar size={14} color={MUTED} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.82rem', color: MUTED }}>
          Come back tomorrow for your next question.
          {total < ECHO_AT && (
            <span style={{ color: GOLD }}> {ECHO_AT - total} more to unlock Echo Chat.</span>
          )}
        </span>
      </div>

      {/* Dev mode bypass — only visible when VITE_DEV_MODE=true */}
      {import.meta.env.VITE_DEV_MODE === 'true' && onDevNextQuestion && (
        <>
          <div style={{ height: 1, background: 'rgba(232,168,56,0.15)' }} />
          <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(232,168,56,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertCircle size={11} color="#E8A838" strokeWidth={2} />
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.6rem', color: '#E8A838', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Dev Mode
                </span>
              </div>
            </div>
            <button type="button" onClick={onDevNextQuestion}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', height: 38, background: 'rgba(232,168,56,0.1)', border: '1px solid rgba(232,168,56,0.3)', borderRadius: 10, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.8rem', fontWeight: 700, color: '#E8A838', letterSpacing: '0.02em', transition: 'all 0.18s', touchAction: 'manipulation' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,168,56,0.18)'; e.currentTarget.style.borderColor = 'rgba(232,168,56,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,168,56,0.1)'; e.currentTarget.style.borderColor = 'rgba(232,168,56,0.3)' }}>
              <ChevronRight size={14} strokeWidth={2.5} />
              Generate next question now
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MEMORY CARD
══════════════════════════════════════════════════════════════ */
function MemoryCard({ mem, onClick, onPhotoClick, index = 0 }) {
  const q      = mem.question_text || 'Question'
  const cat    = mem.category      || 'Wisdom'
  const s      = catStyle(cat)
  const hasPhoto = !!mem.photo_url

  const cardBase = {
    initial:    { opacity: 0, y: 16 },
    whileInView:{ opacity: 1, y: 0 },
    viewport:   { once: true, amount: 0.1 },
    transition: { duration: 0.38, delay: Math.min(index * 0.05, 0.3) },
    whileHover: { y: -4, scale: 1.02, transition: { type: 'spring', stiffness: 380, damping: 18 } },
  }

  if (hasPhoto) {
    /* ── PORTRAIT CARD (photo at top) ── */
    return (
      <motion.div {...cardBase} onClick={onClick}
        style={{ background: '#EEE0FF', borderRadius: 24, cursor: 'pointer', overflow: 'hidden', touchAction: 'manipulation', display: 'flex', flexDirection: 'column', boxShadow: 'inset 0 -8px 18px rgba(110,70,200,0.14),inset 0 8px 18px rgba(255,255,255,0.88),0 12px 32px rgba(140,90,220,0.20)' }}>

        {/* Photo — portrait crop, full width */}
        <div onClick={e => { e.stopPropagation(); onPhotoClick?.(mem.photo_url) }}
          style={{ height: 170, overflow: 'hidden', cursor: 'zoom-in', flexShrink: 0, position: 'relative' }}>
          <img src={mem.photo_url} alt="Memory photo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {/* Category badge over photo */}
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <Badge cat={cat} />
          </div>
        </div>

        {/* Content below photo */}
        <div style={{ padding: '0.85rem 1rem', flex: 1 }}>
          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.65rem', color: MUTED }}>{fmtShort(mem.created_at)}</span>
          <p style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: '0.85rem', color: TEXT, lineHeight: 1.5, margin: '6px 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {q}
          </p>
          <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.76rem', color: 'rgba(26,21,48,0.65)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {mem.answer_text}
          </p>
        </div>
      </motion.div>
    )
  }

  /* ── STANDARD CARD (no photo) ── */
  return (
    <motion.div {...cardBase} onClick={onClick}
      style={{ background: '#EEE0FF', borderRadius: 24, padding: '1rem 1.1rem', cursor: 'pointer', position: 'relative', overflow: 'hidden', touchAction: 'manipulation', boxShadow: 'inset 0 -8px 18px rgba(110,70,200,0.14),inset 0 8px 18px rgba(255,255,255,0.88),0 12px 32px rgba(140,90,220,0.20)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.text}55,transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.67rem', color: MUTED }}>{fmtShort(mem.created_at)}</span>
        <Badge cat={cat} />
      </div>
      <p style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: '0.85rem', color: TEXT, lineHeight: 1.5, margin: '0 0 7px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {q}
      </p>
      <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.78rem', color: 'rgba(26,21,48,0.65)', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {mem.answer_text}
      </p>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MEMORY DETAIL MODAL
══════════════════════════════════════════════════════════════ */
function MemoryModal({ mem, onClose, onUpdate, onDelete }) {
  if (!mem) return null
  const q   = mem.question_text || 'Question'
  const cat = mem.category      || 'Wisdom'
  const s   = catStyle(cat)

  const [isEditing,       setIsEditing]       = useState(false)
  const [editAnswer,      setEditAnswer]      = useState(mem.answer_text || '')
  const [editPhotoFile,   setEditPhotoFile]   = useState(null)
  const [editPhotoPreview,setEditPhotoPreview]= useState(null)
  const [removePhoto,     setRemovePhoto]     = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [saveErr,         setSaveErr]         = useState(null)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const textareaRef = useRef(null)

  /* auto-grow textarea */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [editAnswer, isEditing])

  const cancelEdit = () => {
    setIsEditing(false)
    setEditAnswer(mem.answer_text || '')
    if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview)
    setEditPhotoFile(null)
    setEditPhotoPreview(null)
    setRemovePhoto(false)
    setSaveErr(null)
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { setSaveErr(err); e.target.value = ''; return }
    if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview)
    setEditPhotoFile(file)
    setEditPhotoPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
    setSaveErr(null)
    e.target.value = ''
  }

  const saveEdit = async () => {
    if (saving || !editAnswer.trim()) return
    setSaving(true)
    setSaveErr(null)
    try {
      let photoUrl = removePhoto ? null : mem.photo_url
      if (editPhotoFile) {
        const compressed = await compressImage(editPhotoFile)
        if (compressed) photoUrl = await uploadPhotoToStorage(compressed, mem.user_id, editPhotoFile.name)
      }
      const { error } = await supabase
        .from('user_answers')
        .update({ answer_text: editAnswer.trim(), photo_url: photoUrl })
        .eq('id', mem.id)
      if (error) throw error
      if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview)
      setEditPhotoFile(null)
      setEditPhotoPreview(null)
      setRemovePhoto(false)
      setIsEditing(false)
      onUpdate?.({ ...mem, answer_text: editAnswer.trim(), photo_url: photoUrl })
    } catch (err) {
      setSaveErr('Save failed — please try again.')
    }
    setSaving(false)
  }

  const deleteMemory = async () => {
    setDeleting(true)
    try {
      await supabase.from('user_answers').delete().eq('id', mem.id)
      onDelete?.(mem.id)
      onClose()
    } catch {
      setDeleting(false)
    }
  }

  /* displayed photo: edit preview > existing > none */
  const displayPhoto = removePhoto ? null : (editPhotoPreview || mem.photo_url)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={isEditing ? undefined : onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,9,20,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.3 }}
        onClick={e => e.stopPropagation()}
        style={{ background: SURFACE, border: `1px solid ${isEditing ? BORDER_A : BORDER_A}`, borderRadius: 18, padding: '1.75rem', maxWidth: 540, width: '100%', maxHeight: '88vh', overflowY: 'auto', position: 'relative' }}>

        {/* colour accent strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '18px 18px 0 0', background: `linear-gradient(90deg,${s.text}70,transparent)` }} />

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Badge cat={cat} />
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', color: MUTED }}>{fmtDate(mem.created_at)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {!isEditing && (
              <button type="button" onClick={() => setIsEditing(true)}
                title="Edit this memory"
                style={{ background: SURF_UP, border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, padding: 6, display: 'flex', borderRadius: 8, minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center', transition: 'color 0.18s,border-color 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = BORDER_A }}
                onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER }}>
                <Edit3 size={13} strokeWidth={1.8} />
              </button>
            )}
            <button type="button" onClick={isEditing ? cancelEdit : onClose}
              style={{ background: SURF_UP, border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, padding: 6, display: 'flex', borderRadius: 8, minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── QUESTION (always shown) ── */}
        <p style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: 'clamp(1rem,2.5vw,1.3rem)', color: TEXT, lineHeight: 1.5, margin: '0 0 1.1rem', opacity: 0.85 }}>
          "{q}"
        </p>
        <div style={{ height: 1, background: BORDER, marginBottom: '1.1rem' }} />

        {/* ── VIEW MODE ── */}
        {!isEditing && (
          <>
            <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 400, fontSize: '0.95rem', color: TEXT, lineHeight: 1.85, margin: 0, opacity: 0.78 }}>
              {mem.answer_text}
            </p>
            {mem.photo_url && (
              <div style={{ marginTop: '1.5rem', borderRadius: 12, overflow: 'hidden' }}>
                <img src={mem.photo_url} alt="Memory photo"
                  style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover', borderRadius: 12 }} />
              </div>
            )}

            {/* delete row */}
            <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${BORDER}`, paddingTop: '1rem' }}>
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(224,82,82,0.5)', fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', padding: 0, transition: 'color 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#E05252'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(224,82,82,0.5)'}>
                  <Trash2 size={13} strokeWidth={1.8} />
                  Delete this memory
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.8rem', color: MUTED }}>Delete permanently?</span>
                  <button type="button" onClick={deleteMemory} disabled={deleting}
                    style={{ padding: '5px 14px', background: 'rgba(224,82,82,0.12)', border: '1px solid rgba(224,82,82,0.35)', borderRadius: 7, cursor: deleting ? 'not-allowed' : 'pointer', color: '#E05252', fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', fontWeight: 700 }}>
                    {deleting ? '…' : 'Yes, delete'}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    style={{ padding: '5px 14px', background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 7, cursor: 'pointer', color: MUTED, fontFamily: "'Jost',sans-serif", fontSize: '0.78rem' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── EDIT MODE ── */}
        {isEditing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* answer textarea */}
            <div>
              <label style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, display: 'block', marginBottom: 8 }}>
                Your answer
              </label>
              <textarea
                ref={textareaRef}
                value={editAnswer}
                onChange={e => setEditAnswer(e.target.value)}
                style={{ width: '100%', background: SURF_UP, border: `1px solid ${BORDER_A}`, borderRadius: 11, padding: '12px 14px', fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.92rem', color: TEXT, lineHeight: 1.8, resize: 'none', outline: 'none', boxSizing: 'border-box', minHeight: 120 }}
                onFocus={e => e.target.style.borderColor = GOLD}
                onBlur={e => e.target.style.borderColor = BORDER_A}
              />
            </div>

            {/* photo section */}
            <div>
              <label style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, display: 'block', marginBottom: 8 }}>
                Photo
              </label>

              {displayPhoto ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                  <img src={displayPhoto} alt="Memory"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block', borderRadius: 10 }} />
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                    {/* change photo */}
                    <label title="Change photo"
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.85)', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
                      <Camera size={14} color={TEXT} strokeWidth={1.8} />
                    </label>
                    {/* remove photo */}
                    <button type="button" title="Remove photo"
                      onClick={() => { if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview); setEditPhotoFile(null); setEditPhotoPreview(null); setRemovePhoto(true) }}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(224,82,82,0.18)', border: '1px solid rgba(224,82,82,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                      <X size={14} color="#E05252" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', background: SURF_UP, border: `1px dashed ${BORDER_A}`, borderRadius: 11, cursor: 'pointer', width: 'fit-content' }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
                  <ImagePlus size={15} color={MUTED} strokeWidth={1.8} />
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.82rem', color: MUTED }}>Add a photo</span>
                </label>
              )}
            </div>

            {saveErr && (
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: '#E05252', margin: 0 }}>{saveErr}</p>
            )}

            {/* action buttons */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <motion.button type="button" onClick={saveEdit}
                disabled={saving || !editAnswer.trim()}
                whileTap={{ scale: 0.97 }}
                style={{ flex: 1, height: 44, background: saving || !editAnswer.trim() ? 'rgba(201,168,76,0.15)' : `linear-gradient(135deg,#A8854E,${GOLD})`, border: 'none', borderRadius: 11, cursor: saving || !editAnswer.trim() ? 'not-allowed' : 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.88rem', fontWeight: 700, color: saving || !editAnswer.trim() ? 'rgba(201,168,76,0.4)' : '#0A0914', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {saving
                  ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={15} /></motion.span>Saving…</>
                  : <><Check size={15} strokeWidth={2.5} />Save changes</>}
              </motion.button>
              <button type="button" onClick={cancelEdit}
                style={{ padding: '0 18px', height: 44, background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 11, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.85rem', color: MUTED }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ECHO CHAT — MESSAGE BUBBLE
══════════════════════════════════════════════════════════════ */
function MessageBubble({ msg }) {
  const isUser   = msg.role === 'user'
  const hasAudio = !isUser && !!msg.audio_url

  return (
    <div style={{
      display: 'flex',
      alignItems: hasAudio ? 'flex-start' : 'flex-end',   // avatar stays at top when player is below
      gap: 9, maxWidth: '82%',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      {/* Echo avatar — only on echo messages */}
      {!isUser && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,#A8854E,${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', color: '#0A0914', fontSize: '0.7rem', fontWeight: 700 }}>E</span>
        </div>
      )}

      {/* Bubble + optional voice player stacked vertically */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          background:   isUser ? `linear-gradient(135deg,#A8854E,${GOLD})` : SURFACE,
          border:       isUser ? 'none' : `1px solid ${BORDER}`,
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '10px 14px',
          boxShadow: isUser ? '0 4px 14px rgba(201,168,76,0.15)' : 'none',
        }}>
          <p style={{ margin: 0, fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.9rem', color: isUser ? '#0A0914' : TEXT, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg.content}
          </p>
        </div>

        {/* Voice clip — invitation + player, shown when a related recording was found */}
        {hasAudio && (
          <>
            {/* Invitation text */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, paddingLeft: 2 }}>
              <Mic size={11} color={GOLD} strokeWidth={2} />
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.69rem', color: MUTED, fontStyle: 'italic' }}>
                Want to hear their voice? A related recording is linked below — tap ▶ to listen.
              </span>
            </motion.div>
            <VoiceClipPlayer
              audioUrl={msg.audio_url}
              questionText={msg.clip_question}
              source={msg.voice_source || 'recorded_clip'}
            />
          </>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ECHO CHAT — TYPING INDICATOR
══════════════════════════════════════════════════════════════ */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, alignSelf: 'flex-start' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,#A8854E,${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', color: '#0A0914', fontSize: '0.7rem', fontWeight: 700 }}>E</span>
      </div>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px 16px 16px 4px', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, opacity: 0.75 }}
          />
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ECHO CHAT — MEMORY RELEVANCE SCORER  (Fix 1)
   Pure function, no React deps. Scores a single memory against
   a user question using keywords + emotional themes + category
   bonus + recency bias + depth bonus.
══════════════════════════════════════════════════════════════ */
const ECHO_STOP_WORDS = new Set([
  'what','the','my','your','you','me','i','is','are','was','were','did','do','does',
  'how','why','when','where','who','which','that','this','have','has','had','will',
  'would','could','should','can','may','might','shall','a','an','and','or','but',
  'in','on','at','to','for','of','with','about','from','by','as','if','than','then',
  'so','yet','both','either','not',
])
const ECHO_THEMES = {
  pride:    ['proud','pride','achievement','accomplish','success','glad','pleased','well done','did well'],
  regret:   ['regret','wish','mistake','wrong','sorry','should have','could have','if only','wish i had'],
  love:     ['love','loved','care','miss','heart','special','cherish','treasure','never forget'],
  hardship: ['hard','difficult','struggle','pain','hurt','dark','lost','alone','scared','afraid','failed','worst'],
  wisdom:   ['learned','lesson','understand','realize','taught','truth','important','advice','would tell'],
  family:   ['father','mother','son','daughter','sister','brother','family','parent','child',
             'grandma','grandfather','uncle','aunt','husband','wife','spouse','home'],
  identity: ['believe','value','principle','who i am','define','character','integrity','stand for'],
}
const ECHO_THEME_CATS = {
  pride:    ['Happiness','Identity','Wisdom'],
  regret:   ['Regrets','Relationships'],
  love:     ['Family','Relationships','Happiness'],
  hardship: ['Hardship','Regrets'],
  wisdom:   ['Wisdom','Identity'],
  family:   ['Family','Relationships'],
  identity: ['Identity','Wisdom'],
}
const LOW_REL_STARTERS = [
  `That's not something I ever wrote down, but honestly —`,
  `I never talked about that much. But the way I've always felt about it is`,
  `Hmm. I'd have to dig for that one. What I can say is —`,
  `That one's harder to pin down. But knowing myself, I'd say`,
  `I kept a lot of things inside. But something in me wants to say —`,
]

function scoreMemoryRelevance(memory, question) {
  let score = 0
  const q      = question.toLowerCase()
  const answer = (memory.answer_text   || '').toLowerCase()
  const memQ   = (memory.question_text || '').toLowerCase()

  // 1. Keyword hits — answer = 3 pts each, question = 1 pt each
  q.split(/\s+/).filter(w => w.length > 3 && !ECHO_STOP_WORDS.has(w)).forEach(kw => {
    if (answer.includes(kw)) score += 3
    if (memQ.includes(kw))   score += 1
  })

  // 2. Emotional theme matching
  Object.entries(ECHO_THEMES).forEach(([theme, words]) => {
    if (!words.some(w => q.includes(w))) return
    const hits = words.filter(w => answer.includes(w) || memQ.includes(w)).length
    score += hits * 2
    if ((ECHO_THEME_CATS[theme] || []).includes(memory.category)) score += 4
  })

  // 3. Recency bias — fresh memories slightly preferred
  const days = Math.floor((Date.now() - new Date(memory.created_at)) / 86400000)
  if (days < 7)  score += 1
  if (days < 30) score += 0.5

  // 4. Depth bonus — legacy-stage memories most emotionally rich
  const depth = memory.depth_level || 1
  if (depth >= 3) score += 2
  if (depth >= 4) score += 2

  return score
}

/* ══════════════════════════════════════════════════════════════
   FIND RELEVANT VOICE CLIP  (Phase 1 — free, no API needed)
   Searches the already-loaded memories array for the single
   most topically relevant audio recording to play alongside
   an Echo text response. Uses keyword + theme matching.
   Returns the best-match memory object, or null if none qualify.
══════════════════════════════════════════════════════════════ */
const CLIP_THEMES = {
  pride:    ['proud','achievement','success','accomplish','happy with','did well'],
  regret:   ['regret','wish','mistake','wrong','sorry','should have','if only'],
  love:     ['love','loved','care','miss','heart','special','cherish','treasure'],
  hardship: ['hard','difficult','struggle','pain','hurt','dark','alone','scared','failed'],
  wisdom:   ['learned','lesson','understand','realize','taught','truth','advice'],
  family:   ['father','mother','son','daughter','family','parent','child','home','grandma'],
  identity: ['believe','value','who i am','define','character','integrity','stand for'],
}

function findRelevantVoiceClip(userMessage, echoText, memories) {
  // Only consider memories that have an audio recording
  const audioMems = (memories || []).filter(m => m.audio_url)
  if (!audioMems.length) return null

  // Combine user message + echo response for richer keyword set
  const searchText = `${userMessage} ${echoText}`.toLowerCase()
  const keywords   = searchText.split(/\s+/)
    .filter(w => w.length > 3 && !ECHO_STOP_WORDS.has(w))

  const scored = audioMems.map(m => {
    let score = 0
    const ansLow = (m.answer_text   || '').toLowerCase()
    const qLow   = (m.question_text || '').toLowerCase()

    // Keyword hits — answer counts more than question
    keywords.forEach(kw => {
      if (ansLow.includes(kw)) score += 3
      if (qLow.includes(kw))   score += 2
    })

    // Emotional theme cross-match
    Object.values(CLIP_THEMES).forEach(words => {
      const inSearch = words.some(w => searchText.includes(w))
      const inMemory = words.some(w => ansLow.includes(w) || qLow.includes(w))
      if (inSearch && inMemory) score += 4
    })

    return { m, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Return the best match if there's ANY relevance at all (score >= 1).
  // If nothing matches even loosely, still return the top clip — the user has
  // few recordings so any clip is better than silence.
  // Only skip if audioMems was empty (handled above).
  const best = scored[0]
  if (!best) return null
  return best.score >= 1 ? best.m : (audioMems.length <= 3 ? best.m : null)
}

/* ══════════════════════════════════════════════════════════════
   VOICE CLIP PLAYER  (Phase 1 + Phase 2 shared component)
   Renders below Echo text bubbles when audio is available.
   source: 'recorded_clip' | 'elevenlabs'
══════════════════════════════════════════════════════════════ */
function VoiceClipPlayer({ audioUrl, questionText, source = 'recorded_clip' }) {
  const [playing,  setPlaying]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [currTime, setCurrTime] = useState(0)
  const [errored,  setErrored]  = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onUpdate = () => {
      setCurrTime(el.currentTime)
      if (el.duration && !isNaN(el.duration)) {
        setProgress((el.currentTime / el.duration) * 100)
      }
    }
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrTime(0) }
    const onError = () => setErrored(true)
    el.addEventListener('timeupdate',    onUpdate)
    el.addEventListener('ended',         onEnded)
    el.addEventListener('error',         onError)
    return () => {
      el.removeEventListener('timeupdate',    onUpdate)
      el.removeEventListener('ended',         onEnded)
      el.removeEventListener('error',         onError)
    }
  }, [])

  if (errored) return null   // hide silently — voice is enhancement, not critical

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else { el.play().catch(() => setErrored(true)); setPlaying(true) }
  }

  const seek = (e) => {
    const el = audioRef.current
    if (!el || !el.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration
  }

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const isEl    = source === 'elevenlabs'
  const borderC = isEl ? 'rgba(201,168,76,0.38)' : 'rgba(201,168,76,0.22)'
  const bgC     = isEl ? 'rgba(201,168,76,0.1)'  : 'rgba(201,168,76,0.05)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ background: bgC, border: `1px solid ${borderC}`, borderRadius: 12, padding: '10px 13px', marginTop: 6, maxWidth: 300 }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: questionText ? 6 : 9 }}>
        <motion.div
          animate={playing ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}>
          <Mic size={11} color={GOLD} strokeWidth={2.5} />
        </motion.div>
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.6rem', color: 'rgba(201,168,76,0.85)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {isEl ? 'Echo speaking in their voice' : playing ? 'Playing their recording…' : 'Their voice — recorded memory'}
        </span>
      </div>

      {/* Question context — shown BEFORE play so user knows what they'll hear */}
      {questionText && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontStyle: 'italic', fontSize: '0.72rem', color: MUTED, margin: '0 0 9px', lineHeight: 1.5 }}>
          "{questionText}"
        </p>
      )}

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>

        {/* Play / Pause button */}
        <motion.button type="button" onClick={toggle} whileTap={{ scale: 0.87 }}
          style={{ width: 32, height: 32, borderRadius: '50%', background: playing ? 'rgba(201,168,76,0.85)' : GOLD, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s', boxShadow: playing ? `0 0 12px rgba(201,168,76,0.35)` : 'none' }}
          onMouseEnter={e => e.currentTarget.style.background = '#E8C56A'}
          onMouseLeave={e => e.currentTarget.style.background = playing ? 'rgba(201,168,76,0.85)' : GOLD}>
          {playing
            ? <div style={{ display: 'flex', gap: 3 }}>
                <div style={{ width: 3, height: 9, background: '#0A0914', borderRadius: 1.5 }} />
                <div style={{ width: 3, height: 9, background: '#0A0914', borderRadius: 1.5 }} />
              </div>
            : <div style={{ width: 0, height: 0, borderTop: '5.5px solid transparent', borderBottom: '5.5px solid transparent', borderLeft: '9px solid #0A0914', marginLeft: 2 }} />
          }
        </motion.button>

        {/* Progress bar */}
        <div onClick={seek}
          style={{ flex: 1, height: 4, background: 'rgba(201,168,76,0.16)', borderRadius: 2, cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
          <motion.div
            style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,#A8854E,${GOLD})`, borderRadius: 2 }}
            transition={{ duration: 0.1 }} />
        </div>

        {/* Time */}
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.61rem', color: MUTED, minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {fmt(currTime)}
        </span>
      </div>

      {/* Hint when not yet played */}
      {!playing && progress === 0 && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.62rem', color: DIM, margin: '7px 0 0', textAlign: 'center' }}>
          Tap ▶ to hear their voice
        </p>
      )}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TYPEWRITER TEXT  — word-by-word reveal for Echo opening msg
══════════════════════════════════════════════════════════════ */
function TypewriterText({ text, speed = 42, onComplete }) {
  const [shown,  setShown]  = useState([])
  const doneRef = useRef(false)

  useEffect(() => {
    if (!text) return
    const words = text.split(' ')
    let i = 0
    doneRef.current = false
    setShown([])
    const id = setInterval(() => {
      if (i < words.length) { setShown(p => [...p, words[i]]); i++ }
      else {
        clearInterval(id)
        if (!doneRef.current) { doneRef.current = true; onComplete?.() }
      }
    }, speed)
    return () => clearInterval(id)
  }, [text])

  return <>{shown.join(' ')}</>
}

/* ══════════════════════════════════════════════════════════════
   BONUS QUESTION MODAL  — pops up after saving today's main answer
══════════════════════════════════════════════════════════════ */
function BonusQuestionModal({ question, onSave, onSkip, addToast }) {
  const [answer,      setAnswer]      = useState('')
  const [saving,      setSaving]      = useState(false)

  const {
    recording, transcribing, recordingTime, waveformData,
    formatTime, toggleRecording,
  } = useVoiceRecorder({ setAnswer, addToast })

  const canSave = answer.trim().length >= 2 && !saving && !recording && !transcribing

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    await onSave(answer.trim())
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(10,9,20,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0,  scale: 1   }}
        exit={{    opacity: 0, y: 32, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{ width: '100%', maxWidth: 440, background: SURFACE, border: `1px solid ${BORDER_A}`, borderRadius: 22, overflow: 'hidden', boxShadow: '0 0 80px rgba(201,168,76,0.1), 0 40px 80px rgba(0,0,0,0.5)', position: 'relative' }}>

        {/* Gold top strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.6),transparent)' }} />

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 0.9rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.div
            animate={{ rotate: [0, 12, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
            <Sun size={16} color={GOLD} strokeWidth={2} />
          </motion.div>
          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', fontWeight: 600, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Today's Check-in
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', color: DIM }}>Bonus</span>
        </div>

        {/* Question */}
        <div style={{ padding: '1.25rem 1.5rem 1rem' }}>
          <p style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: 'clamp(1.1rem,3vw,1.4rem)', color: TEXT, lineHeight: 1.5, margin: 0 }}>
            {question}
          </p>
        </div>

        {/* Input area */}
        <div style={{ padding: '0 1.5rem 1.25rem' }}>
          {recording ? (
            <div style={{ padding: '0.9rem 1rem', background: 'rgba(224,82,82,0.07)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.div animate={{ opacity: [1,0.2,1] }} transition={{ duration: 0.9, repeat: Infinity }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#E05252' }} />
              </motion.div>
              <span style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.4rem', color: TEXT, letterSpacing: '0.08em' }}>{formatTime(recordingTime)}</span>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 22, flex: 1 }}>
                {waveformData.slice(0,16).map((v, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: 2, background: 'rgba(224,82,82,0.6)', height: Math.max(3, (v / 255) * 22), transition: 'height 0.06s' }} />
                ))}
              </div>
              <button type="button" onClick={toggleRecording} style={{ padding: '5px 12px', background: 'rgba(224,82,82,0.15)', border: '1px solid rgba(224,82,82,0.35)', borderRadius: 8, color: '#E05252', fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', cursor: 'pointer' }}>Stop</button>
            </div>
          ) : transcribing ? (
            <div style={{ padding: '0.9rem 1rem', background: 'rgba(201,168,76,0.06)', border: `1px solid ${BORDER_A}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={14} color={GOLD} /></motion.span>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.8rem', color: MUTED }}>Transcribing…</span>
            </div>
          ) : (
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="How did today go…"
              maxLength={1000}
              rows={3}
              style={{ width: '100%', background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', fontFamily: "'Jost',sans-serif", fontSize: '0.9rem', color: TEXT, resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = BORDER_A}
              onBlur={e  => e.target.style.borderColor = BORDER}
              autoFocus
            />
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mic */}
          <motion.button type="button" onClick={toggleRecording} whileTap={{ scale: 0.92 }}
            title="Speak your answer"
            style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORDER}`, background: SURF_UP, color: MUTED, cursor: 'pointer', flexShrink: 0, transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER_A; e.currentTarget.style.color = GOLD }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER;   e.currentTarget.style.color = MUTED }}>
            <Mic size={16} strokeWidth={1.8} />
          </motion.button>

          {/* Save */}
          <motion.button type="button" onClick={handleSave} disabled={!canSave} whileTap={{ scale: 0.97 }}
            style={{ flex: 1, height: 44, background: canSave ? `linear-gradient(135deg,#A8854E,${GOLD})` : 'rgba(201,168,76,0.1)', border: 'none', borderRadius: 12, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: "'Jost',sans-serif", fontSize: '0.88rem', fontWeight: 700, color: canSave ? '#0A0914' : 'rgba(201,168,76,0.3)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {saving
              ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={14} /></motion.span>Saving…</>
              : 'Save Check-in'}
          </motion.button>

          {/* Skip */}
          <button type="button" onClick={onSkip}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: DIM, padding: '0 4px', flexShrink: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = MUTED}
            onMouseLeave={e => e.currentTarget.style.color = DIM}>
            Skip
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   UPGRADE MODAL  — shown after 3rd free Echo message
══════════════════════════════════════════════════════════════ */
function UpgradeModal({ userName, memoriesCount, onLater, onWaitlist }) {
  const PlanRow = ({ feature }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ width: 15, height: 15, borderRadius: '50%', background: GOLD_DIM, border: `1px solid ${BORDER_A}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Check size={8} color={GOLD} strokeWidth={3} />
      </div>
      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: MUTED }}>{feature}</span>
    </div>
  )

  return (
    <motion.div
      key="upgrade-modal"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(10,9,20,0.93)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        style={{ background: SURFACE, border: `1px solid ${BORDER_A}`, borderRadius: 22, padding: '2rem 1.75rem', maxWidth: 400, width: '100%', boxShadow: '0 0 60px rgba(201,168,76,0.12)', position: 'relative', marginTop: '1rem', marginBottom: '1rem' }}>

        {/* Gold top glow strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.7),transparent)', borderRadius: '22px 22px 0 0' }} />

        {/* Echo avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <motion.div
            animate={{ boxShadow: ['0 0 12px rgba(201,168,76,0.15)','0 0 36px rgba(201,168,76,0.42)','0 0 12px rgba(201,168,76,0.15)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,#A8854E,${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', color: '#0A0914', fontSize: '1.3rem', fontWeight: 700 }}>E</span>
          </motion.div>
        </div>

        <h2 style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: '1.5rem', color: TEXT, textAlign: 'center', margin: '0 0 0.65rem', lineHeight: 1.25 }}>
          Echo has more to share.
        </h2>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.84rem', color: MUTED, textAlign: 'center', lineHeight: 1.75, margin: '0 0 1.5rem' }}>
          You've used your 3 free conversations.{' '}
          <span style={{ color: TEXT }}>{userName}</span>{' '}
          answered {memoriesCount} {memoriesCount === 1 ? 'question' : 'questions'} —
          every one is still waiting to be explored.
        </p>

        {/* ── BASIC PLAN ── */}
        <div style={{ background: SURF_UP, border: `1px solid ${BORDER_A}`, borderRadius: 14, padding: '1.1rem 1.2rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: '1.1rem', color: TEXT }}>Basic</span>
            <div>
              <span style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.6rem', color: TEXT, lineHeight: 1 }}>$9.99</span>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', color: MUTED, marginLeft: 4 }}>/ mo</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: '1rem' }}>
            {['Unlimited Echo conversations','Echo grows deeper as you add memories','Export your full memory archive','Priority support'].map(f => (
              <PlanRow key={f} feature={f} />
            ))}
          </div>
          <motion.button type="button" onClick={onWaitlist} whileTap={{ scale: 0.97 }}
            style={{ width: '100%', height: 44, background: `linear-gradient(135deg,#A8854E,${GOLD})`, border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.86rem', fontWeight: 700, color: '#0A0914', letterSpacing: '0.02em', touchAction: 'manipulation' }}>
            Join the Waitlist
          </motion.button>
        </div>

        {/* ── SEPARATOR ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0.5rem 0 1rem' }}>
          <div style={{ flex: 1, height: 1, background: BORDER_A }} />
          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', color: DIM, whiteSpace: 'nowrap' }}>or go further</span>
          <div style={{ flex: 1, height: 1, background: BORDER_A }} />
        </div>

        {/* ── VOICE PLAN ── */}
        <div style={{ background: 'rgba(201,168,76,0.04)', border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 14, padding: '1.1rem 1.2rem', marginBottom: '1.1rem', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle gold glow inside */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.45),transparent)' }} />

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div>
              <span style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: '1.1rem', color: GOLD }}>Voice</span>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.65rem', color: GOLD, marginLeft: 7, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 20, padding: '2px 7px', fontWeight: 600, letterSpacing: '0.04em' }}>COMING SOON</span>
            </div>
            <div>
              <span style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.6rem', color: GOLD, lineHeight: 1 }}>$19.99</span>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', color: MUTED, marginLeft: 4 }}>/ mo</span>
            </div>
          </div>

          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: 'rgba(201,168,76,0.75)', margin: '0 0 0.75rem', lineHeight: 1.6, fontStyle: 'italic' }}>
            Want Echo to answer in your real voice? Every question, every memory — spoken back as if you're actually in the room.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: '1rem' }}>
            {['Everything in Basic','Real-time voice conversations with Echo','Cloned from your own voice recordings','Family members can hear you speak — forever'].map(f => (
              <PlanRow key={f} feature={f} />
            ))}
          </div>

          <motion.button type="button" onClick={onWaitlist} whileTap={{ scale: 0.97 }}
            style={{ width: '100%', height: 44, background: 'transparent', border: `1.5px solid rgba(201,168,76,0.5)`, borderRadius: 10, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.86rem', fontWeight: 600, color: GOLD, letterSpacing: '0.02em', touchAction: 'manipulation' }}>
            Join the Waitlist
          </motion.button>
        </div>

        <button type="button" onClick={onLater}
          style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.8rem', color: DIM, padding: '6px 0', textAlign: 'center', touchAction: 'manipulation', transition: 'color 0.18s' }}
          onMouseEnter={e => e.currentTarget.style.color = MUTED}
          onMouseLeave={e => e.currentTarget.style.color = DIM}>
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ECHO CHAT — MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
function EchoChat({ user, memories, userName, addToast }) {
  const FREE_LIMIT = 3
  const MAX_CHARS  = 500
  const IS_DEV     = import.meta.env.VITE_DEV_MODE === 'true'

  const [msgs,          setMsgs]         = useState([])
  const [input,         setInput]        = useState('')
  const [isTyping,      setIsTyping]     = useState(false)
  const [chatLoading,   setChatLoading]  = useState(true)
  const [freeUsed,      setFreeUsed]     = useState(0)
  const [subscription,  setSubscription] = useState('free')
  const [isListening,   setIsListening]  = useState(false)
  const [sending,       setSending]      = useState(false)
  const [viewMode,      setViewMode]     = useState('self')
  const [voiceId,       setVoiceId]      = useState(null)
  const [voiceUsed,     setVoiceUsed]    = useState(0)
  const [openingMsg,    setOpeningMsg]   = useState(null)  // text being typewritten; null after revealed
  const [inputVisible,  setInputVisible] = useState(false) // delayed reveal after opening types
  const [showUpgrade,     setShowUpgrade]    = useState(false)
  const [showFamilyLock,  setShowFamilyLock] = useState(false)
  const [familyWaitlist,  setFamilyWaitlist] = useState(false)
  const [showIntro,       setShowIntro]      = useState(
    () => !localStorage.getItem(`echo_intro_seen_${user.id}`)
  )

  const scrollRef      = useRef(null)
  const textareaRef    = useRef(null)
  const recognitionRef = useRef(null)

  const isPaid       = ['basic', 'family', 'legacy'].includes(subscription)
  const limitReached = !isPaid && freeUsed >= FREE_LIMIT
  const freeLeft     = FREE_LIMIT - freeUsed

  /* ── Load history + profile on mount ── */
  useEffect(() => {
    ;(async () => {
      setChatLoading(true)
      try {
        const [{ data: history }, { data: profile }] = await Promise.all([
          supabase
            .from('echo_conversations')
            .select('id,role,content,created_at,audio_url,clip_question')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(40),
          supabase
            .from('user_profiles')
            .select('elevenlabs_voice_id,elevenlabs_chars_used,echo_free_messages_used,subscription_status')
            .eq('id', user.id)
            .maybeSingle(),
        ])

        const historyRows = (history || []).reverse()
        const usedVal     = profile?.echo_free_messages_used || 0
        const subVal      = profile?.subscription_status     || 'free'

        setMsgs(historyRows)
        setFreeUsed(usedVal)
        setSubscription(subVal)
        setVoiceId(profile?.elevenlabs_voice_id   || null)
        setVoiceUsed(profile?.elevenlabs_chars_used || 0)

        const isUnlimited = ['basic', 'family', 'legacy'].includes(subVal)

        if (historyRows.length === 0 && (isUnlimited || usedVal < FREE_LIMIT)) {
          // First ever visit — generate personalised opening message
          await generateOpeningMessage()
        } else {
          setInputVisible(true)
        }
      } catch (err) {
        console.error('Echo load:', err)
        setInputVisible(true)
      }
      setChatLoading(false)
    })()
  }, [user.id])

  /* ── Generate personalised opening message (first-time visitors only) ── */
  const generateOpeningMessage = async () => {
    try {
      const memorySample = memories.slice(0, 12)
        .map(m => `Q: "${m.question_text}"\nA: "${m.answer_text}"`)
        .join('\n\n')

      const prompt = `You are ${userName}, speaking to a family member who loves you deeply — for the very first time.

You have been listening to everything they shared about your life.

Write a warm, personal opening message of 60-80 words maximum.

Rules:
- Reference 2-3 SPECIFIC details from the memories below (a real name, place, story or phrase they actually used)
- Do NOT be generic or vague
- Speak warmly in first person as this real person
- End your message with exactly: "Ask me anything."
- Make it feel like this person is genuinely present

Their memories:
${memorySample || '(No memories yet — speak warmly and invite them to begin sharing.)'}

Write the opening message now. First person. Warm. Specific. Real. 60-80 words only. Do not add any preamble.`

      const text = await callGemini(prompt)
      const cleaned = text?.trim() || `Hello. I'm here, and I've been waiting for this. There's so much I want to share with you — the people I loved, the moments that shaped me, the things I never quite found the words for. Ask me anything.`

      // Save to DB so subsequent visits load it normally
      const { data: saved } = await supabase
        .from('echo_conversations')
        .insert({ user_id: user.id, role: 'echo', content: cleaned })
        .select('id,role,content,created_at')
        .single()

      setMsgs([saved || { id: 'opening_tmp', role: 'echo', content: cleaned, created_at: new Date().toISOString() }])
      setOpeningMsg(cleaned)
    } catch (err) {
      console.error('Opening message error:', err)
      // Fall back to static opening — still looks personal
      const fallback = `Hello. I'm here. I've been reflecting on everything I've shared, and I'm ready to talk. Ask me anything.`
      setMsgs([{ id: 'opening_fallback', role: 'echo', content: fallback, created_at: new Date().toISOString() }])
      setInputVisible(true)
    }
  }

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, isTyping])

  /* ── Auto-grow textarea ── */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  /* ── Fix 1 + 3: Score all memories, pick top 8, build system prompt ── */
  const buildEchoPrompt = useCallback((userMessage) => {
    // Score every saved memory against the user's question
    const scored = memories
      .map(m => ({ m, s: scoreMemoryRelevance(m, userMessage) }))
      .sort((a, b) => b.s - a.s)

    const topScore   = scored[0]?.s || 0
    const hasRelevant = topScore > 3   // genuine keyword/theme match exists

    // Top 8 by score
    const top8      = scored.slice(0, 8).map(x => x.m)
    // Guarantee up to 2 high-depth memories are always in context
    const highDepth = scored.filter(x => (x.m.depth_level || 1) >= 3).slice(0, 2).map(x => x.m)
    const finalMems = [...new Set([...highDepth, ...top8])].slice(0, 8)

    const memCtx = finalMems
      .map((m, i) => `Memory ${i + 1} [${m.category}]:\nYou were asked: "${m.question_text}"\nYou said: "${m.answer_text}"`)
      .join('\n\n')

    // Fix 2: audience framing changes with viewMode
    const audience = viewMode === 'family'
      ? 'A family member or loved one who misses you is speaking with you'
      : 'You are reviewing how Echo speaks for you'

    if (hasRelevant) {
      return `You are ${userName} — a real person, speaking from your own life and memories. ${audience}.

Respond as ${userName} would naturally speak in conversation — warm, direct, sometimes imperfect. You are NOT an AI. You are this person, remembering their own life.

HOW TO RESPOND:
- Start with something concrete: a feeling, an image, a specific moment from your memories. Examples: "Oh, that takes me back…", "I still remember…", "You know what's funny —", "Honestly, the first thing that comes to mind is…"
- Speak FROM your memories — don't recite them. Translate them into how you'd actually tell someone this story.
- Let your personality come through. If you were funny, be funny. If you were reflective, be reflective.
- Keep it 2–4 sentences. Conversational, not a speech.
- NEVER say "based on my memories", "according to what I shared", or anything that sounds like an AI reading a file.
- If the question touches something from your memories — speak from it naturally, like you're actually recalling the moment.

YOUR MEMORIES (speak FROM these, not about them):
${memCtx}`
    }

    // Low-relevance — honest fallback with rotating starter
    const starter = LOW_REL_STARTERS[Math.floor(Math.random() * LOW_REL_STARTERS.length)]
    return `You are ${userName} — a real person, speaking from your own life. ${audience}.

You don't have a specific memory about what they're asking. Be honest about that, then speak from your broader character and values as shown in the memories below.

Begin your response with EXACTLY this phrase: "${starter}"

Then continue naturally — 2 to 3 sentences, warm and genuine. Speak as ${userName} actually would: no AI-speak, no generic wisdom. Draw on the specific person these memories reveal.

YOUR MEMORIES FOR CONTEXT:
${memCtx}`
  }, [memories, userName, viewMode])

  /* ── Send message ── */
  const sendMsg = async () => {
    const text = input.trim()
    if (!text || isTyping || sending || limitReached || !inputVisible) return
    if (text.length > MAX_CHARS) {
      addToast(`Keep it under ${MAX_CHARS} characters.`, 'error', AlertCircle)
      return
    }

    // If opening message is still in typewriter state, switch to normal view
    setOpeningMsg(null)

    setSending(true)
    setInput('')

    // Optimistic user bubble
    const tmpId = `tmp_${Date.now()}`
    setMsgs(prev => [...prev, { id: tmpId, role: 'user', content: text, created_at: new Date().toISOString() }])
    setIsTyping(true)

    try {
      // 1. Save user message
      const { data: savedUser } = await supabase
        .from('echo_conversations')
        .insert({ user_id: user.id, role: 'user', content: text })
        .select('id,role,content,created_at')
        .single()

      // 2. Increment free usage for non-paid users
      let newFreeUsed = freeUsed
      if (!isPaid) {
        newFreeUsed = freeUsed + 1
        await supabase
          .from('user_profiles')
          .update({ echo_free_messages_used: newFreeUsed })
          .eq('id', user.id)
        setFreeUsed(newFreeUsed)
      }

      // 3. Fix 1+3: Score memories, build context-aware prompt
      const systemPrompt = buildEchoPrompt(text)

      // 4. Groq responds as the user in first person
      const echoText = await callGemini(text, systemPrompt)

      // 5. Phase 2: ElevenLabs voice generation (if user has cloned their voice)
      //    Blob URL is ephemeral — NOT saved to DB, only used for live playback
      let elevenLabsUrl = null
      if (voiceId) {
        try {
          const usage = await getVoiceUsage(user.id)
          if (usage.used + echoText.length <= usage.limit) {
            elevenLabsUrl = await generateVoiceAudio(echoText, voiceId)
            setVoiceUsed(u => u + echoText.length)
            addVoiceUsage(user.id, echoText.length) // fire-and-forget, no await needed
          } else {
            addToast('Monthly voice limit reached. Echo will respond in text until next month.', 'error', AlertCircle)
          }
        } catch (err) {
          // Silently fall through — text response always shows regardless
          console.error('ElevenLabs generation failed:', err.message)
        }
      }

      // Phase 1 fallback: find recorded clip (only if no ElevenLabs audio)
      const voiceClip = elevenLabsUrl ? null : findRelevantVoiceClip(text, echoText, memories)

      // 6. Save Echo response to DB
      //    ElevenLabs blob URLs are ephemeral so we don't save them
      //    Phase 1 clip URLs (Supabase storage) ARE persistent and saved
      const { data: savedEcho } = await supabase
        .from('echo_conversations')
        .insert({
          user_id:       user.id,
          role:          'echo',
          content:       echoText,
          audio_url:     voiceClip?.audio_url    || null,
          clip_question: voiceClip?.question_text || null,
        })
        .select('id,role,content,created_at,audio_url,clip_question')
        .single()

      // 7. Replace optimistic bubble — local message gets live audio URL
      const liveAudioUrl    = elevenLabsUrl || voiceClip?.audio_url    || null
      const liveClipQuestion = elevenLabsUrl ? null : voiceClip?.question_text || null
      const liveVoiceSource  = elevenLabsUrl ? 'elevenlabs' : (voiceClip ? 'recorded_clip' : undefined)

      setMsgs(prev => [
        ...prev.filter(m => m.id !== tmpId),
        savedUser || { id: `u_${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() },
        {
          ...(savedEcho || { id: `e_${Date.now()}`, role: 'echo', content: echoText, created_at: new Date().toISOString() }),
          audio_url:     liveAudioUrl,
          clip_question: liveClipQuestion,
          voice_source:  liveVoiceSource,
        },
      ])

      // Show upgrade modal 3 s after the 3rd free message response lands
      if (!isPaid && newFreeUsed >= FREE_LIMIT) {
        setTimeout(() => setShowUpgrade(true), 3000)
      }

    } catch (err) {
      console.error('Echo send error:', err)
      addToast('Echo is unavailable right now — please try again.', 'error', AlertCircle)
      setMsgs(prev => prev.filter(m => m.id !== tmpId))
    }

    setIsTyping(false)
    setSending(false)
    textareaRef.current?.focus()
  }

  /* ── Web Speech API voice input — transcript goes directly into input ── */
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { addToast('Voice input is not supported in this browser.', 'error', AlertCircle); return }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const r = new SR()
    r.continuous = false; r.interimResults = false; r.lang = 'en-US'
    r.onstart  = () => setIsListening(true)
    r.onresult = e => { const t = e.results[0]?.[0]?.transcript || ''; setInput(prev => prev ? `${prev} ${t}` : t) }
    r.onend    = () => setIsListening(false)
    r.onerror  = () => setIsListening(false)
    r.start()
    recognitionRef.current = r
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() }
  }

  const shimmer = { animate: { opacity: [0.35, 0.65, 0.35] }, transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }

  // Fix 2: welcome text + suggestions change per viewMode
  const welcomeTitle = viewMode === 'family' ? `Hello. I'm Echo.` : `Hello, I'm Echo`
  const welcomeBody  = viewMode === 'family'
    ? `I carry ${userName}'s memories. Ask me anything you wish you had asked them.`
    : `I'm ${userName}, speaking through my memories. Ask me anything about my life — I'll answer from the stories I've shared.`
  const SUGGESTIONS = viewMode === 'family'
    ? [`What was your happiest memory?`, `Tell me about your family`, `What wisdom do you want to leave behind?`]
    : [`What was your childhood like?`, `Tell me about your family`, `What's the best advice you can give me?`]

  const dismissIntro = () => {
    localStorage.setItem(`echo_intro_seen_${user.id}`, '1')
    setShowIntro(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      style={{ display: 'flex', flexDirection: 'column', height: 'calc(100svh - 136px)', overflow: 'hidden', position: 'relative' }}
    >

      {/* ── FIRST-TIME UNLOCK INTRO ── */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="echo-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.35 } }}
            style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(10,9,20,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>

            {/* Pulsing Echo avatar */}
            <motion.div
              animate={{ boxShadow: ['0 0 24px rgba(201,168,76,0.2)', '0 0 64px rgba(201,168,76,0.55)', '0 0 24px rgba(201,168,76,0.2)'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg,#A8854E,${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.75rem' }}>
              <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', color: '#0A0914', fontSize: '2rem', fontWeight: 700 }}>E</span>
            </motion.div>

            {/* Unlock badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${BORDER_A}`, borderRadius: 999, marginBottom: '1.1rem' }}>
              <Sparkles size={11} color={GOLD} />
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.65rem', color: GOLD, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Echo Unlocked</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(1.6rem,5vw,2.2rem)', color: TEXT, margin: '0 0 0.75rem', lineHeight: 1.2 }}>
              Hi — I'm Echo.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: 'clamp(0.85rem,2vw,1rem)', color: MUTED, maxWidth: 340, lineHeight: 1.75, margin: '0 0 1.25rem' }}>
              I've been trained on {userName}'s real memories and stories.<br />
              Ask me anything — I'll answer as them.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              style={{ fontFamily: "'Jost',sans-serif", fontWeight: 400, fontSize: '0.78rem', color: 'rgba(201,168,76,0.6)', maxWidth: 300, lineHeight: 1.65, margin: '0 0 2.2rem', fontStyle: 'italic' }}>
              The more questions you answer, the richer I become — keep building your legacy.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              type="button"
              onClick={dismissIntro}
              whileTap={{ scale: 0.97 }}
              style={{ height: 52, padding: '0 2.5rem', background: `linear-gradient(135deg,#A8854E,${GOLD})`, border: 'none', borderRadius: 14, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#0A0914', letterSpacing: '0.02em', boxShadow: '0 8px 32px rgba(201,168,76,0.35)' }}>
              Start talking →
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
              style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', color: DIM, marginTop: '1.25rem' }}>
              {memories.length} {memories.length === 1 ? 'memory' : 'memories'} loaded
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fix 4: Dev mode banner ── */}
      {IS_DEV && (
        <div style={{ background: 'rgba(232,168,56,0.1)', borderBottom: '1px solid rgba(232,168,56,0.22)', padding: '5px 1.25rem', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <AlertCircle size={11} color="#E8A838" strokeWidth={2} />
          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.63rem', color: '#E8A838', fontWeight: 600, letterSpacing: '0.04em' }}>
            Dev Mode — Echo unlocks at {ECHO_AT} answers (production threshold: 30)
          </span>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ padding: '0.75rem 1.25rem', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>

        {/* Row 1: Identity + daily counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <motion.div
              animate={{ boxShadow: ['0 0 12px rgba(201,168,76,0.1)','0 0 26px rgba(201,168,76,0.28)','0 0 12px rgba(201,168,76,0.1)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,#A8854E,${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', color: '#0A0914', fontSize: '0.85rem', fontWeight: 700 }}>E</span>
            </motion.div>
            <div>
              <p style={{ margin: 0, fontFamily: "'Bodoni Moda',serif", fontSize: '0.93rem', color: TEXT, lineHeight: 1.15 }}>
                {viewMode === 'family' ? `Echo — ${userName}` : 'Echo — Your Memories'}
              </p>
              <p style={{ margin: 0, fontFamily: "'Jost',sans-serif", fontSize: '0.6rem', color: MUTED }}>
                {viewMode === 'family' ? `Speaking as ${userName}'s memory` : 'Testing how Echo speaks for you'}
              </p>
            </div>
          </div>
          <p style={{ margin: 0, fontFamily: "'Jost',sans-serif", fontSize: '0.67rem', flexShrink: 0, textAlign: 'right', color: limitReached ? '#E05252' : freeLeft === 1 && !isPaid ? '#E8A838' : MUTED }}>
            {isPaid
              ? 'Unlimited'
              : limitReached
                ? 'Upgrade to continue'
                : freeUsed > 0
                  ? `${freeLeft} free ${freeLeft === 1 ? 'conversation' : 'conversations'} left`
                  : ''}
          </p>
        </div>

        {/* Row 2: view mode toggle — Family View locked behind waitlist */}
        <div style={{ display: 'flex', gap: 5 }}>
          {/* My Echo — active */}
          <button type="button" onClick={() => setViewMode('self')}
            style={{ flex: 1, height: 28, borderRadius: 999, border: `1px solid ${viewMode === 'self' ? BORDER_A : BORDER}`, background: viewMode === 'self' ? GOLD_DIM : 'transparent', color: viewMode === 'self' ? GOLD : MUTED, fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', fontWeight: viewMode === 'self' ? 700 : 400, cursor: 'pointer', transition: 'all 0.18s', touchAction: 'manipulation' }}>
            My Echo
          </button>

          {/* Family View — locked */}
          <button type="button" onClick={() => setShowFamilyLock(true)}
            style={{ flex: 1, height: 28, borderRadius: 999, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', fontWeight: 400, cursor: 'pointer', transition: 'all 0.18s', touchAction: 'manipulation', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Lock size={9} strokeWidth={2.5} />
            Family View
          </button>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', overscrollBehavior: 'contain' }}>

        {chatLoading ? (
          /* Skeleton shimmer */
          <>
            <div style={{ display: 'flex', gap: 9, maxWidth: '75%' }}>
              <motion.div {...shimmer} style={{ width: 28, height: 28, borderRadius: '50%', background: BORDER, flexShrink: 0 }} />
              <motion.div {...shimmer} style={{ height: 68, flex: 1, borderRadius: '16px 16px 16px 4px', background: BORDER }} />
            </div>
            <div style={{ display: 'flex', alignSelf: 'flex-end', maxWidth: '55%', width: '55%' }}>
              <motion.div {...shimmer} style={{ height: 46, width: '100%', borderRadius: '16px 16px 4px 16px', background: BORDER }} />
            </div>
            <div style={{ display: 'flex', gap: 9, maxWidth: '70%' }}>
              <motion.div {...shimmer} style={{ width: 28, height: 28, borderRadius: '50%', background: BORDER, flexShrink: 0 }} />
              <motion.div {...shimmer} style={{ height: 54, flex: 1, borderRadius: '16px 16px 16px 4px', background: BORDER }} />
            </div>
          </>
        ) : openingMsg !== null ? (
          /* ── First-time opening — typewriter reveal ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', gap: 9, alignSelf: 'flex-start', maxWidth: '84%' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,#A8854E,${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', color: '#0A0914', fontSize: '0.72rem', fontWeight: 700 }}>E</span>
              </div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px 16px 16px 4px', padding: '10px 14px', maxWidth: '100%' }}>
                <p style={{ margin: 0, fontFamily: "'Jost',sans-serif", fontSize: '0.88rem', color: TEXT, lineHeight: 1.65, fontWeight: 300 }}>
                  <TypewriterText text={openingMsg} speed={42} onComplete={() => {
                    setTimeout(() => setInputVisible(true), 900)
                  }} />
                </p>
              </div>
            </div>
            <AnimatePresence>
              {inputVisible && (
                <motion.p key="ask-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
                  style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', color: DIM, textAlign: 'center', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                  Ask me anything →
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ) : msgs.length === 0 ? (
          /* Welcome state (no history, no opening gen — e.g. limit reached on first visit) */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '1.5rem', gap: '1.25rem', minHeight: '60%' }}>
            <motion.div
              animate={{ boxShadow: ['0 0 20px rgba(201,168,76,0.08)','0 0 50px rgba(201,168,76,0.25)','0 0 20px rgba(201,168,76,0.08)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 68, height: 68, borderRadius: '50%', background: `linear-gradient(135deg,#A8854E,${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', color: '#0A0914', fontSize: '1.85rem', fontWeight: 700 }}>E</span>
            </motion.div>
            <div>
              <h3 style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: '1.35rem', color: TEXT, margin: '0 0 0.5rem' }}>{welcomeTitle}</h3>
              <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.86rem', color: MUTED, lineHeight: 1.8, maxWidth: 340, margin: 0 }}>{welcomeBody}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%', maxWidth: 320 }}>
              {SUGGESTIONS.map(q => (
                <motion.button key={q} type="button" onClick={() => setInput(q)}
                  whileTap={{ scale: 0.97 }}
                  style={{ padding: '10px 15px', background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 11, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.81rem', color: MUTED, textAlign: 'left', transition: 'all 0.18s', touchAction: 'manipulation' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER_A; e.currentTarget.style.color = TEXT }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED }}>
                  {q}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          /* Normal conversation view */
          <>
            {msgs.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          </>
        )}

        <AnimatePresence>
          {isTyping && (
            <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Free counter (shows after 1st message if not paid) ── */}
      <AnimatePresence>
        {!isPaid && freeUsed > 0 && freeUsed < FREE_LIMIT && (
          <motion.div key="free-counter"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ padding: '5px 1rem 0', textAlign: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', fontWeight: 500, color: freeLeft === 1 ? '#E8A838' : 'rgba(201,168,76,0.65)' }}>
              {freeLeft} free Echo {freeLeft === 1 ? 'conversation' : 'conversations'} remaining
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upgrade banner (after modal dismissed) ── */}
      <AnimatePresence>
        {limitReached && !showUpgrade && (
          <motion.div key="upgrade-banner"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ padding: '7px 1.25rem', background: 'rgba(201,168,76,0.07)', borderTop: `1px solid ${BORDER_A}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', color: 'rgba(201,168,76,0.7)' }}>
              Upgrade to keep talking to Echo
            </span>
            <motion.button type="button" onClick={() => setShowUpgrade(true)} whileTap={{ scale: 0.96 }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', color: GOLD, fontWeight: 700, padding: 0, flexShrink: 0 }}>
              Upgrade →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input bar (hidden until inputVisible or conversation already exists) ── */}
      {!limitReached && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: (inputVisible || msgs.length > 1) ? 1 : 0 }}
          transition={{ duration: 0.45 }}
          style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: 8, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', pointerEvents: (inputVisible || msgs.length > 1) ? 'auto' : 'none' }}>

          {/* Voice */}
          <motion.button type="button" onClick={toggleVoice} whileTap={{ scale: 0.93 }}
            title={isListening ? 'Stop listening' : 'Speak your question'}
            style={{ width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isListening ? 'rgba(224,82,82,0.5)' : BORDER}`, background: isListening ? 'rgba(224,82,82,0.12)' : SURF_UP, color: isListening ? '#E05252' : MUTED, cursor: 'pointer', flexShrink: 0, transition: 'all 0.18s' }}>
            {isListening
              ? <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}><Mic size={16} strokeWidth={1.8} /></motion.div>
              : <Mic size={16} strokeWidth={1.8} />}
          </motion.button>

          {/* Text */}
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Ask ${userName} anything…`}
              maxLength={MAX_CHARS}
              disabled={isTyping}
              rows={1}
              style={{ width: '100%', background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 11, padding: '10px 14px', fontFamily: "'Jost',sans-serif", fontSize: '0.88rem', color: TEXT, resize: 'none', outline: 'none', maxHeight: 120, minHeight: 42, lineHeight: 1.5, boxSizing: 'border-box', transition: 'border-color 0.2s', display: 'block' }}
              onFocus={e => { e.currentTarget.style.borderColor = BORDER_A }}
              onBlur={e => { e.currentTarget.style.borderColor = BORDER }}
            />
            {input.length > MAX_CHARS * 0.8 && (
              <span style={{ position: 'absolute', bottom: 7, right: 10, fontFamily: "'Jost',sans-serif", fontSize: '0.6rem', color: input.length > MAX_CHARS * 0.92 ? '#E09252' : DIM, pointerEvents: 'none' }}>
                {input.length}/{MAX_CHARS}
              </span>
            )}
          </div>

          {/* Send */}
          <motion.button type="button" onClick={sendMsg}
            disabled={!input.trim() || isTyping || sending}
            whileTap={{ scale: 0.93 }}
            style={{ width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: input.trim() && !isTyping ? `linear-gradient(135deg,#A8854E,${GOLD})` : 'rgba(201,168,76,0.1)', color: input.trim() && !isTyping ? '#0A0914' : 'rgba(201,168,76,0.3)', border: 'none', cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.2s' }}>
            {sending
              ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={15} /></motion.span>
              : <Send size={15} strokeWidth={2} />}
          </motion.button>
        </motion.div>
      )}

      {/* ── Upgrade modal overlay ── */}
      <AnimatePresence>
        {showUpgrade && (
          <UpgradeModal
            userName={userName}
            memoriesCount={memories.length}
            onLater={() => setShowUpgrade(false)}
            onWaitlist={() => { setShowUpgrade(false); setFamilyWaitlist(true) }}
          />
        )}
      </AnimatePresence>

      {/* ── Family View locked modal ── */}
      <AnimatePresence>
        {showFamilyLock && (
          <motion.div
            key="family-lock"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowFamilyLock(false)}
            style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(10,9,20,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1   }}
              exit={{    opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 400, background: SURFACE, border: `1px solid ${BORDER_A}`, borderRadius: 22, overflow: 'hidden', boxShadow: '0 0 80px rgba(201,168,76,0.1), 0 40px 80px rgba(0,0,0,0.5)', position: 'relative' }}>

              {/* Gold top strip */}
              <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.6),transparent)' }} />

              <div style={{ padding: '1.75rem 1.75rem 1.5rem', textAlign: 'center' }}>

                {/* Icon */}
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201,168,76,0.08)', border: `1px solid ${BORDER_A}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <Users size={22} color={GOLD} strokeWidth={1.5} />
                </div>

                <h3 style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontStyle: 'italic', fontSize: '1.45rem', color: TEXT, margin: '0 0 0.65rem', lineHeight: 1.25 }}>
                  Family View
                </h3>

                <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.88rem', color: MUTED, lineHeight: 1.75, margin: '0 0 1.5rem' }}>
                  Add up to <span style={{ color: TEXT, fontWeight: 500 }}>5 family members</span> so they can talk directly to your Echo — in your real voice, trained on your real memories. Like you're in the room with them.
                </p>

                {/* Feature bullets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.75rem', textAlign: 'left' }}>
                  {[
                    'Each member gets their own private conversation',
                    'Echo speaks in your voice, not a generic AI',
                    'Your memories make every answer personal',
                    'They can ask anything — you answer through Echo',
                  ].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: GOLD_DIM, border: `1px solid ${BORDER_A}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <Check size={8} color={GOLD} strokeWidth={3} />
                      </div>
                      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.8rem', color: MUTED, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* Join waitlist CTA */}
                <motion.button type="button" onClick={() => { setShowFamilyLock(false); setFamilyWaitlist(true) }}
                  whileTap={{ scale: 0.97 }}
                  style={{ width: '100%', height: 48, background: `linear-gradient(135deg,#A8854E,${GOLD})`, border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.9rem', fontWeight: 700, color: '#0A0914', marginBottom: 10, boxShadow: '0 6px 24px rgba(201,168,76,0.3)' }}>
                  Join the Waitlist
                </motion.button>

                <button type="button" onClick={() => setShowFamilyLock(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: DIM, padding: '4px 0', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = MUTED}
                  onMouseLeave={e => e.currentTarget.style.color = DIM}>
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <WaitlistModal open={familyWaitlist} onClose={() => setFamilyWaitlist(false)} />
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ECHO LOCKED SCREEN  — curiosity-first redesign
══════════════════════════════════════════════════════════════ */
const ECHO_GHOST_CONVOS = [
  { role: 'user', text: 'What was the proudest moment of your life?' },
  { role: 'echo', text: 'There was a morning I still think about — the air smelled like cut grass and something felt different. It wasn\'t the big ceremony or the applause. It was the quiet after, when I finally understood what I\'d been working toward all those years…' },
  { role: 'user', text: 'Tell me about someone you loved.' },
  { role: 'echo', text: 'Your grandfather had this way of laughing — sudden and deep, like it surprised even him. He never said "I love you" directly. He showed it by showing up. I learned everything about loyalty from watching him.' },
  { role: 'user', text: 'What do you want us to remember most?' },
  { role: 'echo', text: 'That ordinary days were the ones I treasured most. Not the milestones — the slow Sunday mornings, the dinners that ran long, the small kindnesses nobody wrote down. Those were the real story.' },
]

function EchoLocked({ total, onBack, userName }) {
  const left = ECHO_AT - total
  const pct  = total / ECHO_AT


  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem 1.25rem 2rem', overflowY: 'auto', flex: 1 }}>

      {/* ── Lock icon + headline ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.1rem', paddingTop: '0.5rem' }}>
        <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
          {/* Progress arc */}
          <svg width="92" height="92" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="46" cy="46" r="40" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2.5" />
            <motion.circle
              cx="46" cy="46" r="40" fill="none"
              stroke="url(#lockArcGrad)" strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - Math.min(total / ECHO_AT, 1)) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            />
            <defs>
              <linearGradient id="lockArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A8854E" />
                <stop offset="100%" stopColor="#C9A84C" />
              </linearGradient>
            </defs>
          </svg>
          {/* Lock circle */}
          <motion.div
            animate={{ boxShadow: ['0 0 16px rgba(201,168,76,0.08)','0 0 36px rgba(201,168,76,0.22)','0 0 16px rgba(201,168,76,0.08)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: `1.5px solid ${BORDER_A}`, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={26} color={GOLD} strokeWidth={1.4} />
          </motion.div>
          {/* Count label */}
          <div style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.62rem', color: MUTED, letterSpacing: '0.05em' }}>
              {total} / {ECHO_AT}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <h2 style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: 'clamp(1.4rem,4vw,1.8rem)', color: TEXT, margin: '0 0 0.6rem', lineHeight: 1.2 }}>
            Echo Chat is locked
          </h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.88rem', color: MUTED, lineHeight: 1.75, margin: 0, maxWidth: 340 }}>
            Answer <span style={{ color: GOLD, fontWeight: 600 }}>{left} more {left === 1 ? 'question' : 'questions'}</span> to unlock Echo Chat — where your family can speak with Echo, trained entirely on your real memories, in your own words.
          </p>
        </div>
      </div>

      {/* ── What Echo makes possible ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { icon: '🗣', text: `Echo is trained on your memories — it will speak as ${userName || 'you'}, in your words, from your stories` },
          { icon: '💛', text: `When you're not there, the people who love you can still ask you anything` },
          { icon: '✨', text: `Every answer you share makes Echo more real, more you` },
        ].map(({ icon, text }, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 11 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.84rem', fontWeight: 400, color: TEXT, lineHeight: 1.6 }}>{text}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <EchoProgress total={total} unlockAt={ECHO_AT} onOpenEchoChat={() => {}} />

      {/* ── Ghost conversation preview ── */}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>

        {/* Blurred chat bubbles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', filter: 'blur(4px)', opacity: 0.28, pointerEvents: 'none', userSelect: 'none' }}>
          {ECHO_GHOST_CONVOS.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%',
                padding: '9px 13px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? GOLD_DIM : SURFACE,
                border: `1px solid ${msg.role === 'user' ? BORDER_A : BORDER}`,
                fontFamily: "'Jost',sans-serif",
                fontSize: '0.82rem',
                color: TEXT,
                lineHeight: 1.55,
              }}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Overlay: fade top + bottom + lock badge */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${BG} 0%, transparent 22%, transparent 72%, ${BG} 100%)`, pointerEvents: 'none' }} />

        {/* Centred lock badge */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.75)', border: `1px solid ${BORDER_A}`, borderRadius: 999, padding: '8px 18px', backdropFilter: 'blur(8px)' }}>
            <Lock size={12} color={GOLD} strokeWidth={2} />
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: GOLD, fontWeight: 600, letterSpacing: '0.02em' }}>
              {left} more {left === 1 ? 'answer' : 'answers'} to unlock your voice
            </span>
          </motion.div>
        </div>
      </div>

      {/* ── CTA row ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: '0.25rem' }}>
        <motion.button type="button" onClick={onBack} whileTap={{ scale: 0.97 }}
          style={{ height: 46, paddingInline: '2rem', background: `linear-gradient(135deg,#A8854E,${GOLD})`, border: 'none', borderRadius: 13, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.88rem', fontWeight: 700, color: '#0A0914', letterSpacing: '0.02em', touchAction: 'manipulation', boxShadow: '0 4px 20px rgba(201,168,76,0.2)' }}>
          Answer today's question →
        </motion.button>
        <button type="button" onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.76rem', color: DIM, padding: '4px 0', touchAction: 'manipulation', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = MUTED} onMouseLeave={e => e.currentTarget.style.color = DIM}>
          ← Back to Home
        </button>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   HOME SECTION
══════════════════════════════════════════════════════════════ */
function HomeSection({
  user, question, questionLoading, answeredToday, todayAnswer,
  answer, setAnswer, saving, saved, handleSave,
  recording, transcribing, recordingTime, waveformData, formatTime, toggleRecording,
  photoPreviewUrl, onPhotoSelect, onPhotoRemove, onAddPhoto, uploadingPhoto,
  memories, setSelectedMem, setSection, addToast, onPhotoClick, onDevNextQuestion,
  saveFailed, isOnline, questionLoadFailed, onRetryLoad,
}) {
  const textareaRef = useRef()
  const [focused, setFocused]   = useState(false)
  const userName  = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend'
  const greeting  = getGreeting(userName)
  const total     = memories.length
  const { canInstall, isIOS, install, dismiss, promptEvt } = usePWAInstall()
  const thisWeek  = memories.filter(m => (Date.now() - new Date(m.created_at)) < 7 * 86400000).length
  const MAX_CHARS = 2000
  const charsLeft = answer.length

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(el.scrollHeight, 120) + 'px'
  }, [answer])

  return (
    <motion.div key="home"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
      style={{ display: 'grid', gap: '1.25rem', padding: '1.25rem 1rem 1.5rem' }}
      className="grid-cols-1 lg:grid-cols-[1fr_260px]">

      {/* ─── LEFT COL ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>

        {/* Greeting — desktop */}
        <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: '1.05rem', color: MUTED, fontWeight: 300, flexShrink: 0 }}>{greeting}</span>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', color: DIM, flexShrink: 0 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>


        {/* ── Question load failure retry ── */}
        {questionLoadFailed && !questionLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0.65rem 1rem', background: 'rgba(232,168,56,0.08)', border: '1px solid rgba(232,168,56,0.2)', borderRadius: 11 }}>
            <AlertCircle size={13} color="#E8A838" strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: '#E8A838' }}>
              Couldn't load your question — showing a fallback.
            </span>
            <button type="button" onClick={onRetryLoad}
              style={{ background: 'rgba(232,168,56,0.12)', border: '1px solid rgba(232,168,56,0.3)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', fontWeight: 600, color: '#E8A838', flexShrink: 0, touchAction: 'manipulation' }}>
              Retry
            </button>
          </div>
        )}

        {/* ── QUESTION AREA ── */}
        {questionLoading ? (
          <QuestionCardSkeleton />
        ) : answeredToday ? (
          <AnsweredTodayCard question={question} todayAnswer={todayAnswer} total={total}
            onAddPhoto={onAddPhoto} uploadingPhoto={uploadingPhoto}
            onDevNextQuestion={onDevNextQuestion} />
        ) : (
          /* ── ACTIVE QUESTION CARD ── */
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
            style={{ background: '#FFD8EC', borderRadius: 32, overflow: 'hidden', border: 'none', boxShadow: focused ? 'inset 0 -14px 28px rgba(180,50,90,0.16),inset 0 12px 24px rgba(255,255,255,0.92),0 0 0 4px rgba(201,98,130,0.22),0 20px 50px rgba(201,98,130,0.28)' : 'inset 0 -14px 28px rgba(180,50,90,0.13),inset 0 12px 24px rgba(255,255,255,0.92),0 20px 50px rgba(201,98,130,0.22)', transition: 'box-shadow 0.3s' }}>

            {/* Header — deep clay */}
            <div style={{ height: 130, position: 'relative', overflow: 'hidden', background: '#E05888', flexShrink: 0, boxShadow: 'inset 0 -12px 24px rgba(140,20,60,0.30),inset 0 10px 20px rgba(255,255,255,0.42)' }}>
              {/* puffy highlight dome */}
              <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: '120%', height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', filter: 'blur(18px)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 14, left: 18, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Calendar size={13} color="rgba(255,255,255,0.92)" strokeWidth={2.2} />
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', color: 'rgba(255,255,255,0.92)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>Today's Question</span>
              </div>
            </div>

            {/* Question text */}
            <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
              <p style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.2rem,3vw,1.6rem)', color: TEXT, lineHeight: 1.45, margin: 0 }}>
                {question?.question_text || ''}
              </p>
              {/* Library fallback indicator */}
              {question?.isFromLibrary && (
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.62rem', color: DIM, marginTop: '0.55rem', margin: '0.55rem 0 0', letterSpacing: '0.04em' }}>
                  Question from our library
                </p>
              )}
              {/* Dev mode badge — only visible when VITE_DEV_MODE=true */}
              {import.meta.env.VITE_DEV_MODE === 'true' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: '0.65rem', padding: '3px 9px', background: 'rgba(232,168,56,0.1)', border: '1px solid rgba(232,168,56,0.2)', borderRadius: 999 }}>
                  <AlertCircle size={10} color="#E8A838" strokeWidth={2} />
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.6rem', color: '#E8A838', fontWeight: 600, letterSpacing: '0.06em' }}>
                    Dev Mode — questions rotating test
                  </span>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: 'rgba(201,98,130,0.12)' }} />

            {/* ── RECORDING STATE: waveform ── */}
            {recording ? (
              <div style={{ padding: '1rem 1.25rem' }}>
                {/* Timer + red dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.85rem' }}>
                  <motion.div
                    animate={{ opacity: [1, 0.25, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: 9, height: 9, borderRadius: '50%', background: '#E05252', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.5rem', color: TEXT, letterSpacing: '0.08em', lineHeight: 1 }}>
                    {formatTime(recordingTime)}
                  </span>
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', color: MUTED }}>
                    Speak naturally — transcript appears when you stop
                  </span>
                </div>

                {/* Live waveform bars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 52, marginBottom: '0.5rem' }}>
                  {waveformData.map((val, i) => (
                    <motion.div key={i}
                      animate={{ height: Math.max(4, (val / 255) * 52) }}
                      transition={{ duration: 0.06, ease: 'linear' }}
                      style={{ flex: 1, borderRadius: 3, background: `linear-gradient(180deg,#DFC090,${GOLD})`, opacity: 0.4 + (val / 255) * 0.6, minHeight: 4 }}
                    />
                  ))}
                </div>

                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', color: DIM, margin: 0 }}>
                  Transcript will appear when you stop recording.
                </p>
              </div>

            ) : transcribing ? (
              /* ── TRANSCRIBING STATE ── */
              <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: 14 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ flexShrink: 0 }}>
                  <Loader2 size={22} color={GOLD} strokeWidth={1.8} />
                </motion.div>
                <div>
                  <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.88rem', color: TEXT, margin: '0 0 3px', fontWeight: 500 }}>
                    Converting your voice to text…
                  </p>
                  <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', color: MUTED, margin: 0 }}>
                    This usually takes a moment
                  </p>
                </div>
              </div>

            ) : (
              /* ── VOICE-FIRST INPUT ── */
              <>
                {/* ══ BIG VOICE CTA — hero element when answer is empty ══ */}
                <AnimatePresence>
                  {!answer.trim() && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '1.75rem 1.25rem 1.1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

                        {/* Clay mic blob */}
                        <motion.button type="button" onClick={toggleRecording}
                          whileHover={{ scale: 1.07, transition: { type: 'spring', stiffness: 400, damping: 16 } }}
                          whileTap={{ scale: 0.90 }}
                          animate={{
                            boxShadow: [
                              'inset 0 -8px 16px rgba(140,20,60,0.28),inset 0 8px 16px rgba(255,255,255,0.42),0 8px 0 rgba(180,40,80,0.40),0 12px 32px rgba(201,98,130,0.28)',
                              'inset 0 -8px 16px rgba(140,20,60,0.28),inset 0 8px 16px rgba(255,255,255,0.42),0 8px 0 rgba(180,40,80,0.40),0 20px 48px rgba(201,98,130,0.40)',
                              'inset 0 -8px 16px rgba(140,20,60,0.28),inset 0 8px 16px rgba(255,255,255,0.42),0 8px 0 rgba(180,40,80,0.40),0 12px 32px rgba(201,98,130,0.28)',
                            ],
                          }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                          style={{ width: 88, height: 88, borderRadius: '50%', background: '#E05888', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.1rem', touchAction: 'manipulation', flexShrink: 0 }}>
                          <Mic size={34} color="rgba(255,255,255,0.95)" strokeWidth={1.8} />
                        </motion.button>

                        {/* Headline */}
                        <p style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontWeight: 400, fontSize: '1.2rem', color: TEXT, margin: '0 0 0.4rem', lineHeight: 1.3 }}>
                          Speak your answer
                        </p>
                        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.78rem', color: MUTED, margin: 0, lineHeight: 1.65, maxWidth: 260 }}>
                          Your voice is preserved as part of this memory — exactly as you sound today
                        </p>

                        {/* Divider to textarea */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: '1.35rem', width: '100%' }}>
                          <div style={{ flex: 1, height: 1, background: BORDER }} />
                          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.63rem', color: DIM, letterSpacing: '0.06em' }}>or write below</span>
                          <div style={{ flex: 1, height: 1, background: BORDER }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Textarea — always present, becomes primary once user starts typing */}
                <div style={{ padding: answer.trim() ? '0.9rem 1.25rem 0.4rem' : '0 1.25rem 0.75rem' }}>
                  <textarea
                    ref={textareaRef}
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Write your answer here…"
                    maxLength={MAX_CHARS}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.55)', border: 'none', outline: 'none', resize: 'none', fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.93rem', color: TEXT, lineHeight: 1.8, minHeight: answer.trim() ? 120 : 52, boxSizing: 'border-box', touchAction: 'pan-y', borderRadius: 18, padding: '0.85rem 1rem', boxShadow: 'inset 0 6px 14px rgba(180,50,90,0.13),inset 0 -3px 8px rgba(255,255,255,0.50)', transition: 'box-shadow 0.2s' }}
                  />
                  <style>{`textarea::placeholder{color:rgba(26,21,48,0.28)} input::placeholder{color:rgba(26,21,48,0.28)}`}</style>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.35rem' }}>
                    {charsLeft > 0 && charsLeft < MIN_ANSWER_CHARS ? (
                      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.65rem', color: 'rgba(232,168,56,0.8)' }}>
                        {MIN_ANSWER_CHARS - charsLeft} more characters to save
                      </span>
                    ) : <span />}
                    {charsLeft > 0 && (
                      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.62rem', color: charsLeft > MAX_CHARS * 0.9 ? '#E09252' : DIM }}>
                        {charsLeft}/{MAX_CHARS}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── PHOTO PREVIEW — small passport thumbnail ── */}
            {photoPreviewUrl && !recording && !transcribing && (
              <div style={{ margin: '0 1.1rem 0.5rem', padding: '0.6rem 0.8rem', background: SURF_UP, border: `1px solid ${BORDER_A}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={photoPreviewUrl} alt="Preview"
                  style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: '0.78rem', color: TEXT, fontWeight: 600, fontFamily: "'Jost',sans-serif" }}>Photo ready</p>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: MUTED, fontFamily: "'Jost',sans-serif" }}>Will save with your memory</p>
                </div>
                <button type="button" onClick={onPhotoRemove}
                  style={{ background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 7, cursor: 'pointer', color: MUTED, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            )}

            <div style={{ height: 1, background: BORDER }} />

            {/* ── Save failed notice ── */}
            {saveFailed && (
              <div style={{ padding: '0.55rem 1.1rem', background: 'rgba(224,82,82,0.06)', borderBottom: '1px solid rgba(224,82,82,0.14)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertCircle size={12} color="#E05252" strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.73rem', color: '#E05252' }}>
                  Save failed — your draft is preserved. Tap "Save Memory" to retry.
                </span>
              </div>
            )}

            {/* ── ACTION BAR ── */}
            {/* Hidden file input — triggered by Photo button below */}
            <input
              id="photo-file-input" type="file" accept="image/*" capture="environment"
              style={{ display: 'none' }}
              onChange={onPhotoSelect}
            />

            <div style={{ padding: '0.75rem 1.1rem', display: 'flex', alignItems: 'center', gap: 9 }}>

              {/* Voice / Stop / Transcribing button
                  Hidden when the big voice CTA is already visible (empty answer, idle)
                  so it doesn't compete. Reappears once user has typed, or during recording. */}
              {(answer.trim() || recording || transcribing) && (
                <motion.button type="button"
                  onClick={transcribing ? undefined : toggleRecording}
                  disabled={transcribing}
                  whileHover={{ scale: transcribing ? 1 : 1.02 }}
                  whileTap={{   scale: transcribing ? 1 : 0.96  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 44, background: recording ? '#FFD4D4' : transcribing ? '#FFF0D8' : '#EEE4FF', border: 'none', borderRadius: 14, cursor: transcribing ? 'not-allowed' : 'pointer', color: recording ? '#C03030' : transcribing ? '#B87820' : '#6040B8', fontSize: '0.8rem', fontFamily: "'Jost',sans-serif", transition: 'all 0.2s', flexShrink: 0, touchAction: 'manipulation', opacity: transcribing ? 0.7 : 1, boxShadow: recording ? 'inset 0 -4px 8px rgba(180,30,30,0.14),inset 0 4px 8px rgba(255,255,255,0.80),0 6px 16px rgba(200,60,60,0.20)' : 'inset 0 -4px 8px rgba(80,40,160,0.10),inset 0 4px 8px rgba(255,255,255,0.85),0 6px 16px rgba(100,60,200,0.15)' }}>
                  {recording
                    ? <><MicOff size={15} strokeWidth={1.8} />Stop</>
                    : transcribing
                      ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={14} /></motion.span>Converting…</>
                      : <><Mic size={15} strokeWidth={1.8} />Voice</>
                  }
                </motion.button>
              )}

              <motion.button type="button" onClick={handleSave}
                disabled={saving}
                whileHover={{ filter: !saving ? 'brightness(1.08)' : 'none' }}
                whileTap={{ scale: !saving ? 0.97 : 1 }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, background: saved ? '#C8F0D8' : answer.trim().length >= MIN_ANSWER_CHARS ? '#FFD8EC' : '#F0E8FF', border: 'none', borderRadius: 14, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.03em', color: saved ? '#186840' : answer.trim().length >= MIN_ANSWER_CHARS ? '#A82858' : '#8040C0', transition: 'all 0.25s', touchAction: 'manipulation', boxShadow: saved ? 'inset 0 -4px 8px rgba(20,130,60,0.14),inset 0 4px 8px rgba(255,255,255,0.85),0 6px 18px rgba(40,160,80,0.22)' : answer.trim().length >= MIN_ANSWER_CHARS ? 'inset 0 -4px 8px rgba(160,40,80,0.16),inset 0 4px 8px rgba(255,255,255,0.85),0 8px 22px rgba(200,80,130,0.26)' : 'inset 0 -4px 8px rgba(100,40,180,0.10),inset 0 4px 8px rgba(255,255,255,0.85),0 6px 16px rgba(130,70,200,0.14)' }}>
                {saving
                  ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={15} /></motion.span>Saving…</>
                  : saved
                    ? <><Check size={15} strokeWidth={2.5} />Memory saved!</>
                    : 'Save Memory'
                }
              </motion.button>

              <motion.button type="button" title="Add photo"
                onClick={() => document.getElementById('photo-file-input')?.click()}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 44, background: photoPreviewUrl ? '#FFF0C8' : '#D8F0FF', border: 'none', borderRadius: 14, cursor: 'pointer', color: photoPreviewUrl ? '#A06010' : '#2070A8', fontSize: '0.8rem', fontFamily: "'Jost',sans-serif", transition: 'all 0.2s', flexShrink: 0, touchAction: 'manipulation', boxShadow: photoPreviewUrl ? 'inset 0 -4px 8px rgba(160,90,0,0.14),inset 0 4px 8px rgba(255,255,255,0.85),0 6px 16px rgba(200,140,0,0.20)' : 'inset 0 -4px 8px rgba(20,90,160,0.10),inset 0 4px 8px rgba(255,255,255,0.85),0 6px 16px rgba(40,120,200,0.16)' }}>
                <ImagePlus size={15} strokeWidth={1.8} />
                <span className="hidden sm:inline">{photoPreviewUrl ? 'Change' : 'Photo'}</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── ECHO PROGRESS ── */}
        {!questionLoading && (
          <EchoProgress
            total={total}
            unlockAt={ECHO_AT}
            onOpenEchoChat={() => setSection('echo')}
          />
        )}

        {/* ── 7-DAY ACTIVITY ── */}
        <div style={{ background: '#E2D4FF', borderRadius: 24, padding: '0.9rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', boxShadow: 'inset 0 -10px 20px rgba(100,60,200,0.16),inset 0 10px 20px rgba(255,255,255,0.88),0 16px 40px rgba(130,90,220,0.22)' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontFamily: "'Jost',sans-serif", fontSize: '0.65rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>This week</p>
            <p style={{ margin: 0, fontFamily: "'Bodoni Moda',serif", fontSize: '1.15rem', color: TEXT }}>
              {thisWeek} <span style={{ fontSize: '0.73rem', color: MUTED, fontFamily: "'Jost',sans-serif", fontWeight: 300 }}>of 7 days answered</span>
            </p>
          </div>
          <ActivityDots memories={memories} />
        </div>

        {/* ── QUICK ACTION BENTO CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
          {[
            { label: 'Memory Archive', sub: `${total} saved`, bg: '#B8DCFF', shadowRgb: '50,110,210', blobBg: 'rgba(255,255,255,0.60)', iconC: '#1A58A8', textC: '#12407E', id: 'archive', icon: Archive },
            { label: 'Echo Chat', sub: total >= ECHO_AT ? 'Ready' : `${ECHO_AT - total} to unlock`, bg: '#FFCAB0', shadowRgb: '200,70,40', blobBg: 'rgba(255,255,255,0.60)', iconC: '#B03820', textC: '#802410', id: 'echo', icon: MessageCircle },
            { label: 'Settings', sub: 'Profile', bg: '#B0ECD0', shadowRgb: '20,140,80', blobBg: 'rgba(255,255,255,0.60)', iconC: '#107848', textC: '#0A5030', id: 'settings', icon: Settings },
          ].map(({ label, sub, bg, shadowRgb, blobBg, iconC, textC, icon: Icon, id }) => (
            <motion.button key={id} type="button" onClick={() => setSection(id)}
              whileHover={{ scale: 1.05, transition: { type: 'spring', stiffness: 380, damping: 18 } }}
              whileTap={{ scale: 0.93 }}
              style={{ background: bg, borderRadius: 24, border: 'none', cursor: 'pointer', padding: '1rem 0.9rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, position: 'relative', overflow: 'hidden', minHeight: 96, touchAction: 'manipulation', textAlign: 'left', boxShadow: `inset 0 -10px 20px rgba(${shadowRgb},0.18),inset 0 10px 20px rgba(255,255,255,0.85),0 14px 36px rgba(${shadowRgb},0.24)` }}>
              {/* icon blob */}
              <div style={{ width: 38, height: 38, borderRadius: 12, background: blobBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 -3px 6px rgba(${shadowRgb},0.14),inset 0 3px 6px rgba(255,255,255,0.90),0 4px 10px rgba(${shadowRgb},0.16)`, flexShrink: 0 }}>
                <Icon size={18} color={iconC} strokeWidth={2} />
              </div>
              <div>
                <p style={{ margin: 0, fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', fontWeight: 800, color: textC, lineHeight: 1.25 }}>{label}</p>
                <p style={{ margin: '3px 0 0', fontFamily: "'Jost',sans-serif", fontSize: '0.62rem', color: textC, opacity: 0.60, fontWeight: 600 }}>{sub}</p>
              </div>
            </motion.button>
          ))}
        </div>


        {/* ── RECENT MEMORIES ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <h2 style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: 'clamp(1.05rem,2.5vw,1.3rem)', color: TEXT, margin: 0 }}>
              Recent Memories
              {total > 0 && <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.72rem', color: MUTED, marginLeft: 8, fontWeight: 400, fontStyle: 'normal' }}>({total})</span>}
            </h2>
            {total > 0 && (
              <button type="button" onClick={() => setSection('archive')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontSize: '0.8rem', fontFamily: "'Jost',sans-serif", display: 'flex', alignItems: 'center', gap: 4, padding: '6px 0', touchAction: 'manipulation' }}>
                View all <ChevronRight size={13} strokeWidth={2} />
              </button>
            )}
          </div>

          {total === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: SURFACE, borderRadius: 14, border: `1px solid ${BORDER}` }}>
              <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ marginBottom: '1rem', opacity: 0.4 }}>
                <BookOpen size={32} color={GOLD} strokeWidth={1.2} style={{ margin: '0 auto' }} />
              </motion.div>
              <p style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: '1.1rem', color: MUTED, margin: '0 0 0.5rem' }}>Your story begins today.</p>
              <p style={{ fontSize: '0.82rem', color: MUTED, lineHeight: 1.7, margin: 0 }}>Answer today's question above to save your first memory.</p>
            </motion.div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,265px),1fr))', gap: '0.85rem' }}>
              {memories.slice(0, 6).map((mem, i) => (
                <MemoryCard key={mem.id} mem={mem} index={i}
                  onClick={() => setSelectedMem(mem)}
                  onPhotoClick={onPhotoClick} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT STATS PANEL (desktop) ─── */}
      <aside className="hidden lg:flex" style={{ flexDirection: 'column', gap: '1rem', minWidth: 0 }}>

        {/* Streak */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.1rem 1.2rem', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.7rem' }}>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
              <Flame size={17} color={GOLD} strokeWidth={1.8} />
            </motion.div>
            <span style={{ fontSize: '0.66rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Jost',sans-serif" }}>Memory Streak</span>
          </div>
          <p style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '2.8rem', fontWeight: 400, color: TEXT, margin: 0, lineHeight: 1 }}>{total}</p>
          <p style={{ fontSize: '0.75rem', color: MUTED, marginTop: 5, fontFamily: "'Jost',sans-serif" }}>{total === 1 ? 'memory' : 'memories'} saved</p>
          <div style={{ marginTop: '1rem' }}><ActivityDots memories={memories} /></div>
        </div>

        {/* Echo progress — compact sidebar version */}
        <EchoProgress total={total} unlockAt={ECHO_AT} onOpenEchoChat={() => setSection('echo')} />

        {/* Category breakdown */}
        {total > 0 && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.1rem 1.2rem' }}>
            <p style={{ fontSize: '0.66rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 1rem', fontFamily: "'Jost',sans-serif" }}>Categories</p>
            <CategoryBreakdown memories={memories} />
          </div>
        )}

        {/* Recent mini list */}
        {total > 0 && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1rem 1.1rem' }}>
            <p style={{ fontSize: '0.66rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.85rem', fontFamily: "'Jost',sans-serif" }}>Recent</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {memories.slice(0, 3).map(mem => (
                <div key={mem.id} onClick={() => setSelectedMem(mem)}
                  style={{ padding: '0.6rem 0.75rem', background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 9, cursor: 'pointer', transition: 'border-color 0.18s,background 0.18s', touchAction: 'manipulation' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER_A; e.currentTarget.style.background = GOLD_DIM }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = SURF_UP }}>
                  <p style={{ margin: '0 0 3px', fontSize: '0.64rem', color: MUTED, fontFamily: "'Jost',sans-serif" }}>{fmtShort(mem.created_at)}</p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: TEXT, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45, fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic' }}>
                    {mem.question_text || 'Question'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ARCHIVE SECTION
══════════════════════════════════════════════════════════════ */
function ArchiveSection({ memories, setSelectedMem, onPhotoClick }) {
  const [searchQ, setSearchQ]     = useState('')
  const [catFilter, setCatFilter] = useState('All')

  const filtered = memories.filter(m => {
    const matchCat = catFilter === 'All' || m.category === catFilter
    const txt      = ((m.question_text || '') + ' ' + (m.answer_text || '')).toLowerCase()
    return matchCat && (!searchQ || txt.includes(searchQ.toLowerCase()))
  })

  return (
    <motion.div key="archive" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}
      style={{ padding: '1.25rem 1rem 1.5rem', maxWidth: 900, margin: '0 auto', width: '100%' }}>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: 'clamp(1.2rem,3vw,1.6rem)', color: TEXT, margin: 0 }}>Memory Archive</h2>
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: MUTED }}>({memories.length} total)</span>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 11, padding: '0 13px', marginBottom: '0.85rem', height: 46 }}>
        <Search size={14} color={MUTED} strokeWidth={1.8} />
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search by question or answer…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Jost',sans-serif", fontSize: '0.85rem', color: TEXT, height: '100%' }} />
        {searchQ && (
          <button type="button" onClick={() => setSearchQ('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4, display: 'flex', touchAction: 'manipulation' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter — horizontally scrollable on mobile */}
      <div className="archive-chips-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: '1.1rem', scrollbarWidth: 'none' }}>
        {ALL_CATEGORIES.map(cat => {
          const active = catFilter === cat
          const s      = catStyle(cat)
          return (
            <motion.button key={cat} type="button" onClick={() => setCatFilter(cat)}
              whileTap={{ scale: 0.95 }}
              style={{ padding: '6px 14px', borderRadius: 999, border: `1px solid ${active ? s.text : BORDER}`, background: active ? s.bg : 'transparent', color: active ? s.text : MUTED, fontFamily: "'Jost',sans-serif", fontSize: '0.69rem', fontWeight: active ? 700 : 400, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.18s', touchAction: 'manipulation', flexShrink: 0, minHeight: 34 }}>
              {cat}
            </motion.button>
          )
        })}
      </div>

      {/* Result count */}
      {(searchQ || catFilter !== 'All') && memories.length > 0 && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', color: MUTED, margin: '0 0 0.85rem', paddingLeft: 2 }}>
          {filtered.length === 0
            ? 'No matches'
            : `Showing ${filtered.length} of ${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}`}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: MUTED }}>
          {memories.length === 0
            ? <p style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: '1.1rem', color: MUTED }}>No memories yet. Answer your first question to begin.</p>
            : <p style={{ fontSize: '0.85rem', fontFamily: "'Jost',sans-serif" }}>No memories match your search.</p>
          }
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,270px),1fr))', gap: '0.9rem' }}>
          {filtered.map((mem, i) => (
            <MemoryCard key={mem.id} mem={mem} index={i}
              onClick={() => setSelectedMem(mem)}
              onPhotoClick={onPhotoClick} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SETTINGS SECTION
══════════════════════════════════════════════════════════════ */

/* Passage the user reads aloud — varied phonemes, ~2 min at normal pace */
const VOICE_PASSAGE = `The people we love don't disappear when they leave. They stay in the small things. The way a certain song brings someone back completely, as if no time has passed at all. The smell of coffee in the morning that makes you think of your father. A phrase someone used to say that you catch yourself repeating.

We carry the people who shaped us everywhere we go. Their voices live inside ours. Their way of laughing, their advice, their warnings — all of it becomes part of who we are. We don't always notice this while it's happening. We only see it later, when we hear ourselves saying something our mother used to say, and we think: so that's where that came from.

Memory doesn't work like a recording. It works like a feeling. You don't remember the whole conversation, but you remember how someone made you feel. Safe. Heard. Like the world was a little less frightening because they were in it.

That is what I want to preserve. Not just the facts of my life, but the way it felt to live it. The ordinary days that were actually remarkable. The quiet moments between the big ones. The people who never made headlines but who were, to me, everything.

If you are listening to this, it means someone loved you enough to leave a part of themselves behind. I hope you can hear the warmth in my voice. I hope it sounds like home.`

function SettingsSection({ user, onSignOut, addToast, avatarUrl, onAvatarChange }) {
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend'

  /* ── Profile editing ── */
  const [editingName,      setEditingName]      = useState(false)
  const [displayName,      setDisplayName]      = useState(userName)
  const [nameInput,        setNameInput]        = useState(userName)
  const [savingName,       setSavingName]       = useState(false)

  const initial = displayName[0]?.toUpperCase() || 'U'
  const [uploadingAvatar,  setUploadingAvatar]  = useState(false)
  const avatarInputRef = useRef(null)

  /* ── Expandable sections ── */
  const [openSection,   setOpenSection]   = useState(null) // 'notifications'|'privacy'|'family'|'subscription'|'delete'
  const [waitlistOpen,  setWaitlistOpen]  = useState(false)
  const toggleSection = (s) => setOpenSection(prev => prev === s ? null : s)

  /* ── Notifications ── */
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifTime,    setNotifTime]    = useState('09:00')
  const [notifPerm,    setNotifPerm]    = useState('default')

  /* ── Privacy ── */
  const [memoriesPrivate, setMemoriesPrivate] = useState(false)

  /* ── Family Access ── */
  const [inviteEmail,        setInviteEmail]        = useState('')
  const [sendingInvite,      setSendingInvite]      = useState(false)
  const [invites,            setInvites]            = useState([])
  const [loadingInvites,     setLoadingInvites]     = useState(false)
  const [revokingId,         setRevokingId]         = useState(null)
  const [familyTableMissing, setFamilyTableMissing] = useState(false)

  /* ── Delete account ── */
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting,    setDeleting]    = useState(false)

  /* ── Voice Preservation state ── */
  const [voiceId,     setVoiceId]     = useState(null)
  const [voiceUsed,   setVoiceUsed]   = useState(0)
  const [voiceLimit]                  = useState(10000)
  const [recState,    setRecState]    = useState('idle')
  const [recTime,     setRecTime]     = useState(0)
  const [cloneErr,    setCloneErr]    = useState(null)
  const [previewing,  setPreviewing]  = useState(false)
  const [prevPlaying, setPrevPlaying] = useState(false)
  const [removing,    setRemoving]    = useState(false)

  const mediaRecRef  = useRef(null)
  const streamRef    = useRef(null)
  const chunksRef    = useRef([])
  const timerRef     = useRef(null)
  const prevAudioRef = useRef(null)

  /* ── Load profile on mount ── */
  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('elevenlabs_voice_id, elevenlabs_chars_used, memories_private')
        .eq('id', user.id)
        .maybeSingle()
      setVoiceId(data?.elevenlabs_voice_id || null)
      setVoiceUsed(data?.elevenlabs_chars_used || 0)
      setMemoriesPrivate(data?.memories_private || false)
    })()
    // Notifications pref from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('echo_notif') || '{}')
      setNotifEnabled(!!saved.enabled)
      setNotifTime(saved.time || '09:00')
    } catch {}
    setNotifPerm(Notification?.permission || 'default')
  }, [user?.id])

  /* ── Cleanup on unmount ── */
  useEffect(() => () => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (prevAudioRef.current) prevAudioRef.current.pause()
  }, [])

  /* ── Load invites when Family section opens ── */
  useEffect(() => {
    if (openSection !== 'family') return
    loadInvites()
  }, [openSection])

  const loadInvites = async () => {
    setLoadingInvites(true)
    try {
      const { data, error } = await supabase
        .from('family_access')
        .select('*')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false })
      if (error?.code === '42P01') { setFamilyTableMissing(true) }
      else { setInvites(data || []); setFamilyTableMissing(false) }
    } catch { setFamilyTableMissing(true) }
    setLoadingInvites(false)
  }

  /* ── Save profile name ── */
  const saveName = async () => {
    if (!nameInput.trim() || savingName) return
    setSavingName(true)
    try {
      await Promise.all([
        supabase.auth.updateUser({ data: { full_name: nameInput.trim() } }),
        supabase.from('user_profiles').update({ display_name: nameInput.trim() }).eq('id', user.id),
      ])
      setDisplayName(nameInput.trim())
      setEditingName(false)
      addToast('Name updated.', 'success', Check)
    } catch { addToast('Failed to update name — please try again.', 'error', AlertCircle) }
    setSavingName(false)
  }

  /* ── Avatar upload ── */
  const handleAvatarUpload = async (file) => {
    if (!file || uploadingAvatar) return
    if (!file.type.startsWith('image/')) { addToast('Please select an image file.', 'error', AlertCircle); return }
    setUploadingAvatar(true)
    try {
      const compressed = await compressImage(file)
      if (!compressed) throw new Error('Image compression failed')

      const path = `${user.id}/avatar.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (uploadErr) throw new Error(`Storage: ${uploadErr.message}`)

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const freshUrl = `${publicUrl}?t=${Date.now()}`

      // Always persist in localStorage — works even if DB update fails
      localStorage.setItem(`echo_avatar_${user.id}`, freshUrl)

      // Best-effort DB save — use .select() so we can detect 0-row updates
      const { error: dbErr } = await supabase
        .from('user_profiles')
        .update({ avatar_url: freshUrl })
        .eq('id', user.id)
        .select('id')
      if (dbErr) console.warn('Avatar DB save failed (localStorage used as fallback):', dbErr.message)

      onAvatarChange?.(freshUrl)
      addToast('Photo updated.', 'success', Check)
    } catch (err) {
      console.error('Avatar upload failed:', err.message)
      addToast(`Photo upload failed: ${err.message}`, 'error', AlertCircle)
    }
    setUploadingAvatar(false)
  }

  /* ── Notifications ── */
  const toggleNotifications = async () => {
    if (!notifEnabled) {
      if (notifPerm === 'denied') { addToast('Notifications blocked — allow them in browser settings.', 'error', AlertCircle); return }
      if (notifPerm === 'default') {
        const perm = await Notification.requestPermission().catch(() => 'denied')
        setNotifPerm(perm)
        if (perm !== 'granted') { addToast('Notification permission denied.', 'error', AlertCircle); return }
      }
      setNotifEnabled(true)
      localStorage.setItem('echo_notif', JSON.stringify({ enabled: true, time: notifTime }))
      addToast('Daily reminders enabled.', 'success', Check)
    } else {
      setNotifEnabled(false)
      localStorage.setItem('echo_notif', JSON.stringify({ enabled: false, time: notifTime }))
    }
  }

  /* ── Privacy toggle ── */
  const togglePrivacy = async () => {
    const next = !memoriesPrivate
    setMemoriesPrivate(next)
    try {
      await supabase.from('user_profiles').update({ memories_private: next }).eq('id', user.id)
    } catch { /* column may not exist yet — UI still responds */ }
  }

  /* ── Family: send invite ── */
  const sendInvite = async () => {
    if (!inviteEmail.trim() || sendingInvite) return
    setSendingInvite(true)
    try {
      const { error } = await supabase.from('family_access').insert({
        inviter_id: user.id,
        invitee_email: inviteEmail.trim().toLowerCase(),
        status: 'pending',
      })
      if (error?.code === '42P01') { setFamilyTableMissing(true) }
      else if (error) throw error
      else { setInviteEmail(''); addToast('Invite sent.', 'success', Check); await loadInvites() }
    } catch { addToast('Failed to send invite.', 'error', AlertCircle) }
    setSendingInvite(false)
  }

  /* ── Family: revoke invite ── */
  const revokeInvite = async (id) => {
    setRevokingId(id)
    try {
      await supabase.from('family_access').delete().eq('id', id)
      setInvites(prev => prev.filter(i => i.id !== id))
    } catch { addToast('Failed to revoke.', 'error', AlertCircle) }
    setRevokingId(null)
  }

  /* ── Delete account ── */
  const deleteAccount = async () => {
    if (deleteInput !== 'DELETE' || deleting) return
    setDeleting(true)
    try {
      await Promise.all([
        supabase.from('user_answers').delete().eq('user_id', user.id),
        supabase.from('echo_conversations').delete().eq('user_id', user.id),
        supabase.from('user_question_log').delete().eq('user_id', user.id),
        supabase.from('family_access').delete().eq('inviter_id', user.id).catch(() => null),
      ])
      await supabase.from('user_profiles').delete().eq('id', user.id).catch(() => null)
      await supabase.auth.signOut()
    } catch {
      addToast('Deletion partially failed — signing out. Contact support if needed.', 'error', AlertCircle)
      await supabase.auth.signOut()
    }
  }

  /* ── Voice recording ── */
  const startRecording = async () => {
    setCloneErr(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      })
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(100)
      mediaRecRef.current = mr
      setRecTime(0)
      setRecState('recording')
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000)
    } catch (err) {
      addToast(
        err.name === 'NotAllowedError'
          ? 'Microphone access denied — allow it in your browser settings.'
          : 'Could not access microphone. Please try again.',
        'error', AlertCircle
      )
    }
  }

  const stopAndClone = () => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    const mr = mediaRecRef.current
    if (!mr) return
    mr.onstop = async () => {
      setRecState('cloning')
      try {
        const blob  = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        const file  = new File([blob], 'voice-sample.webm', { type: blob.type })
        if (voiceId) await deleteElevenLabsVoice(voiceId)
        const newId = await cloneVoice(file, userName)
        await supabase.from('user_profiles').update({ elevenlabs_voice_id: newId }).eq('id', user.id)
        setVoiceId(newId)
        setRecState('idle')
        addToast('Voice preserved! Echo will now speak in your voice.', 'success', Check)
      } catch (err) {
        setCloneErr(err.message || 'Cloning failed — please try again.')
        setRecState('idle')
        addToast(err.message || 'Voice cloning failed.', 'error', AlertCircle)
      }
    }
    mr.stop()
    mediaRecRef.current = null
    streamRef.current   = null
  }

  const handlePreview = async () => {
    if (!voiceId || previewing || prevPlaying) return
    setPreviewing(true)
    try {
      const url   = await previewVoice(voiceId)
      if (prevAudioRef.current) prevAudioRef.current.pause()
      const audio = new Audio(url)
      prevAudioRef.current = audio
      audio.onplay  = () => { setPrevPlaying(true); setPreviewing(false) }
      audio.onended = () => { setPrevPlaying(false); URL.revokeObjectURL(url) }
      audio.onerror = () => { setPrevPlaying(false); setPreviewing(false); addToast('Preview failed — try again.', 'error', AlertCircle) }
      await audio.play()
    } catch { setPreviewing(false); addToast('Preview failed — please try again.', 'error', AlertCircle) }
  }

  const handleRemove = async () => {
    if (!voiceId || removing) return
    setRemoving(true)
    try {
      await deleteElevenLabsVoice(voiceId)
      await supabase.from('user_profiles').update({ elevenlabs_voice_id: null }).eq('id', user.id)
      setVoiceId(null)
      addToast('Voice removed. Echo will respond in text.', 'success', Check)
    } catch { addToast('Failed to remove. Please try again.', 'error', AlertCircle) }
    setRemoving(false)
  }

  /* ── Inline toggle switch ── */
  const ToggleSwitch = ({ checked, onToggle, disabled }) => (
    <motion.button type="button" onClick={onToggle} disabled={disabled}
      style={{ width: 44, height: 24, borderRadius: 12, background: checked ? GOLD : 'rgba(0,0,0,0.12)', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', flexShrink: 0, padding: 2, display: 'flex', alignItems: 'center', transition: 'background 0.25s', outline: 'none' }}>
      <motion.div
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }}
      />
    </motion.button>
  )

  /* ── Expandable section row ── */
  const SectionRow = ({ icon: Icon, label, sub, sectionKey, activeColor = GOLD, children }) => {
    const isOpen = openSection === sectionKey
    return (
      <div style={{ background: SURFACE, border: `1px solid ${isOpen ? BORDER_A : BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: '0.75rem', transition: 'border-color 0.2s' }}>
        <button type="button" onClick={() => toggleSection(sectionKey)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '0.85rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', minHeight: 62, touchAction: 'manipulation' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: isOpen ? `${activeColor}18` : GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${isOpen ? `${activeColor}30` : BORDER_A}`, transition: 'all 0.2s' }}>
            <Icon size={15} color={isOpen ? activeColor : GOLD} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <p style={{ margin: '0 0 2px', fontSize: '0.88rem', color: TEXT, fontFamily: "'Jost',sans-serif", fontWeight: 500 }}>{label}</p>
            <p style={{ margin: 0, fontSize: '0.73rem', color: MUTED, fontFamily: "'Jost',sans-serif" }}>{sub}</p>
          </div>
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronRight size={14} color={isOpen ? GOLD : DIM} />
          </motion.div>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div key="body"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: '1rem 1.1rem' }}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const usagePct = Math.min((voiceUsed / voiceLimit) * 100, 100)

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}
      style={{ padding: '1.5rem 1rem 3rem', maxWidth: 520, margin: '0 auto', width: '100%' }}>

      <h2 style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 400, fontSize: 'clamp(1.2rem,3vw,1.6rem)', color: TEXT, margin: '0 0 1.5rem' }}>Settings</h2>

      {/* ══ PROFILE CARD ══ */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.2rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Avatar with camera overlay */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#A8854E,#C9A84C)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '1.3rem', fontWeight: 700, color: '#0D0C1A' }}>{initial}</span>
              }
            </div>
            {/* Camera button overlay */}
            <label style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: SURF_UP, border: `1.5px solid ${BORDER_A}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingAvatar ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingAvatar}
                onChange={e => { const f = e.target.files?.[0]; if (f) { handleAvatarUpload(f); e.target.value = '' } }} />
              {uploadingAvatar
                ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><Loader2 size={10} color={GOLD} /></motion.div>
                : <Camera size={10} color={GOLD} strokeWidth={2} />
              }
            </label>
          </div>

          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus
                  maxLength={40}
                  style={{ flex: 1, background: SURF_UP, border: `1px solid ${BORDER_A}`, borderRadius: 8, padding: '5px 10px', fontFamily: "'Jost',sans-serif", fontSize: '0.9rem', color: TEXT, outline: 'none' }}
                />
                <button type="button" onClick={saveName} disabled={savingName}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, background: GOLD, border: 'none', cursor: savingName ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                  {savingName
                    ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><Loader2 size={12} color="#0A0914" /></motion.div>
                    : <Check size={12} color="#0A0914" strokeWidth={2.5} />}
                </button>
                <button type="button" onClick={() => { setEditingName(false); setNameInput(userName) }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, background: SURF_UP, border: `1px solid ${BORDER}`, cursor: 'pointer', flexShrink: 0 }}>
                  <X size={12} color={MUTED} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: TEXT, fontFamily: "'Jost',sans-serif" }}>{displayName}</p>
                <button type="button" onClick={() => { setEditingName(true); setNameInput(displayName) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, padding: 2, display: 'flex', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = MUTED}
                  onMouseLeave={e => e.currentTarget.style.color = DIM}>
                  <Edit3 size={12} strokeWidth={1.8} />
                </button>
              </div>
            )}
            <p style={{ margin: 0, fontSize: '0.78rem', color: MUTED, fontFamily: "'Jost',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* ══ VOICE PRESERVATION CARD ══ */}
      <SectionRow
        icon={voiceId ? Check : Mic}
        label="Voice Preservation"
        sub={voiceId ? 'Echo speaks in your voice' : 'Record your voice — Echo will speak as you'}
        sectionKey="voice"
        activeColor={voiceId ? SUCCESS : GOLD}
      >
        <div>
          <AnimatePresence mode="wait">

            {/* ── CLONING SPINNER ── */}
            {recState === 'cloning' && (
              <motion.div key="cloning"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 0' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Loader2 size={22} color={GOLD} strokeWidth={1.8} />
                </motion.div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: TEXT, fontFamily: "'Jost',sans-serif", fontWeight: 500 }}>Cloning your voice…</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: MUTED, fontFamily: "'Jost',sans-serif" }}>This usually takes 10–30 seconds</p>
                </div>
              </motion.div>
            )}

            {/* ── VOICE PRESERVED ── */}
            {recState !== 'cloning' && voiceId && (
              <motion.div key="preserved"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

                {/* Preview */}
                <motion.button type="button" onClick={handlePreview}
                  disabled={previewing || prevPlaying} whileTap={{ scale: 0.97 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, background: prevPlaying ? 'rgba(106,182,106,0.1)' : GOLD_DIM, border: `1px solid ${prevPlaying ? 'rgba(106,182,106,0.3)' : BORDER_A}`, borderRadius: 11, cursor: previewing || prevPlaying ? 'not-allowed' : 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.85rem', fontWeight: 600, color: prevPlaying ? SUCCESS : GOLD, transition: 'all 0.18s', touchAction: 'manipulation' }}>
                  {previewing
                    ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={15} /></motion.span>Generating…</>
                    : prevPlaying
                      ? <><motion.div animate={{ scale: [1,1.15,1] }} transition={{ duration: 0.7, repeat: Infinity }}><Mic size={15} strokeWidth={2} /></motion.div>Playing Echo's voice…</>
                      : <><div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid currentColor' }} />Preview Your Echo Voice</>}
                </motion.button>

                {/* Re-record + Remove */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button type="button" onClick={() => { setVoiceId(null); setRecState('idle') }}
                    whileTap={{ scale: 0.96 }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 38, background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 10, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: MUTED, transition: 'all 0.18s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER_A; e.currentTarget.style.color = TEXT }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED }}>
                    <Mic size={13} strokeWidth={1.8} /> Re-record Voice
                  </motion.button>
                  <motion.button type="button" onClick={handleRemove} disabled={removing}
                    whileTap={{ scale: 0.96 }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 38, background: 'rgba(224,82,82,0.07)', border: '1px solid rgba(224,82,82,0.18)', borderRadius: 10, cursor: removing ? 'not-allowed' : 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: '#E05252', transition: 'all 0.18s' }}
                    onMouseEnter={e => { if (!removing) e.currentTarget.style.background = 'rgba(224,82,82,0.13)' }}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(224,82,82,0.07)'}>
                    {removing ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={13} /></motion.span>Removing…</> : 'Remove Voice'}
                  </motion.button>
                </div>

                {/* Monthly usage bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', color: MUTED }}>Voice responses this month</span>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', color: usagePct > 80 ? '#E09252' : MUTED }}>
                      {voiceUsed.toLocaleString()} / {voiceLimit.toLocaleString()} chars
                    </span>
                  </div>
                  <div style={{ height: 3, background: BORDER, borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 2, background: usagePct > 80 ? '#E09252' : GOLD }} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── RECORDING STATE ── */}
            {recState === 'recording' && (
              <motion.div key="recording"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Timer + indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: 10, height: 10, borderRadius: '50%', background: '#E05252', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.6rem', color: TEXT, letterSpacing: '0.08em', lineHeight: 1 }}>
                    {`${String(Math.floor(recTime/60)).padStart(2,'0')}:${String(recTime%60).padStart(2,'0')}`}
                  </span>
                  {/* Animated waveform bars */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {[0,1,2,3,4].map(i => (
                      <motion.div key={i}
                        animate={{ height: [6, 18, 6] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
                        style={{ width: 3, background: GOLD, borderRadius: 2, opacity: 0.8 }} />
                    ))}
                  </div>
                </div>

                {/* Passage — dimmed for reference while reading */}
                <div style={{ background: SURF_UP, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '0.85rem 1rem', maxHeight: 180, overflowY: 'auto' }}>
                  <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.82rem', color: MUTED, lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line' }}>
                    {VOICE_PASSAGE}
                  </p>
                </div>

                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.7rem', color: MUTED, margin: 0, textAlign: 'center' }}>
                  Read until the end — or stop whenever you feel you've recorded enough.
                </p>

                {/* Stop button */}
                <motion.button type="button" onClick={stopAndClone}
                  whileTap={{ scale: 0.97 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, background: 'rgba(224,82,82,0.12)', border: '1px solid rgba(224,82,82,0.35)', borderRadius: 12, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.88rem', fontWeight: 700, color: '#E05252', transition: 'all 0.18s', touchAction: 'manipulation' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(224,82,82,0.12)'}>
                  <MicOff size={16} strokeWidth={2} />
                  Stop &amp; Save Voice
                </motion.button>
              </motion.div>
            )}

            {/* ── IDLE — Premium gate (ElevenLabs cloning is a paid feature) ── */}
            {recState === 'idle' && !voiceId && (
              <motion.div key="idle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

                {/* What this feature does */}
                <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.84rem', color: MUTED, lineHeight: 1.75, margin: 0 }}>
                  Record your voice and Echo will speak every response in your actual cloned voice — so your family hears <em>you</em>, not a generic AI.
                </p>

                {/* Premium lock card */}
                <div style={{ background: GOLD_DIM, border: `1px solid ${BORDER_A}`, borderRadius: 12, padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Lock size={14} color={GOLD} strokeWidth={1.8} />
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.82rem', fontWeight: 700, color: GOLD }}>Legacy Plan Feature</span>
                  </div>
                  <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.78rem', color: MUTED, lineHeight: 1.65, margin: 0 }}>
                    Voice cloning is available with the Legacy Plan. Payments are coming soon — when you subscribe, your voice will be preserved and Echo will speak as you.
                  </p>
                  <div style={{ height: 1, background: BORDER }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <Check size={13} color={SUCCESS} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.76rem', color: 'rgba(106,182,106,0.85)', lineHeight: 1.55, margin: 0 }}>
                      Already active for free: Echo links relevant voice recordings from your saved memories to every response in Echo Chat.
                    </p>
                  </div>
                </div>

                {/* Join the Waitlist button */}
                <motion.button
                  type="button"
                  onClick={() => setWaitlistOpen(true)}
                  whileTap={{ scale: 0.97 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, background: GOLD_DIM, border: `1px solid ${BORDER_A}`, borderRadius: 11, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.85rem', fontWeight: 600, color: GOLD, transition: 'all 0.18s', width: '100%' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}18` }}
                  onMouseLeave={e => { e.currentTarget.style.background = GOLD_DIM }}
                >
                  Join the Waitlist
                </motion.button>

                {/* Subscription coming soon note */}
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.67rem', color: DIM, margin: 0, textAlign: 'center' }}>
                  Payments coming soon · No action needed right now
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </SectionRow>

      {/* ══ NOTIFICATIONS ══ */}
      <SectionRow icon={Bell} label="Notifications" sub={notifEnabled ? `Daily reminder at ${notifTime}` : 'Daily question reminders'} sectionKey="notifications">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: notifEnabled ? '1rem' : 0 }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '0.85rem', color: TEXT, fontFamily: "'Jost',sans-serif", fontWeight: 500 }}>Daily reminder</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: MUTED, fontFamily: "'Jost',sans-serif" }}>
              {notifPerm === 'denied' ? 'Blocked in browser — update site permissions' : 'Remind you to answer your daily question'}
            </p>
          </div>
          <ToggleSwitch checked={notifEnabled} onToggle={toggleNotifications} disabled={notifPerm === 'denied'} />
        </div>
        {notifEnabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: MUTED }}>Remind me at</span>
            <input type="time" value={notifTime}
              onChange={e => {
                setNotifTime(e.target.value)
                localStorage.setItem('echo_notif', JSON.stringify({ enabled: true, time: e.target.value }))
              }}
              style={{ background: SURF_UP, border: `1px solid ${BORDER_A}`, borderRadius: 8, padding: '5px 10px', fontFamily: "'Jost',sans-serif", fontSize: '0.82rem', color: TEXT, outline: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.68rem', color: DIM }}>Saved to this device</span>
          </div>
        )}
      </SectionRow>

      {/* ══ PRIVACY ══ */}
      <SectionRow icon={Shield} label="Privacy" sub={memoriesPrivate ? 'Memories are private' : 'Memories visible to invited family'} sectionKey="privacy">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '0.85rem', color: TEXT, fontFamily: "'Jost',sans-serif", fontWeight: 500 }}>Keep memories private</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: MUTED, fontFamily: "'Jost',sans-serif", maxWidth: 260, lineHeight: 1.5 }}>
              When off, family members you invite can read your memories in Echo Chat.
            </p>
          </div>
          <ToggleSwitch checked={memoriesPrivate} onToggle={togglePrivacy} />
        </div>
      </SectionRow>

      {/* ══ FAMILY ACCESS — coming soon ══ */}
      <SectionRow icon={Users} label="Family Access" sub="Invite family to talk with your Echo — coming soon" sectionKey="family">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.82rem', fontWeight: 300, color: MUTED, lineHeight: 1.65, margin: 0 }}>
            Share your Echo with up to 5 family members. Each member will be able to have real conversations with your Echo, trained on your memories and voice.
          </p>
          <div style={{ height: 1, background: BORDER }} />
          <motion.button
            type="button"
            onClick={() => setWaitlistOpen(true)}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, background: GOLD_DIM, border: `1px solid ${BORDER_A}`, borderRadius: 11, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.85rem', fontWeight: 600, color: GOLD, transition: 'all 0.18s', width: '100%' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}18` }}
            onMouseLeave={e => { e.currentTarget.style.background = GOLD_DIM }}
          >
            Join the Waitlist
          </motion.button>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.67rem', color: DIM, margin: 0, textAlign: 'center' }}>
            Payments coming soon · No action needed right now
          </p>
        </div>
      </SectionRow>

      {/* ══ SUBSCRIPTION ══ */}
      <SectionRow icon={Heart} label="Subscription" sub="Free plan · See all plans" sectionKey="subscription">
        <motion.button type="button" whileTap={{ scale: 0.97 }}
          onClick={() => window.open('/#pricing', '_blank', 'noopener')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', height: 44, borderRadius: 11, border: `1px solid ${BORDER_A}`, background: GOLD_DIM, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '0.84rem', fontWeight: 600, color: GOLD, transition: 'all 0.18s', touchAction: 'manipulation' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.18)' }}
          onMouseLeave={e => { e.currentTarget.style.background = GOLD_DIM }}>
          View all plans
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 11 10 2M10 2H4M10 2v6" />
          </svg>
        </motion.button>
      </SectionRow>

      {/* ══ SIGN OUT ══ */}
      <button type="button" onClick={onSignOut}
        style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: 'rgba(224,82,82,0.07)', border: '1px solid rgba(224,82,82,0.16)', borderRadius: 12, padding: '0.9rem 1.1rem', cursor: 'pointer', color: '#E05252', fontSize: '0.86rem', fontFamily: "'Jost',sans-serif", fontWeight: 500, transition: 'background 0.2s', minHeight: 50, touchAction: 'manipulation', marginBottom: '1rem' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,0.12)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(224,82,82,0.07)'}>
        <LogOut size={15} strokeWidth={1.8} />Sign out
      </button>

      {/* ══ DANGER ZONE — DELETE ACCOUNT ══ */}
      <div style={{ background: SURFACE, border: '1px solid rgba(224,82,82,0.18)', borderRadius: 14, overflow: 'hidden' }}>
        <button type="button" onClick={() => toggleSection('delete')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '0.85rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', minHeight: 62, touchAction: 'manipulation' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(224,82,82,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(224,82,82,0.2)' }}>
            <Trash2 size={14} color="#E05252" strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ margin: '0 0 2px', fontSize: '0.88rem', color: '#E05252', fontFamily: "'Jost',sans-serif", fontWeight: 500 }}>Delete account</p>
            <p style={{ margin: 0, fontSize: '0.73rem', color: MUTED, fontFamily: "'Jost',sans-serif" }}>Remove all your data and memories</p>
          </div>
          <motion.div animate={{ rotate: openSection === 'delete' ? 90 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronRight size={14} color="rgba(224,82,82,0.5)" />
          </motion.div>
        </button>
        <AnimatePresence>
          {openSection === 'delete' && (
            <motion.div key="delete-body"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
              <div style={{ borderTop: '1px solid rgba(224,82,82,0.18)', padding: '1rem 1.1rem' }}>
                <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: '0.82rem', color: MUTED, lineHeight: 1.65, margin: '0 0 1rem' }}>
                  This will permanently delete all your memories, questions, and Echo conversations. Your voice recordings will remain in storage until manually removed. This cannot be undone.
                </p>
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.78rem', color: 'rgba(224,82,82,0.75)', margin: '0 0 0.6rem', fontWeight: 500 }}>
                  Type <strong>DELETE</strong> to confirm
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={deleteInput}
                    onChange={e => setDeleteInput(e.target.value)}
                    placeholder="DELETE"
                    style={{ flex: 1, background: 'rgba(224,82,82,0.06)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: 9, padding: '9px 12px', fontFamily: "'Jost',sans-serif", fontSize: '0.85rem', color: TEXT, outline: 'none', letterSpacing: '0.05em' }}
                  />
                  <motion.button type="button" onClick={deleteAccount}
                    disabled={deleteInput !== 'DELETE' || deleting}
                    whileTap={{ scale: 0.96 }}
                    style={{ padding: '9px 16px', background: deleteInput === 'DELETE' ? 'rgba(224,82,82,0.15)' : 'rgba(224,82,82,0.06)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 9, cursor: deleteInput === 'DELETE' && !deleting ? 'pointer' : 'not-allowed', fontFamily: "'Jost',sans-serif", fontSize: '0.82rem', fontWeight: 700, color: deleteInput === 'DELETE' ? '#E05252' : 'rgba(224,82,82,0.3)', transition: 'all 0.18s', flexShrink: 0 }}>
                    {deleting
                      ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={14} /></motion.span>
                      : 'Delete'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate()
  const { isStandalone, install, promptEvt, isIOS } = usePWAInstall()

  /* ── State ── */
  const [user, setUser]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [questionLoading, setQuestionLoading] = useState(true)
  const [question, setQuestion]     = useState({ question_text: '', logId: null, isFromLibrary: false })
  const [answeredToday, setAnsweredToday] = useState(false)
  const [answer, setAnswer]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [memories, setMemories]     = useState([])
  const [section, setSection]       = useState('home')
  const [userMenu, setUserMenu]     = useState(false)
  const [selectedMem, setSelectedMem] = useState(null)
  const [toasts, setToasts]           = useState([])
  const [photoFile,        setPhotoFile]        = useState(null)
  const [photoPreviewUrl,  setPhotoPreviewUrl]  = useState(null)
  const [uploadingPhoto,   setUploadingPhoto]   = useState(false)
  const [lastSavedMemId,   setLastSavedMemId]   = useState(null)
  const [lightboxUrl,      setLightboxUrl]      = useState(null)
  const [showPhotoPrompt,  setShowPhotoPrompt]  = useState(false)
  const [avatarUrl,        setAvatarUrl]        = useState(null)
  const pendingPhotoFileRef = useRef(null) // holds file chosen from prompt
  const draftRestoredRef    = useRef(false)
  const prevOnlineRef       = useRef(null)

  const [saveFailed,         setSaveFailed]         = useState(false)
  const [questionLoadFailed, setQuestionLoadFailed] = useState(false)

  /* ── Bonus daily check-in question ── */
  const [bonusQuestion,       setBonusQuestion]      = useState({ question_text: '', logId: null })
  const [bonusAnsweredToday,  setBonusAnsweredToday] = useState(false)
  const [showBonusPopup,      setShowBonusPopup]     = useState(false)

  const isOnline = useOnlineStatus()

  /* ── Toast helpers (defined early — voice hook needs addToast) ── */
  const addToast = useCallback((message, type = 'success', Icon = Check) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, Icon }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  /* ── Draft key — scoped to user + calendar day so stale drafts never restore ── */
  const draftKey = user ? `echo_draft_${user.id}_${todayISO()}` : null

  /* ── Draft autosave — debounced 800ms, skipped once answered ── */
  useEffect(() => {
    if (!draftKey || answeredToday) return
    const t = setTimeout(() => {
      if (answer.trim()) localStorage.setItem(draftKey, answer)
      else localStorage.removeItem(draftKey)
    }, 800)
    return () => clearTimeout(t)
  }, [answer, draftKey, answeredToday])

  /* ── Online / offline transition ── */
  useEffect(() => {
    if (prevOnlineRef.current === false && isOnline) {
      const draft = draftKey ? localStorage.getItem(draftKey) : null
      if (draft && !answeredToday) {
        addToast('Back online — your draft is safe. Tap Save Memory to preserve it.', 'success', Check)
      }
    }
    prevOnlineRef.current = isOnline
  }, [isOnline])

  /* ── Photo handlers ── */
  const handlePhotoSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { addToast(err, 'error', AlertCircle); e.target.value = ''; return }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoFile(file)
    setPhotoPreviewUrl(URL.createObjectURL(file))
    e.target.value = ''
  }, [photoPreviewUrl, addToast])

  const handlePhotoRemove = useCallback(() => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoFile(null)
    setPhotoPreviewUrl(null)
  }, [photoPreviewUrl])

  /* Post-save photo: upload and patch existing memory row */
  const handleAddPhoto = useCallback(async (file) => {
    if (!file || !lastSavedMemId || !user) return
    setUploadingPhoto(true)
    try {
      const compressed = await compressImage(file)
      if (!compressed) throw new Error('Compression failed')
      const photoUrl = await uploadPhotoToStorage(compressed, user.id, file.name)
      await supabase.from('user_answers').update({ photo_url: photoUrl }).eq('id', lastSavedMemId)
      await loadData(user.id)
      addToast('Photo added to your memory.', 'success', Check)
    } catch (err) {
      addToast('Photo upload failed — please try again.', 'error', AlertCircle)
    }
    setUploadingPhoto(false)
  }, [lastSavedMemId, user, addToast])

  /* Voice recorder ── */
  const {
    recording, transcribing, recordingTime, waveformData,
    formatTime, audioBlob, setAudioBlob, toggleRecording,
  } = useVoiceRecorder({ setAnswer, addToast })

  /* ── Derived ── */
  const total       = memories.length
  const userName    = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend'
  const initial     = userName[0]?.toUpperCase() || 'U'
  const todayAnswer = memories.find(m => m.created_at?.slice(0, 10) === todayISO()) ?? null

  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/signin'); return }
      const u = session.user
      setUser(u)
      initDashboard(u)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((e, session) => {
      if (e === 'SIGNED_OUT') navigate('/signin')
    })
    return () => subscription.unsubscribe()
  }, [])

  /* ── Init — ensures profile + loads data ── */
  const initDashboard = async (u) => {
    const displayName = u.user_metadata?.full_name?.split(' ')[0] || u.email?.split('@')[0] || 'Friend'
    try {
      await ensureProfile(u.id, displayName)
    } catch (e) {
      console.warn('ensureProfile:', e.message)
    }
    await loadData(u.id)
  }

  /* ── Load data ── */
  const loadData = async (uid) => {
    setQuestionLoading(true)
    try {
      // Today's AI question
      const { questionText, alreadyAnswered, logId, isFromLibrary } = await getTodaysQuestion(uid)
      setQuestion({ question_text: questionText, logId, isFromLibrary: isFromLibrary || false })
      setAnsweredToday(alreadyAnswered)
      setQuestionLoadFailed(false)
      // Restore draft on first load if not yet answered today
      if (!alreadyAnswered && !draftRestoredRef.current) {
        const dKey  = `echo_draft_${uid}_${todayISO()}`
        const draft = localStorage.getItem(dKey)
        if (draft) {
          setAnswer(draft)
          draftRestoredRef.current = true
          addToast('Draft restored — your answer is here when you\'re ready.', 'success', Check)
        }
      }
    } catch (err) {
      console.error('Question load error:', err)
      setQuestion({ question_text: 'What moment in your life do you wish you could live inside forever?', logId: null })
      setQuestionLoadFailed(true)
    }
    setQuestionLoading(false)

    try {
      const [{ data: ans }, { data: profileData }] = await Promise.all([
        supabase.from('user_answers').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('avatar_url').eq('id', uid).maybeSingle(),
      ])
      const loadedMemories = ans || []
      setMemories(loadedMemories)
      const dbAvatar    = profileData?.avatar_url || null
      const localAvatar = localStorage.getItem(`echo_avatar_${uid}`)
      setAvatarUrl(dbAvatar || localAvatar || null)

      // Bonus check-in — only once user has at least 1 memory
      if (loadedMemories.length >= 1) {
        try {
          const { questionText, alreadyAnswered, logId } = await getTodaysBonusQuestion(uid, loadedMemories)
          setBonusQuestion({ question_text: questionText, logId })
          setBonusAnsweredToday(alreadyAnswered)
          setLoading(false)
          return { bonusText: questionText, bonusAnswered: alreadyAnswered }
        } catch (e) {
          console.warn('Bonus question load failed:', e.message)
        }
      }
    } catch (err) {
      console.error('Memories load error:', err)
    }
    setLoading(false)
    return {}
  }

  /* ── Save memory ── */
  // Step 1: validate + maybe show photo prompt
  const handleSave = async () => {
    if (saving || !user || answeredToday) return
    if (!isOnline) {
      addToast('You\'re offline — your draft is saved locally. Connect to save.', 'error', AlertCircle)
      return
    }
    if (answer.trim().length < MIN_ANSWER_CHARS) {
      addToast('Write a little more — the more you share, the richer your Echo becomes.', 'error', AlertCircle)
      return
    }
    // No photo selected → ask if they want one
    if (!photoFile) {
      setShowPhotoPrompt(true)
      return
    }
    await executeSave(photoFile)
  }

  // Called from prompt: user chose a photo
  const handlePromptPhotoChosen = async (file) => {
    setShowPhotoPrompt(false)
    pendingPhotoFileRef.current = file
    await executeSave(file)
    pendingPhotoFileRef.current = null
  }

  // Called from prompt: user skipped photo
  const handlePromptSkip = async () => {
    setShowPhotoPrompt(false)
    await executeSave(null)
  }

  // Step 2: actual save (accepts explicit file or null)
  const executeSave = async (fileToUse) => {
    setSaving(true)
    try {
      // 1. Categorize with Groq
      const category = await categorizeAnswer(question.question_text, answer.trim())

      // 2. Depth level based on total memories
      const depthLevel = Math.min(Math.floor(total / 5) + 1, 5)

      // 3. Compress + upload photo
      let photoUrl = null
      if (fileToUse) {
        try {
          const compressed = await compressImage(fileToUse)
          if (compressed) {
            photoUrl = await uploadPhotoToStorage(compressed, user.id, fileToUse.name)
          } else {
            addToast('Could not compress photo — saving memory without it.', 'error', AlertCircle)
          }
        } catch (err) {
          console.error('Photo upload error:', err)
          addToast(`Photo upload failed: ${err.message}`, 'error', AlertCircle)
        }
        handlePhotoRemove()
      }

      // 4. Upload audio if a voice recording was made
      let audioUrl = null
      if (audioBlob) {
        try {
          const filename = `${user.id}/${Date.now()}.webm`
          const { error: upErr } = await supabase.storage
            .from('memory-audio')
            .upload(filename, audioBlob, { contentType: 'audio/webm', upsert: false })
          if (upErr) {
            console.error('Audio upload error:', upErr.message)
            // Common cause: memory-audio bucket doesn't exist yet.
            // Run the SQL in the readme to create it. Memory still saves without audio.
            if (upErr.message?.toLowerCase().includes('bucket')) {
              addToast('Voice not saved: create the memory-audio bucket in Supabase Storage.', 'error', AlertCircle)
            }
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('memory-audio')
              .getPublicUrl(filename)
            audioUrl = publicUrl
            addToast('Voice recording saved with this memory.', 'success', Check)
          }
        } catch (err) {
          console.error('Audio upload exception:', err)
        }
        setAudioBlob(null)
      }

      // 5. Save to user_answers — capture ID for post-save photo add
      const { data: savedRow, error: saveErr } = await supabase.from('user_answers').insert({
        user_id:       user.id,
        question_text: question.question_text,
        answer_text:   answer.trim(),
        category,
        depth_level:   depthLevel,
        audio_url:     audioUrl,
        photo_url:     photoUrl,
      }).select('id').single()
      if (saveErr) throw saveErr
      setLastSavedMemId(savedRow?.id ?? null)

      // 5. Mark question log as answered
      if (question.logId) {
        await supabase
          .from('user_question_log')
          .update({ answered: true })
          .eq('id', question.logId)
      }

      // 5. Update streak
      const newStreak = await updateStreak(user.id)

      // 6. Update UI
      if (draftKey) localStorage.removeItem(draftKey)
      setSaveFailed(false)
      setSaved(true)
      setAnswer('')
      setAnsweredToday(true)

      // 7. Milestone toasts
      const newTotal = total + 1
      if (newTotal === ECHO_AT) {
        addToast('Echo Chat unlocked! Your family can now speak with your Echo.', 'milestone', Sparkles)
      } else if (newStreak === 7) {
        addToast('A full week of memories saved. Keep going.', 'milestone', Flame)
      } else if (newStreak === 3) {
        addToast('3-day streak! You\'re building something beautiful.', 'milestone', Flame)
      } else {
        addToast('Memory saved.', 'success', Check)
      }

      // 8. Refresh memories + get fresh bonus state (avoid stale closure)
      const { bonusText, bonusAnswered } = await loadData(user.id) || {}
      setTimeout(() => setSaved(false), 3500)

      // 9. Show bonus check-in popup using fresh values, not stale state
      if (bonusText && !bonusAnswered) {
        setTimeout(() => setShowBonusPopup(true), 1200)
      }

    } catch (err) {
      console.error('Save error:', err)
      setSaveFailed(true)
      addToast('Save failed — your draft is preserved. Tap Save Memory to try again.', 'error', AlertCircle)
    }
    setSaving(false)
  }

  /* ── Save bonus check-in (called from BonusQuestionModal) ── */
  const handleBonusSave = async (answerText) => {
    if (!user || bonusAnsweredToday) return
    try {
      const category = await categorizeAnswer(bonusQuestion.question_text, answerText)
      await supabase.from('user_answers').insert({
        user_id:       user.id,
        question_text: bonusQuestion.question_text,
        answer_text:   answerText,
        category,
        depth_level:   1,
      })
      if (bonusQuestion.logId) {
        await supabase.from('user_question_log').update({ answered: true }).eq('id', bonusQuestion.logId)
      }
      setBonusAnsweredToday(true)
      setShowBonusPopup(false)
      addToast('Check-in saved.', 'success', Check)
      const { data: ans } = await supabase.from('user_answers').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setMemories(ans || [])
    } catch (err) {
      console.error('Bonus save error:', err)
      addToast('Could not save check-in — try again.', 'error', AlertCircle)
      throw err
    }
  }

  /* ── Sign out ── */
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/signin')
  }

  /* ── Dev: skip to next question without waiting till tomorrow ── */
  /* Only active when VITE_DEV_MODE=true — never compiled into production */
  const handleDevNextQuestion = import.meta.env.VITE_DEV_MODE === 'true'
    ? async () => {
        if (!user) return
        try {
          // Delete today's log entry — getTodaysQuestion will generate a fresh one
          const today = new Date().toISOString().split('T')[0]
          await supabase
            .from('user_question_log')
            .delete()
            .eq('user_id', user.id)
            .eq('asked_on', today)

          // Reset UI state immediately so skeleton shows
          setAnsweredToday(false)
          setAnswer('')
          setSaved(false)
          setQuestionLoading(true)

          // Regenerate — loadData calls getTodaysQuestion which now finds no entry for today
          await loadData(user.id)
          addToast('New question generated.', 'success', Check)
        } catch (err) {
          console.error('Dev next question error:', err)
          addToast('Failed to generate next question: ' + err.message, 'error', AlertCircle)
        }
      }
    : undefined

  /* ── Dev reset (only runs when VITE_DEV_MODE=true) ── */
  const handleDevReset = async () => {
    if (!user) return
    try {
      await Promise.all([
        // Wipe all answers
        supabase.from('user_answers').delete().eq('user_id', user.id),
        // Wipe question log so a fresh AI question generates today
        supabase.from('user_question_log').delete().eq('user_id', user.id),
        // Wipe echo chat history
        supabase.from('echo_conversations').delete().eq('user_id', user.id),
      ])
      // Reset profile counters (keep the row, just zero everything)
      await supabase.from('user_profiles').update({
        current_streak:      0,
        longest_streak:      0,
        total_memories:      0,
        last_answered_date:  null,
        echo_messages_today: 0,
        echo_messages_date:  null,
      }).eq('id', user.id)

      // Reset all local state
      setMemories([])
      setAnswer('')
      setSaved(false)
      setAnsweredToday(false)
      setQuestion({ question_text: '', logId: null, isFromLibrary: false })
      setSection('home')
      handlePhotoRemove()
      setLastSavedMemId(null)
      setShowPhotoPrompt(false)
      if (draftKey) localStorage.removeItem(draftKey)
      draftRestoredRef.current = false
      setSaveFailed(false)
      setQuestionLoadFailed(false)

      // Reload fresh question from AI
      await loadData(user.id)
      addToast('Dev reset done — all test data deleted.', 'success', Check)
    } catch (err) {
      console.error('Dev reset error:', err)
      addToast('Reset failed: ' + err.message, 'error', AlertCircle)
    }
  }

  /* ── Loading spinner ── */
  if (loading) {
    return (
      <div style={{ height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Loader2 size={28} color={GOLD} strokeWidth={1.5} />
        </motion.div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════════
     INSTALL GATE — block web use, require PWA install
  ══════════════════════════════════════════════════════════════ */
  if (!isStandalone) {
    return (
      <div style={{ height: '100svh', background: 'linear-gradient(145deg,#0A0914 0%,#140D2E 60%,#0E0820 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', fontFamily: "'Jost',sans-serif", position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 1, textAlign: 'center' }}
        >
          {/* Echo logo */}
          <div style={{ width: 80, height: 80, borderRadius: 24, background: '#0A0914', border: '1.5px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(201,168,76,0.15), 0 8px 32px rgba(0,0,0,0.6)' }}>
            <svg viewBox="0 0 64 64" width="44" height="44">
              <rect x="14" y="11" width="8"  height="42" rx="2" fill="#C9A84C"/>
              <rect x="14" y="11" width="36" height="8"  rx="2" fill="#C9A84C"/>
              <rect x="14" y="28" width="28" height="7"  rx="2" fill="#C9A84C"/>
              <rect x="14" y="45" width="36" height="8"  rx="2" fill="#C9A84C"/>
            </svg>
          </div>

          {/* Heading */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h1 style={{ margin: 0, fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', fontSize: 'clamp(1.6rem,5vw,2.2rem)', color: '#F0EDE6', lineHeight: 1.15 }}>
              Echo lives on your device
            </h1>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(240,237,230,0.55)', lineHeight: 1.6, maxWidth: 340 }}>
              Install the app to get your daily memory question, receive reminders, and use Echo offline — the way it was meant to be experienced.
            </p>
          </div>

          {/* Why install — 3 pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {['Daily reminders', 'Works offline', 'Full-screen experience'].map(f => (
              <span key={f} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 999, padding: '5px 14px', fontSize: '0.75rem', color: '#C9A84C', fontWeight: 500 }}>{f}</span>
            ))}
          </div>

          {/* Install CTA */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isIOS ? (
              <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 16, padding: '1rem 1.2rem' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>How to install on iOS</p>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem', color: 'rgba(240,237,230,0.7)', lineHeight: 1.8 }}>
                  <li>Tap the <strong style={{ color: '#F0EDE6' }}>Share</strong> button at the bottom of Safari</li>
                  <li>Scroll down and tap <strong style={{ color: '#F0EDE6' }}>Add to Home Screen</strong></li>
                  <li>Tap <strong style={{ color: '#F0EDE6' }}>Add</strong> — done!</li>
                </ol>
              </div>
            ) : promptEvt ? (
              <motion.button
                onClick={install}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                style={{ width: '100%', height: 52, background: 'linear-gradient(135deg,#A8854E,#C9A84C)', border: 'none', borderRadius: 16, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: '1rem', fontWeight: 700, color: '#0A0914', letterSpacing: '0.03em', boxShadow: '0 6px 24px rgba(201,168,76,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Download size={18} strokeWidth={2.5} />
                Install Echo — it's free
              </motion.button>
            ) : (
              <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 16, padding: '1rem 1.2rem' }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.8rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Install from your browser</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(240,237,230,0.65)', lineHeight: 1.7 }}>
                  Look for the <strong style={{ color: '#F0EDE6' }}>install icon ⊕</strong> in your browser's address bar, or open this page in <strong style={{ color: '#F0EDE6' }}>Chrome on Android</strong> for the easiest install.
                </p>
              </div>
            )}

            <button
              onClick={() => { supabase.auth.signOut(); navigate('/signin') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(240,237,230,0.25)', fontFamily: "'Jost',sans-serif", padding: '4px 0' }}
            >
              Sign out
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ height: '100svh', background: 'linear-gradient(145deg,#fce8f0 0%,#f5eafd 45%,#eaeeff 100%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Jost',sans-serif", position: 'relative' }}>
      <AmbientGlow />

      {/* ════ TOAST CONTAINER ════ */}
      <ToastContainer toasts={toasts} remove={removeToast} />

      {/* ════ NAVBAR ════ */}
      <nav style={{ height: 56, flexShrink: 0, position: 'relative', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(14px,4vw,28px)', borderBottom: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#A8854E,#C9A84C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: 'italic', color: '#0D0C1A', fontSize: '0.85rem', fontWeight: 700 }}>E</span>
          </div>
          <span style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1rem', fontWeight: 400, color: TEXT, letterSpacing: '0.04em' }}>
            Echo <em style={{ color: GOLD }}>AI</em>
          </span>
        </Link>

        {/* Desktop center tabs */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 3 }}>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setSection(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: section === id ? 'rgba(201,168,76,0.1)' : 'transparent', color: section === id ? GOLD : MUTED, fontFamily: "'Jost',sans-serif", fontSize: '0.82rem', fontWeight: 500, transition: 'all 0.18s', position: 'relative', touchAction: 'manipulation' }}
              onMouseEnter={e => { if (section !== id) { e.currentTarget.style.color = TEXT; e.currentTarget.style.background = 'rgba(0,0,0,0.04)' } }}
              onMouseLeave={e => { if (section !== id) { e.currentTarget.style.color = MUTED; e.currentTarget.style.background = 'transparent' } }}>
              <Icon size={15} strokeWidth={1.8} />
              {label}
              {id === 'echo' && total < ECHO_AT && (
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, position: 'absolute', top: 5, right: 6, opacity: 0.7 }} />
              )}
            </button>
          ))}
        </div>

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => setUserMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', height: 40, background: 'rgba(0,0,0,0.04)', border: `1px solid ${BORDER}`, borderRadius: 999, cursor: 'pointer', touchAction: 'manipulation' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#A8854E,#C9A84C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#0D0C1A' }}>{initial}</span>
              }
            </div>
            <span className="hidden md:block" style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.82rem', color: MUTED, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</span>
            <ChevronDown size={13} color={MUTED} style={{ transition: 'transform 0.2s', transform: userMenu ? 'rotate(180deg)' : 'none' }} />
          </button>

          <AnimatePresence>
            {userMenu && (
              <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '0.5rem', minWidth: 196, zIndex: 100, boxShadow: '0 20px 50px rgba(0,0,0,0.55)' }}>
                <div style={{ padding: '0.65rem 0.8rem', borderBottom: `1px solid ${BORDER}`, marginBottom: '0.4rem' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '0.82rem', fontWeight: 600, color: TEXT }}>{userName}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: MUTED }}>{user?.email}</p>
                </div>
                <button type="button" onClick={handleSignOut}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '0.65rem 0.8rem', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: '0.82rem', borderRadius: 8, fontFamily: "'Jost',sans-serif", transition: 'background 0.15s,color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,82,82,0.1)'; e.currentTarget.style.color = '#E05252' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = MUTED }}>
                  <LogOut size={14} strokeWidth={1.8} />Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
      {userMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setUserMenu(false)} />}

      {/* ════ OFFLINE BANNER ════ */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            key="offline-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ background: 'rgba(232,168,56,0.08)', borderBottom: '1px solid rgba(232,168,56,0.22)', display: 'flex', alignItems: 'center', gap: 8, padding: '7px clamp(14px,4vw,28px)', flexShrink: 0, overflow: 'hidden', zIndex: 50 }}>
            <AlertCircle size={13} color="#E8A838" strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: '0.75rem', color: '#E8A838', fontWeight: 500 }}>
              You're offline — your draft is saved locally and will sync when you reconnect.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ BODY ════ */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', position: 'relative', zIndex: 1 }}>

        {/* Left sidebar — desktop */}
        <aside className="hidden lg:flex" style={{ width: 220, flexShrink: 0, flexDirection: 'column', borderRight: `1px solid ${BORDER}`, padding: '1.25rem 0.85rem', gap: 3, overflowY: 'auto', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)' }}>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setSection(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: section === id ? 'rgba(201,168,76,0.1)' : 'transparent', color: section === id ? GOLD : MUTED, fontFamily: "'Jost',sans-serif", fontSize: '0.85rem', fontWeight: section === id ? 600 : 400, transition: 'all 0.18s', textAlign: 'left', position: 'relative', width: '100%', minHeight: 44, touchAction: 'manipulation' }}
              onMouseEnter={e => { if (section !== id) { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = TEXT } }}
              onMouseLeave={e => { if (section !== id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = MUTED } }}>
              <Icon size={16} strokeWidth={1.8} />
              {label}
              {id === 'echo' && total < ECHO_AT && <Lock size={10} style={{ marginLeft: 'auto', color: DIM }} />}
            </button>
          ))}

          {/* Sidebar streak card — sits above bottom with breathing room */}
          <div style={{ marginTop: 'auto', paddingTop: '1.25rem', paddingBottom: '1.75rem', flexShrink: 0 }}>
            <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_A}`, borderRadius: 12, padding: '0.9rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <Flame size={14} color={GOLD} strokeWidth={1.8} />
                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: GOLD, fontFamily: "'Jost',sans-serif" }}>
                  {total} {total === 1 ? 'memory' : 'memories'} saved
                </span>
              </div>
              <p style={{ fontSize: '0.68rem', color: MUTED, margin: '0 0 10px', lineHeight: 1.5, fontFamily: "'Jost',sans-serif" }}>Keep answering daily.</p>
              <ActivityDots memories={memories} />
            </div>
          </div>
        </aside>

        {/* Main scroll */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 68, overscrollBehavior: 'contain' }}>

          {/* Mobile stats strip */}
          <div className="flex lg:hidden" style={{ padding: '0.85rem 1rem 0', gap: 9 }}>
            <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '0.7rem 0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
                <Flame size={16} color={GOLD} strokeWidth={1.8} />
              </motion.div>
              <div>
                <p style={{ margin: 0, fontFamily: "'Bodoni Moda',serif", fontSize: '1.1rem', color: TEXT, lineHeight: 1 }}>{total}</p>
                <p style={{ margin: 0, fontSize: '0.57rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Jost',sans-serif", marginTop: 2 }}>Saved</p>
              </div>
            </div>
            <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '0.7rem 0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ProgressRing value={total} max={ECHO_AT} size={40} stroke={3} />
              <div>
                <p style={{ margin: 0, fontSize: '0.6rem', color: MUTED, lineHeight: 1.45, fontFamily: "'Jost',sans-serif" }}>Echo<br />unlock</p>
              </div>
            </div>
            <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '0.7rem 0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} color={GOLD} strokeWidth={1.8} />
              <div>
                <p style={{ margin: 0, fontFamily: "'Bodoni Moda',serif", fontSize: '1.1rem', color: TEXT, lineHeight: 1 }}>{total < ECHO_AT ? ECHO_AT - total : '✓'}</p>
                <p style={{ margin: 0, fontSize: '0.57rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Jost',sans-serif", marginTop: 2 }}>{total < ECHO_AT ? 'to Echo' : 'Unlocked'}</p>
              </div>
            </div>
          </div>

          {/* Section content */}
          <AnimatePresence mode="wait">
            {section === 'home' && (
              <HomeSection
                key="home" user={user}
                question={question} questionLoading={questionLoading}
                answeredToday={answeredToday} todayAnswer={todayAnswer}
                answer={answer} setAnswer={setAnswer}
                saving={saving} saved={saved} handleSave={handleSave}
                recording={recording} transcribing={transcribing}
                recordingTime={recordingTime} waveformData={waveformData}
                formatTime={formatTime} toggleRecording={toggleRecording}
                photoPreviewUrl={photoPreviewUrl}
                onPhotoSelect={handlePhotoSelect}
                onPhotoRemove={handlePhotoRemove}
                onAddPhoto={handleAddPhoto}
                uploadingPhoto={uploadingPhoto}
                onPhotoClick={setLightboxUrl}
                memories={memories} setSelectedMem={setSelectedMem}
                setSection={setSection} addToast={addToast}
                onDevNextQuestion={handleDevNextQuestion}
                saveFailed={saveFailed}
                isOnline={isOnline}
                questionLoadFailed={questionLoadFailed}
                onRetryLoad={() => loadData(user.id)}
              />
            )}
            {section === 'archive' && (
              <ArchiveSection key="archive" memories={memories} setSelectedMem={setSelectedMem} onPhotoClick={setLightboxUrl} />
            )}
            {section === 'echo' && total < ECHO_AT && (
              <EchoLocked key="echo-locked" total={total} onBack={() => setSection('home')} userName={userName} />
            )}
            {section === 'echo' && total >= ECHO_AT && (
              <EchoChat
                key="echo-ready"
                user={user}
                memories={memories}
                userName={userName}
                addToast={addToast}
              />
            )}
            {section === 'settings' && (
              <SettingsSection key="settings" user={user} onSignOut={handleSignOut} addToast={addToast}
                avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ════ MOBILE BOTTOM NAV ════ */}
      <nav className="flex md:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, zIndex: 60, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 4px' }}>
        {NAV.map(({ id, label, Icon }) => {
          const active = section === id
          return (
            <button key={id} type="button" onClick={() => setSection(id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', color: active ? GOLD : 'rgba(26,21,48,0.38)', transition: 'color 0.18s', position: 'relative', minWidth: 56, minHeight: 48, justifyContent: 'center', touchAction: 'manipulation' }}>
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span style={{ fontSize: '0.56rem', letterSpacing: '0.04em', fontFamily: "'Jost',sans-serif", fontWeight: active ? 600 : 400 }}>{label}</span>
              {active && (
                <motion.div layoutId="mobile-nav-bar"
                  style={{ position: 'absolute', bottom: 0, width: 24, height: 2.5, background: GOLD, borderRadius: 2 }} />
              )}
              {id === 'echo' && total < ECHO_AT && (
                <div style={{ position: 'absolute', top: 6, right: 13, width: 6, height: 6, borderRadius: '50%', background: GOLD, opacity: 0.75 }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* ════ MEMORY MODAL ════ */}
      <AnimatePresence>
        {selectedMem && (
          <MemoryModal
            mem={selectedMem}
            onClose={() => setSelectedMem(null)}
            onUpdate={(updated) => {
              setMemories(prev => prev.map(m => m.id === updated.id ? updated : m))
              setSelectedMem(updated)
            }}
            onDelete={(id) => {
              setMemories(prev => prev.filter(m => m.id !== id))
              setSelectedMem(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* ════ PHOTO PROMPT ════ */}
      <AnimatePresence>
        {showPhotoPrompt && (
          <PhotoPromptModal
            onSelectPhoto={handlePromptPhotoChosen}
            onSkip={handlePromptSkip}
          />
        )}
      </AnimatePresence>

      {/* ════ BONUS CHECK-IN POPUP ════ */}
      <AnimatePresence>
        {showBonusPopup && bonusQuestion?.question_text && (
          <BonusQuestionModal
            question={bonusQuestion.question_text}
            onSave={handleBonusSave}
            onSkip={() => setShowBonusPopup(false)}
            addToast={addToast}
          />
        )}
      </AnimatePresence>

      {/* ════ PHOTO LIGHTBOX ════ */}
      <AnimatePresence>
        {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      </AnimatePresence>

      {/* ════ DEV RESET BUTTON (only visible when VITE_DEV_MODE=true) ════ */}
      <DevResetButton onReset={handleDevReset} />

    </div>
  )
}
