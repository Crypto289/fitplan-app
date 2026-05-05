import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlan } from '../context/PlanContext'
import { exportPDF } from '../utils/exportPDF'
import type { FitnessPlan, Mahlzeit } from '../services/mistralService'

// ── StatPill ──────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center bg-[#0d1018] rounded-xl px-3 py-2.5 flex-1 border border-white/[0.05]">
      <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-white mt-0.5 tabular-nums">{value}</span>
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
      className="w-full bg-transparent border-b border-white/[0.07] text-xs text-white/55 placeholder:text-white/20 py-2 focus:outline-none focus:border-neon/40 transition-colors"
    />
  )
}

// ── MealCard ──────────────────────────────────────────────────────────────────

function MealCard({ meal, label }: { meal: Mahlzeit; label: string }) {
  return (
    <div className="bg-[#0d1018] rounded-xl border border-white/[0.06] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-neon/55 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-white/30">{meal.kalorien} kcal</span>
      </div>
      <p className="text-sm font-semibold text-white">{meal.name}</p>
      <ul className="flex flex-col gap-1.5">
        {meal.zutaten.map((z, i) => (
          <li key={i} className="text-xs text-white/40 flex items-center gap-2.5">
            <span className="w-1 h-1 rounded-full bg-neon/35 flex-shrink-0" />
            {z}
          </li>
        ))}
      </ul>
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
    return <p className="text-white/25 text-sm text-center py-16">{t('plan.noData')}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDayIdx(i)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              dayIdx === i
                ? 'border-neon/60 bg-neon/10 text-neon shadow-[0_0_14px_rgba(0,255,136,0.18)]'
                : 'border-white/[0.07] bg-[#0d1018] text-white/40 hover:border-neon/20 hover:text-white/70'
            }`}
          >
            {d.tag}
          </button>
        ))}
      </div>

      {/* Focus divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-neon/[0.12]" />
        <span className="text-[10px] font-bold text-neon/50 uppercase tracking-[0.18em] px-2">
          {day.focus}
        </span>
        <div className="h-px flex-1 bg-neon/[0.12]" />
      </div>

      {/* Exercise cards */}
      {day.uebungen.map((ex, exIdx) => (
        <div
          key={exIdx}
          className="bg-[#1a1d27] rounded-2xl border border-neon/[0.08] p-4 sm:p-5 flex flex-col gap-4 shadow-card"
        >
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-white">{ex.name}</p>
            <span className="text-xs text-neon/50 font-medium">{ex.maschine}</span>
          </div>

          <div className="flex gap-2">
            <StatPill label={t('plan.training.sets')} value={String(ex.sets)} />
            <StatPill label={t('plan.training.reps')} value={ex.wiederholungen} />
            <StatPill label={t('plan.training.pause')} value={ex.pause} />
          </div>

          {ex.beschreibung && (
            <p className="text-xs text-white/38 leading-relaxed">{ex.beschreibung}</p>
          )}

          <NoteInput
            noteKey={`note-${dayIdx}-${exIdx}`}
            notes={notes}
            setNotes={setNotes}
            placeholder={t('plan.training.notePlaceholder')}
          />
        </div>
      ))}
    </div>
  )
}

// ── NutritionSection ──────────────────────────────────────────────────────────

function NutritionSection({ plan }: { plan: FitnessPlan }) {
  const { t } = useTranslation()
  const [dayIdx, setDayIdx] = useState(0)
  const np = plan.ernaehrungsplan
  const days = np.wochentage
  const day = days[dayIdx]

  const macros = [
    { label: t('plan.nutrition.calories'), value: np.kalorien_ziel, unit: 'kcal', cls: 'text-neon' },
    { label: t('plan.nutrition.protein'), value: np.protein_g, unit: 'g', cls: 'text-blue-400' },
    { label: t('plan.nutrition.carbs'), value: np.kohlenhydrate_g, unit: 'g', cls: 'text-amber-400' },
    { label: t('plan.nutrition.fat'), value: np.fett_g, unit: 'g', cls: 'text-orange-400' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Macro grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {macros.map(({ label, value, unit, cls }) => (
          <div key={label} className="bg-[#1a1d27] rounded-xl border border-white/[0.06] p-4 text-center">
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${cls}`}>
              {value}
              <span className="text-xs font-normal ml-1 opacity-55">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDayIdx(i)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              dayIdx === i
                ? 'border-neon/60 bg-neon/10 text-neon shadow-[0_0_14px_rgba(0,255,136,0.18)]'
                : 'border-white/[0.07] bg-[#0d1018] text-white/40 hover:border-neon/20 hover:text-white/70'
            }`}
          >
            {d.tag}
          </button>
        ))}
      </div>

      {/* Meals */}
      {day ? (
        <div className="flex flex-col gap-3">
          {day.mahlzeiten.map((meal, i) => (
            <MealCard key={i} meal={meal} label={meal.typ} />
          ))}
        </div>
      ) : (
        <p className="text-white/25 text-sm text-center py-12">{t('plan.noData')}</p>
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
        <div className="w-14 h-14 rounded-full border border-white/[0.07] flex items-center justify-center">
          <span className="text-white/15 text-2xl select-none">∅</span>
        </div>
        <p className="text-white/25 text-sm">{t('plan.supplements.none')}</p>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1d27] rounded-2xl border border-neon/[0.08] overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {(['supplement', 'timing', 'amount', 'note'] as const).map((col) => (
                <th
                  key={col}
                  className="text-left text-[10px] font-bold text-neon/45 uppercase tracking-[0.16em] px-4 py-3 whitespace-nowrap"
                >
                  {t(`plan.supplements.${col}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={i}
                className={i < items.length - 1 ? 'border-b border-white/[0.04]' : ''}
              >
                <td className="px-4 py-4 font-semibold text-white whitespace-nowrap">
                  {item.supplement}
                </td>
                <td className="px-4 py-4 text-white/55">{item.zeitpunkt}</td>
                <td className="px-4 py-4 font-mono text-neon/75 whitespace-nowrap">{item.menge}</td>
                <td className="px-4 py-4 text-xs text-white/38 leading-relaxed">{item.hinweis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Section = 'training' | 'nutrition' | 'supplements'
const SECTIONS: Section[] = ['training', 'nutrition', 'supplements']

export default function PlanPage() {
  const { plan, planLang } = usePlan()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('training')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [pdfLoading, setPdfLoading] = useState(false)

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

  const currentLang = i18n.language.startsWith('en') ? 'en' : 'de'
  const langMismatch = planLang !== null && planLang !== currentLang

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center gap-5">
        <p className="text-white/30 text-sm">{t('plan.noPlan')}</p>
        <button
          onClick={() => navigate('/onboarding')}
          className="px-6 py-3 rounded-xl bg-neon text-[#0f1117] font-bold text-sm shadow-neon hover:shadow-neon-lg transition-all"
        >
          {t('plan.goToStart')}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] overflow-x-hidden">

      {/* ── Sticky header ── */}
      <div className="bg-[#0f1117]/95 backdrop-blur-md border-b border-neon/[0.08] px-4 pt-10 pb-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold text-neon tracking-[0.25em] uppercase mb-1.5">
              {t('plan.subtitle')}
            </p>
            <h1 className="text-2xl font-bold text-white">{t('plan.title')}</h1>
          </div>
          <button
            onClick={toggleLang}
            className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-xs font-mono font-bold text-white/40 hover:border-neon/30 hover:text-neon/70 transition-all"
          >
            {i18n.language.startsWith('de') ? 'EN' : 'DE'}
          </button>
        </div>
      </div>

      {/* ── Section tabs ── */}
      <div className="bg-[#0f1117]/95 backdrop-blur-md px-4 py-3 sticky top-[88px] z-10 border-b border-neon/[0.04]">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-1 bg-[#1a1d27] rounded-xl p-1 border border-white/[0.04]">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`flex-1 flex items-center justify-center min-h-[44px] py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-wider transition-all ${
                  section === s
                    ? 'bg-neon text-[#0f1117] shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                    : 'text-white/30 hover:text-white/55'
                }`}
              >
                {t(`plan.sections.${s}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lang mismatch banner ── */}
      {langMismatch && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-500/30 rounded-xl px-4 py-3">
            <span className="text-amber-400 text-base flex-shrink-0 mt-0.5">⚠</span>
            <p className="text-xs text-amber-300/80 leading-relaxed">{t('plan.langMismatch')}</p>
          </div>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div className="max-w-2xl mx-auto px-4 py-5 pb-36">
        {section === 'training' && (
          <TrainingSection plan={plan} notes={notes} setNotes={setNotes} />
        )}
        {section === 'nutrition' && <NutritionSection plan={plan} />}
        {section === 'supplements' && <SupplementSection plan={plan} />}

        {/* General tips — always shown at bottom */}
        {(plan.allgemeine_tipps?.length ?? 0) > 0 && (
          <div className="mt-6 bg-[#1a1d27] rounded-2xl border border-neon/[0.08] p-5 flex flex-col gap-4 shadow-card">
            <h3 className="text-[10px] font-bold text-neon uppercase tracking-[0.2em]">
              {t('plan.tips')}
            </h3>
            <ul className="flex flex-col gap-3">
              {plan.allgemeine_tipps.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-white/55 leading-relaxed"
                >
                  <span className="text-neon font-bold mt-0.5 flex-shrink-0 tabular-nums w-4">
                    {i + 1}.
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Fixed bottom actions ── */}
      <div className="fixed bottom-0 inset-x-0 bg-[#0f1117]/95 backdrop-blur-md border-t border-neon/[0.08] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={() => navigate('/preferences')}
            className="flex-1 py-3.5 rounded-xl border border-white/[0.08] text-white/45 hover:border-neon/25 hover:text-neon/65 font-semibold text-sm transition-all"
          >
            {t('plan.actions.regenerate')}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={pdfLoading}
            className="flex-1 py-3.5 rounded-xl font-bold text-sm text-[#0f1117]
              bg-neon shadow-neon hover:shadow-neon-lg active:scale-[0.98]
              transition-all duration-200 flex items-center justify-center gap-2
              disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {pdfLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#0f1117]/30 border-t-[#0f1117] rounded-full animate-spin" />
                {t('plan.actions.pdfExporting')}
              </>
            ) : (
              t('plan.actions.savePdf')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
