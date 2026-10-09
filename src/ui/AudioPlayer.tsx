import { useEffect, useMemo } from 'react'

/** Riproduce un audio salvato sul dispositivo. */
export function AudioPlayer({ blob, label }: { blob: Blob; label: string }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <audio controls src={url} aria-label={label} className="w-full" preload="metadata" />
}
