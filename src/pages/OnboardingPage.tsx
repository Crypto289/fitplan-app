import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type Gender = 'male' | 'female' | 'diverse'
type Experience = 'beginner' | 'intermediate' | 'advanced'
type Occupation = 'desk' | 'standing' | 'heavy'
export type Goal = 'muscle' | 'lose' | 'gain' | 'endurance' | 'mobility' | 'fitness'

const GOALS: Goal[] = ['muscle', 'lose', 'gain', 'endurance', 'mobility', 'fitness']

export interface ProfileData {
  height: string
  weight: string
  age: string
  gender: Gender | ''
  goal: Goal | ''
  bodyFat: string
  experience: Experience | ''
  occupation: Occupation | ''
  steps: number
  injuries: string
  allergies: string
}

type FormErrors = Partial<Record<keyof ProfileData, string>>

const INITIAL: ProfileData = {
  height: '',
  weight: '',
  age: '',
  gender: '',
  goal: '',
  bodyFat: '',
  experience: '',
  occupation: '',
  steps: 5000,
  injuries: '',
  allergies: '',
}

function validate(data: ProfileData, t: (k: string) => string): FormErrors {
  const errors: FormErrors = {}

  if (!data.height) {
    errors.height = t('onboarding.errors.required')
  } else {
    const h = Number(data.height)
    if (isNaN(h) || h < 140 || h > 220) errors.height = t('onboarding.errors.heightRange')
  }

  if (!data.weight) {
    errors.weight = t('onboarding.errors.required')
  } else {
    const w = Number(data.weight)
    if (isNaN(w) || w < 40 || w > 200) errors.weight = t('onboarding.errors.weightRange')
  }

  if (!data.age) {
    errors.age = t('onboarding.errors.required')
  } else {
    const a = Number(data.age)
    if (isNaN(a) || a < 15 || a > 80) errors.age = t('onboarding.errors.ageRange')
  }

  if (!data.gender) errors.gender = t('onboarding.errors.required')
  if (!data.goal) errors.goal = t('onboarding.errors.required')
  if (data.bodyFat) {
    const bf = Number(data.bodyFat)
    if (isNaN(bf) || bf < 5 || bf > 60) errors.bodyFat = t('onboarding.errors.bodyFatRange')
  }
  if (!data.experience) errors.experience = t('onboarding.errors.required')
  if (!data.occupation) errors.occupation = t('onboarding.errors.required')

  return errors
}

const GOAL_ICONS: Record<Goal, JSX.Element> = {
  muscle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h2M2 10h2M6 12h2M2 14h2" />
      <path d="M8 7h2v10H8z" />
      <path d="M16 7h-2v10h2z" />
      <path d="M16 8h2M20 10h2M16 12h2M20 14h2" />
      <path d="M10 12h4" />
    </svg>
  ),
  lose: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  ),
  gain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V8" />
      <path d="M7 13l5-5 5 5" />
      <path d="M4 4h16" />
    </svg>
  ),
  endurance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-5 3 10 2-7 2 2h5" />
    </svg>
  ),
  mobility: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v5" />
      <path d="M5 9l7 2 7-2" />
      <path d="M12 11l-3 9" />
      <path d="M12 11l3 9" />
    </svg>
  ),
  fitness: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const inputBase =
  'w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 ' +
  'text-base font-semibold text-fg placeholder:text-fg-mute/70 ' +
  'focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all'

const inputErr =
  'w-full rounded-xl border border-red-500/40 bg-red-950/20 px-3.5 py-3 ' +
  'text-base font-semibold text-fg placeholder:text-fg-mute/70 ' +
  'focus:outline-none focus:border-red-400 focus:ring-[3px] focus:ring-red-500/15 transition-all'

function AmberChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 4L6 8L10 4" stroke="#e8922a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-bg-card rounded-[22px] border border-amber/[0.15] p-5 sm:p-6 flex flex-col gap-4 sm:gap-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fg-mute m-0">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({
  label,
  error,
  optional,
  children,
}: {
  label: string
  error?: string
  optional?: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
        {label}
        {optional && (
          <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-fg-mute/60">
            ({t('onboarding.optional')})
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-xs text-red-400/90">{error}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  function toggleLang() {
    i18n.changeLanguage(i18n.language.startsWith('de') ? 'en' : 'de')
  }
  const [form, setForm] = useState<ProfileData>(INITIAL)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  function patch<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    const next = { ...form, [key]: value }
    setForm(next)
    if (submitted) setErrors(validate(next, t))
  }

  function handleSubmit() {
    setSubmitted(true)
    const errs = validate(form, t)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      document.getElementById('form-top')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    localStorage.setItem('fitplan_profile', JSON.stringify(form))
    navigate('/onboarding/goals')
  }

  function ic(field: keyof ProfileData) {
    return errors[field] ? inputErr : inputBase
  }

  const stepsPercent = (form.steps / 20000) * 100
  const isDe = i18n.language.startsWith('de')

  return (
    <div className="relative min-h-screen text-fg" id="form-top">
      <div className="bg-stage" aria-hidden>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      <div className="relative z-10 max-w-[720px] mx-auto pb-32">

        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-30 px-7 pt-7 pb-4 bg-gradient-to-b from-bg/95 via-bg/90 to-transparent backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber mb-2">
                {t('onboarding.step', { step: 1, total: 2 })}
              </p>
              <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.02em] text-fg m-0">
                {t('onboarding.title')}
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

          {/* Progress bar */}
          <div className="mt-4 h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: '50%',
                background: 'linear-gradient(90deg, #b8701f 0%, #e8922a 50%, #f0a648 100%)',
                boxShadow: '0 0 12px rgba(232,146,42,0.55)',
              }}
            />
          </div>
        </header>

        {/* ── Content ── */}
        <div className="px-7 mt-2 flex flex-col gap-3.5">

          {/* ── Card 1: Body ── */}
          <Card title={t('onboarding.sections.body')}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('onboarding.fields.height')} error={errors.height}>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={140} max={220} step={1}
                    placeholder="170"
                    className={ic('height') + ' pr-10'}
                    value={form.height}
                    onChange={(e) => patch('height', e.target.value)}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-fg-mute pointer-events-none">cm</span>
                </div>
              </Field>

              <Field label={t('onboarding.fields.weight')} error={errors.weight}>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={40} max={200} step={0.1}
                    placeholder="70.0"
                    className={ic('weight') + ' pr-10'}
                    value={form.weight}
                    onChange={(e) => patch('weight', e.target.value)}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-fg-mute pointer-events-none">kg</span>
                </div>
              </Field>
            </div>

            <Field label={t('onboarding.fields.age')} error={errors.age}>
              <input
                type="number"
                inputMode="numeric"
                min={15} max={80} step={1}
                placeholder="25"
                className={ic('age') + ' max-w-[160px]'}
                value={form.age}
                onChange={(e) => patch('age', e.target.value)}
              />
            </Field>

            <Field label={t('onboarding.fields.gender')} error={errors.gender}>
              <div className="flex gap-2 flex-wrap">
                {(['male', 'female', 'diverse'] as const).map((g) => {
                  const active = form.gender === g
                  return (
                    <label
                      key={g}
                      className={`flex-1 min-w-[80px] flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-full border text-sm cursor-pointer transition-all select-none whitespace-nowrap ${
                        active
                          ? 'border-amber bg-amber/[0.15] text-amber font-semibold'
                          : errors.gender
                          ? 'border-red-500/30 bg-red-950/15 text-fg-dim hover:text-fg'
                          : 'border-white/[0.06] bg-white/[0.02] text-fg-dim hover:bg-white/[0.04] hover:text-fg'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={active}
                        onChange={() => patch('gender', g)}
                        className="sr-only"
                      />
                      {t(`onboarding.gender.${g}`)}
                    </label>
                  )
                })}
              </div>
            </Field>

            <Field label={t('onboarding.fields.goal')} error={errors.goal}>
              <div className="grid grid-cols-2 gap-2.5">
                {GOALS.map((g) => {
                  const active = form.goal === g
                  return (
                    <label
                      key={g}
                      className={`relative flex items-center gap-2.5 sm:gap-3.5 px-3 sm:px-4 py-3 sm:py-4 rounded-2xl border cursor-pointer transition-all select-none text-left text-xs sm:text-sm font-medium ${
                        active
                          ? 'border-amber bg-amber/[0.15] text-fg shadow-amber'
                          : errors.goal
                          ? 'border-red-500/30 bg-red-950/15 text-fg-dim hover:text-fg'
                          : 'border-white/[0.06] bg-white/[0.02] text-fg-dim hover:bg-white/[0.04] hover:text-fg'
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-[10px] grid place-items-center flex-shrink-0 transition-all ${
                          active ? 'bg-amber/[0.18] text-amber' : 'bg-white/[0.04] text-fg-dim'
                        }`}
                      >
                        <span className="block w-5 h-5">{GOAL_ICONS[g]}</span>
                      </span>
                      <span>{t(`onboarding.goal.${g}`)}</span>
                      <input
                        type="radio"
                        name="goal"
                        value={g}
                        checked={active}
                        onChange={() => patch('goal', g)}
                        className="sr-only"
                      />
                    </label>
                  )
                })}
              </div>
            </Field>

            <Field label={t('onboarding.fields.bodyFat')} error={errors.bodyFat} optional>
              <div className="relative max-w-[160px]">
                <input
                  type="number"
                  inputMode="numeric"
                  min={5} max={60} step={1}
                  placeholder={t('onboarding.placeholders.bodyFat')}
                  className={ic('bodyFat') + ' pr-10'}
                  value={form.bodyFat}
                  onChange={(e) => patch('bodyFat', e.target.value)}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-fg-mute pointer-events-none">%</span>
              </div>
            </Field>
          </Card>

          {/* ── Card 2: Activity ── */}
          <Card title={t('onboarding.sections.activity')}>
            <Field label={t('onboarding.fields.experience')} error={errors.experience}>
              <div className="relative">
                <select
                  className={ic('experience') + ' appearance-none pr-10 cursor-pointer'}
                  value={form.experience}
                  onChange={(e) => patch('experience', e.target.value as Experience)}
                >
                  <option value="">– {t('onboarding.select')} –</option>
                  {(['beginner', 'intermediate', 'advanced'] as const).map((v) => (
                    <option key={v} value={v}>{t(`onboarding.experience.${v}`)}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
                  <AmberChevron />
                </div>
              </div>
            </Field>

            <Field label={t('onboarding.fields.occupation')} error={errors.occupation}>
              <div className="relative">
                <select
                  className={ic('occupation') + ' appearance-none pr-10 cursor-pointer'}
                  value={form.occupation}
                  onChange={(e) => patch('occupation', e.target.value as Occupation)}
                >
                  <option value="">– {t('onboarding.select')} –</option>
                  {(['desk', 'standing', 'heavy'] as const).map((v) => (
                    <option key={v} value={v}>{t(`onboarding.occupation.${v}`)}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
                  <AmberChevron />
                </div>
              </div>
            </Field>

            {/* Steps slider */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
                  {t('onboarding.fields.steps')}
                </label>
                <span className="text-[26px] font-bold text-amber tracking-[-0.01em] tabular-nums leading-none">
                  {form.steps.toLocaleString(isDe ? 'de-DE' : 'en-US')}
                  <span className="text-[13px] font-medium text-fg-mute ml-1.5">
                    {t('onboarding.stepsUnit')}
                  </span>
                </span>
              </div>

              <div className="relative h-1.5 rounded-full bg-white/[0.05]">
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${stepsPercent}%`,
                    background: 'linear-gradient(90deg, #b8701f, #e8922a, #f0a648)',
                    boxShadow: '0 0 10px rgba(232,146,42,0.55)',
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={20000}
                  step={1000}
                  value={form.steps}
                  onChange={(e) => patch('steps', Number(e.target.value))}
                  className="range-amber absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-amber-hi border-2 border-[#1a0e00] pointer-events-none"
                  style={{
                    left: `${stepsPercent}%`,
                    boxShadow: '0 0 0 3px rgba(232,146,42,0.20), 0 4px 12px rgba(232,146,42,0.45)',
                  }}
                />
              </div>

              <div className="flex justify-between text-[10px] tracking-[0.12em] text-fg-mute">
                {[0, 5000, 10000, 15000, 20000].map((v) => (
                  <span key={v}>{v === 0 ? '0' : `${v / 1000}k`}</span>
                ))}
              </div>
            </div>
          </Card>

          {/* ── Card 3: Health ── */}
          <Card title={t('onboarding.sections.health')}>
            <Field label={t('onboarding.fields.injuries')} optional>
              <textarea
                rows={3}
                placeholder={t('onboarding.placeholders.injuries')}
                className={inputBase + ' resize-none text-sm'}
                value={form.injuries}
                onChange={(e) => patch('injuries', e.target.value)}
              />
            </Field>

            <Field label={t('onboarding.fields.allergies')} optional>
              <textarea
                rows={3}
                placeholder={t('onboarding.placeholders.allergies')}
                className={inputBase + ' resize-none text-sm'}
                value={form.allergies}
                onChange={(e) => patch('allergies', e.target.value)}
              />
            </Field>
          </Card>
        </div>

        {/* ── Submit (sticky bottom) ── */}
        <div className="fixed bottom-0 inset-x-0 z-30 max-w-[720px] mx-auto px-7 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-bg via-bg/95 to-transparent backdrop-blur-md">
          <button
            onClick={handleSubmit}
            className="w-full min-h-[52px] py-4 rounded-2xl font-semibold text-[15px] text-[#1a0e00]
              transition-all duration-200 active:translate-y-0 hover:-translate-y-px
              shadow-amber hover:shadow-amber-lg"
            style={{
              background: 'linear-gradient(180deg, #f0a648 0%, #e8922a 100%)',
              boxShadow: '0 0 20px rgba(232,146,42,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            {t('onboarding.next')} →
          </button>
        </div>
      </div>
    </div>
  )
}
