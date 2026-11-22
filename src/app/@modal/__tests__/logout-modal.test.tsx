/**
 * Hotfix 22-nov-2026 — «Cerrar sesión» reaparecía al volver a entrar.
 *
 * - El slot `@modal` casa con cualquier ruta (catch-all opcional que no pinta
 *   nada): Next ya no conserva el modal en las respuestas de los prefetch.
 * - Confirmar sale con navegación DURA y no hace además `router.back()`.
 * - Cancelar vuelve atrás UNA vez (antes eran dos: su onClick + el cierre).
 */
import { existsSync } from "node:fs"
import { join } from "node:path"
import { act, fireEvent, render, screen } from "@testing-library/react"

const backMock = jest.fn()
const replaceRouterMock = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: backMock, replace: replaceRouterMock, push: jest.fn() }),
}))

const logoutMock = jest.fn()
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ logout: logoutMock }),
}))

import ModalSlotCatchAll from "../[[...catchAll]]/page"
import ModalSlotDefault from "../default"
import LogoutConfirmModal from "../(.)auth/logout/page"

const originalLocation = window.location
const locationReplaceMock = jest.fn()

beforeAll(() => {
  // jsdom no implementa la navegación: stub inspeccionable.
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...originalLocation, replace: locationReplaceMock },
  })
})

afterAll(() => {
  Object.defineProperty(window, "location", { writable: true, value: originalLocation })
})

beforeEach(() => {
  backMock.mockReset()
  replaceRouterMock.mockReset()
  locationReplaceMock.mockReset()
  logoutMock.mockReset()
})

describe("slot @modal de la raíz", () => {
  const slot = join(__dirname, "..")

  it("el catch-all opcional casa con cualquier ruta y no pinta nada", () => {
    expect(existsSync(join(slot, "[[...catchAll]]", "page.tsx"))).toBe(true)
    expect(ModalSlotCatchAll()).toBeNull()
    expect(ModalSlotDefault()).toBeNull()
  })

  it("la interceptada del logout sigue al lado del catch-all", () => {
    expect(existsSync(join(slot, "(.)auth", "logout", "page.tsx"))).toBe(true)
  })
})

describe("LogoutConfirmModal", () => {
  it("confirmar cierra la sesión y sale con navegación dura, sin router.back()", async () => {
    logoutMock.mockResolvedValue(undefined)
    render(<LogoutConfirmModal />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))
    })

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(locationReplaceMock).toHaveBeenCalledWith("/")
    expect(backMock).not.toHaveBeenCalled()
    expect(replaceRouterMock).not.toHaveBeenCalled()
  })

  it("un doble clic en confirmar cierra la sesión una sola vez", async () => {
    let resolve: () => void = () => {}
    logoutMock.mockReturnValue(new Promise<void>((r) => { resolve = r }))
    render(<LogoutConfirmModal />)

    const confirm = screen.getByRole("button", { name: "Cerrar sesión" })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    await act(async () => resolve())

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(locationReplaceMock).toHaveBeenCalledTimes(1)
  })

  it("si el cierre falla por red, no navega y deja reintentar", async () => {
    logoutMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    render(<LogoutConfirmModal />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))
    })

    expect(locationReplaceMock).not.toHaveBeenCalled()
    expect(backMock).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled()
  })

  it("cancelar vuelve atrás una sola vez y no cierra la sesión", () => {
    render(<LogoutConfirmModal />)

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(backMock).toHaveBeenCalledTimes(1)
    expect(logoutMock).not.toHaveBeenCalled()
  })
})
