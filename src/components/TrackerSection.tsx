import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  loadEntries,
  newEntry,
  persistEntries,
  TRACKER_CHART_POINTS,
  TRACKER_NOTE_MAX,
  type TrackerEntry,
} from '../utils/trackerStore'

const WEIGHT_COLOR = '#e8922a'
const BODYFAT_COLOR = '#6aa9ff'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, { dateStyle: 'medium' })
  } catch {
    return iso.slice(0, 10)
  }
}

function parseNum(s: string): number | undefined {
  const v = Number(s.replace(',', '.'))
  return Number.isFinite(v) && v > 0 ? v : undefined
}

// ── SparklineChart ────────────────────────────────────────────────────────────

function SparklineChart({ entries }: { entries: TrackerEntry[] }) {
  const { t } = useTranslation()
  const W = 320
  const H = 140
  const padX = 16
  const padY = 18

  const slice = entries.slice(-TRACKER_CHART_POINTS)
  const xs = slice.map((_, i) =>
    slice.length === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (slice.length - 1),
  )

  function project(values: Array<number | undefined>): Array<{ x: number; y: number } | null> {
    const defined = values.filter((v): v is number => typeof v === 'number')
    if (defined.length === 0) return values.map(() => null)
    const min = Math.min(...defined)
    const max = Math.max(...defined)
    const span = max - min || 1
    const pad = span * 0.1
    const lo = min - pad
    const hi = max + pad
    return values.map((v, i) =>
      typeof v === 'number'
        ? { x: xs[i], y: H - padY - ((v - lo) / (hi - lo)) * (H - padY * 2) }
        : null,
    )
  }

  const weightPts = project(slice.map((e) => e.weight))
  const fatPts = project(slice.map((e) => e.bodyFat))

  const hasWeight = weightPts.some((p) => p !== null)
  const hasFat = fatPts.some((p) => p !== null)

  function lineFrom(pts: Array<{ x: number; y: number } | null>): string {
    let d = ''
    let started = false
    for (const p of pts) {
      if (!p) {
        started = false
        continue
      }
      d += started ? ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      started = true
    }
    return d
  }

  return (
    <div className="bg-bg-card rounded-[22px] border border-amber/[0.15] p-4 flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        aria-hidden
      >
        {hasWeight && (
          <>
            <path
              d={lineFrom(weightPts)}
              fill="none"
              stroke={WEIGHT_COLOR}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {weightPts.map((p, i) =>
              p ? <circle key={`w${i}`} cx={p.x} cy={p.y} r="3" fill={WEIGHT_COLOR} /> : null,
            )}
          </>
        )}
        {hasFat && (
          <>
            <path
              d={lineFrom(fatPts)}
              fill="none"
              stroke={BODYFAT_COLOR}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {fatPts.map((p, i) =>
              p ? <circle key={`f${i}`} cx={p.x} cy={p.y} r="3" fill={BODYFAT_COLOR} /> : null,
            )}
          </>
        )}
      </svg>
      <div className="flex gap-4 flex-wrap text-xs text-fg-dim">
        {hasWeight && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: WEIGHT_COLOR }} />
            {t('plan.tracker.chartLegendWeight')}
          </span>
        )}
        {hasFat && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: BODYFAT_COLOR }} />
            {t('plan.tracker.chartLegendBodyFat')}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function TrackerSection({
  profileId,
  locale,
}: {
  profileId: string
  locale: string
}) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<TrackerEntry[]>(() => loadEntries(profileId))
  const [date, setDate] = useState<string>(todayISO())
  const [weight, setWeight] = useState<string>('')
  const [bodyFat, setBodyFat] = useState<string>('')
  const [note, setNote] = useState<string>('')

  useEffect(() => {
    setEntries(loadEntries(profileId))
  }, [profileId])

  const sortedAsc = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  )
  const sortedDesc = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  )

  const w = parseNum(weight)
  const f = parseNum(bodyFat)
  const canAdd = w !== undefined || f !== undefined

  function handleAdd() {
    if (!canAdd) return
    const e = newEntry({
      date: new Date(`${date}T12:00:00`).toISOString(),
      weight: w,
      bodyFat: f,
      note: note.trim() || undefined,
    })
    const next = [...entries, e]
    setEntries(next)
    persistEntries(profileId, next)
    setWeight('')
    setBodyFat('')
    setNote('')
  }

  function handleDelete(id: string) {
    const next = entries.filter((e) => e.id !== id)
    setEntries(next)
    persistEntries(profileId, next)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-fg m-0">
          {t('plan.tracker.title')}
        </h2>
        <p className="text-xs text-fg-mute leading-relaxed m-0">{t('plan.tracker.intro')}</p>
      </div>

      {/* Input card */}
      <div className="bg-bg-card rounded-[22px] border border-amber/[0.15] p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
            {t('plan.tracker.date')}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm text-fg focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
              {t('plan.tracker.weight')}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="20"
              max="300"
              placeholder="—"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-base font-semibold tabular-nums text-fg placeholder:text-fg-mute/70 focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
              {t('plan.tracker.bodyFat')}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="3"
              max="60"
              placeholder="—"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-base font-semibold tabular-nums text-fg placeholder:text-fg-mute/70 focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute flex items-center justify-between">
            <span>{t('plan.tracker.note')}</span>
            <span className="text-fg-mute/70 tracking-normal normal-case">
              {t('plan.tracker.charsLeft', { n: note.length })}
            </span>
          </label>
          <input
            type="text"
            maxLength={TRACKER_NOTE_MAX}
            placeholder={t('plan.tracker.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm text-fg placeholder:text-fg-mute/70 focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all"
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="w-full py-3.5 min-h-[48px] rounded-2xl font-semibold text-sm text-[#1a0e00] transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
          style={{
            background: 'linear-gradient(180deg, #f0a648 0%, #e8922a 100%)',
            boxShadow: '0 0 20px rgba(232,146,42,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          + {t('plan.tracker.addEntry')}
        </button>
      </div>

      {/* Chart */}
      {sortedAsc.length >= 2 && <SparklineChart entries={sortedAsc} />}

      {/* List */}
      {sortedDesc.length === 0 ? (
        <div className="bg-white/[0.02] rounded-[22px] border-2 border-dashed border-amber/30 px-5 py-10 grid place-items-center text-center">
          <p className="text-fg-mute text-sm max-w-[280px]">{t('plan.tracker.empty')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedDesc.map((e) => (
            <article
              key={e.id}
              className="bg-bg-card rounded-[18px] border border-amber/[0.15] px-4 py-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber">
                  {formatDate(e.date, locale)}
                </span>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[15px] font-semibold tabular-nums text-fg">
                  {typeof e.weight === 'number' && (
                    <span>
                      <span style={{ color: WEIGHT_COLOR }}>●</span> {e.weight.toFixed(1)} kg
                    </span>
                  )}
                  {typeof e.bodyFat === 'number' && (
                    <span>
                      <span style={{ color: BODYFAT_COLOR }}>●</span> {e.bodyFat.toFixed(1)} %
                    </span>
                  )}
                </div>
                {e.note && (
                  <p className="text-xs text-fg-dim leading-relaxed m-0 mt-0.5 break-words">
                    {e.note}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(e.id)}
                aria-label={t('plan.tracker.delete')}
                className="w-9 h-9 min-w-[36px] rounded-full bg-bg-elev border border-amber/[0.15] text-fg-mute hover:text-red-400 hover:border-red-400/40 grid place-items-center flex-shrink-0 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                </svg>
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
