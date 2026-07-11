import { act, renderHook, waitFor } from "@testing-library/react"
import { useVoiceRecorder } from "../use-voice-recorder"

/** Mock mínimo de MediaRecorder + getUserMedia (jsdom no los trae). */
class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = []
  static isTypeSupported = jest.fn(() => true)
  state: "inactive" | "recording" = "inactive"
  mimeType = "audio/webm;codecs=opus"
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  stream = { getTracks: () => [{ stop: trackStop }] }

  constructor() {
    FakeMediaRecorder.instances.push(this)
  }

  start() {
    this.state = "recording"
  }

  stop() {
    this.state = "inactive"
    this.ondataavailable?.({ data: new Blob(["audio-bytes"], { type: this.mimeType }) })
    this.onstop?.()
  }
}

const trackStop = jest.fn()
const getUserMedia = jest.fn(async () => ({}) as MediaStream)

beforeAll(() => {
  Object.defineProperty(window, "MediaRecorder", { value: FakeMediaRecorder, writable: true })
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, writable: true })
  Object.defineProperty(URL, "createObjectURL", { value: jest.fn(() => "blob:voice"), writable: true })
  Object.defineProperty(URL, "revokeObjectURL", { value: jest.fn(), writable: true })
})

beforeEach(() => {
  FakeMediaRecorder.instances = []
  trackStop.mockClear()
  getUserMedia.mockClear()
  getUserMedia.mockResolvedValue({} as MediaStream)
})

describe("use-voice-recorder (F9)", () => {
  it("flujo completo: start → recording → stop → preview con blob", async () => {
    const { result } = renderHook(() => useVoiceRecorder())
    expect(result.current.status).toBe("idle")

    await act(() => result.current.start())
    await waitFor(() => expect(result.current.status).toBe("recording"))

    act(() => result.current.stop())
    await waitFor(() => expect(result.current.status).toBe("preview"))
    expect(result.current.recording?.blob.size).toBeGreaterThan(0)
    expect(result.current.recording?.object_url).toBe("blob:voice")
    // El micrófono se apaga SIEMPRE al detener
    expect(trackStop).toHaveBeenCalled()
  })

  it("cancel durante la grabación: descarta y vuelve a idle sin preview", async () => {
    const { result } = renderHook(() => useVoiceRecorder())
    await act(() => result.current.start())
    await waitFor(() => expect(result.current.status).toBe("recording"))

    act(() => result.current.cancel())
    await waitFor(() => expect(result.current.status).toBe("idle"))
    expect(result.current.recording).toBeNull()
    expect(trackStop).toHaveBeenCalled()
  })

  it("permiso denegado: status denied, sin recorder", async () => {
    getUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"))
    const { result } = renderHook(() => useVoiceRecorder())

    await act(() => result.current.start())
    await waitFor(() => expect(result.current.status).toBe("denied"))
    expect(FakeMediaRecorder.instances).toHaveLength(0)
  })

  it("reset tras preview: libera el object URL y vuelve a idle", async () => {
    const { result } = renderHook(() => useVoiceRecorder())
    await act(() => result.current.start())
    act(() => result.current.stop())
    await waitFor(() => expect(result.current.status).toBe("preview"))

    act(() => result.current.reset())
    expect(result.current.status).toBe("idle")
    expect(result.current.recording).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:voice")
  })
})
