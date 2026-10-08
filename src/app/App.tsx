import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { TodayScreen } from './screens/TodayScreen'
import { TrainingScreen } from './screens/TrainingScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { DebugScreen } from './screens/DebugScreen'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayScreen />} />
        <Route path="allenamenti" element={<TrainingScreen />} />
        <Route path="progressi" element={<ProgressScreen />} />
        <Route path="impostazioni" element={<SettingsScreen />} />
        <Route path="prova" element={<DebugScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
