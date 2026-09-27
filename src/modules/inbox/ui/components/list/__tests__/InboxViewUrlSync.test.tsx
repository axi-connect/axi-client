import { act, render } from "@testing-library/react"
import { conversationIdFromPath, InboxViewUrlSync } from "../InboxViewUrlSync"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"

let pathname = "/workspace/inbox"
const replace = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}))

const select = jest.fn(async (id: string | null) => {
  useInboxStore.setState({ selectedId: id })
})

/** jsdom no mueve `location` con pushState de Next: se lleva a mano junto a `pathname`. */
function goTo(path: string) {
  window.history.replaceState(null, "", path)
  pathname = path
}

beforeEach(() => {
  goTo("/workspace/inbox")
  select.mockClear()
  replace.mockClear()
  useInboxStore.setState({ view: "all_open", selectedId: null, select })
})

describe("InboxViewUrlSync — la conversación abierta vive en la URL (IB1-H1)", () => {
  it("abrir una conversación empuja /workspace/inbox/<id> sin navegar (la vista no se remonta)", async () => {
    const push = jest.spyOn(window.history, "pushState")
    render(<InboxViewUrlSync />)
    await act(async () => {
      useInboxStore.setState({ selectedId: "c1" })
    })
    expect(push).toHaveBeenCalledWith(null, "", "/workspace/inbox/c1")
    push.mockRestore()
  })

  it("«Atrás» (la ruta vuelve a la bandeja) cierra la conversación", async () => {
    goTo("/workspace/inbox/c1")
    useInboxStore.setState({ selectedId: "c1" })
    const { rerender } = render(<InboxViewUrlSync />)
    goTo("/workspace/inbox")
    await act(async () => {
      rerender(<InboxViewUrlSync />)
    })
    expect(select).toHaveBeenCalledWith(null)
  })

  it("entrar por el enlace abre esa conversación y no reescribe la URL", async () => {
    goTo("/workspace/inbox/c9")
    const push = jest.spyOn(window.history, "pushState")
    await act(async () => {
      render(<InboxViewUrlSync />)
    })
    expect(select).toHaveBeenCalledWith("c9")
    expect(push).not.toHaveBeenCalled()
    push.mockRestore()
  })

  it("cerrarla desde la app vuelve atrás si la entrada la pusimos nosotros (no apila historial)", async () => {
    const back = jest.spyOn(window.history, "back").mockImplementation(() => {})
    const { rerender } = render(<InboxViewUrlSync />)
    await act(async () => {
      useInboxStore.setState({ selectedId: "c1" })
    })
    // Como Next tras el pushState: `usePathname` ya dice la conversación y la vista se repinta.
    pathname = "/workspace/inbox/c1"
    await act(async () => {
      rerender(<InboxViewUrlSync />)
    })
    await act(async () => {
      useInboxStore.setState({ selectedId: null })
    })
    expect(back).toHaveBeenCalledTimes(1)
    back.mockRestore()
  })

  it("conversationIdFromPath", () => {
    expect(conversationIdFromPath("/workspace/inbox/abc")).toBe("abc")
    expect(conversationIdFromPath("/workspace/inbox")).toBeNull()
    expect(conversationIdFromPath("/crm")).toBeNull()
    expect(conversationIdFromPath(null)).toBeNull()
  })

  describe("IB2-H1 — sobre la bandeja hay como mucho UNA entrada de conversación", () => {
    /** Simula lo que hace Next tras un push/replace: `usePathname` sigue a `location`. */
    async function follow(rerender: (ui: React.ReactElement) => void) {
      pathname = window.location.pathname
      await act(async () => {
        rerender(<InboxViewUrlSync />)
      })
    }

    it("lista → A → B: A se empuja y B la reemplaza; cerrar vuelve atrás UNA vez, a la lista, y no reabre A", async () => {
      const push = jest.spyOn(window.history, "pushState")
      const replaceSpy = jest.spyOn(window.history, "replaceState")
      // «Atrás» de verdad: la entrada de la conversación se descarta y se vuelve a la bandeja.
      const back = jest.spyOn(window.history, "back").mockImplementation(() => {
        window.history.replaceState(null, "", "/workspace/inbox")
      })
      const { rerender } = render(<InboxViewUrlSync />)
      await act(async () => useInboxStore.setState({ selectedId: "A" }))
      await follow(rerender)
      await act(async () => useInboxStore.setState({ selectedId: "B" }))
      await follow(rerender)
      expect(push).toHaveBeenCalledTimes(1)
      expect(push).toHaveBeenLastCalledWith(null, "", "/workspace/inbox/A")
      expect(replaceSpy).toHaveBeenLastCalledWith(null, "", "/workspace/inbox/B")

      select.mockClear()
      await act(async () => useInboxStore.setState({ selectedId: null }))
      await follow(rerender)
      expect(back).toHaveBeenCalledTimes(1)
      expect(window.location.pathname).toBe("/workspace/inbox")
      expect(select).not.toHaveBeenCalledWith("A")
      expect(useInboxStore.getState().selectedId).toBeNull()
      push.mockRestore()
      replaceSpy.mockRestore()
      back.mockRestore()
    })

    it("lista → A → cerrar: igual, a la lista", async () => {
      const back = jest.spyOn(window.history, "back").mockImplementation(() => {
        window.history.replaceState(null, "", "/workspace/inbox")
      })
      const { rerender } = render(<InboxViewUrlSync />)
      await act(async () => useInboxStore.setState({ selectedId: "A" }))
      await follow(rerender)
      await act(async () => useInboxStore.setState({ selectedId: null }))
      await follow(rerender)
      expect(back).toHaveBeenCalledTimes(1)
      expect(window.location.pathname).toBe("/workspace/inbox")
      back.mockRestore()
    })

    it("«Atrás» del navegador tras lista → A → B vuelve a la lista (B reemplazó a A)", async () => {
      const { rerender } = render(<InboxViewUrlSync />)
      await act(async () => useInboxStore.setState({ selectedId: "A" }))
      await follow(rerender)
      await act(async () => useInboxStore.setState({ selectedId: "B" }))
      await follow(rerender)
      // El navegador descarta la única entrada de conversación: queda la bandeja.
      goTo("/workspace/inbox")
      select.mockClear()
      await act(async () => {
        rerender(<InboxViewUrlSync />)
      })
      expect(select).toHaveBeenCalledWith(null)
      expect(select).not.toHaveBeenCalledWith("A")
    })

    it("entrar por el enlace y cerrar reemplaza (no hay entrada nuestra a la que volver)", async () => {
      goTo("/workspace/inbox/c9")
      const back = jest.spyOn(window.history, "back")
      const { rerender } = render(<InboxViewUrlSync />)
      await act(async () => {})
      await act(async () => useInboxStore.setState({ selectedId: null }))
      await follow(rerender)
      expect(back).not.toHaveBeenCalled()
      expect(window.location.pathname).toBe("/workspace/inbox")
      back.mockRestore()
    })
  })
})
