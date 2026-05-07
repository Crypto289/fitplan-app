import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProfile } from '../context/ProfileContext'
import { AVATAR_OPTIONS, type FitProfile } from '../utils/profileStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, { dateStyle: 'medium' })
  } catch {
    return iso.slice(0, 10)
  }
}

function nextRoute(profile: FitProfile): string {
  return profile.planHistory.length > 0 ? '/plan' : '/onboarding'
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  locale,
  onSelect,
  onDelete,
}: {
  profile: FitProfile
  locale: string
  onSelect: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const last =
    profile.planHistory.length > 0
      ? profile.planHistory[profile.planHistory.length - 1]
      : null
  const subtitle = last
    ? t('profiles.lastPlan', { date: formatDate(last.date, locale) })
    : t('profiles.noPlanYet')

  return (
    <article className="bg-bg-card rounded-[22px] border border-amber/[0.15] px-5 py-5 flex items-center gap-4">
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 flex items-center gap-4 text-left"
      >
        <div className="w-14 h-14 rounded-full bg-amber/[0.15] border border-amber/30 grid place-items-center text-3xl flex-shrink-0">
          <span aria-hidden>{profile.avatar}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-semibold text-fg m-0 truncate">{profile.name}</h3>
          <p className="text-xs text-fg-mute m-0 mt-0.5 truncate">{subtitle}</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t('profiles.delete')}
        className="w-10 h-10 min-w-[40px] rounded-full bg-bg-elev border border-amber/[0.15] text-fg-mute hover:text-red-400 hover:border-red-400/40 grid place-items-center text-lg flex-shrink-0 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
        </svg>
      </button>
    </article>
  )
}

// ── New-profile tile ──────────────────────────────────────────────────────────

function NewProfileTile({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white/[0.02] rounded-[22px] border-2 border-dashed border-amber/30 px-5 py-6 flex items-center justify-center gap-3 text-amber font-semibold text-[15px] tracking-[0.06em] hover:bg-amber/[0.06] hover:border-amber/50 transition-all min-h-[88px]"
    >
      <span className="text-2xl leading-none">+</span>
      <span>{t('profiles.newProfile')}</span>
    </button>
  )
}

// ── Create-profile modal ──────────────────────────────────────────────────────

