/**
 * Echo AI — AI provider: Groq (llama-3.3-70b-versatile) via Edge Function proxy
 *
 * The API key never touches the browser — all calls go through
 * supabase/functions/groq-proxy which verifies auth + enforces rate limits.
 */

import { supabase }          from './supabase'
import { sanitizeForPrompt } from './sanitize'

/**
 * callGemini(prompt, systemPrompt?)
 *
 * Same interface as before — all callers (questionGenerator, Dashboard echo chat)
 * work without changes. Now calls the edge function instead of Groq directly.
 */
export async function callGemini(prompt, systemPrompt = null) {
  const messages = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: sanitizeForPrompt(systemPrompt, 6000) })
  }
  messages.push({ role: 'user', content: sanitizeForPrompt(prompt, 6000) })

  const { data, error } = await supabase.functions.invoke('groq-proxy', {
    body: { messages, max_tokens: 500 },
  })

  if (error) throw new Error(error.message || 'AI service unavailable')

  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')
  return content.trim()
}
