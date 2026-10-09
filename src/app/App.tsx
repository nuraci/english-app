import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { TodayScreen } from './screens/TodayScreen'
import { TrainingScreen } from './screens/TrainingScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { DebugScreen } from './screens/DebugScreen'
import { VerbsScreen } from '../modules/verbs/VerbsScreen'
import { VerbSessionScreen } from '../modules/verbs/VerbSessionScreen'
import { NumbersScreen } from '../modules/numbers/NumbersScreen'
import { NumbersSessionScreen } from '../modules/numbers/NumbersSessionScreen'
import { SpellingScreen } from '../modules/spelling/SpellingScreen'
import { SpellingSessionScreen } from '../modules/spelling/SpellingSessionScreen'
import { AlphabetScreen } from '../modules/spelling/AlphabetScreen'
import { VocabScreen } from '../modules/vocab/VocabScreen'
import { VocabSessionScreen } from '../modules/vocab/VocabSessionScreen'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayScreen />} />
        <Route path="allenamenti" element={<TrainingScreen />} />
        <Route path="allenamenti/verbi" element={<VerbsScreen />} />
        <Route path="allenamenti/verbi/sessione" element={<VerbSessionScreen />} />
        <Route path="allenamenti/numeri" element={<NumbersScreen />} />
        <Route path="allenamenti/numeri/sessione" element={<NumbersSessionScreen />} />
        <Route path="allenamenti/spelling" element={<SpellingScreen />} />
        <Route path="allenamenti/spelling/sessione" element={<SpellingSessionScreen />} />
        <Route path="allenamenti/spelling/alfabeto" element={<AlphabetScreen />} />
        <Route path="allenamenti/vocabolario" element={<VocabScreen />} />
        <Route path="allenamenti/vocabolario/sessione" element={<VocabSessionScreen />} />
        <Route path="progressi" element={<ProgressScreen />} />
        <Route path="impostazioni" element={<SettingsScreen />} />
        <Route path="prova" element={<DebugScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
