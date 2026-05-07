import type { FitnessPlan } from '../services/mistralService'
import { ProfileProvider, useProfile } from './ProfileContext'

export const PlanProvider = ProfileProvider

export function usePlan(): {
  plan: FitnessPlan | null
  planLang: 'de' | 'en' | null
  setPlan: (plan: FitnessPlan | null, lang?: 'de' | 'en') => void
} {
  const { plan, planLang, appendPlanToHistory } = useProfile()
  return {
    plan,
    planLang,
    setPlan: (p, lang) => {
      if (p && lang) appendPlanToHistory(p, lang)
    },
  }
}
