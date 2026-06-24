/**
 * Echo AI — ElevenLabs API Proxy (Supabase Edge Function)
 *
 * Actions:
 *   tts    → POST /text-to-speech/:voiceId   (returns base64 audio JSON)
 *   clone  → POST /voices/add                (accepts base64 audio)
 *   delete → DELETE /voices/:voiceId
 *
 * Enforces:
 *   - JWT authentication
 *   - 20 TTS calls / user / day
 *   - 2 000-char max per TTS text
 *   - voiceId is URL-encoded before forwarding
 *
 * Deploy:
 *   supabase functions deploy elevenlabs-proxy
 *   supabase secrets set ELEVENLABS_API_KEY=<your_key>
 */

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EL_API          = "https://api.elevenlabs.io/v1"
const MAX_TTS_PER_DAY = 20
const MAX_TEXT_CHARS  = 2000

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  // ── Auth ──────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const elKey       = Deno.env.get("ELEVENLABS_API_KEY")!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Unauthorized" }, 401)

  const admin = createClient(supabaseUrl, serviceKey)

  // ── Parse body ────────────────────────────────────────────────
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  const action = String(body.action ?? "")

  // ── TTS ───────────────────────────────────────────────────────
  if (action === "tts") {
    const today = new Date().toISOString().split("T")[0]
    const { data: rateRow } = await admin
      .from("api_rate_limits")
      .select("call_count")
      .eq("user_id", user.id).eq("api", "elevenlabs_tts").eq("date", today)
      .maybeSingle()

    if (rateRow && rateRow.call_count >= MAX_TTS_PER_DAY) {
      return json(
        { error: `Daily voice limit (${MAX_TTS_PER_DAY} responses) reached. Resets at midnight UTC.` },
        429
      )
    }

    const text    = String(body.text    ?? "").slice(0, MAX_TEXT_CHARS)
    const voiceId = String(body.voiceId ?? "")
    if (!text || !voiceId) return json({ error: "Missing text or voiceId" }, 400)

    const elRes = await fetch(`${EL_API}/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method:  "POST",
      headers: { "xi-api-key": elKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5, similarity_boost: 0.85,
          style: 0.3, use_speaker_boost: true,
        },
      }),
    })

    if (!elRes.ok) {
      const err = await elRes.json().catch(() => ({}))
      const msg = (err as { detail?: { message?: string } })?.detail?.message ?? "Voice generation failed"
      return json({ error: msg }, elRes.status)
    }

    // Convert audio bytes → base64 for JSON transport
    const bytes  = new Uint8Array(await elRes.arrayBuffer())
    let binary = ""
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const audio_base64 = btoa(binary)

    // Increment rate counter
    if (rateRow) {
      await admin.from("api_rate_limits")
        .update({ call_count: rateRow.call_count + 1 })
        .eq("user_id", user.id).eq("api", "elevenlabs_tts").eq("date", today)
    } else {
      await admin.from("api_rate_limits")
        .insert({ user_id: user.id, api: "elevenlabs_tts", date: today, call_count: 1 })
    }

    return json({ audio_base64 })
  }

  // ── Clone voice ───────────────────────────────────────────────
  if (action === "clone") {
    const audio_base64   = String(body.audio_base64   ?? "")
    const audio_filename = String(body.audio_filename ?? "voice.mp3")
    const display_name   = String(body.display_name   ?? "").slice(0, 50)
    if (!audio_base64 || !display_name) return json({ error: "Missing fields" }, 400)

    // Decode base64 → bytes
    let audioBytes: Uint8Array
    try {
      audioBytes = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0))
    } catch {
      return json({ error: "Invalid audio data" }, 400)
    }

    const audioBlob = new Blob([audioBytes], { type: "audio/mpeg" })
    const form      = new FormData()
    form.append("name",        `${display_name}_echo_${Date.now()}`)
    form.append("description", "Echo AI voice clone")
    form.append("files",       audioBlob, audio_filename)

    const elRes = await fetch(`${EL_API}/voices/add`, {
      method:  "POST",
      headers: { "xi-api-key": elKey },
      body:    form,
    })
    const data = await elRes.json()
    if (!elRes.ok) {
      const raw = (data as { detail?: { message?: string } | string })?.detail
      const msg = typeof raw === "string" ? raw
        : (raw as { message?: string })?.message ?? "Voice cloning failed"
      return json({ error: msg }, elRes.status)
    }
    return json({ voice_id: (data as { voice_id: string }).voice_id })
  }

  // ── Delete voice ──────────────────────────────────────────────
  if (action === "delete") {
    const voiceId = String(body.voiceId ?? "")
    if (!voiceId) return json({ error: "Missing voiceId" }, 400)
    await fetch(`${EL_API}/voices/${encodeURIComponent(voiceId)}`, {
      method:  "DELETE",
      headers: { "xi-api-key": elKey },
    }).catch(() => {})
    return json({ ok: true })
  }

  return json({ error: "Unknown action" }, 400)
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}
