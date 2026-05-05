import { Routes, Route, Navigate } from 'react-router-dom'
import { PlanProvider } from './context/PlanContext'
import OnboardingPage from './pages/OnboardingPage'
import PreferencesPage from './pages/PreferencesPage'
import PlanPage from './pages/PlanPage'

export default function App() {
  return (
    <PlanProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/onboarding/goals" element={<Navigate to="/preferences" replace />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/plan" element={<PlanPage />} />
      </Routes>
    </PlanProvider>
  )
}
