import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlan } from '../context/PlanContext'
import { exportPDF } from '../utils/exportPDF'
import type { FitnessPlan, Mahlzeit } from '../services/mistralService'
import ShoppingListModal from '../components/ShoppingListModal'
import NotesSection from '../components/NotesSection'

// ── StatPill ──────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  unit,
}: {
  label: string
  value: string | number
  unit?: string
}) {
  return (
    <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl px-3 py-3 text-center overflow-hidden">
      <div className="text-[9px] sm:text-[9.5px] font-semibold uppercase tracking-[0.22em] text-fg-mute mb-1.5">
        {label}
      </div>
      <div className="text-[17px] sm:text-[22px] font-bold tracking-[-0.01em] tabular-nums text-fg leading-tight break-words">
        {value}
        {unit && (
          <span className="text-[10px] sm:text-[11px] font-medium text-fg-mute ml-0.5 tracking-[0.04em]">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

// ── NoteInput ─────────────────────────────────────────────────────────────────

function NoteInput({
  noteKey,
  notes,
  setNotes,
  placeholder,
}: {
  noteKey: string
  notes: Record<string, string>
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>
  placeholder: string
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={notes[noteKey] ?? ''}
      onChange={(e) => setNotes((prev) => ({ ...prev, [noteKey]: e.target.value }))}
      className="w-full bg-transparent border-b border-white/[0.07] text-xs text-fg-dim placeholder:text-fg-mute py-2 focus:outline-none focus:border-amber/60 transition-colors"
    />
  )
}

// ── MealCard ──────────────────────────────────────────────────────────────────

function MealCard({ meal, label, idx }: { meal: Mahlzeit; label: string; idx: number }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const hasSteps = (meal.zubereitung?.length ?? 0) > 0
  const panelId = `recipe-panel-${idx}`

  return (
    <article className="bg-bg-card rounded-[22px] border border-amber/[0.15] px-5 py-5 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-amber">
          {label}
        </span>
        <span className="text-xs font-medium tabular-nums text-fg-dim">
          {meal.kalorien} kcal
        </span>
      </div>
      <h3 className="text-[17px] font-bold tracking-[-0.01em] text-fg m-0">{meal.name}</h3>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {meal.zutaten.map((z, i) => (
          <span
            key={i}
            className="text-xs bg-white/[0.025] border border-white/[0.06] px-2.5 py-1 rounded-full text-fg-dim"
          >
            {z}
          </span>
        ))}
      </div>

      {hasSteps && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="mt-3 inline-flex items-center justify-center gap-2 self-start px-3.5 py-2 min-h-[36px] rounded-full border border-amber/[0.15] bg-amber/[0.06] text-amber text-xs font-semibold tracking-[0.06em] transition-colors hover:bg-amber/[0.10]"
          >
            <span>{open ? t('plan.recipe.collapse') : t('plan.recipe.expand')}</span>
            <svg
              viewBox="0 0 12 12"
              className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>

          <div
            id={panelId}
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
            aria-hidden={!open}
          >
            <div className="overflow-hidden min-h-0">
              <div className="pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-mute m-0 mb-2">
                  {t('plan.recipe.steps')}
                </p>
                <ol className="flex flex-col gap-2 m-0 p-0 list-none">
                  {(meal.zubereitung ?? []).map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-fg-dim leading-relaxed">
                      <span className="text-amber font-semibold tabular-nums w-5 flex-shrink-0 mt-0.5">
                        {i + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </>
      )}
    </article>
  )
}

// ── Macro card ────────────────────────────────────────────────────────────────

type MacroKey = 'cal' | 'pro' | 'carb' | 'fat'

const MACRO_STYLE: Record<MacroKey, { color: string; barFrom: string; barTo: string; glow: string }> = {
  cal: { color: '#e8922a', barFrom: '#b8701f', barTo: '#f0a648', glow: '0 0 10px rgba(232,146,42,0.55)' },
  pro: { color: '#6aa9ff', barFrom: '#4a85d9', barTo: '#6aa9ff', glow: '0 0 8px rgba(106,169,255,0.35)' },
  carb: { color: '#d4b450', barFrom: '#b89640', barTo: '#d4b450', glow: '0 0 8px rgba(212,180,80,0.35)' },
  fat: { color: '#d96a3a', barFrom: '#b04e22', barTo: '#d96a3a', glow: '0 0 8px rgba(217,106,58,0.35)' },
}

function MacroCard({
  kind,
  label,
  value,
  unit,
  isDe,
}: {
  kind: MacroKey
  label: string
  value: number
  unit: string
  isDe: boolean
}) {
  const s = MACRO_STYLE[kind]
  const borderClr = kind === 'cal' ? 'rgba(232,146,42,0.30)' : 'rgba(232,146,42,0.15)'
  return (
    <div
      className="bg-bg-card rounded-[18px] p-5 border"
      style={{ borderColor: borderClr }}
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-fg-mute mb-2.5">
        {label}
      </div>
      <div>
        <span
          className="text-[42px] font-bold tracking-[-0.03em] tabular-nums leading-none"
          style={{ color: s.color }}
        >
          {value.toLocaleString(isDe ? 'de-DE' : 'en-US')}
        </span>
        <span className="text-xs font-medium text-fg-mute ml-1.5 tracking-[0.06em]">{unit}</span>
      </div>
    </div>
  )
}

// ── TrainingSection ───────────────────────────────────────────────────────────

function TrainingSection({
  plan,
  notes,
  setNotes,
}: {
  plan: FitnessPlan
  notes: Record<string, string>
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) {
  const { t } = useTranslation()
  const [dayIdx, setDayIdx] = useState(0)
  const days = plan.trainingsplan
  const day = days[dayIdx]

  if (!day) {
    return <p className="text-fg-mute text-sm text-center py-16">{t('plan.noData')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 px-7 -mx-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDayIdx(i)}
            className={`flex-shrink-0 px-4 py-2.5 min-h-[40px] rounded-full border text-[13px] font-medium transition-all ${
              dayIdx === i
                ? 'border-amber bg-amber/[0.15] text-amber'
                : 'border-white/[0.06] bg-white/[0.02] text-fg-dim hover:text-fg'
            }`}
          >
            {d.tag}
          </button>
        ))}
      </div>

      {/* Focus row */}
      <div className="flex items-baseline gap-3 flex-wrap mt-3 mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber">
          ▸ {day.focus}
        </span>
        <span className="text-xs text-fg-mute tracking-[0.06em]">
          · {day.uebungen.length} {t('plan.training.exercises')}
        </span>
      </div>

      {/* Exercise cards */}
      {day.uebungen.map((ex, exIdx) => (
        <article
          key={exIdx}
          className="relative bg-bg-card rounded-[22px] border border-amber/[0.15] p-5 flex flex-col gap-4"
        >
          {/* Number badge */}
          <span
            className="absolute top-[18px] right-[18px] bg-amber/10 border border-amber/30 text-amber text-[11px] font-bold tracking-[0.12em] tabular-nums px-2.5 py-1 rounded-lg"
          >
            {String(exIdx + 1).padStart(2, '0')} / {String(day.uebungen.length).padStart(2, '0')}
          </span>

          <div className="flex flex-col gap-1 pr-16">
            <h3 className="text-[19px] font-bold tracking-[-0.01em] text-fg m-0">{ex.name}</h3>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber">
              {ex.maschine}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatPill label={t('plan.training.sets')} value={String(ex.sets)} />
            <StatPill label={t('plan.training.reps')} value={ex.wiederholungen} />
            <StatPill label={t('plan.training.pause')} value={ex.pause} />
          </div>

          {ex.beschreibung && (
            <p className="text-[13px] text-fg-dim leading-relaxed m-0">{ex.beschreibung}</p>
          )}

          <NoteInput
            noteKey={`note-${dayIdx}-${exIdx}`}
            notes={notes}
            setNotes={setNotes}
            placeholder={t('plan.training.notePlaceholder')}
          />
        </article>
      ))}
    </div>
  )
}

// ── NutritionSection ──────────────────────────────────────────────────────────

function NutritionSection({
  plan,
  isDe,
  onOpenShoppingList,
}: {
  plan: FitnessPlan
  isDe: boolean
  onOpenShoppingList: () => void
}) {
  const { t } = useTranslation()
  const [dayIdx, setDayIdx] = useState(0)
  const np = plan.ernaehrungsplan
  const days = np.wochentage
  const day = days[dayIdx]

  return (
    <div className="flex flex-col gap-4">
      {/* Shopping list trigger */}
      <button
        type="button"
        onClick={onOpenShoppingList}
        className="self-start inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-full border border-amber/30 bg-amber/[0.08] text-amber text-[13px] font-semibold transition-colors hover:bg-amber/[0.14]"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 4h2l2.5 11h11l2-8H6" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
        {t('plan.shoppingList.button')}
      </button>

      {/* Macro grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <MacroCard kind="cal" label={t('plan.nutrition.calories')} value={np.kalorien_ziel} unit="kcal" isDe={isDe} />
        <MacroCard kind="pro" label={t('plan.nutrition.protein')} value={np.protein_g} unit="g" isDe={isDe} />
        <MacroCard kind="carb" label={t('plan.nutrition.carbs')} value={np.kohlenhydrate_g} unit="g" isDe={isDe} />
        <MacroCard kind="fat" label={t('plan.nutrition.fat')} value={np.fett_g} unit="g" isDe={isDe} />
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 px-7 -mx-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDayIdx(i)}
            className={`flex-shrink-0 px-4 py-2.5 min-h-[40px] rounded-full border text-[13px] font-medium transition-all ${
              dayIdx === i
                ? 'border-amber bg-amber/[0.15] text-amber'
                : 'border-white/[0.06] bg-white/[0.02] text-fg-dim hover:text-fg'
            }`}
          >
            {d.tag}
          </button>
        ))}
      </div>

      {/* Meals */}
      {day ? (
        <div className="flex flex-col gap-2.5">
          {day.mahlzeiten.map((meal, i) => (
            <MealCard key={`${dayIdx}-${i}`} idx={dayIdx * 100 + i} meal={meal} label={meal.typ} />
          ))}
        </div>
      ) : (
        <p className="text-fg-mute text-sm text-center py-12">{t('plan.noData')}</p>
      )}
    </div>
  )
}

// ── SupplementSection ─────────────────────────────────────────────────────────

function SupplementSection({ plan }: { plan: FitnessPlan }) {
  const { t } = useTranslation()
  const items = plan.supplement_timing ?? []

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-full border border-amber/[0.15] flex items-center justify-center">
          <span className="text-fg-mute text-2xl select-none">∅</span>
        </div>
        <p className="text-fg-mute text-sm">{t('plan.supplements.none')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <article
          key={i}
          className="bg-bg-card rounded-[22px] border border-amber/[0.15] px-5 py-5 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-amber/[0.15] border border-amber/30 grid place-items-center text-amber font-bold flex-shrink-0">
            {item.supplement.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-fg m-0 min-w-0 truncate">{item.supplement}</h3>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-amber flex-shrink-0 whitespace-nowrap">
                {item.zeitpunkt}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 mt-0.5">
              <span className="text-xs text-fg-mute">{item.menge}</span>
              {item.hinweis && (
                <span className="text-xs text-fg-mute/80">· {item.hinweis}</span>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Section = 'training' | 'nutrition' | 'supplements' | 'notes'
const SECTIONS: Section[] = ['training', 'nutrition', 'supplements', 'notes']

export default function PlanPage() {
  const { plan, planLang } = usePlan()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('training')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [pdfLoading, setPdfLoading] = useState(false)
  const [shoppingOpen, setShoppingOpen] = useState(false)

  async function handleExportPDF() {
    if (!plan) return
    setPdfLoading(true)
    try {
      const lang = (i18n.language.startsWith('en') ? 'en' : 'de') as 'de' | 'en'
      await exportPDF(plan, lang)
    } finally {
      setPdfLoading(false)
    }
  }

  function toggleLang() {
    i18n.changeLanguage(i18n.language.startsWith('de') ? 'en' : 'de')
  }

  const isDe = i18n.language.startsWith('de')
  const currentLang = isDe ? 'de' : 'en'
  const langMismatch = planLang !== null && planLang !== currentLang

  if (!plan) {
    return (
      <div className="relative min-h-screen text-fg flex flex-col items-center justify-center gap-5 px-4">
        <div className="bg-stage" aria-hidden>
          <div className="blob b1" />
          <div className="blob b2" />
        </div>
        <p className="relative z-10 text-fg-mute text-sm">{t('plan.noPlan')}</p>
        <button
          onClick={() => navigate('/onboarding')}
          className="relative z-10 px-6 py-3 rounded-2xl text-[#1a0e00] font-semibold text-sm transition-all hover:-translate-y-px"
          style={{
            background: 'linear-gradient(180deg, #f0a648 0%, #e8922a 100%)',
            boxShadow: '0 0 20px rgba(232,146,42,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          {t('plan.goToStart')}
        </button>
      </div>
    )
  }

  const kcalTarget = plan.ernaehrungsplan?.kalorien_ziel ?? 0
  const trainingDayCount = plan.trainingsplan?.length ?? 0

  return (
    <div className="relative min-h-screen text-fg">
      <div className="bg-stage" aria-hidden>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      <div className="relative z-10 max-w-[720px] mx-auto pb-36">

        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-30 px-7 pt-7 pb-4 bg-gradient-to-b from-bg/95 via-bg/90 to-transparent backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber mb-2">
                {t('plan.subtitle')}
              </p>
              <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.02em] text-fg m-0">
                {t('plan.title')}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
              <button
                onClick={() => navigate('/profiles')}
                aria-label={t('profiles.switchProfile')}
                title={t('profiles.switchProfile')}
                className="w-10 h-10 rounded-full bg-bg-card border border-amber/[0.15] text-fg-dim hover:text-amber hover:border-amber/30 grid place-items-center transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M7 7h13M16 3l4 4-4 4" />
                  <path d="M17 17H4M8 21l-4-4 4-4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Header stat badges */}
          <div className="flex gap-2 mt-3.5 flex-wrap">
            <span className="inline-flex items-center gap-2 bg-bg-card border border-amber/[0.15] rounded-full pl-3 pr-3.5 py-1.5 text-xs text-fg-dim">
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber"
                style={{ boxShadow: '0 0 8px rgba(232,146,42,0.6)' }}
              />
              <span className="text-fg font-semibold tabular-nums">
                {kcalTarget.toLocaleString(isDe ? 'de-DE' : 'en-US')}
              </span>
              <span className="text-fg-mute tracking-[0.04em]">{t('plan.headerBadges.kcalDay')}</span>
            </span>
            <span className="inline-flex items-center gap-2 bg-bg-card border border-amber/[0.15] rounded-full pl-3 pr-3.5 py-1.5 text-xs text-fg-dim">
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber"
                style={{ boxShadow: '0 0 8px rgba(232,146,42,0.6)' }}
              />
              <span className="text-fg font-semibold tabular-nums">{trainingDayCount}×</span>
              <span className="text-fg-mute tracking-[0.04em]">{t('plan.headerBadges.trainingWeek')}</span>
            </span>
          </div>
        </header>

        {/* ── Underline tabs ── */}
        <div className="flex gap-1 mt-2 border-b border-white/[0.06] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-7 -mx-7">
          {SECTIONS.map((s) => {
            const active = section === s
            return (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`relative flex-shrink-0 sm:flex-1 min-w-max min-h-[44px] py-3.5 px-3 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.13em] sm:tracking-[0.18em] transition-colors ${
                  active ? 'text-amber' : 'text-fg-mute hover:text-fg-dim'
                }`}
              >
                {t(`plan.sections.${s}`)}
                {active && (
                  <span
                    className="absolute left-[12%] right-[12%] -bottom-[1px] h-[2px] rounded-sm bg-amber"
                    style={{ boxShadow: '0 0 12px rgba(232,146,42,0.65)' }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Lang mismatch banner ── */}
        {langMismatch && (
          <div className="px-7 pt-4">
            <div className="flex items-start gap-3 bg-amber/[0.08] border border-amber/30 rounded-xl px-4 py-3">
              <span className="text-amber text-base flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-xs text-fg-dim leading-relaxed">{t('plan.langMismatch')}</p>
            </div>
          </div>
        )}

        {/* ── Scrollable content ── */}
        <div className="px-7 mt-4 flex flex-col gap-3">
          {section === 'training' && (
            <TrainingSection plan={plan} notes={notes} setNotes={setNotes} />
          )}
          {section === 'nutrition' && (
            <NutritionSection
              plan={plan}
              isDe={isDe}
              onOpenShoppingList={() => setShoppingOpen(true)}
            />
          )}
          {section === 'supplements' && <SupplementSection plan={plan} />}
          {section === 'notes' && <NotesSection lang={isDe ? 'de' : 'en'} />}

          {/* General tips */}
          {section !== 'notes' && (plan.allgemeine_tipps?.length ?? 0) > 0 && (
            <div className="mt-4 bg-bg-card rounded-[22px] border border-amber/[0.15] p-5 flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fg-mute m-0">
                {t('plan.tips')}
              </h3>
              <ul className="flex flex-col gap-3 m-0 p-0 list-none">
                {plan.allgemeine_tipps.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-fg-dim leading-relaxed"
                  >
                    <span className="text-amber font-semibold mt-0.5 flex-shrink-0 tabular-nums w-4">
                      {i + 1}.
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed bottom actions ── */}
      <div className="fixed bottom-0 inset-x-0 z-30 max-w-[720px] mx-auto px-7 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-bg via-bg/95 to-transparent backdrop-blur-md flex gap-3">
        <button
          onClick={() => navigate('/preferences')}
          className="flex-1 py-4 min-h-[52px] rounded-2xl bg-bg-card border border-amber/[0.15] text-fg font-semibold text-sm transition-all hover:bg-bg-elev hover:border-amber/30"
        >
          ↻ {t('plan.actions.regenerate')}
        </button>
        <button
          onClick={handleExportPDF}
          disabled={pdfLoading}
          className="flex-1 py-4 min-h-[52px] rounded-2xl font-semibold text-sm text-[#1a0e00]
            transition-all duration-200 hover:-translate-y-px
            disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0
            flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(180deg, #f0a648 0%, #e8922a 100%)',
            boxShadow: '0 0 20px rgba(232,146,42,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          {pdfLoading ? (
            <>
              <span
                className="w-3.5 h-3.5 rounded-full border-2 border-[#1a0e00]/30 animate-spin"
                style={{ borderTopColor: '#1a0e00' }}
              />
              {t('plan.actions.pdfExporting')}
            </>
          ) : (
            <>↓ {t('plan.actions.savePdf')}</>
          )}
        </button>
      </div>

      {shoppingOpen && (
        <ShoppingListModal
          plan={plan}
          lang={isDe ? 'de' : 'en'}
          onClose={() => setShoppingOpen(false)}
        />
      )}
    </div>
  )
}
