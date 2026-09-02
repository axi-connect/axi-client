"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Un solo `<audio>` para toda una lista de muestras (§10.5): nunca suenan dos
 * a la vez. Extraído del VoiceSelector de agents para que la curaduría de
 * /platform/voices reproduzca EXACTAMENTE igual (misma pieza, no una copia).
 *
 * `toggle(id, url)` reproduce esa muestra o la detiene si ya sonaba; `stop`
 * silencia (el host lo llama también al cerrar su popover/vista). El cleanup
 * de desmontaje va incluido.
 */
export function useAudioSample() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Muestra sonando o cargando; un id a la vez. */
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const stop = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
    setLoading(false)
  }, [])

  useEffect(() => stop, [stop])

  const toggle = useCallback(
    (id: string, url: string | null) => {
      const wasPlaying = playingId === id
      stop()
      if (wasPlaying || url === null) return

      const audio = new Audio(url)
      audioRef.current = audio
      setPlayingId(id)
      setLoading(true)
      audio.onplaying = () => setLoading(false)
      audio.onended = stop
      audio.onerror = stop
      // En jsdom `play()` devuelve undefined (no implementado): el cast evita
      // un TypeError en tests sin tocar el comportamiento del navegador
      const playback = audio.play() as Promise<void> | undefined
      void playback?.catch(stop)
    },
    [playingId, stop],
  )

  return { playingId, loading, toggle, stop }
}
