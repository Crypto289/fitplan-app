import type { FitnessPlan } from '../services/mistralService'
import type { ProfileData } from '../pages/OnboardingPage'
import type { PreferencesData } from '../pages/PreferencesPage'

export const AVATAR_OPTIONS = [
  '💪',
  '🏃‍♂️',
  '🧘‍♀️',
  '🏋️‍♂️',
  '🚴‍♀️',
  '⚡',
  '🔥',
  '🌟',
] as const

export const MAX_PROFILES = 3
export const MAX_HISTORY = 8

const PROFILES_KEY = 'fitplan_profiles'
const ACTIVE_KEY = 'fitplan_active_profile'

const LEGACY_PROFILE = 'fitplan_profile'
const LEGACY_PREFERENCES = 'fitplan_preferences'
const LEGACY_PLAN = 'fitplan_plan'
const LEGACY_PLAN_LANG = 'fitplan_plan_lang'

export interface PlanHistoryEntry {
  date: string
  lang: 'de' | 'en'
  plan: FitnessPlan
}

export interface FitProfile {
  id: string
  name: string
  avatar: string
  createdAt: string
  profileData?: ProfileData
  preferencesData?: PreferencesData
  planHistory: PlanHistoryEntry[]
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function loadProfiles(): FitProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isFitProfile)
  } catch {
    return []
  }
}

function isFitProfile(x: unknown): x is FitProfile {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.avatar === 'string' &&
    typeof o.createdAt === 'string' &&
    Array.isArray(o.planHistory)
  )
}

export function persistProfiles(profiles: FitProfile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function persistActiveId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id)
  else localStorage.removeItem(ACTIVE_KEY)
}

export function migrateLegacyIfNeeded(defaultName: string): {
  profiles: FitProfile[]
  activeId: string | null
} {
  const existing = loadProfiles()
  if (existing.length > 0) {
    return { profiles: existing, activeId: loadActiveId() }
  }

  if (localStorage.getItem(PROFILES_KEY) !== null) {
    return { profiles: [], activeId: null }
  }

  const legacyProfileRaw = localStorage.getItem(LEGACY_PROFILE)
  const legacyPrefRaw = localStorage.getItem(LEGACY_PREFERENCES)
  const legacyPlanRaw = localStorage.getItem(LEGACY_PLAN)
  const legacyLangRaw = localStorage.getItem(LEGACY_PLAN_LANG)

  if (!legacyProfileRaw && !legacyPrefRaw && !legacyPlanRaw) {
    persistProfiles([])
    return { profiles: [], activeId: null }
  }

  let profileData: ProfileData | undefined
  let preferencesData: PreferencesData | undefined
  let plan: FitnessPlan | undefined

  try { if (legacyProfileRaw) profileData = JSON.parse(legacyProfileRaw) } catch { /* ignore */ }
  try { if (legacyPrefRaw) preferencesData = JSON.parse(legacyPrefRaw) } catch { /* ignore */ }
  try { if (legacyPlanRaw) plan = JSON.parse(legacyPlanRaw) } catch { /* ignore */ }

  const lang: 'de' | 'en' = legacyLangRaw === 'en' ? 'en' : 'de'

  const profile: FitProfile = {
    id: makeId(),
    name: defaultName,
    avatar: AVATAR_OPTIONS[0],
    createdAt: new Date().toISOString(),
    profileData,
    preferencesData,
    planHistory: plan
      ? [{ date: new Date().toISOString(), lang, plan }]
      : [],
  }

  const profiles = [profile]
  persistProfiles(profiles)
  persistActiveId(profile.id)

  localStorage.removeItem(LEGACY_PROFILE)
  localStorage.removeItem(LEGACY_PREFERENCES)
  localStorage.removeItem(LEGACY_PLAN)
  localStorage.removeItem(LEGACY_PLAN_LANG)

  return { profiles, activeId: profile.id }
}

export function trimHistory(entries: PlanHistoryEntry[]): PlanHistoryEntry[] {
  if (entries.length <= MAX_HISTORY) return entries
  return entries.slice(entries.length - MAX_HISTORY)
}
