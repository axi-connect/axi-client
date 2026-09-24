import { act, render } from "@testing-library/react"
import { AlertProvider, useAlert } from "../alert-provider"

const fromAlert = jest.fn()
jest.mock("@/core/notifications", () => ({
  notify: { fromAlert: (...args: unknown[]) => fromAlert(...args) },
  NotificationsToaster: () => null,
}))
jest.mock("@/shared/components/ui/modal", () => ({ Modal: () => null }))

type Ctx = ReturnType<typeof useAlert>

function Probe({ onCtx }: { onCtx: (ctx: Ctx) => void }) {
  onCtx(useAlert())
  return null
}

describe("AlertProvider", () => {
  it("showAlert delega en notify.fromAlert con el aviso tal cual", () => {
    let ctx: Ctx | undefined
    render(
      <AlertProvider>
        <Probe onCtx={(c) => (ctx = c)} />
      </AlertProvider>,
    )
    const alert = { tone: "success" as const, title: "Contacto guardado" }
    act(() => ctx!.showAlert(alert))
    expect(fromAlert).toHaveBeenCalledWith(alert)
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
