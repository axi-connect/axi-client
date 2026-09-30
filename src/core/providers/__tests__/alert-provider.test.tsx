import { act, render, waitFor } from "@testing-library/react"
import { AlertProvider, useAlert } from "../alert-provider"

const fromAlert = jest.fn()
jest.mock("@/core/notifications", () => ({
  notify: { fromAlert: (...args: unknown[]) => fromAlert(...args) },
  NotificationsToaster: () => null,
}))
jest.mock("@/core/notifications/toaster", () => ({ NotificationsToaster: () => null }))
const modalRender = jest.fn()
jest.mock("@/shared/components/ui/modal", () => ({
  Modal: (props: { open: boolean }) => {
    modalRender(props.open)
    return null
  },
}))

type Ctx = ReturnType<typeof useAlert>

function Probe({ onCtx }: { onCtx: (ctx: Ctx) => void }) {
  onCtx(useAlert())
  return null
}

describe("AlertProvider", () => {
  beforeEach(() => {
    fromAlert.mockClear()
    modalRender.mockClear()
  })

  it("showAlert delega en notify.fromAlert con el aviso tal cual", async () => {
    let ctx: Ctx | undefined
    render(
      <AlertProvider>
        <Probe onCtx={(c) => (ctx = c)} />
      </AlertProvider>,
    )
    const alert = { tone: "success" as const, title: "Contacto guardado" }
    act(() => ctx!.showAlert(alert))
    // sileo se carga bajo demanda: el aviso sale en cuanto llega el módulo.
    await waitFor(() => expect(fromAlert).toHaveBeenCalledWith(alert))
  })

  it("el Modal no se monta hasta que alguien lo abre, y luego se queda", async () => {
    let ctx: Ctx | undefined
    render(
      <AlertProvider>
        <Probe onCtx={(c) => (ctx = c)} />
      </AlertProvider>,
    )
    await act(async () => {})
    expect(modalRender).not.toHaveBeenCalled()
    act(() => ctx!.showModal({ title: "¿Seguro?" } as never))
    await waitFor(() => expect(modalRender).toHaveBeenLastCalledWith(true))
    act(() => ctx!.closeModal())
    await waitFor(() => expect(modalRender).toHaveBeenLastCalledWith(false))
  })

  it("avisar no cambia la identidad de showAlert ni del contexto", () => {
    const seen: Ctx[] = []
    render(
      <AlertProvider>
        <Probe onCtx={(c) => seen.push(c)} />
      </AlertProvider>,
    )
    act(() => seen[0].showAlert({ tone: "error", title: "Falló" }))
    act(() => seen[0].showAlert({ tone: "success", title: "Listo" }))
    expect(new Set(seen.map((c) => c.showAlert)).size).toBe(1)
    expect(new Set(seen).size).toBe(1)
  })
})
