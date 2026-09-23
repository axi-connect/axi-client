import * as React from "react"
import DetailSheet from "../DetailSheet"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

/**
 * El DetailSheet difiere su contenido con un timeout de 50 ms (`ready`)
 * para coordinar la animación de entrada: los asserts deben esperar
 * a que el overlay/contenido exista.
 */
function Wrapper({ children }: { children: React.ReactNode }) {
  return <div id="__test-root">{children}</div>
}

async function findBackdrop(): Promise<HTMLElement> {
  return waitFor(() => {
    const el = document.querySelector(".axi-detail-sheet__backdrop") as HTMLElement | null
    if (!el) throw new Error("backdrop aún no montado")
    return el
  })
}

describe("DetailSheet", () => {
  it("cierra al hacer click en el backdrop", async () => {
    const onOpenChange = jest.fn()
    render(
      <Wrapper>
        <DetailSheet open={true} onOpenChange={onOpenChange} title="Test" />
      </Wrapper>
    )

    const backdrop = await findBackdrop()
    // Radix cierra vía pointerdown fuera del contenido (DismissableLayer).
    fireEvent.pointerDown(backdrop)
    fireEvent.pointerUp(backdrop)
    fireEvent.click(backdrop)
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("NO cierra al hacer click en el backdrop si closeOnOverlayClick=false", async () => {
    const onOpenChange = jest.fn()
    render(
      <Wrapper>
        <DetailSheet open={true} onOpenChange={onOpenChange} title="Test" closeOnOverlayClick={false} />
      </Wrapper>
    )

    const backdrop = await findBackdrop()
    fireEvent.pointerDown(backdrop)
    fireEvent.pointerUp(backdrop)
    fireEvent.click(backdrop)
    // Pequeña espera: el cierre (si ocurriera) es asíncrono.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("muestra skeleton mientras fetchDetail está pendiente", async () => {
    const onOpenChange = jest.fn()
    let resolveFetch: (value: unknown) => void = () => {}
    const fetchDetail = jest.fn(
      () => new Promise((resolve) => { resolveFetch = resolve }),
    )

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

    await waitFor(() => expect(screen.getByTestId("skeleton")).toBeInTheDocument())

    // Al resolver el fetch, el contenido reemplaza al skeleton.
    resolveFetch({})
    await waitFor(() => expect(screen.getByTestId("content")).toBeInTheDocument())
  })

  it("NO re-fetchea cuando cambia la identidad de fetchDetail (solo open/id)", async () => {
    // Regresión: pasar lambdas inline como fetchDetail (identidad nueva en
    // cada render del padre) provocaba un bucle infinito de refetch.
    const onOpenChange = jest.fn()
    const calls: string[] = []
    const makeFetch = (tag: string) =>
      jest.fn(async () => { calls.push(tag) })

    const { rerender } = render(
      <Wrapper>
        <DetailSheet open={true} onOpenChange={onOpenChange} id={1} title="Test" fetchDetail={makeFetch("a")}>
          <div data-testid="content" />
        </DetailSheet>
      </Wrapper>
    )

    await waitFor(() => expect(calls).toEqual(["a"]))

    // Re-render con una función DISTINTA pero mismo open/id → sin refetch.
    rerender(
      <Wrapper>
        <DetailSheet open={true} onOpenChange={onOpenChange} id={1} title="Test" fetchDetail={makeFetch("b")}>
          <div data-testid="content" />
        </DetailSheet>
      </Wrapper>
    )
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(calls).toEqual(["a"])

    // Cambiar el id SÍ re-fetchea, usando la función más reciente.
    rerender(
      <Wrapper>
        <DetailSheet open={true} onOpenChange={onOpenChange} id={2} title="Test" fetchDetail={makeFetch("c")}>
          <div data-testid="content" />
        </DetailSheet>
      </Wrapper>
    )
    await waitFor(() => expect(calls).toEqual(["a", "c"]))
  })

  it("al cerrarse (o desmontarse, como al hacer «atrás» en una ruta interceptada) el foco vuelve al disparador", async () => {
    function Harness({ open, mounted = true }: { open: boolean; mounted?: boolean }) {
      return (
        <Wrapper>
          <button type="button">Abrir detalle</button>
          {mounted ? (
            <DetailSheet open={open} onOpenChange={() => {}} title="Detalle">
              <button type="button">Dentro</button>
            </DetailSheet>
          ) : null}
        </Wrapper>
      )
    }
    const { rerender } = render(<Harness open={false} />)
    const trigger = screen.getByRole("button", { name: "Abrir detalle" })
    trigger.focus()
    rerender(<Harness open />)
    await findBackdrop()
    // Radix atrapa el foco dentro del panel mientras está abierto.
    await waitFor(() => expect(document.activeElement).not.toBe(trigger))
    rerender(<Harness open mounted={false} />)
    await waitFor(() => expect(document.activeElement).toBe(trigger))

    // Y cerrando con `open={false}` (el panel sigue montado).
    rerender(<Harness open />)
    await findBackdrop()
    await waitFor(() => expect(document.activeElement).not.toBe(trigger))
    rerender(<Harness open={false} />)
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
