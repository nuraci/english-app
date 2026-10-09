export {
  clampRate,
  englishVoices,
  isTtsSupported,
  loadVoices,
  MAX_RATE,
  MIN_RATE,
  pickVoice,
  pickVoiceForLang,
  speakBatch,
  tts,
  TtsQueue,
} from './tts'
export type { BatchOptions, BatchSegment, SpeakOptions } from './tts'
export {
  getOnDeviceStatus,
  getRecognitionCtor,
  installOnDevice,
  isSttSupported,
  listen,
  SttError,
  sttErrorMessage,
} from './stt'
export type { ListenOptions, OnDeviceStatus, SttErrorCode, SttResult } from './stt'
export { useListener, useSpeaker } from './hooks'
export { startDictation } from './dictation'
export type { Dictation, DictationOptions } from './dictation'
export { isRecordingSupported, pickMimeType, startRecording } from './recorder'
export type { Recorder, Recording } from './recorder'
export { keepScreenOn, silentWav, startBackgroundSession } from './background'
export type { BackgroundSession, WakeLockHandle } from './background'
