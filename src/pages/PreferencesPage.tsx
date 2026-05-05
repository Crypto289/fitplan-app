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

// ── Design helpers ────────────────────────────────────────────────────────────

function pillBase(active: boolean, error?: boolean) {
  if (active) {
    return 'border-neon/60 bg-neon/10 text-neon font-semibold shadow-[0_0_12px_rgba(0,255,136,0.18)]'
  }
  if (error) {
    return 'border-red-500/30 bg-red-950/20 text-white/45 hover:border-red-400/40'
  }
  return 'border-white/[0.08] bg-[#0d1018] text-white/50 hover:border-neon/25 hover:text-white/75'
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-white/55">{label}</label>
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
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-medium text-white/55">{label}</label>
        <span className="text-xl font-bold text-neon tabular-nums">
          {value}
          <span className="text-xs font-normal text-neon/50 ml-1">{unitLabel ?? unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full cursor-pointer accent-neon"
        style={{
          background: `linear-gradient(to right, #00ff88 ${pct}%, rgba(255,255,255,0.07) ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-white/20">
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

  return (
    <div className="min-h-screen bg-[#0f1117] overflow-x-hidden" id="pref-top">

      {/* ── Sticky Header ── */}
      <div className="bg-[#0f1117]/95 backdrop-blur-md border-b border-neon/[0.08] px-4 pt-8 pb-4 sm:pt-10 sm:pb-5 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-neon tracking-[0.25em] uppercase mb-1.5">
                {t('preferences.step', { step: 2, total: 2 })}
              </p>
              <h1 className="text-2xl font-bold text-white">{t('preferences.title')}</h1>
            </div>
            <button
              onClick={toggleLang}
              className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-xs font-mono font-bold text-white/40 hover:border-neon/30 hover:text-neon/70 transition-all"
            >
              {i18n.language.startsWith('de') ? 'EN' : 'DE'}
            </button>
          </div>
          <div className="mt-4 flex gap-2 items-center">
            <div className="h-[3px] rounded-full bg-neon/40 flex-1" />
            <div className="h-[3px] rounded-full bg-neon flex-1 shadow-[0_0_10px_rgba(0,255,136,0.7)]" />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

        {/* ── Card 1: Training ── */}
        <Card title={t('preferences.sections.training')}>

          {/* Trainingstage */}
          <Field label={t('preferences.fields.trainingDays')} error={errors.trainingDays}>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-1.5">
              {DAYS.map((day) => {
                const active = form.trainingDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`min-h-[44px] py-2.5 rounded-xl border text-xs font-semibold transition-all select-none ${pillBase(active, !!errors.trainingDays)}`}
                  >
                    {t(`preferences.days.${day}`)}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Fitnessstudio-Typ */}
          <Field label={t('preferences.fields.gymType')} error={errors.gymType}>
            <div className="flex flex-col gap-2">
              {GYM_TYPES.map((g) => {
                const active = form.gymType === g
                return (
                  <label
                    key={g}
                    className={`flex items-center gap-3 sm:gap-3.5 p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                      active
                        ? 'border-neon/55 bg-neon/[0.08] shadow-[0_0_16px_rgba(0,255,136,0.14)]'
                        : errors.gymType
                        ? 'border-red-500/30 bg-red-950/15 hover:border-red-400/40'
                        : 'border-white/[0.07] bg-[#0d1018] hover:border-neon/20'
                    }`}
                  >
                    {/* Custom radio dot */}
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      active ? 'border-neon' : 'border-white/20'
                    }`}>
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-neon shadow-[0_0_6px_rgba(0,255,136,0.8)]" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold transition-colors ${active ? 'text-neon' : 'text-white/70'}`}>
                        {t(`preferences.gymType.${g}`)}
                      </p>
                      <p className="text-xs text-white/30 mt-0.5">
                        {t(`preferences.gymType.${g}Sub`)}
                      </p>
                    </div>
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

          {/* Trainingszeit */}
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
                    className={`flex-1 min-h-[44px] py-2.5 rounded-xl border text-sm font-semibold transition-all select-none ${pillBase(active)}`}
                  >
                    {t(`preferences.regions.${mode === 'ai' ? 'aiDecides' : 'manualToggle'}`)}
                  </button>
                )
              })}
            </div>

            {form.regionsMode === 'ai' ? (
              <p className="text-xs text-white/30 leading-relaxed mt-2">
                {t('preferences.regions.aiHint')}
              </p>
            ) : form.trainingDays.length === 0 ? null : (
              <div className="flex flex-col gap-3 mt-3">
                {form.trainingDays.map((day) => {
                  const selected = form.trainingRegions[day] ?? []
                  return (
                    <div key={day} className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-neon/60 uppercase tracking-wider">
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
                              className={`px-3 py-2.5 min-h-[44px] rounded-lg border text-xs transition-all select-none ${pillBase(active)}`}
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

          {/* Ernährungsbudget */}
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
                    className={`px-4 min-h-[44px] py-2.5 rounded-xl border text-sm transition-all select-none ${pillBase(active, !!errors.dietPreferences)}`}
                  >
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
              className="w-full rounded-xl border border-white/[0.08] bg-[#0d1018] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-neon/50 focus:ring-2 focus:ring-neon/10 transition-all resize-none"
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
                    className={`flex-1 min-h-[44px] py-3 rounded-xl border text-sm font-semibold transition-all select-none ${pillBase(active, !!errors.mealsPerDay)}`}
                  >
                    {t(`preferences.meals.${m}`)}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Mahlzeiten-Temperatur */}
          <Field label={t('preferences.fields.mealTemperature')}>
            <div className="flex flex-col gap-2">
              {MEAL_TEMPS.map((temp) => {
                const active = form.mealTemperature === temp
                return (
                  <label
                    key={temp}
                    className={`flex items-center gap-3 p-3 sm:gap-3.5 sm:p-3.5 rounded-xl border cursor-pointer transition-all ${
                      active
                        ? 'border-neon/55 bg-neon/[0.08] shadow-[0_0_16px_rgba(0,255,136,0.14)]'
                        : 'border-white/[0.07] bg-[#0d1018] hover:border-neon/20'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      active ? 'border-neon' : 'border-white/20'
                    }`}>
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-neon shadow-[0_0_6px_rgba(0,255,136,0.8)]" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold transition-colors ${active ? 'text-neon' : 'text-white/70'}`}>
                        {t(`preferences.mealTemp.${temp}`)}
                      </p>
                      <p className="text-xs text-white/30 mt-0.5">
                        {t(`preferences.mealTemp.${temp}Hint`)}
                      </p>
                    </div>
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
                    className={`px-4 min-h-[44px] py-2.5 rounded-xl border text-sm transition-all select-none ${pillBase(active)}`}
                  >
                    {t(`preferences.supplement.${s}`)}
                  </button>
                )
              })}
            </div>
          </Field>
        </Card>

        {/* ── Buttons ── */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => navigate('/onboarding')}
            disabled={loading}
            className="px-6 py-4 rounded-xl border border-white/10 text-white/50
              hover:border-neon/25 hover:text-white/80 font-semibold text-sm
              transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('preferences.back')}
          </button>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 py-4 rounded-xl font-bold text-base text-[#0f1117]
              bg-neon shadow-neon hover:shadow-neon-lg
              active:scale-[0.98] transition-all duration-200
              disabled:opacity-80 disabled:cursor-not-allowed disabled:active:scale-100
              flex items-center justify-center gap-2.5"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-[#0f1117]/30 border-t-[#0f1117] rounded-full animate-spin" />
                {t('preferences.generating')}
              </>
            ) : (
              t('preferences.generate')
            )}
          </button>
        </div>

        {/* API error */}
        {apiError && (
          <div
            ref={errorRef}
            className="mt-3 bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-4 flex items-start gap-3"
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

        <div className="h-8" />
      </div>

      {/* ── Full-screen loading overlay ── */}
      {loading && (
        <div className="fixed inset-0 bg-[#0f1117]/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-8 px-6">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-2 border-neon/[0.07]" />
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-neon animate-spin" style={{ animationDuration: '1s' }} />
            <div className="absolute inset-4 rounded-full border-[3px] border-transparent border-t-neon/40 animate-spin" style={{ animationDuration: '1.6s', animationDirection: 'reverse' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-neon shadow-[0_0_10px_rgba(0,255,136,0.8)]" />
            </div>
          </div>
          <div className="text-center max-w-xs">
            <p className="text-neon font-bold text-xl tracking-wide mb-2">
              {t('preferences.generatingTitle')}
            </p>
            <p className="text-white/40 text-sm leading-relaxed">
              {t('preferences.generatingHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
