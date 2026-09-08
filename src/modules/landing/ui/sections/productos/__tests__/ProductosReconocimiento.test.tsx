import { render, screen, within } from "@testing-library/react"

import ProductosReconocimiento from "../ProductosReconocimiento"
import { RECOGNITION_SECTION } from "@/modules/landing/ui/content/productos.content"

/**
 * La sección cuenta el reconocimiento con DOS vistas separadas a propósito:
 * el teléfono del cliente (solo la respuesta) y la tarjeta del equipo (los
 * candidatos con su similitud). Mezclarlas prometería que el cliente ve el
 * análisis, y no lo ve.
 */
describe("ProductosReconocimiento", () => {
  it("pinta el ancla, el titular y los tres desenlaces del contenido", () => {
    render(<ProductosReconocimiento />)
    expect(document.getElementById("reconocimiento")).not.toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: RECOGNITION_SECTION.title })).toBeInTheDocument()
    for (const outcome of RECOGNITION_SECTION.outcomes) {
      expect(screen.getByRole("heading", { level: 3, name: outcome.title })).toBeInTheDocument()
    }
  })

  it("el teléfono enseña la publicación compartida y la respuesta con la referencia", () => {
    render(<ProductosReconocimiento />)
    expect(screen.getByText(RECOGNITION_SECTION.phone.photo.text)).toBeInTheDocument()
    expect(screen.getByText(RECOGNITION_SECTION.phone.photo.photo.sourceLabel)).toBeInTheDocument()
    expect(screen.getByText(RECOGNITION_SECTION.phone.reply.text)).toBeInTheDocument()
    expect(screen.getByText(RECOGNITION_SECTION.phone.reply.product.meta)).toBeInTheDocument()
  })

  it("«Lo que ve tu equipo» lista los tres candidatos con su confianza y similitud", () => {
    render(<ProductosReconocimiento />)
    const backstage = screen.getByText(RECOGNITION_SECTION.backstage.label).closest("div")?.parentElement
    expect(backstage).not.toBeNull()
    const list = within(backstage as HTMLElement).getByRole("list")
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(RECOGNITION_SECTION.backstage.candidates.length)
    expect(within(list).getByText("AV-AMB-U")).toBeInTheDocument()
    expect(within(list).getByLabelText(/Confianza alta, similitud 93 %/)).toBeInTheDocument()
    expect(within(list).getByLabelText(/Confianza baja, similitud 64 %/)).toBeInTheDocument()
  })

  it("las fuentes y los hechos no venden enlaces de Instagram pegados (fuera de la v1)", () => {
    render(<ProductosReconocimiento />)
    const section = document.getElementById("reconocimiento") as HTMLElement
    expect(section.textContent).not.toMatch(/enlace|link|url/i)
  })
})
