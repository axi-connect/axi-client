/**
 * El sonido de la ruleta: suena un tic por paso y una confirmación al elegir,
 * solo después de un gesto real, como mucho un tic cada 35 ms, y calla con
 * movimiento reducido, con la pestaña oculta o sin Web Audio.
 */
import { act, fireEvent, render, screen } from "@testing-library/react"

import { RAIL_INDEX } from "@/modules/landing/domain/film/rail-index"
import { FilmDrum } from "../parts/FilmDrum"
import { drumSelect, drumTick, primeDrumSound, resetDrumSoundForTests } from "../parts/drum-sound"

/** Un AudioContext de mentira que cuenta qué se toca. */
const played = { sources: 0, oscillators: 0, contexts: 0 }
const param = () => ({ value: 0, setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() })
const node = () => {
  const n: Record<string, unknown> = { connect: jest.fn(() => n), start: jest.fn(), stop: jest.fn() }
  return n
}
class FakeAudioContext {
  state = "running"
  currentTime = 0
  sampleRate = 44100
  destination = {}
  constructor() {
    played.contexts++
  }
  resume = jest.fn(() => Promise.resolve())
  createBuffer = (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) })
  createBufferSource = () => {
    played.sources++
    return { ...node(), buffer: null }
  }
  createBiquadFilter = () => ({ ...node(), type: "", frequency: param(), Q: param() })
  createGain = () => ({ ...node(), gain: param() })
  createOscillator = () => {
    played.oscillators++
    return { ...node(), type: "", frequency: param() }
  }
}

let reduce = false
const gesture = () => fireEvent.pointerDown(document.body)

beforeEach(() => {
  resetDrumSoundForTests()
  played.sources = played.oscillators = played.contexts = 0
  reduce = false
  ;(window as unknown as { AudioContext?: unknown }).AudioContext = FakeAudioContext
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: reduce && q.includes("reduce"),
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0)
    return 0
  }) as typeof window.requestAnimationFrame
})

describe("drum-sound", () => {
  it("antes del primer gesto calla sin error (la rueda no activa el audio); después suena", () => {
    primeDrumSound()
    drumTick(1000)
    expect(played.contexts).toBe(0)
    expect(played.sources).toBe(0)
    gesture()
    drumTick(2000)
    expect(played.contexts).toBe(1)
    expect(played.sources).toBe(1)
  })

  it("como mucho un tic cada 35 ms", () => {
    primeDrumSound()
    gesture()
    drumTick(1000)
    drumTick(1020)
    drumTick(1034)
    expect(played.sources).toBe(1)
    drumTick(1035)
    expect(played.sources).toBe(2)
  })

  it("elegir suena dos notas y el brillo; un solo contexto para todo", () => {
    primeDrumSound()
    gesture()
    drumSelect()
    drumTick(1000)
    expect(played.oscillators).toBe(3)
    expect(played.contexts).toBe(1)
  })

  it("con movimiento reducido no suena nada", () => {
    reduce = true
    primeDrumSound()
    gesture()
    drumTick(1000)
    drumSelect()
    expect(played.sources + played.oscillators).toBe(0)
  })

  it("con la pestaña oculta no suena", () => {
    primeDrumSound()
    gesture()
    const hidden = jest.spyOn(document, "hidden", "get").mockReturnValue(true)
    drumTick(1000)
    drumSelect()
    hidden.mockRestore()
    expect(played.sources + played.oscillators).toBe(0)
  })

  it("sin Web Audio no pasa nada", () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext
    primeDrumSound()
    gesture()
    expect(() => {
      drumTick(1000)
      drumSelect()
    }).not.toThrow()
  })
})

describe("la ruleta suena", () => {
  function drum() {
    const onTravel = jest.fn()
    render(<FilmDrum entries={RAIL_INDEX} current={9} onTravel={onTravel} />)
    return { onTravel, trigger: screen.getByRole("button", { name: "Ir a una escena" }) }
  }

  it("abrir no suena; cada paso con ↑ ↓ o la rueda suena; elegir confirma", () => {
    const { trigger, onTravel } = drum()
    gesture()
    fireEvent.keyDown(trigger, { key: "ArrowDown" }) // abre
    expect(played.sources).toBe(0)
    const row = () => document.querySelector<HTMLElement>(".film-drum-row[data-centered]")!
    const now = jest.spyOn(performance, "now")
    now.mockReturnValue(1000)
    fireEvent.keyDown(row(), { key: "ArrowDown" })
    expect(played.sources).toBe(1)
    now.mockReturnValue(1100)
    act(() => {
      document.querySelector(".film-drum-zone")!.dispatchEvent(new WheelEvent("wheel", { deltaY: 70, bubbles: true, cancelable: true }))
    })
    expect(played.sources).toBe(2)
    now.mockRestore()
    fireEvent.keyDown(row(), { key: "Enter" })
    expect(onTravel).toHaveBeenCalled()
    expect(played.oscillators).toBe(3)
  })
})
