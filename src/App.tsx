import { Routes, Route, Navigate } from 'react-router-dom'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import OnboardingPage from './pages/OnboardingPage'
import PreferencesPage from './pages/PreferencesPage'
import PlanPage from './pages/PlanPage'
import ProfilesPage from './pages/ProfilesPage'

function RootRedirect() {
  const { profiles, activeProfile } = useProfile()
  if (profiles.length === 0 || !activeProfile) {
    return <Navigate to="/profiles" replace />
  }
  if (activeProfile.planHistory.length > 0) {
    return <Navigate to="/plan" replace />
  }
  return <Navigate to="/onboarding" replace />
}

export default function App() {
  return (
    <ProfileProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/profiles" element={<ProfilesPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/onboarding/goals" element={<Navigate to="/preferences" replace />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/plan" element={<PlanPage />} />
      </Routes>
    </ProfileProvider>
  )
}
