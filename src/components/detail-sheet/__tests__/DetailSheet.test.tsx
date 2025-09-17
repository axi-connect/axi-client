import * as React from "react"
import DetailSheet from "../DetailSheet"
import { render, screen, fireEvent } from "@testing-library/react"

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div id="__test-root">{children}</div>
}

describe("DetailSheet", () => {
  it("cierra al hacer click en el backdrop", async () => {
    const onOpenChange = jest.fn()
    render(
      <Wrapper>
        <DetailSheet open={true} onOpenChange={onOpenChange} title="Test" />
      </Wrapper>
    )

    const backdrop = document.querySelector(".axi-detail-sheet__backdrop") as HTMLElement
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("cierra con tecla ESC si habilitado", async () => {
    const onOpenChange = jest.fn()
    render(
      <Wrapper>
        <DetailSheet open={true} onOpenChange={onOpenChange} title="Test" />
      </Wrapper>
    )
    fireEvent.keyDown(window, { key: "Escape" })
    // Radix gestionará el cierre y propagará change
    // En JSDOM no anima, pero onOpenChange debería ser llamado con false
    // Aunque Radix no cierra automáticamente sin Root controlado, nuestro handler recibe el evento
    expect(onOpenChange).toHaveBeenCalled()
  })

  it("muestra skeleton cuando fetchDetail está pendiente", async () => {
    const onOpenChange = jest.fn()
    const fetchDetail = jest.fn(async () => new Promise((r) => setTimeout(r, 100)))
    render(
      <Wrapper>
        <DetailSheet
          open={true}
          onOpenChange={onOpenChange}
          id={1}
          title="Test"
          fetchDetail={fetchDetail}
          skeleton={<div data-testid="skeleton" />}
        >
          <div data-testid="content" />
        </DetailSheet>
      </Wrapper>
    )

    // Durante la promesa pendiente debería estar el skeleton
    expect(screen.getByTestId("skeleton")).toBeInTheDocument()
  })
})