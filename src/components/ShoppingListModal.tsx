import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FitnessPlan } from '../services/mistralService'
import { aggregateIngredients, CATEGORY_ORDER, type IngredientCategory } from '../utils/aggregateIngredients'
import { exportShoppingList } from '../utils/exportPDF'

const CHECKED_KEY = 'fitplan_shopping_checked'

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function persistChecked(set: Set<string>) {
  localStorage.setItem(CHECKED_KEY, JSON.stringify([...set]))
}

interface Props {
  plan: FitnessPlan
  lang: 'de' | 'en'
  onClose: () => void
}

export default function ShoppingListModal({ plan, lang, onClose }: Props) {
  const { t } = useTranslation()
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked())
  const [pdfLoading, setPdfLoading] = useState(false)

  const grouped = useMemo(() => aggregateIngredients(plan), [plan])
  const totalCount = CATEGORY_ORDER.reduce((sum, c) => sum + grouped[c].length, 0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  function toggle(key: string) {
    const next = new Set(checked)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setChecked(next)
    persistChecked(next)
  }

  async function handleSavePdf() {
    setPdfLoading(true)
    try {
      await exportShoppingList(plan, lang)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-lg flex items-stretch sm:items-center justify-center sm:px-6 sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shopping-title"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-[640px] sm:rounded-[22px] bg-bg-card border border-amber/[0.15] flex flex-col max-h-screen sm:max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-amber/[0.15]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber mb-1.5">
              {t('plan.shoppingList.subtitle')}
            </p>
            <h2 id="shopping-title" className="text-[26px] font-bold tracking-[-0.02em] text-fg m-0 leading-tight">
              {t('plan.shoppingList.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] rounded-full bg-bg-elev border border-amber/[0.15] text-fg-dim hover:text-fg hover:border-amber/30 grid place-items-center text-lg flex-shrink-0"
            aria-label={t('plan.shoppingList.close')}
          >
            ×
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {totalCount === 0 ? (
            <p className="text-fg-mute text-sm text-center py-12">
              {t('plan.shoppingList.empty')}
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {CATEGORY_ORDER.map((cat) => {
                const items = grouped[cat]
                if (items.length === 0) return null
                return (
                  <section key={cat} className="flex flex-col gap-2.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber m-0">
                      {t(`plan.shoppingList.categories.${cat satisfies IngredientCategory}`)}
                    </h3>
                    <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
                      {items.map((item) => {
                        const key = `${item.category}|${item.name.toLowerCase()}|${item.unit}`
                        const isChecked = checked.has(key)
                        return (
                          <li key={key}>
                            <label
                              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer select-none transition-colors ${
                                isChecked
                                  ? 'border-amber/30 bg-amber/[0.06]'
                                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isChecked}
                                onChange={() => toggle(key)}
                              />
                              <span
                                className={`w-[18px] h-[18px] rounded-md border-2 flex-shrink-0 grid place-items-center transition-all ${
                                  isChecked ? 'border-amber bg-amber/[0.15]' : 'border-white/20'
                                }`}
                              >
                                {isChecked && (
                                  <svg viewBox="0 0 12 12" className="w-3 h-3 text-amber" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2.5 6.5L5 9l4.5-5.5" />
                                  </svg>
                                )}
                              </span>
                              <span
                                className={`text-sm flex-1 ${
                                  isChecked ? 'text-fg-mute line-through' : 'text-fg'
                                }`}
                              >
                                {item.display}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-amber/[0.15] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3 bg-bg-card">
          <button
            onClick={onClose}
            className="px-5 py-3.5 min-h-[48px] rounded-2xl bg-bg-elev border border-amber/[0.15] text-fg font-semibold text-sm transition-all hover:border-amber/30"
          >
            {t('plan.shoppingList.close')}
          </button>
          <button
            onClick={handleSavePdf}
            disabled={pdfLoading || totalCount === 0}
            className="flex-1 py-3.5 min-h-[48px] rounded-2xl font-semibold text-sm text-[#1a0e00] transition-all hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
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
                {t('plan.shoppingList.exporting')}
              </>
            ) : (
              <>↓ {t('plan.shoppingList.savePdf')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
