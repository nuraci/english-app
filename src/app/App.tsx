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
import { InterviewScreen } from '../modules/interview/InterviewScreen'
import { InterviewSessionScreen } from '../modules/interview/InterviewSessionScreen'
import { HistoryScreen } from '../modules/interview/HistoryScreen'
import { TellMeScreen } from '../modules/interview/TellMeScreen'
import { AnswerEditorScreen, AnswersScreen } from '../modules/interview/AnswersScreen'
import { PhrasesScreen } from '../modules/interview/PhrasesScreen'
import { ShadowingScreen } from '../modules/shadowing/ShadowingScreen'
import { PlayerScreen } from '../modules/shadowing/PlayerScreen'
import { AutoScreen } from '../modules/shadowing/AutoScreen'
import { TutorScreen } from '../modules/tutor/TutorScreen'
import { TutorChatScreen } from '../modules/tutor/TutorChatScreen'
import { WelcomeScreen } from '../modules/onboarding/WelcomeScreen'
import { PrivacyScreen } from './screens/PrivacyScreen'

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
        <Route path="allenamenti/colloquio" element={<InterviewScreen />} />
        <Route path="allenamenti/colloquio/prova" element={<InterviewSessionScreen />} />
        <Route path="allenamenti/colloquio/storico" element={<HistoryScreen />} />
        <Route path="allenamenti/colloquio/tell-me" element={<TellMeScreen />} />
        <Route path="allenamenti/colloquio/risposte" element={<AnswersScreen />} />
        <Route path="allenamenti/colloquio/risposte/:id" element={<AnswerEditorScreen />} />
        <Route path="allenamenti/colloquio/frasi" element={<PhrasesScreen />} />
        <Route path="allenamenti/shadowing" element={<ShadowingScreen />} />
        <Route path="allenamenti/shadowing/player" element={<PlayerScreen />} />
        <Route path="allenamenti/shadowing/auto" element={<AutoScreen />} />
        <Route path="allenamenti/tutor" element={<TutorScreen />} />
        <Route path="allenamenti/tutor/chat" element={<TutorChatScreen />} />
        <Route path="benvenuto" element={<WelcomeScreen />} />
        <Route path="privacy" element={<PrivacyScreen />} />
        <Route path="progressi" element={<ProgressScreen />} />
        <Route path="impostazioni" element={<SettingsScreen />} />
        <Route path="prova" element={<DebugScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
