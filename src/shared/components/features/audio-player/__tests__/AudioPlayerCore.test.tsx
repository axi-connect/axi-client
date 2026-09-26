import { act, fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"

import { AudioPlayerCore, type AudioPlayerControl } from "../AudioPlayerCore"

function audioElement(container: HTMLElement): HTMLAudioElement {
  const audio = container.querySelector("audio")
  if (audio === null) throw new Error("sin <audio>")
  return audio
}

describe("AudioPlayerCore", () => {
  it("sin las props nuevas se comporta como siempre (play perezoso pide la URL)", () => {
    const onNeedSrc = jest.fn()
    render(<AudioPlayerCore src={null} onNeedSrc={onNeedSrc} />)
    fireEvent.click(screen.getByRole("button", { name: "Reproducir audio" }))
    expect(onNeedSrc).toHaveBeenCalledTimes(1)
  })

  it("premium F2: onTimeUpdate recibe la posición del <audio>", () => {
    const onTimeUpdate = jest.fn()
    const { container } = render(<AudioPlayerCore src="https://x/rec.mp3" onTimeUpdate={onTimeUpdate} />)
    const audio = audioElement(container)
    Object.defineProperty(audio, "currentTime", { value: 12.5, writable: true })
    fireEvent.timeUpdate(audio)
    expect(onTimeUpdate).toHaveBeenLastCalledWith(12.5)
  })

  it("premium F2: controlRef.seek mueve el <audio> y avisa la nueva posición", () => {
    const control = createRef<AudioPlayerControl>()
    const onTimeUpdate = jest.fn()
    const { container } = render(
      <AudioPlayerCore src="https://x/rec.mp3" controlRef={control} onTimeUpdate={onTimeUpdate} />,
    )
    act(() => control.current?.seek(35))
    expect(audioElement(container).currentTime).toBe(35)
    expect(onTimeUpdate).toHaveBeenLastCalledWith(35)
  })

  it("premium F2: un seek antes de tener la URL se aplica cuando carga", () => {
    const control = createRef<AudioPlayerControl>()
    const { container, rerender } = render(<AudioPlayerCore src={null} controlRef={control} />)
    act(() => control.current?.seek(48))

    rerender(<AudioPlayerCore src="https://x/rec.mp3" controlRef={control} />)
    const audio = audioElement(container)
    Object.defineProperty(audio, "duration", { value: 118 })
    fireEvent.loadedMetadata(audio)
    expect(audio.currentTime).toBe(48)
  })

  it("premium F2: onPlayingChange sigue los eventos del <audio>", () => {
    const onPlayingChange = jest.fn()
    const { container } = render(
      <AudioPlayerCore src="https://x/rec.mp3" onPlayingChange={onPlayingChange} />,
    )
    fireEvent.play(audioElement(container))
    expect(onPlayingChange).toHaveBeenLastCalledWith(true)
    fireEvent.pause(audioElement(container))
    expect(onPlayingChange).toHaveBeenLastCalledWith(false)
  })
})
