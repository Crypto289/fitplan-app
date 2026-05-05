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

// ── Design tokens ─────────────────────────────────────────────────────────────

const inputBase =
  'w-full rounded-xl border border-white/[0.08] bg-[#0d1018] px-3 py-3 ' +
  'text-sm text-white placeholder:text-white/20 ' +
  'focus:outline-none focus:border-neon/50 focus:ring-2 focus:ring-neon/10 transition-all'

const inputErr =
  'w-full rounded-xl border border-red-500/40 bg-red-950/25 px-3 py-3 ' +
  'text-sm text-white placeholder:text-white/20 ' +
  'focus:outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/10 transition-all'

// ── Sub-components ─────────────────────────────────────────────────────────────

function NeonChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 4L6 8L10 4" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1d27] rounded-2xl border border-neon/[0.1] p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 shadow-card">
      <h2 className="text-[10px] font-bold text-neon uppercase tracking-[0.22em] pb-3 border-b border-neon/[0.08]">
        {title}
      </h2>
      {children}
    </div>
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
      <label className="text-sm font-medium text-white/55">
        {label}
        {optional && (
          <span className="ml-1.5 text-xs font-normal text-white/20">({t('onboarding.optional')})</span>
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

  return (
    <div className="min-h-screen bg-[#0f1117] overflow-x-hidden" id="form-top">

      {/* ── Sticky Header ── */}
      <div className="bg-[#0f1117]/95 backdrop-blur-md border-b border-neon/[0.08] px-4 pt-8 pb-4 sm:pt-10 sm:pb-5 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-neon tracking-[0.25em] uppercase mb-1.5">
                {t('onboarding.step', { step: 1, total: 2 })}
              </p>
              <h1 className="text-2xl font-bold text-white">{t('onboarding.title')}</h1>
            </div>
            <button
              onClick={toggleLang}
              className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-xs font-mono font-bold text-white/40 hover:border-neon/30 hover:text-neon/70 transition-all"
            >
              {i18n.language.startsWith('de') ? 'EN' : 'DE'}
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex gap-2 items-center">
            <div className="h-[3px] rounded-full bg-neon flex-1 shadow-[0_0_10px_rgba(0,255,136,0.7)]" />
            <div className="h-[3px] rounded-full bg-white/[0.07] flex-1" />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

        {/* ── Card 1: Body ── */}
        <Card title={t('onboarding.sections.body')}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('onboarding.fields.height')} error={errors.height}>
              <input
                type="number"
                inputMode="numeric"
                min={140} max={220} step={1}
                placeholder="170"
                className={ic('height')}
                value={form.height}
                onChange={(e) => patch('height', e.target.value)}
              />
            </Field>

            <Field label={t('onboarding.fields.weight')} error={errors.weight}>
              <input
                type="number"
                inputMode="decimal"
                min={40} max={200} step={0.1}
                placeholder="70.0"
                className={ic('weight')}
                value={form.weight}
                onChange={(e) => patch('weight', e.target.value)}
              />
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
            <div className="flex gap-2">
              {(['male', 'female', 'diverse'] as const).map((g) => (
                <label
                  key={g}
                  className={`flex-1 flex items-center justify-center min-h-[44px] py-3 rounded-xl border text-sm
                    cursor-pointer transition-all select-none ${
                    form.gender === g
                      ? 'border-neon/60 bg-neon/10 text-neon font-semibold shadow-[0_0_14px_rgba(0,255,136,0.18)]'
                      : errors.gender
                      ? 'border-red-500/30 bg-red-950/20 text-white/40 hover:border-red-400/40'
                      : 'border-white/[0.08] bg-[#0d1018] text-white/45 hover:border-neon/25 hover:text-white/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={form.gender === g}
                    onChange={() => patch('gender', g)}
                    className="sr-only"
                  />
                  {t(`onboarding.gender.${g}`)}
                </label>
              ))}
            </div>
          </Field>

          <Field label={t('onboarding.fields.goal')} error={errors.goal}>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <label
                  key={g}
                  className={`flex items-center justify-center min-h-[44px] py-3 rounded-xl border text-sm
                    cursor-pointer transition-all select-none text-center ${
                    form.goal === g
                      ? 'border-neon/60 bg-neon/10 text-neon font-semibold shadow-[0_0_14px_rgba(0,255,136,0.18)]'
                      : errors.goal
                      ? 'border-red-500/30 bg-red-950/20 text-white/40 hover:border-red-400/40'
                      : 'border-white/[0.08] bg-[#0d1018] text-white/45 hover:border-neon/25 hover:text-white/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="goal"
                    value={g}
                    checked={form.goal === g}
                    onChange={() => patch('goal', g)}
                    className="sr-only"
                  />
                  {t(`onboarding.goal.${g}`)}
                </label>
              ))}
            </div>
          </Field>

          <Field label={t('onboarding.fields.bodyFat')} error={errors.bodyFat} optional>
            <input
              type="number"
              inputMode="numeric"
              min={5} max={60} step={1}
              placeholder={t('onboarding.placeholders.bodyFat')}
              className={ic('bodyFat') + ' max-w-[160px]'}
              value={form.bodyFat}
              onChange={(e) => patch('bodyFat', e.target.value)}
            />
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
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <NeonChevron />
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
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <NeonChevron />
              </div>
            </div>
          </Field>

          {/* Steps slider */}
          <Field label={t('onboarding.fields.steps')}>
            <div className="flex flex-col gap-3 pt-1">
              <div className="flex justify-between items-end">
                <span className="text-xs text-white/20">0</span>
                <div className="text-center">
                  <span className="text-2xl font-bold text-neon tabular-nums">
                    {form.steps.toLocaleString('de-DE')}
                  </span>
                  <span className="text-xs text-neon/50 ml-1.5">{t('onboarding.stepsUnit')}</span>
                </div>
                <span className="text-xs text-white/20">20k</span>
              </div>

              <input
                type="range"
                min={0}
                max={20000}
                step={1000}
                value={form.steps}
                onChange={(e) => patch('steps', Number(e.target.value))}
                className="w-full h-1.5 rounded-full cursor-pointer accent-neon"
                style={{
                  background: `linear-gradient(to right, #00ff88 ${stepsPercent}%, rgba(255,255,255,0.07) ${stepsPercent}%)`,
                }}
              />

              <div className="flex justify-between">
                {[0, 5000, 10000, 15000, 20000].map((v) => (
                  <span
                    key={v}
                    className={`text-[10px] transition-colors ${form.steps === v ? 'text-neon/60' : 'text-white/15'}`}
                  >
                    {v === 0 ? '0' : `${v / 1000}k`}
                  </span>
                ))}
              </div>
            </div>
          </Field>
        </Card>

        {/* ── Card 3: Health ── */}
        <Card title={t('onboarding.sections.health')}>
          <Field label={t('onboarding.fields.injuries')} optional>
            <textarea
              rows={3}
              placeholder={t('onboarding.placeholders.injuries')}
              className={inputBase + ' resize-none'}
              value={form.injuries}
              onChange={(e) => patch('injuries', e.target.value)}
            />
          </Field>

          <Field label={t('onboarding.fields.allergies')} optional>
            <textarea
              rows={3}
              placeholder={t('onboarding.placeholders.allergies')}
              className={inputBase + ' resize-none'}
              value={form.allergies}
              onChange={(e) => patch('allergies', e.target.value)}
            />
          </Field>
        </Card>

        {/* ── Submit ── */}
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl font-bold text-base text-[#0f1117]
            bg-neon shadow-neon hover:shadow-neon-lg
            active:scale-[0.98] transition-all duration-200 mt-2"
        >
          {t('onboarding.next')} →
        </button>

        <div className="h-8" />
      </div>
    </div>
  )
}
