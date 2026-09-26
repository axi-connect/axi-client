"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CallSessionDetailDTO } from "@/modules/calls/domain/call";
import {
  activeSegmentIndex,
  segmentWindows,
  type SegmentWindow,
} from "@/modules/calls/domain/recording-sync";
import { useRecordingPeaks } from "@/modules/calls/infrastructure/hooks/use-recording-peaks";
import { useRecordingPlayback } from "@/modules/calls/infrastructure/hooks/use-recording-playback";
import { useRecordingUrl } from "@/modules/calls/infrastructure/hooks/use-recording-url";

/**
 * Todo lo que la llamada terminada necesita para que la grabación y la
 * transcripción vayan juntas (premium F4): la URL firmada (se pide al abrir,
 * porque la onda la necesita), la reproducción, los picos y la ventana de
 * cada segmento en la grabación.
 */
export function useSyncedRecording(call: CallSessionDetailDTO) {
  const enabled = call.has_recording;
  const { url, status: urlStatus, load, refresh } = useRecordingUrl(call.id);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  // Una URL vencida se renueva UNA vez; si el fallo es otro, no hay bucle.
  const retriedForRef = useRef<string | null>(null);
  const playback = useRecordingPlayback(enabled ? url : null, {
    onError: () => {
      if (url === null || retriedForRef.current === url) return;
      retriedForRef.current = url;
      refresh();
    },
  });
  const { peaks } = useRecordingPeaks(call.id, enabled ? url : null);

  const durationMs =
    playback.durationMs ??
    (call.recording_duration_seconds !== null ? call.recording_duration_seconds * 1000 : null) ??
    (call.duration_seconds !== null ? call.duration_seconds * 1000 : 0);

  const windows: SegmentWindow[] = useMemo(
    () => segmentWindows(call.segments, call.recording_offset_ms, Math.max(1, durationMs)),
    [call.segments, call.recording_offset_ms, durationMs],
  );
  const activeIndex = enabled ? activeSegmentIndex(windows, playback.positionMs) : -1;

  return {
    enabled,
    urlStatus,
    retry: refresh,
    playback,
    peaks,
    durationMs,
    windows,
    activeIndex,
  };
}
