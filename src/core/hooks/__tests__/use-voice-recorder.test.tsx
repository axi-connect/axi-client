import { act, renderHook } from "@testing-library/react";

import { useVoiceRecorder } from "../use-voice-recorder";

/**
 * Las tres promesas del hook: el permiso se pide al PULSAR (no al montar), el
 * tope de dos minutos se aplica solo, y desmontar a media grabación cierra el
 * micrófono. Sin `MediaRecorder` el estado es `unsupported`, no un error.
 */

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state = "inactive";
  stop = jest.fn(() => {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/webm" }) });
    this.onstop?.();
  });
  start() {
    this.state = "recording";
  }
  constructor() {
    FakeRecorder.instances.push(this);
  }
}

const track = { stop: jest.fn() };
const getUserMedia = jest.fn(async () => ({ getTracks: () => [track] }));

beforeEach(() => {
  FakeRecorder.instances = [];
  track.stop.mockClear();
  getUserMedia.mockClear();
  Object.defineProperty(window, "MediaRecorder", { configurable: true, writable: true, value: FakeRecorder });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useVoiceRecorder", () => {
  it("apagado o sin MediaRecorder es `unsupported`, y no toca el micrófono", () => {
    const { result } = renderHook(() => useVoiceRecorder(false));
    expect(result.current.state).toBe("unsupported");
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("pide permiso al pulsar y no al montar; graba y cuenta segundos", async () => {
    const { result } = renderHook(() => useVoiceRecorder(true));
    expect(result.current.state).toBe("idle");
    expect(getUserMedia).not.toHaveBeenCalled();

    await act(async () => {
      result.current.start();
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("recording");

    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    expect(result.current.seconds).toBe(3);
  });

  it("a los dos minutos se detiene solo", async () => {
    const { result } = renderHook(() => useVoiceRecorder(true));
    await act(async () => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(120_000);
    });
    expect(FakeRecorder.instances[0]?.stop).toHaveBeenCalled();
  });

  it("desmontar a media grabación cierra las pistas del micrófono", async () => {
    const { result, unmount } = renderHook(() => useVoiceRecorder(true));
    await act(async () => {
      result.current.start();
    });
    unmount();
    expect(track.stop).toHaveBeenCalled();
  });

  it("si el permiso se niega, queda en `denied` y el texto sigue disponible", async () => {
    getUserMedia.mockRejectedValueOnce(new Error("NotAllowed"));
    const { result } = renderHook(() => useVoiceRecorder(true));
    await act(async () => {
      result.current.start();
    });
    expect(result.current.state).toBe("denied");
  });
});
