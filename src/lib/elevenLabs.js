/**
 * Echo AI — ElevenLabs Voice via Edge Function proxy
 *
 * The ElevenLabs API key never touches the browser — all calls go through
 * supabase/functions/elevenlabs-proxy which verifies auth + enforces rate limits.
 *
 * Exports (same interface as before):
 *   cloneVoice(file, name)            → voiceId string
 *   generateVoiceAudio(text, voiceId) → ephemeral blob URL
 *   previewVoice(voiceId)             → ephemeral blob URL
 *   deleteElevenLabsVoice(voiceId)    → void
 *   getVoiceUsage(userId)             → { used, limit }
 *   addVoiceUsage(userId, chars)      → void
 */

import { supabase }    from './supabase'
import { fileToBase64 } from './sanitize'

/* ── internal helper ── */
async function invokeEL(body) {
  const { data, error } = await supabase.functions.invoke('elevenlabs-proxy', { body })
  if (error) throw new Error(error.message || 'Voice service unavailable')
  return data
}

/* ─────────────────────────────────────────────────────────────
   cloneVoice
   Uploads audio to ElevenLabs via edge function proxy.
   Returns the voice_id string on success.
───────────────────────────────────────────────────────────── */
export async function cloneVoice(audioFile, displayName) {
  // Convert file to base64 — edge function forwards it to ElevenLabs
  const audio_base64 = await fileToBase64(audioFile)
  const data = await invokeEL({
    action:         'clone',
    audio_base64,
    audio_filename: audioFile.name ?? 'voice.mp3',
    display_name:   String(displayName).slice(0, 50),
  })
  if (data?.error) {
    const msg = data.error.toLowerCase()
    if (msg.includes('too short') || msg.includes('minimum'))
      throw new Error('Please upload at least 1 minute of clear audio for best results.')
    if (msg.includes('quality') || msg.includes('noise'))
      throw new Error('Recording quality needs improvement. Try recording in a quieter space.')
    throw new Error(data.error || 'Voice cloning failed — please try again.')
  }
  if (!data?.voice_id) throw new Error('Voice cloning failed — please try again.')
  return data.voice_id
}

/* ─────────────────────────────────────────────────────────────
   generateVoiceAudio
   Converts text to audio via edge function proxy.
   Returns a blob URL for immediate playback (ephemeral).
───────────────────────────────────────────────────────────── */
export async function generateVoiceAudio(text, voiceId) {
  const data = await invokeEL({
    action: 'tts',
    text:   String(text).slice(0, 2000),
    voiceId,
  })
  if (data?.error) throw new Error(data.error)
  if (!data?.audio_base64) throw new Error('Voice generation failed')

  // Decode base64 → Blob → ephemeral URL
  const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0))
  const blob       = new Blob([audioBytes], { type: 'audio/mpeg' })
  return URL.createObjectURL(blob)
}

/* ─────────────────────────────────────────────────────────────
   previewVoice
   Plays a short sentence in the cloned voice.
───────────────────────────────────────────────────────────── */
export async function previewVoice(voiceId) {
  return generateVoiceAudio(
    'Hello. I am Echo. I carry the memories and wisdom of someone you love. Ask me anything.',
    voiceId,
  )
}

/* ─────────────────────────────────────────────────────────────
   deleteElevenLabsVoice
   Removes the cloned voice from ElevenLabs.
───────────────────────────────────────────────────────────── */
export async function deleteElevenLabsVoice(voiceId) {
  try {
    await invokeEL({ action: 'delete', voiceId })
  } catch {
    // Local state cleared regardless
  }
}

/* ─────────────────────────────────────────────────────────────
   getVoiceUsage / addVoiceUsage
   DB-only — no API key needed, unchanged.
───────────────────────────────────────────────────────────── */
export async function getVoiceUsage(userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('elevenlabs_chars_used, elevenlabs_chars_reset_date')
    .eq('id', userId)
    .maybeSingle()

  const today     = new Date()
  const resetDate = data?.elevenlabs_chars_reset_date
    ? new Date(data.elevenlabs_chars_reset_date)
    : null

  const newMonth = resetDate && (
    today.getMonth()    !== resetDate.getMonth() ||
    today.getFullYear() !== resetDate.getFullYear()
  )

  if (newMonth) {
    await supabase
      .from('user_profiles')
      .update({
        elevenlabs_chars_used:       0,
        elevenlabs_chars_reset_date: today.toISOString().split('T')[0],
      })
      .eq('id', userId)
    return { used: 0, limit: 10000 }
  }

  return { used: data?.elevenlabs_chars_used || 0, limit: 10000 }
}

export async function addVoiceUsage(userId, chars) {
  const { data } = await supabase
    .from('user_profiles')
    .select('elevenlabs_chars_used')
    .eq('id', userId)
    .maybeSingle()

  await supabase
    .from('user_profiles')
    .update({
      elevenlabs_chars_used:       (data?.elevenlabs_chars_used || 0) + chars,
      elevenlabs_chars_reset_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', userId)
}
