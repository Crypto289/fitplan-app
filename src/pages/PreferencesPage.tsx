import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { generatePlan, MistralError } from '../services/mistralService'
import { usePlan } from '../context/PlanContext'
import type { ProfileData } from './OnboardingPage'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
type GymType = 'chain' | 'standard' | 'full'
type DietPref = 'everything' | 'vegetarian' | 'vegan' | 'lowcarb' | 'highprotein'
type Supplement = 'creatine' | 'protein' | 'ashwagandha' | 'shilajit' | 'vitamins' | 'magnesium' | 'none'
type MealsPerDay = '2' | '3' | '4-5'
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'fullbody'
type MealTemperature = 'warm' | 'cold' | 'mixed'

export interface PreferencesData {
  trainingDays: Day[]
  gymType: GymType | ''
  trainingDuration: number
  regionsMode: 'ai' | 'manual'
  trainingRegions: Partial<Record<Day, MuscleGroup[]>>
  nutritionBudget: number
  dietPreferences: DietPref[]
  dislikedIngredients: string
  supplements: Supplement[]
  mealsPerDay: MealsPerDay | ''
  mealTemperature: MealTemperature
}

interface FormErrors {
  trainingDays?: string
  gymType?: string
  dietPreferences?: string
  mealsPerDay?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const GYM_TYPES: GymType[] = ['chain', 'standard', 'full']
const DIET_PREFS: DietPref[] = ['everything', 'vegetarian', 'vegan', 'lowcarb', 'highprotein']
const SUPPLEMENTS: Supplement[] = ['creatine', 'protein', 'ashwagandha', 'shilajit', 'vitamins', 'magnesium', 'none']
const MEALS: MealsPerDay[] = ['2', '3', '4-5']
const MEAL_TEMPS: MealTemperature[] = ['warm', 'cold', 'mixed']
const MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'fullbody']

const INITIAL: PreferencesData = {
  trainingDays: [],
  gymType: '',
  trainingDuration: 60,
  regionsMode: 'ai',
  trainingRegions: {},
  nutritionBudget: 60,
  dietPreferences: [],
  dislikedIngredients: '',
  supplements: [],
  mealsPerDay: '',
  mealTemperature: 'mixed',
}

function validate(data: PreferencesData, t: (k: string) => string): FormErrors {
  const errors: FormErrors = {}
  if (data.trainingDays.length < 2) errors.trainingDays = t('preferences.errors.trainingDaysMin')
  if (!data.gymType) errors.gymType = t('preferences.errors.required')
  if (data.dietPreferences.length === 0) errors.dietPreferences = t('preferences.errors.dietRequired')
  if (!data.mealsPerDay) errors.mealsPerDay = t('preferences.errors.required')
  return errors
}

// ── Pill style helper ─────────────────────────────────────────────────────────

function pillCls(active: boolean, error?: boolean) {
  if (active) {
    return 'border-amber bg-amber/[0.15] text-amber font-semibold'
  }
  if (error) {
    return 'border-red-500/30 bg-red-950/15 text-fg-dim hover:text-fg'
  }
  return 'border-white/[0.06] bg-white/[0.02] text-fg-dim hover:bg-white/[0.04] hover:text-fg'
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400/90">{error}</p>}
    </div>
  )
}

