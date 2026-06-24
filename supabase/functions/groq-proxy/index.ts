/**
 * Echo AI — Groq API Proxy (Supabase Edge Function)
 *
 * Handles two actions:
 *   chat       — LLM completions (llama-3.3-70b-versatile), 60/day
 *   transcribe — Whisper audio transcription, 20/day
 *
 * Both keep the Groq API key server-side.
 */

import { serve }         from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient }  from "https://esm.sh/@supabase/supabase-js@2"

const GROQ_CHAT_URL      = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_WHISPER_URL   = "https://api.groq.com/openai/v1/audio/transcriptions"
const MAX_CHAT_CALLS     = 60
const MAX_WHISPER_CALLS  = 20
const MAX_TOKENS         = 800
const MAX_MSG_CHARS      = 8000

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  // ── Auth ──────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const groqKey     = Deno.env.get("GROQ_API_KEY")!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Unauthorized" }, 401)

  const admin = createClient(supabaseUrl, serviceKey)
  const today = new Date().toISOString().split("T")[0]

  // ── Parse action ──────────────────────────────────────────────
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  const action = (body.action as string) ?? "chat"

  // ══════════════════════════════════════════════════════════════
  //  TRANSCRIBE — Groq Whisper
  // ══════════════════════════════════════════════════════════════
  if (action === "transcribe") {
    // Rate limit: 20 Whisper calls / user / day
    const { data: rateRow } = await admin
      .from("api_rate_limits")
      .select("call_count")
      .eq("user_id", user.id).eq("api", "whisper").eq("date", today)
      .maybeSingle()

    if (rateRow && rateRow.call_count >= MAX_WHISPER_CALLS) {
      return json({ error: `Daily transcription limit (${MAX_WHISPER_CALLS}) reached.` }, 429)
    }

    const audio_base64   = body.audio_base64 as string
    const audio_filename = (body.audio_filename as string) ?? "recording.webm"

    if (!audio_base64) return json({ error: "audio_base64 required" }, 400)

    // Decode base64 → binary
    const binaryStr = atob(audio_base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

    const formData = new FormData()
    formData.append("file", new Blob([bytes], { type: "audio/webm" }), audio_filename)
    formData.append("model", "whisper-large-v3")
    formData.append("response_format", "json")

    const whisperRes = await fetch(GROQ_WHISPER_URL, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${groqKey}` },
      body:    formData,
    })

    // Increment rate limit counter
    if (rateRow) {
      await admin.from("api_rate_limits")
        .update({ call_count: rateRow.call_count + 1 })
        .eq("user_id", user.id).eq("api", "whisper").eq("date", today)
    } else {
      await admin.from("api_rate_limits")
        .insert({ user_id: user.id, api: "whisper", date: today, call_count: 1 })
    }

    const data = await whisperRes.json()
    return json(data, whisperRes.status)
  }

  // ══════════════════════════════════════════════════════════════
  //  CHAT — LLM completions
  // ══════════════════════════════════════════════════════════════
  const { data: rateRow } = await admin
    .from("api_rate_limits")
    .select("call_count")
    .eq("user_id", user.id).eq("api", "groq").eq("date", today)
    .maybeSingle()

  if (rateRow && rateRow.call_count >= MAX_CHAT_CALLS) {
    return json(
      { error: `Daily AI limit (${MAX_CHAT_CALLS} calls) reached. Resets at midnight UTC.` },
      429
    )
  }

  if (rateRow) {
    await admin.from("api_rate_limits")
      .update({ call_count: rateRow.call_count + 1 })
      .eq("user_id", user.id).eq("api", "groq").eq("date", today)
  } else {
    await admin.from("api_rate_limits")
      .insert({ user_id: user.id, api: "groq", date: today, call_count: 1 })
  }

  const { messages, max_tokens } = body as { messages?: unknown; max_tokens?: unknown }
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages must be a non-empty array" }, 400)
  }

  const VALID_ROLES = new Set(["system", "user", "assistant"])
  const sanitized = (messages as Array<{ role?: unknown; content?: unknown }>).map(m => ({
    role:    VALID_ROLES.has(String(m.role)) ? String(m.role) : "user",
    content: String(m.content ?? "").slice(0, MAX_MSG_CHARS),
  }))

  const safeTokens = Math.min(
    typeof max_tokens === "number" && max_tokens > 0 ? max_tokens : 500,
    MAX_TOKENS,
  )

  const groqRes = await fetch(GROQ_CHAT_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model:       "llama-3.3-70b-versatile",
      messages:    sanitized,
      temperature: 0.8,
      max_tokens:  safeTokens,
    }),
  })

  const data = await groqRes.json()
  return json(data, groqRes.status)
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}
