import { act, render, waitFor } from "@testing-library/react"
import { AlertProvider, useAlert } from "../alert-provider"

const fromAlert = jest.fn()
jest.mock("@/core/notifications", () => ({
  notify: { fromAlert: (...args: unknown[]) => fromAlert(...args) },
  NotificationsToaster: () => null,
}))
const toasterRender = jest.fn()
jest.mock("@/core/notifications/toaster", () => ({
  NotificationsToaster: () => {
    toasterRender()
    return null
  },
}))
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
    toasterRender.mockClear()
    // El reposo del navegador, inmediato: así «no se montó en el reposo» se puede afirmar.
    window.requestIdleCallback = ((fn: IdleRequestCallback) =>
      window.setTimeout(() => fn({} as IdleDeadline), 0)) as typeof window.requestIdleCallback
    window.cancelIdleCallback = ((id: number) => window.clearTimeout(id)) as typeof window.cancelIdleCallback
  })
  afterEach(() => {
    document.head.querySelectorAll("style[data-test-sileo]").forEach((n) => n.remove())
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

  describe("cuándo se monta el viewport de avisos", () => {
    const idle = () => act(() => new Promise((r) => setTimeout(r, 30)))

    it("fuera de la película se monta en el primer reposo, sin ningún aviso", async () => {
      render(<AlertProvider>{null}</AlertProvider>)
      await waitFor(() => expect(toasterRender).toHaveBeenCalled())
    })

    it("en la película NO se monta en el reposo (sileo recalcula toda la página)", async () => {
      render(
        <AlertProvider>
          <div data-film="" />
        </AlertProvider>,
      )
      await idle()
      await idle()
      expect(toasterRender).not.toHaveBeenCalled()
    })

    it("en la película, un aviso temprano monta el viewport y sale (no se pierde)", async () => {
      let ctx: Ctx | undefined
      render(
        <AlertProvider>
          <div data-film="" />
          <Probe onCtx={(c) => (ctx = c)} />
        </AlertProvider>,
      )
      const first = { tone: "error" as const, title: "No pudimos enviar" }
      const second = { tone: "success" as const, title: "Enviado" }
      // Los dos antes de que exista el viewport: los dos esperan en la cola.
      act(() => {
        ctx!.showAlert(first)
        ctx!.showAlert(second)
      })
      await waitFor(() => expect(toasterRender).toHaveBeenCalled())
      await waitFor(() => expect(fromAlert).toHaveBeenCalledTimes(2))
      expect(fromAlert.mock.calls.map((c) => c[0])).toEqual([first, second])
    })

    it("en la película, ni el motor listo ni el paso del tiempo lo montan: solo un aviso", async () => {
      jest.useFakeTimers()
      try {
        render(
          <AlertProvider>
            <div data-film="" />
          </AlertProvider>,
        )
        act(() => document.querySelector("[data-film]")!.setAttribute("data-film-ready", ""))
        act(() => jest.advanceTimersByTime(60_000))
      } finally {
        jest.useRealTimers()
      }
      await idle()
      expect(toasterRender).not.toHaveBeenCalled()
    })

    it("en la película, si otro cargó sileo (un notify directo) se monta en el acto", async () => {
      render(
        <AlertProvider>
          <div data-film="" />
        </AlertProvider>,
      )
      await idle()
      expect(toasterRender).not.toHaveBeenCalled()
      act(() => {
        const style = document.createElement("style")
        style.setAttribute("data-test-sileo", "")
        style.textContent = ":root{--sileo-spring-easing:linear(0, 1)}"
        document.head.appendChild(style)
      })
      await waitFor(() => expect(toasterRender).toHaveBeenCalled())
    })

  })
})
