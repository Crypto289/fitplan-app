import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'fitplan_notes'
const MAX_CHARS = 1000

interface ProgressNote {
  id: string
  createdAt: string
  text: string
}

function loadNotes(): ProgressNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((n): n is ProgressNote =>
        n && typeof n.id === 'string' && typeof n.createdAt === 'string' && typeof n.text === 'string')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    return []
  }
}

function persistNotes(notes: ProgressNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

interface Props {
  lang: 'de' | 'en'
}

export default function NotesSection({ lang }: Props) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState<ProgressNote[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setNotes(loadNotes())
  }, [])

  function handleAdd() {
    const text = draft.trim()
    if (!text) return
    const note: ProgressNote = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      text,
    }
    const next = [note, ...notes]
    setNotes(next)
    persistNotes(next)
    setDraft('')
  }

  function handleDelete(id: string) {
    const next = notes.filter((n) => n.id !== id)
    setNotes(next)
    persistNotes(next)
  }

  const charsLeft = MAX_CHARS - draft.length
  const locale = lang === 'de' ? 'de-DE' : 'en-US'

  return (
    <div className="flex flex-col gap-4">
      {/* Editor */}
      <section className="bg-bg-card rounded-[22px] border border-amber/[0.15] p-5 sm:p-6 flex flex-col gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fg-mute m-0 mb-1.5">
            {t('plan.notes.title')}
          </h2>
          <p className="text-[12.5px] text-fg-mute leading-relaxed m-0">
            {t('plan.notes.intro')}
          </p>
        </div>
        <textarea
          rows={4}
          maxLength={MAX_CHARS}
          placeholder={t('plan.notes.placeholder')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm text-fg placeholder:text-fg-mute/70 focus:outline-none focus:border-amber focus:bg-amber/[0.15] focus:ring-[3px] focus:ring-amber/[0.12] transition-all resize-none"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-fg-mute tabular-nums">
            {t('plan.notes.charsLeft', { n: charsLeft })}
          </span>
          <button
            onClick={handleAdd}
            disabled={draft.trim().length === 0}
            className="px-5 py-3 min-h-[44px] rounded-2xl font-semibold text-sm text-[#1a0e00] transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{
              background: 'linear-gradient(180deg, #f0a648 0%, #e8922a 100%)',
              boxShadow: '0 0 20px rgba(232,146,42,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            + {t('plan.notes.add')}
          </button>
        </div>
      </section>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-full border border-amber/[0.15] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-fg-mute" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M9 13h6M9 17h4" />
            </svg>
          </div>
          <p className="text-fg-mute text-sm text-center max-w-[260px]">{t('plan.notes.empty')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <article
              key={n.id}
              className="bg-bg-card rounded-[22px] border border-amber/[0.15] p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber">
                  {new Date(n.createdAt).toLocaleDateString(locale, { dateStyle: 'long' })}
                </span>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="w-8 h-8 rounded-full border border-amber/[0.15] text-fg-mute hover:text-red-400 hover:border-red-400/40 grid place-items-center text-base flex-shrink-0 transition-colors"
                  aria-label={t('plan.notes.delete')}
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-fg-dim leading-relaxed whitespace-pre-wrap m-0 break-words">
                {n.text}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
