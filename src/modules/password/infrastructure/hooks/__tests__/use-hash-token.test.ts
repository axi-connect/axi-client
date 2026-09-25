import { StrictMode } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { useHashToken } from "../use-hash-token"

const TOKEN = "Zk3n0p-Qa_9sT2uV8wXyZ0123"

describe("useHashToken", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/")
  })

  it("lee el token del # y lo borra de la URL sin tocar ruta ni query", async () => {
    window.history.replaceState(null, "", `/auth/crear-contrasena?x=1#token=${TOKEN}`)
    const spy = jest.spyOn(window.history, "replaceState")

    const { result } = renderHook(() => useHashToken())

    await waitFor(() => expect(result.current).toEqual({ status: "found", token: TOKEN }))
    expect(window.location.hash).toBe("")
    expect(window.location.pathname).toBe("/auth/crear-contrasena")
    expect(window.location.search).toBe("?x=1")
    expect(window.location.href).not.toContain(TOKEN)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it("sin fragmento no reescribe la URL y dice que falta el token", async () => {
    window.history.replaceState(null, "", "/auth/restablecer")
    const spy = jest.spyOn(window.history, "replaceState")

    const { result } = renderHook(() => useHashToken())

    await waitFor(() => expect(result.current).toEqual({ status: "missing" }))
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it("un fragmento con basura también se borra, y no cuenta como token", async () => {
    window.history.replaceState(null, "", "/auth/restablecer#token=corto")

    const { result } = renderHook(() => useHashToken())

    await waitFor(() => expect(result.current).toEqual({ status: "missing" }))
    expect(window.location.hash).toBe("")
  })

  it("en StrictMode (el efecto corre dos veces) no pierde el token ya borrado", async () => {
    window.history.replaceState(null, "", `/auth/crear-contrasena#token=${TOKEN}`)

    const { result } = renderHook(() => useHashToken(), { wrapper: StrictMode })

    await waitFor(() => expect(result.current).toEqual({ status: "found", token: TOKEN }))
    expect(window.location.hash).toBe("")
  })
})
