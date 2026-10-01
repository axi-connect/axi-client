/**
 * La hoja del nav en móvil (§18.1): sus enlaces navegan aunque el cierre
 * retire la entrada de historial que puso al abrirse (ronda 2 de la auditoría:
 * con history.back() tras el clic, Next 15 descartaba la navegación y
 * «Precios» no llevaba a ningún sitio), y atrás del navegador la cierra sin
 * navegar.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

const push = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/" }))
jest.mock("next-themes", () => ({ useTheme: () => ({ theme: "system", setTheme: jest.fn() }) }))

import { SiteMenuSheet } from "../SiteMenuSheet"

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
})

beforeEach(() => {
  push.mockClear()
  window.history.replaceState(null, "", "/")
})

function sheet() {
  render(<SiteMenuSheet dark session={{ text: "Iniciar sesión", href: "/auth/login" }} ctaHref="/comenzar" ctaLabel="Prueba 7 días gratis" onCtaClick={jest.fn()} />)
  fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }))
}

it("tocar un enlace de la hoja la cierra y navega a su destino", async () => {
  sheet()
  expect(window.history.state?.siteSheet).toBe(true)
  fireEvent.click(screen.getByRole("link", { name: "Precios" }))
  // Navega cuando el navegador ya retiró la entrada de la hoja (no antes, o Next la descarta).
  await waitFor(() => expect(push).toHaveBeenCalledWith("/precios"))
  expect(window.history.state?.siteSheet).not.toBe(true)
})

it("atrás del navegador cierra la hoja y no navega", async () => {
  sheet()
  expect(screen.getByRole("dialog")).toBeInTheDocument()
  await act(async () => {
    window.history.back()
    await new Promise((r) => setTimeout(r, 50))
  })
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  expect(push).not.toHaveBeenCalled()
})
