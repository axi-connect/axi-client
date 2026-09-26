import { act, renderHook } from "@testing-library/react";

import { useRecordingPlayback } from "../use-recording-playback";

/** jsdom no reproduce audio: `play` resuelve y dispara `play`, `pause` dispara `pause`. */
let lastAudio: HTMLAudioElement | null = null;
const OriginalAudio = window.Audio;

beforeAll(() => {
  window.Audio = function FakeAudio() {
    const audio = new OriginalAudio();
    Object.defineProperty(audio, "paused", { get: () => !(audio as unknown as { _on?: boolean })._on, configurable: true });
    audio.play = function play() {
      (audio as unknown as { _on?: boolean })._on = true;
      audio.dispatchEvent(new Event("play"));
      return Promise.resolve();
    };
    audio.pause = function pause() {
      (audio as unknown as { _on?: boolean })._on = false;
      audio.dispatchEvent(new Event("pause"));
    };
    lastAudio = audio;
    return audio;
  } as unknown as typeof Audio;
});
afterAll(() => {
  window.Audio = OriginalAudio;
});

function loadMetadata(audio: HTMLAudioElement, durationSeconds: number) {
  Object.defineProperty(audio, "duration", { value: durationSeconds, configurable: true });
  Object.defineProperty(audio, "readyState", { value: 1, configurable: true });
  audio.dispatchEvent(new Event("loadedmetadata"));
}

describe("useRecordingPlayback (premium F4)", () => {
  it("un play y un salto pedidos antes de tener la URL se aplican al llegar", () => {
    const { result, rerender } = renderHook(({ url }) => useRecordingPlayback(url), {
      initialProps: { url: null as string | null },
    });
    act(() => result.current.seek(35_000));
    act(() => result.current.toggle());
    expect(result.current.positionMs).toBe(35_000);
    expect(result.current.playing).toBe(false);

    rerender({ url: "https://storage/rec.mp3" });
    const audio = lastAudio as HTMLAudioElement;
    expect(audio.src).toBe("https://storage/rec.mp3");
    expect(result.current.playing).toBe(true);

    act(() => loadMetadata(audio, 118));
    expect(audio.currentTime).toBe(35);
    expect(result.current.durationMs).toBe(118_000);
  });

  it("toggle pausa y reanuda; la velocidad llega al <audio>", () => {
    const { result } = renderHook(() => useRecordingPlayback("https://storage/rec.mp3"));
    const audio = lastAudio as HTMLAudioElement;
    act(() => loadMetadata(audio, 60));

    act(() => result.current.toggle());
    expect(result.current.playing).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);

    act(() => result.current.setRate(1.5));
    expect(audio.playbackRate).toBe(1.5);
  });

  it("un error del <audio> avisa a quien provee la URL (para pedir una fresca)", () => {
    const onError = jest.fn();
    renderHook(() => useRecordingPlayback("https://storage/rec.mp3", { onError }));
    act(() => {
      lastAudio?.dispatchEvent(new Event("error"));
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
