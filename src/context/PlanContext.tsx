import { createContext, useContext, useState } from 'react'
import type { FitnessPlan } from '../services/mistralService'

interface PlanContextValue {
  plan: FitnessPlan | null
  planLang: 'de' | 'en' | null
  setPlan: (plan: FitnessPlan | null, lang?: 'de' | 'en') => void
}

const PlanContext = createContext<PlanContextValue>({
  plan: null,
  planLang: null,
  setPlan: () => {},
})

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlanState] = useState<FitnessPlan | null>(() => {
    const stored = localStorage.getItem('fitplan_plan')
    if (!stored) return null
    try { return JSON.parse(stored) as FitnessPlan } catch { return null }
  })

  const [planLang, setPlanLangState] = useState<'de' | 'en' | null>(() => {
    const stored = localStorage.getItem('fitplan_plan_lang')
    return stored === 'en' ? 'en' : stored === 'de' ? 'de' : null
  })

  function setPlan(p: FitnessPlan | null, lang?: 'de' | 'en') {
    setPlanState(p)
    if (p) {
      localStorage.setItem('fitplan_plan', JSON.stringify(p))
      if (lang) {
        setPlanLangState(lang)
        localStorage.setItem('fitplan_plan_lang', lang)
      }
    } else {
      localStorage.removeItem('fitplan_plan')
      localStorage.removeItem('fitplan_plan_lang')
      setPlanLangState(null)
    }
  }

  return (
    <PlanContext.Provider value={{ plan, planLang, setPlan }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  return useContext(PlanContext)
}
