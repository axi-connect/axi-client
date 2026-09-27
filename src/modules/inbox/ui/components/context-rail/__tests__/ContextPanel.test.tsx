import { act, fireEvent, render, screen } from "@testing-library/react"
import { createPortal } from "react-dom"
import { UserRound, Paperclip } from "lucide-react"
import { ContextPanel } from "../ContextPanel"
import { contextRailButtonId } from "../ContextRail"
import type { ContextPanelDef } from "../registry"
import type { ConversationDTO } from "@/modules/inbox/domain/inbox"

const conversation = { id: "c1", contact: { full_name: "Laura Gómez" } } as unknown as ConversationDTO

// Un panel con un «menú» que va por portal, como los Select/Dropdown reales.
function PanelWithPortal() {
  return (
    <div>
      <p>Cuerpo del panel</p>
      {createPortal(<input aria-label="Menú del panel" />, document.body)}
    </div>
  )
}

const def = (id: string, label: string): ContextPanelDef => ({
  id,
  label,
  icon: id === "contact" ? UserRound : Paperclip,
  Panel: PanelWithPortal,
  useHeading: () => ({ title: `Título de ${label}`, subtitle: "La línea" }),
})
const PANELS = [def("contact", "Contacto"), def("attachments", "Adjuntos")]

function renderPanel(onClose = jest.fn(), onSelect = jest.fn()) {
  // El botón del riel que lo abrió: al cerrar, el foco vuelve aquí.
  const rail = document.createElement("button")
  rail.id = contextRailButtonId("contact")
  document.body.appendChild(rail)
  const utils = render(
    <ContextPanel panel={PANELS[0]} panels={PANELS} conversation={conversation} contactId="k1" contextVersion={0} onClose={onClose} onSelect={onSelect} />,
  )
  return { ...utils, rail, onClose, onSelect }
}

beforeEach(() => {
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0)
    return 0
  })
  document.body.innerHTML = ""
})
afterEach(() => jest.restoreAllMocks())

describe("ContextPanel — el marco del contexto (F4)", () => {
  it("la cabecera dice el tipo, el título y su línea; el cierre es de 36 px con nombre", () => {
    renderPanel()
    expect(screen.getByRole("heading", { name: "Título de Contacto" })).toBeInTheDocument()
    expect(screen.getByText("La línea")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cerrar el panel" })).toHaveClass("size-9")
  })

  it("Escape dentro del panel lo cierra y el foco vuelve a su botón del riel", () => {
    const { onClose, rail } = renderPanel()
    fireEvent.keyDown(screen.getByText("Cuerpo del panel"), { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(rail)
  })

  it("el Escape de un menú del panel (portal) cierra el menú, NO el panel", () => {
    const { onClose } = renderPanel()
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Menú del panel" }), { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()
  })

  it("tocar el velo lo cierra", () => {
    const { onClose } = renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "Cerrar el panel de contexto" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("en el celular, las pestañas cambian de panel", () => {
    const { onSelect } = renderPanel()
    const tabs = screen.getByRole("navigation", { name: "Paneles de contexto" })
    expect(tabs).toHaveTextContent("ContactoAdjuntos")
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Adjuntos" }))
    })
    expect(onSelect).toHaveBeenCalledWith("attachments")
  })
})
