import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  appendEntry,
  getLog,
  loadLogs,
  type ExerciseLog,
  type ExerciseLogEntry,
} from '../utils/exerciseLogStore'

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parsePos(s: string): number | undefined {
  const v = Number(s.replace(',', '.'))
  return Number.isFinite(v) && v > 0 ? v : undefined
}

type Trend =
  | { kind: 'up' | 'down' | 'same'; deltaText: string }
  | null

function computeTrend(entries: ExerciseLogEntry[]): Trend {
  if (entries.length < 2) return null
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const last = sorted[sorted.length - 1].weight
  const prev = sorted[sorted.length - 2].weight
  const delta = last - prev
  const abs = Math.abs(delta).toFixed(1).replace(/\.0$/, '')
  if (delta > 0) return { kind: 'up', deltaText: `+${abs}` }
  if (delta < 0) return { kind: 'down', deltaText: `−${abs}` }
  return { kind: 'same', deltaText: '0' }
}

export default function ExerciseWeightLog({
  profileId,
  exerciseName,
}: {
  profileId: string
  exerciseName: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<ExerciseLog[]>(() => loadLogs(profileId))
  const [date, setDate] = useState<string>(todayISO())
  const [weight, setWeight] = useState<string>('')
  const [reps, setReps] = useState<string>('')

  useEffect(() => {
    setLogs(loadLogs(profileId))
  }, [profileId])

  const log = useMemo(() => getLog(logs, exerciseName), [logs, exerciseName])
  const entries = log?.entries ?? []
  const trend = useMemo(() => computeTrend(entries), [entries])
  const last5 = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [entries],
  )

  const w = parsePos(weight)
  const r = reps.trim() ? parsePos(reps) : undefined
  const canSave = w !== undefined && (reps.trim() === '' || r !== undefined)

  function handleSave() {
    if (!canSave || w === undefined) return
    const entry: ExerciseLogEntry = { date, weight: w }
    if (r !== undefined) entry.reps = Math.round(r)
    const next = appendEntry(profileId, exerciseName, entry)
    setLogs(next)
    setWeight('')
    setReps('')
  }

  const trendCls =
    trend?.kind === 'up'
      ? 'text-amber bg-amber/[0.15] border-amber/30'
      : trend?.kind === 'down'
      ? 'text-red-400 bg-red-950/30 border-red-500/30'
      : 'text-fg-dim bg-white/[0.04] border-white/[0.08]'

  const trendArrow =
    trend?.kind === 'up' ? '↑' : trend?.kind === 'down' ? '↓' : '→'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 self-start px-3.5 py-2 min-h-[36px] rounded-full border border-amber/[0.15] bg-amber/[0.06] text-amber text-xs font-semibold tracking-[0.06em] transition-colors hover:bg-amber/[0.10]"
        >
          <span>{open ? t('plan.exerciseLog.hideToggle') : `+ ${t('plan.exerciseLog.addToggle')}`}</span>
          <svg
            viewBox="0 0 12 12"
            className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold tabular-nums ${trendCls}`}
          >
            {trendArrow} {trend.deltaText} kg
          </span>
        )}
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
        aria-hidden={!open}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pt-3 flex flex-col gap-3">
            {/* Inputs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
                  {t('plan.exerciseLog.date')}
                </label>
                <input
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-fg focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
                  {t('plan.exerciseLog.weight')}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  placeholder="—"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm font-semibold tabular-nums text-fg placeholder:text-fg-mute/70 focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
                {t('plan.exerciseLog.reps')}
              </label>
              <input
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                placeholder="—"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm font-semibold tabular-nums text-fg placeholder:text-fg-mute/70 focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="w-full py-2.5 min-h-[40px] rounded-xl font-semibold text-xs text-[#1a0e00] tracking-[0.06em] transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{
                background: 'linear-gradient(180deg, #f0a648 0%, #e8922a 100%)',
                boxShadow: '0 0 16px rgba(232,146,42,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              {t('plan.exerciseLog.save')}
            </button>

            {/* History */}
            {last5.length === 0 ? (
              <p className="text-[11px] text-fg-mute text-center py-2 m-0">
                {t('plan.exerciseLog.empty')}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute m-0">
                  {t('plan.exerciseLog.history')}
                </p>
                <ul className="flex flex-col gap-1 m-0 p-0 list-none">
                  {last5.map((e, i) => (
                    <li
                      key={`${e.date}-${i}`}
                      className="bg-white/[0.025] border border-white/[0.06] rounded-xl px-3 py-2 text-xs tabular-nums text-fg-dim flex items-center justify-between gap-3"
                    >
                      <span className="text-fg-mute">{e.date}</span>
                      <span className="text-fg font-semibold">
                        {e.weight.toFixed(1).replace(/\.0$/, '')} kg
                        {typeof e.reps === 'number' && (
                          <span className="text-fg-mute font-normal"> × {e.reps}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