function SliderField({
  label,
  min,
  max,
  step,
  value,
  unit,
  unitLabel,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  unit: string
  unitLabel?: string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-baseline">
        <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
          {label}
        </label>
        <span className="text-[26px] font-bold text-amber tracking-[-0.01em] tabular-nums leading-none">
          {value}
          <span className="text-[13px] font-medium text-fg-mute ml-1">{unitLabel ?? unit}</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/[0.05]">
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #b8701f, #e8922a, #f0a648)',
            boxShadow: '0 0 10px rgba(232,146,42,0.55)',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-amber-hi border-2 border-[#1a0e00] pointer-events-none"
          style={{
            left: `${pct}%`,
            boxShadow: '0 0 0 3px rgba(232,146,42,0.20), 0 4px 12px rgba(232,146,42,0.45)',
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] tracking-[0.12em] text-fg-mute">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PreferencesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { setPlan } = usePlan()
  const [form, setForm] = useState<PreferencesData>(INITIAL)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (apiError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [apiError])

  function patch<K extends keyof PreferencesData>(key: K, value: PreferencesData[K]) {
    const next = { ...form, [key]: value }
    setForm(next)
    if (submitted) setErrors(validate(next, t))
  }

  function toggleDay(day: Day) {
    const next = form.trainingDays.includes(day)
      ? form.trainingDays.filter((d) => d !== day)
      : [...form.trainingDays, day]
    patch('trainingDays', next)
  }

  function toggleDiet(pref: DietPref) {
    if (pref === 'everything') {
      patch('dietPreferences', ['everything'])
    } else {
      const without = form.dietPreferences.filter((d) => d !== 'everything')
      const next = without.includes(pref) ? without.filter((d) => d !== pref) : [...without, pref]
      patch('dietPreferences', next)
    }
  }

  function setRegionsMode(mode: 'ai' | 'manual') {
    const next: PreferencesData = {
      ...form,
      regionsMode: mode,
      trainingRegions: mode === 'ai' ? {} : form.trainingRegions,
    }
    setForm(next)
    if (submitted) setErrors(validate(next, t))
  }

  function toggleMuscle(day: Day, m: MuscleGroup) {
    const current = form.trainingRegions[day] ?? []
    let nextDay: MuscleGroup[]
    if (m === 'fullbody') {
      nextDay = current.includes('fullbody') ? [] : ['fullbody']
    } else {
      const without = current.filter((x) => x !== 'fullbody')
      nextDay = without.includes(m) ? without.filter((x) => x !== m) : [...without, m]
    }
    patch('trainingRegions', { ...form.trainingRegions, [day]: nextDay })
  }

  function toggleSupplement(s: Supplement) {
    if (s === 'none') {
      patch('supplements', form.supplements.includes('none') ? [] : ['none'])
    } else {
      const without = form.supplements.filter((x) => x !== 'none')
      const next = without.includes(s) ? without.filter((x) => x !== s) : [...without, s]
      patch('supplements', next)
    }
  }

  function toggleLang() {
    i18n.changeLanguage(i18n.language.startsWith('de') ? 'en' : 'de')
  }

  async function handleGenerate() {
    setSubmitted(true)
    const errs = validate(form, t)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      document.getElementById('pref-top')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    localStorage.setItem('fitplan_preferences', JSON.stringify(form))
    setLoading(true)
    setApiError(null)
    try {
      const stored = localStorage.getItem('fitplan_profile')
      if (!stored) {
        navigate('/onboarding')
        return
      }
      const profile = JSON.parse(stored) as ProfileData
      const lang = (i18n.language.startsWith('en') ? 'en' : 'de') as 'de' | 'en'
      const plan = await generatePlan(profile, form, lang)
      setPlan(plan, lang)
      navigate('/plan')
    } catch (err) {
      if (err instanceof MistralError) {
        setApiError(t(`errors.api.${err.code}`))
      } else {
        setApiError(t('errors.api.unknown'))
      }
    } finally {
      setLoading(false)
    }
  }

  const isDe = i18n.language.startsWith('de')

  return (
    <div className="relative min-h-screen text-fg" id="pref-top">
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
                {t('preferences.step', { step: 2, total: 2 })}
              </p>
              <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.02em] text-fg m-0">
                {t('preferences.title')}
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

          <div className="mt-4 h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #b8701f 0%, #e8922a 50%, #f0a648 100%)',
                boxShadow: '0 0 12px rgba(232,146,42,0.55)',
              }}
            />
          </div>
        </header>

        {/* ── Content ── */}
        <div className="px-7 mt-2 flex flex-col gap-3.5">

          {/* ── Card 1: Training ── */}
          <Card title={t('preferences.sections.training')}>

            {/* Trainingstage */}
            <Field label={t('preferences.fields.trainingDays')} error={errors.trainingDays}>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {DAYS.map((day) => {
                  const active = form.trainingDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`min-h-[44px] py-3 rounded-xl border text-[13px] font-semibold tracking-[0.08em] transition-all select-none ${pillCls(active, !!errors.trainingDays)}`}
                    >
                      {t(`preferences.days.${day}`)}
                    </button>
                  )
                })}
              </div>
            </Field>

            {/* Fitnessstudio-Typ */}
            <Field label={t('preferences.fields.gymType')} error={errors.gymType}>
              <div className="flex flex-col gap-2.5">
                {GYM_TYPES.map((g) => {
                  const active = form.gymType === g
                  return (
                    <label
                      key={g}
                      className={`flex items-start gap-3.5 px-4 py-4 rounded-2xl border cursor-pointer transition-all ${
                        active
                          ? 'border-amber bg-amber/[0.15]'
                          : errors.gymType
                          ? 'border-red-500/30 bg-red-950/15 hover:border-red-400/40'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span
                        className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 mt-0.5 grid place-items-center transition-all ${
                          active ? 'border-amber' : 'border-white/20'
                        }`}
                        style={active ? { boxShadow: '0 0 10px rgba(232,146,42,0.55)' } : undefined}
                      >
                        {active && <span className="block w-2 h-2 rounded-full bg-amber" />}
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-semibold text-fg">
                          {t(`preferences.gymType.${g}`)}
                        </span>
                        <span className="text-[12.5px] text-fg-mute leading-snug">
                          {t(`preferences.gymType.${g}Sub`)}
                        </span>
                      </span>
                      <input
                        type="radio"
                        name="gymType"
                        value={g}
                        checked={active}
                        onChange={() => patch('gymType', g)}
                        className="sr-only"
                      />
                    </label>
                  )
                })}
              </div>
            </Field>

            <SliderField
              label={t('preferences.fields.trainingDuration')}
              min={30}
              max={120}
              step={5}
              value={form.trainingDuration}
              unit={t('preferences.unit.min')}
              onChange={(v) => patch('trainingDuration', v)}
            />

            {/* Trainingsregionen pro Tag */}
            <Field label={t('preferences.fields.trainingRegions')}>
              <div className="flex gap-2">
                {(['ai', 'manual'] as const).map((mode) => {
                  const active = form.regionsMode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRegionsMode(mode)}
                      className={`flex-1 min-h-[44px] py-3 rounded-full border text-sm font-semibold transition-all select-none ${pillCls(active)}`}
                    >
                      {t(`preferences.regions.${mode === 'ai' ? 'aiDecides' : 'manualToggle'}`)}
                    </button>
                  )
                })}
              </div>

              {form.regionsMode === 'ai' ? (
                <p className="text-xs text-fg-mute leading-relaxed mt-2">
                  {t('preferences.regions.aiHint')}
                </p>
              ) : form.trainingDays.length === 0 ? null : (
                <div className="flex flex-col gap-3 mt-3">
                  {form.trainingDays.map((day) => {
                    const selected = form.trainingRegions[day] ?? []
                    return (
                      <div key={day} className="flex flex-col gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber">
                          {t(`preferences.days.${day}`)}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {MUSCLES.map((m) => {
                            const active = selected.includes(m)
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => toggleMuscle(day, m)}
                                className={`px-3.5 py-2.5 min-h-[40px] rounded-full border text-xs font-medium transition-all select-none ${pillCls(active)}`}
                              >
                                {t(`preferences.muscle.${m}`)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Field>
          </Card>

          {/* ── Card 2: Nutrition ── */}
          <Card title={t('preferences.sections.nutrition')}>

            <SliderField
              label={t('preferences.fields.nutritionBudget')}
              min={20}
              max={150}
              step={5}
              value={form.nutritionBudget}
              unit="€"
              unitLabel={t('preferences.unit.eurWeek')}
              onChange={(v) => patch('nutritionBudget', v)}
            />

            {/* Essenspräferenzen */}
            <Field label={t('preferences.fields.dietPreferences')} error={errors.dietPreferences}>
              <div className="flex flex-wrap gap-2">
                {DIET_PREFS.map((pref) => {
                  const active = form.dietPreferences.includes(pref)
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => toggleDiet(pref)}
                      className={`inline-flex items-center gap-2 px-4 min-h-[40px] py-2.5 rounded-full border text-[13px] transition-all select-none ${pillCls(active, !!errors.dietPreferences)}`}
                    >
                      {active && <span className="text-[10px]">✓</span>}
                      {t(`preferences.diet.${pref}`)}
                    </button>
                  )
                })}
              </div>
            </Field>

            {/* Unbeliebte Zutaten */}
            <Field label={t('preferences.fields.dislikedIngredients')}>
              <textarea
                rows={2}
                placeholder={t('preferences.placeholders.dislikedIngredients')}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm text-fg placeholder:text-fg-mute/70 focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all resize-none"
                value={form.dislikedIngredients}
                onChange={(e) => patch('dislikedIngredients', e.target.value)}
              />
            </Field>

            {/* Mahlzeiten pro Tag */}
            <Field label={t('preferences.fields.mealsPerDay')} error={errors.mealsPerDay}>
              <div className="flex gap-2">
                {MEALS.map((m) => {
                  const active = form.mealsPerDay === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => patch('mealsPerDay', m)}
                      className={`flex-1 min-h-[44px] py-3 rounded-full border text-sm font-semibold transition-all select-none ${pillCls(active, !!errors.mealsPerDay)}`}
                    >
                      {t(`preferences.meals.${m}`)}
                    </button>
                  )
                })}
              </div>
            </Field>

            {/* Mahlzeiten-Temperatur */}
            <Field label={t('preferences.fields.mealTemperature')}>
              <div className="flex flex-col gap-2.5">
                {MEAL_TEMPS.map((temp) => {
                  const active = form.mealTemperature === temp
                  return (
                    <label
                      key={temp}
                      className={`flex items-start gap-3.5 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all ${
                        active
                          ? 'border-amber bg-amber/[0.15]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span
                        className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 mt-0.5 grid place-items-center transition-all ${
                          active ? 'border-amber' : 'border-white/20'
                        }`}
                        style={active ? { boxShadow: '0 0 10px rgba(232,146,42,0.55)' } : undefined}
                      >
                        {active && <span className="block w-2 h-2 rounded-full bg-amber" />}
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-semibold text-fg">
                          {t(`preferences.mealTemp.${temp}`)}
                        </span>
                        <span className="text-[12.5px] text-fg-mute leading-snug">
                          {t(`preferences.mealTemp.${temp}Hint`)}
                        </span>
                      </span>
                      <input
                        type="radio"
                        name="mealTemperature"
                        value={temp}
                        checked={active}
                        onChange={() => patch('mealTemperature', temp)}
                        className="sr-only"
                      />
                    </label>
                  )
                })}
              </div>
            </Field>
          </Card>

          {/* ── Card 3: Supplements ── */}
          <Card title={t('preferences.sections.supplements')}>
            <Field label={t('preferences.fields.supplements')}>
              <div className="flex flex-wrap gap-2">
                {SUPPLEMENTS.map((s) => {
                  const active = form.supplements.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSupplement(s)}
                      className={`inline-flex items-center gap-2 px-4 min-h-[40px] py-2.5 rounded-full border text-[13px] transition-all select-none ${pillCls(active)}`}
                    >
                      {active && <span className="text-[10px]">✓</span>}
                      {t(`preferences.supplement.${s}`)}
                    </button>
                  )
                })}
              </div>
            </Field>
          </Card>

          {/* API error */}
          {apiError && (
            <div
              ref={errorRef}
              className="mt-1 bg-red-950/40 border border-red-500/40 rounded-2xl px-4 py-4 flex items-start gap-3"
            >
              <span className="text-red-400 text-lg flex-shrink-0 leading-none mt-0.5">✕</span>
              <p className="text-sm text-red-300 leading-relaxed flex-1">{apiError}</p>
              <button
                onClick={() => setApiError(null)}
                className="text-red-400/50 hover:text-red-300 transition-colors flex-shrink-0 text-lg leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* ── Bottom bar ── */}
        <div className="fixed bottom-0 inset-x-0 z-30 max-w-[720px] mx-auto px-7 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-bg via-bg/95 to-transparent backdrop-blur-md flex gap-3">
          <button
            onClick={() => navigate('/onboarding')}
            disabled={loading}
            className="px-5 py-4 min-h-[52px] rounded-2xl bg-bg-card border border-amber/[0.15] text-fg font-semibold text-[15px] transition-all hover:bg-bg-elev hover:border-amber/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← {t('preferences.back')}
          </button>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 py-4 min-h-[52px] rounded-2xl font-semibold text-[15px] text-[#1a0e00]
              transition-all duration-200 active:translate-y-0 hover:-translate-y-px
              disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0
              flex items-center justify-center gap-2.5"
            style={{
              background: 'linear-gradient(180deg, #f0a648 0%, #e8922a 100%)',
              boxShadow: '0 0 20px rgba(232,146,42,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            {loading ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-[#1a0e00]/30 animate-spin"
                  style={{ borderTopColor: '#1a0e00' }}
                />
                {t('preferences.generating')}
              </>
            ) : (
              t('preferences.generate')
            )}
          </button>
        </div>
      </div>

      {/* ── Full-screen loading overlay ── */}
      {loading && (
        <div className="fixed inset-0 bg-bg/85 backdrop-blur-lg z-50 flex flex-col items-center justify-center gap-8 px-6">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-2 border-amber/[0.07]" />
            <div
              className="absolute inset-0 rounded-full border-[3px] border-transparent animate-spin"
              style={{ borderTopColor: '#e8922a', animationDuration: '1s' }}
            />
            <div
              className="absolute inset-4 rounded-full border-[3px] border-transparent animate-spin"
              style={{
                borderTopColor: 'rgba(232,146,42,0.4)',
                animationDuration: '1.6s',
                animationDirection: 'reverse',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-2 h-2 rounded-full bg-amber"
                style={{ boxShadow: '0 0 10px rgba(232,146,42,0.8)' }}
              />
            </div>
          </div>
          <div className="text-center max-w-xs">
            <p className="text-amber font-bold text-xl tracking-wide mb-2">
              {t('preferences.generatingTitle')}
            </p>
            <p className="text-fg-dim text-sm leading-relaxed">
              {t('preferences.generatingHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
