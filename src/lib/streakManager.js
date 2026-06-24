/**
 * Echo AI — Streak & Profile Manager
 *
 * ensureProfile  — creates user_profiles row if missing (fallback to trigger)
 * getProfile     — fetches user_profiles row
 * updateStreak   — calculates and saves new streak after an answer is saved
 */

import { supabase } from './supabase'

/* ─────────────────────────────────────────────────────────────
   ensureProfile
   Called on dashboard load as a fallback if the DB trigger
   didn't fire (e.g. Google OAuth signup edge cases).
───────────────────────────────────────────────────────────── */
export async function ensureProfile(userId, displayName) {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (!existing) {
    await supabase
      .from('user_profiles')
      .insert({
        id:             userId,
        display_name:   displayName || 'Friend',
        current_streak: 0,
        total_memories: 0,
      })
      // Ignore conflict — might have been created by trigger simultaneously
      .throwOnError()
      .catch(() => null)
  }
}

/* ─────────────────────────────────────────────────────────────
   getProfile
───────────────────────────────────────────────────────────── */
export async function getProfile(userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data
}

/* ─────────────────────────────────────────────────────────────
   updateStreak
   Called immediately after a memory is saved.
   Returns the new streak count.
───────────────────────────────────────────────────────────── */
export async function updateStreak(userId) {
  const profile = await getProfile(userId)

  const today     = new Date().toISOString().split('T')[0]          // "2025-06-01"
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString().split('T')[0]                                    // "2025-05-31"

  const lastDate = profile?.last_answered_date ?? null

  let newStreak = profile?.current_streak ?? 0

  if (lastDate === today) {
    // Already answered today — streak unchanged (shouldn't reach here normally)
    return newStreak
  } else if (lastDate === yesterday) {
    // Continued streak
    newStreak = (profile?.current_streak ?? 0) + 1
  } else {
    // First answer ever, or missed a day — reset to 1
    newStreak = 1
  }

  const newTotal = (profile?.total_memories ?? 0) + 1

  await supabase
    .from('user_profiles')
    .update({
      current_streak:     newStreak,
      longest_streak:     Math.max(newStreak, profile?.longest_streak ?? 0),
      total_memories:     newTotal,
      last_answered_date: today,
    })
    .eq('id', userId)

  return newStreak
}
