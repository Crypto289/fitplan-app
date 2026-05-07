import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FitnessPlan } from '../services/mistralService'
import type { ProfileData } from '../pages/OnboardingPage'
import type { PreferencesData } from '../pages/PreferencesPage'
import {
  AVATAR_OPTIONS,
  MAX_PROFILES,
  makeId,
  migrateLegacyIfNeeded,
  persistActiveId,
  persistProfiles,
  trimHistory,
  type FitProfile,
} from '../utils/profileStore'

interface ProfileContextValue {
  profiles: FitProfile[]
  activeProfile: FitProfile | null
  canCreate: boolean

  createProfile(name: string, avatar: string): FitProfile | null
  selectProfile(id: string): void
  deleteProfile(id: string): void
  updateActiveProfileData(profileData: ProfileData): void
  updateActivePreferencesData(prefs: PreferencesData): void

  plan: FitnessPlan | null
  planLang: 'de' | 'en' | null
  appendPlanToHistory(plan: FitnessPlan, lang: 'de' | 'en'): void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()

  const [{ profiles, activeId }, setStore] = useState<{
    profiles: FitProfile[]
    activeId: string | null
  }>(() => {
    const defaultName = (() => {
      try { return t('profiles.defaultName') } catch { return 'Mein Profil' }
    })()
    return migrateLegacyIfNeeded(defaultName)
  })

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? null,
    [profiles, activeId],
  )

  const writeProfiles = useCallback((next: FitProfile[], nextActive?: string | null) => {
    persistProfiles(next)
    if (nextActive !== undefined) persistActiveId(nextActive)
    setStore((prev) => ({
      profiles: next,
      activeId: nextActive !== undefined ? nextActive : prev.activeId,
    }))
  }, [])

  const createProfile = useCallback(
    (name: string, avatar: string): FitProfile | null => {
      if (profiles.length >= MAX_PROFILES) return null
      const cleanName = name.trim() || t('profiles.defaultName')
      const cleanAvatar = avatar || AVATAR_OPTIONS[0]
      const profile: FitProfile = {
        id: makeId(),
        name: cleanName,
        avatar: cleanAvatar,
        createdAt: new Date().toISOString(),
        planHistory: [],
      }
      const next = [...profiles, profile]
      writeProfiles(next, profile.id)
      return profile
    },
    [profiles, t, writeProfiles],
  )

  const selectProfile = useCallback(
    (id: string) => {
      if (!profiles.some((p) => p.id === id)) return
      persistActiveId(id)
      setStore((prev) => ({ ...prev, activeId: id }))
    },
    [profiles],
  )

  const deleteProfile = useCallback(
    (id: string) => {
      const next = profiles.filter((p) => p.id !== id)
      const nextActive =
        activeId === id ? (next[0]?.id ?? null) : activeId
      writeProfiles(next, nextActive)
    },
    [profiles, activeId, writeProfiles],
  )

  const patchActive = useCallback(
    (patch: (p: FitProfile) => FitProfile) => {
      if (!activeId) return
      const next = profiles.map((p) => (p.id === activeId ? patch(p) : p))
      writeProfiles(next)
    },
    [profiles, activeId, writeProfiles],
  )

  const updateActiveProfileData = useCallback(
    (profileData: ProfileData) => {
      patchActive((p) => ({ ...p, profileData }))
    },
    [patchActive],
  )

  const updateActivePreferencesData = useCallback(
    (preferencesData: PreferencesData) => {
      patchActive((p) => ({ ...p, preferencesData }))
    },
    [patchActive],
  )

  const appendPlanToHistory = useCallback(
    (plan: FitnessPlan, lang: 'de' | 'en') => {
      patchActive((p) => ({
        ...p,
        planHistory: trimHistory([
          ...p.planHistory,
          { date: new Date().toISOString(), lang, plan },
        ]),
      }))
    },
    [patchActive],
  )

  const lastEntry =
    activeProfile && activeProfile.planHistory.length > 0
      ? activeProfile.planHistory[activeProfile.planHistory.length - 1]
      : null

  const value: ProfileContextValue = {
    profiles,
    activeProfile,
    canCreate: profiles.length < MAX_PROFILES,
    createProfile,
    selectProfile,
    deleteProfile,
    updateActiveProfileData,
    updateActivePreferencesData,
    plan: lastEntry?.plan ?? null,
    planLang: lastEntry?.lang ?? null,
    appendPlanToHistory,
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error('useProfile must be used inside <ProfileProvider>')
  }
  return ctx
}
