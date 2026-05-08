import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TrainingDay } from '../services/mistralService'
import {
  DIARY_NOTE_MAX,
  loadDiary,
  newDiaryEntry,
  persistDiary,
  weekStats,
  type DiaryEntry,
  type DiaryRating,
} from '../utils/diaryStore'

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { dateStyle: 'medium' })
  } catch {
    return iso
  }
}

function shortDayLabel(tag: string): string {
  const first = tag.trim().split(/\s+/)[0] ?? tag
  return first.slice(0, 2)
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function StarRow({
  value,
  onSelect,
  size = 'lg',
}: {
  value: number
  onSelect?: (v: DiaryRating) => void
  size?: 'sm' | 'lg'
}) {
  const dim = size === 'lg' ? 'w-7 h-7' : 'w-4 h-4'
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= value
        const cls = active ? 'text-amber' : 'text-fg-mute/40'
        return onSelect ? (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i as DiaryRating)}
            aria-label={String(i)}
            aria-pressed={active}
            className={`${cls} hover:scale-110 transition-transform`}
          >
            <svg viewBox="0 0 24 24" className={dim} fill="currentColor" aria-hidden>
              <path d="M12 2.5l2.95 6.18 6.8.66-5.1 4.6 1.5 6.66L12 17.27 5.85 20.6l1.5-6.66-5.1-4.6 6.8-.66L12 2.5z" />
            </svg>
          </button>
        ) : (
          <span key={i} className={cls} aria-hidden>
            <svg viewBox="0 0 24 24" className={dim} fill="currentColor">
              <path d="M12 2.5l2.95 6.18 6.8.66-5.1 4.6 1.5 6.66L12 17.27 5.85 20.6l1.5-6.66-5.1-4.6 6.8-.66L12 2.5z" />
            </svg>
          </span>
        )
      })}
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function DiarySection({
  profileId,
  locale,
  trainingDays,
}: {
  profileId: string
  locale: string
  trainingDays: TrainingDay[]
}) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<DiaryEntry[]>(() => loadDiary(profileId))
  const [date, setDate] = useState<string>(todayISO())
  const [trainingDay, setTrainingDay] = useState<string>(trainingDays[0]?.tag ?? '')
  const [rating, setRating] = useState<DiaryRating>(5)
  const [completed, setCompleted] = useState<boolean>(true)
  const [note, setNote] = useState<string>('')

  useEffect(() => {
    setEntries(loadDiary(profileId))
  }, [profileId])

  useEffect(() => {
    if (!trainingDay && trainingDays.length > 0) setTrainingDay(trainingDays[0].tag)
  }, [trainingDays, trainingDay])

  const stats = useMemo(
    () => weekStats(entries, trainingDays.length),
    [entries, trainingDays.length],
  )

  const sortedDesc = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  )

  const canSave = !!trainingDay

  function handleSave() {
    if (!canSave) return
    const e = newDiaryEntry({
      date,
      trainingDay,
      rating,
      completed,
      note: note.trim().slice(0, DIARY_NOTE_MAX),
    })
    const next = [...entries, e]
    setEntries(next)
    persistDiary(profileId, next)
    setNote('')
    setRating(5)
    setCompleted(true)
  }

  function handleDelete(id: string) {
    const next = entries.filter((e) => e.id !== id)
    setEntries(next)
    persistDiary(profileId, next)
  }

  const progress =
    stats.planned > 0 ? Math.min(stats.done / stats.planned, 1) * 100 : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-fg m-0">
          {t('plan.diary.title')}
        </h2>
        <p className="text-xs text-fg-mute leading-relaxed m-0">{t('plan.diary.intro')}</p>
      </div>

      {/* Week stats */}
      <div className="bg-bg-card rounded-[22px] border border-amber/[0.15] p-5 flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <span className="text-[32px] font-bold tracking-[-0.02em] tabular-nums text-amber leading-none">
            {stats.done}
            <span className="text-fg-mute font-medium">/{stats.planned}</span>
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fg-mute">
              {t('plan.diary.weekStats')}
            </span>
            <span className="text-xs text-fg-dim">
              {t('plan.diary.weekStatsCaption', { done: stats.done, planned: stats.planned })}
            </span>
          </div>
        </div>
        {stats.planned > 0 && (
          <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #b8701f 0%, #e8922a 50%, #f0a648 100%)',
                boxShadow: '0 0 10px rgba(232,146,42,0.45)',
              }}
            />
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-bg-card rounded-[22px] border border-amber/[0.15] p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
            {t('plan.diary.date')}
          </label>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm text-fg focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
            {t('plan.diary.trainingDay')}
          </label>
          {trainingDays.length === 0 ? (
            <p className="text-xs text-fg-mute">—</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {trainingDays.map((d, i) => {
                const active = trainingDay === d.tag
                return (
                  <button
                    key={`${d.tag}-${i}`}
                    type="button"
                    onClick={() => setTrainingDay(d.tag)}
                    className={`px-3.5 py-2 min-h-[36px] rounded-full border text-[13px] font-medium transition-all select-none ${
                      active
                        ? 'border-amber bg-amber/[0.15] text-amber'
                        : 'border-white/[0.06] bg-white/[0.02] text-fg-dim hover:text-fg'
                    }`}
                  >
                    <span className="sm:hidden">{shortDayLabel(d.tag)}</span>
                    <span className="hidden sm:inline">{d.tag}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
            {t('plan.diary.rating')}
          </label>
          <StarRow value={rating} onSelect={setRating} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute">
            {t('plan.diary.completed')}
          </label>
          <div className="flex gap-2">
            {[
              { v: true, label: t('plan.diary.completedYes') },
              { v: false, label: t('plan.diary.completedNo') },
            ].map((opt) => {
              const active = completed === opt.v
              return (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setCompleted(opt.v)}
                  className={`flex-1 min-h-[44px] py-3 rounded-full border text-sm font-semibold transition-all select-none ${
                    active
                      ? 'border-amber bg-amber/[0.15] text-amber'
                      : 'border-white/[0.06] bg-white/[0.02] text-fg-dim hover:text-fg'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-mute flex items-center justify-between">
            <span>{t('plan.diary.note')}</span>
            <span className="text-fg-mute/70 tracking-normal normal-case">
              {t('plan.diary.charsLeft', { n: note.length })}
            </span>
          </label>
          <textarea
            rows={3}
            maxLength={DIARY_NOTE_MAX}
            placeholder={t('plan.diary.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm text-fg placeholder:text-fg-mute/70 focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all resize-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3.5 min-h-[48px] rounded-2xl font-semibold text-sm text-[#1a0e00] transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
          style={{
            background: 'linear-gradient(180deg, #f0a648 0%, #e8922a 100%)',
            boxShadow: '0 0 20px rgba(232,146,42,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          {t('plan.diary.save')}
        </button>
      </div>

      {/* List */}
      {sortedDesc.length === 0 ? (
        <div className="bg-white/[0.02] rounded-[22px] border-2 border-dashed border-amber/30 px-5 py-10 grid place-items-center text-center">
          <p className="text-fg-mute text-sm max-w-[280px]">{t('plan.diary.empty')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedDesc.map((e) => {
            const tagCls = e.completed
              ? 'border-amber/30 bg-amber/[0.10] text-amber'
              : 'border-red-500/30 bg-red-950/30 text-red-400'
            return (
              <article
                key={e.id}
                className="bg-bg-card rounded-[18px] border border-amber/[0.15] px-4 py-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber">
                      {formatDate(e.date, locale)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.18em] rounded-full border px-2 py-0.5 ${tagCls}`}
                    >
                      {e.completed ? t('plan.diary.completedTag') : t('plan.diary.abortedTag')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[14px] font-semibold text-fg">{e.trainingDay}</span>
                    <StarRow value={e.rating} size="sm" />
                  </div>
                  {e.note && (
                    <p className="text-xs text-fg-dim leading-relaxed m-0 break-words">{e.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(e.id)}
                  aria-label={t('plan.diary.delete')}
                  className="w-9 h-9 min-w-[36px] rounded-full bg-bg-elev border border-amber/[0.15] text-fg-mute hover:text-red-400 hover:border-red-400/40 grid place-items-center flex-shrink-0 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                  </svg>
                </button>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
