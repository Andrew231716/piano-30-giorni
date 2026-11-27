import { Suspense, lazy } from 'react'
import { Layout } from './components/Layout'
import { PageLoading } from './components/PageLoading'
import { AppStateProvider, useAppState } from './context/AppStateContext'

const Onboarding = lazy(() =>
  import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })),
)
const Today = lazy(() =>
  import('./pages/Today').then((m) => ({ default: m.Today })),
)
const Plan = lazy(() =>
  import('./pages/Plan').then((m) => ({ default: m.Plan })),
)
const Nutrition = lazy(() =>
  import('./pages/Nutrition').then((m) => ({ default: m.Nutrition })),
)
const Progress = lazy(() =>
  import('./pages/Progress').then((m) => ({ default: m.Progress })),
)
const Profile = lazy(() =>
  import('./pages/Profile').then((m) => ({ default: m.Profile })),
)

function AppRoutes() {
  const { state, tab } = useAppState()

  if (!state.profile.onboarded) {
    return (
      <Suspense fallback={<PageLoading label="Preparazione percorso…" />}>
        <Onboarding />
      </Suspense>
    )
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        {tab === 'oggi' && <Today />}
        {tab === 'piano' && <Plan />}
        {tab === 'alimentazione' && <Nutrition />}
        {tab === 'progressi' && <Progress />}
        {tab === 'profilo' && <Profile />}
      </Suspense>
    </Layout>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <AppRoutes />
    </AppStateProvider>
  )
}