function CreateProfileModal({
  onCancel,
  onCreate,
}: {
  onCancel: () => void
  onCreate: (name: string, avatar: string) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string>(AVATAR_OPTIONS[0])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onCancel])

  function submit() {
    if (!name.trim()) return
    onCreate(name.trim(), avatar)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-lg flex items-stretch sm:items-center justify-center sm:px-6 sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-profile-title"
      onClick={onCancel}
    >
      <div
        className="relative w-full sm:max-w-[480px] sm:rounded-[22px] bg-bg-card border border-amber/[0.15] flex flex-col max-h-screen sm:max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-amber/[0.15]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber mb-1.5">
              {t('profiles.subtitle')}
            </p>
            <h2 id="create-profile-title" className="text-[24px] font-bold tracking-[-0.02em] text-fg m-0 leading-tight">
              {t('profiles.newProfileTitle')}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 min-w-[40px] rounded-full bg-bg-elev border border-amber/[0.15] text-fg-dim hover:text-fg hover:border-amber/30 grid place-items-center text-lg flex-shrink-0"
            aria-label={t('profiles.cancel')}
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
              {t('profiles.profileName')}
            </label>
            <input
              type="text"
              autoFocus
              maxLength={30}
              placeholder={t('profiles.profileNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-base font-semibold text-fg placeholder:text-fg-mute/70 focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
              {t('profiles.selectAvatar')}
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {AVATAR_OPTIONS.map((emoji) => {
                const active = avatar === emoji
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    className={`aspect-square rounded-2xl border text-3xl grid place-items-center transition-all select-none ${
                      active
                        ? 'border-amber bg-amber/[0.15]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                    aria-pressed={active}
                  >
                    <span aria-hidden>{emoji}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-amber/[0.15] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3 bg-bg-card">
          <button
            onClick={onCancel}
            className="px-5 py-3.5 min-h-[48px] rounded-2xl bg-bg-elev border border-amber/[0.15] text-fg font-semibold text-sm transition-all hover:border-amber/30"
          >
            {t('profiles.cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex-1 py-3.5 min-h-[48px] rounded-2xl font-semibold text-sm text-[#1a0e00] transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{
              background: 'linear-gradient(180deg, #f0a648 0%, #e8922a 100%)',
              boxShadow: '0 0 20px rgba(232,146,42,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            {t('profiles.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete-confirmation modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  profile,
  onCancel,
  onConfirm,
}: {
  profile: FitProfile
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-lg flex items-center justify-center px-6 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-[420px] rounded-[22px] bg-bg-card border border-red-500/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/40 grid place-items-center text-red-400 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-confirm-title" className="text-[20px] font-bold tracking-[-0.01em] text-fg m-0 leading-tight">
              {t('profiles.deleteConfirmTitle')}
            </h2>
            <p className="text-sm text-fg-dim leading-relaxed mt-2 m-0">
              <span className="font-semibold text-fg">{profile.name}</span>
              {' — '}
              {t('profiles.deleteConfirmBody')}
            </p>
          </div>
        </div>

        <div className="px-6 pt-5 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3.5 min-h-[48px] rounded-2xl bg-bg-elev border border-amber/[0.15] text-fg font-semibold text-sm transition-all hover:border-amber/30"
          >
            {t('profiles.deleteCancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 min-h-[48px] rounded-2xl font-semibold text-sm text-white transition-all hover:-translate-y-px"
            style={{
              background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
              boxShadow: '0 0 20px rgba(239,68,68,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            {t('profiles.deleteConfirmBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { profiles, canCreate, createProfile, selectProfile, deleteProfile } = useProfile()
  const [showCreate, setShowCreate] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<FitProfile | null>(null)

  const isDe = i18n.language.startsWith('de')
  const locale = isDe ? 'de-DE' : 'en-US'

  function toggleLang() {
    i18n.changeLanguage(isDe ? 'en' : 'de')
  }

  function handleSelect(profile: FitProfile) {
    selectProfile(profile.id)
    navigate(nextRoute(profile))
  }

  function handleCreate(name: string, avatar: string) {
    const created = createProfile(name, avatar)
    setShowCreate(false)
    if (created) navigate('/onboarding')
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return
    deleteProfile(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <div className="relative min-h-screen text-fg">
      <div className="bg-stage" aria-hidden>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      <div className="relative z-10 max-w-[720px] mx-auto pb-20">
        <header className="sticky top-0 z-30 px-7 pt-7 pb-4 bg-gradient-to-b from-bg/95 via-bg/90 to-transparent backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber mb-2">
                {t('profiles.subtitle')}
              </p>
              <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.02em] text-fg m-0">
                {t('profiles.title')}
              </h1>
            </div>
            <div className="inline-flex bg-bg-card border border-amber/[0.15] rounded-full p-[3px]">
              <button
                onClick={() => isDe || toggleLang()}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-[0.08em] transition-colors ${
                  isDe ? 'bg-amber/[0.15] text-amber' : 'text-fg-mute'
                }`}
              >
                DE
              </button>
              <button
                onClick={() => !isDe || toggleLang()}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-[0.08em] transition-colors ${
                  !isDe ? 'bg-amber/[0.15] text-amber' : 'text-fg-mute'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </header>

        <div className="px-7 mt-2 flex flex-col gap-2.5">
          {profiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-full border border-amber/[0.15] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-fg-mute" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              </div>
              <p className="text-fg-mute text-sm max-w-[280px]">{t('profiles.empty')}</p>
            </div>
          )}

          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              locale={locale}
              onSelect={() => handleSelect(p)}
              onDelete={() => setPendingDelete(p)}
            />
          ))}

          {canCreate ? (
            <NewProfileTile onClick={() => setShowCreate(true)} />
          ) : (
            <p className="text-xs text-fg-mute text-center mt-2">{t('profiles.maxReached')}</p>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateProfileModal
          onCancel={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {pendingDelete && (
        <DeleteConfirmModal
          profile={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}
