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
})
