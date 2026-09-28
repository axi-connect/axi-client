import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QuickActionsMenu } from "../QuickActionsMenu"
import { useQuickActionsStore } from "@/modules/quick-actions/infrastructure/stores/quick-actions.store"
import type { QuickActionDTO } from "@/modules/quick-actions/domain/quick-action"

jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))

const action = (over: Partial<QuickActionDTO>): QuickActionDTO =>
  ({
    id: "qa1",
    name: "Link de pago",
    description: "Te comparto el link de pago",
    type: "canned_response",
    body: "Te comparto el link de pago de tu reserva.",
    assets: [],
    template_name: null,
    template_language: null,
    interactive_payload: null,
    ...over,
  }) as unknown as QuickActionDTO

const ACTIONS = [
  action({}),
  action({ id: "qa2", name: "seguimiento_cotizacion", description: "Plantilla", type: "whatsapp_template", body: null, template_name: "seguimiento_cotizacion", template_language: "es_CO" }),
]

function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  useQuickActionsStore.setState({ actions: ACTIONS, loaded: true, loading: false })
})

describe("QuickActionsMenu — ver lo que sale y enviar en el mismo lugar (F3)", () => {
  it("escritorio: elegir en la lista solo cambia la vista previa; enviar exige «Enviar a Laura»", async () => {
    setWide(true)
    const onExecute = jest.fn(async () => {})
    const onOpenChange = jest.fn()
    render(
      <QuickActionsMenu open onOpenChange={onOpenChange} mode="all" contactName="Laura Gómez" onExecute={onExecute}>
        <div>composer</div>
      </QuickActionsMenu>,
    )
    fireEvent.click(screen.getByRole("option", { name: /Link de pago/ }))
    expect(onExecute).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Vista previa")).toHaveTextContent("Te comparto el link de pago de tu reserva.")
    fireEvent.click(screen.getByRole("button", { name: /Enviar a Laura/ }))
    await waitFor(() => expect(onExecute).toHaveBeenCalledWith(ACTIONS[0]))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("fuera de ventana: solo las plantillas se eligen; lo demás se ve apagado bajo «Fuera de la ventana»", () => {
    setWide(true)
    render(
      <QuickActionsMenu open onOpenChange={jest.fn()} mode="templates" contactName="Laura Gómez" onExecute={jest.fn()}>
        <div>composer</div>
      </QuickActionsMenu>,
    )
    expect(screen.getAllByRole("option")).toHaveLength(1)
    expect(screen.getByRole("option", { name: /seguimiento_cotizacion/ })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Fuera de la ventana" })).toHaveTextContent("Link de pago")
    expect(screen.getByLabelText("Vista previa")).toHaveTextContent("Plantilla aprobada por Meta · es_CO")
  })

  it("celular: tocar abre la vista previa (no envía) y se puede volver", async () => {
    setWide(false)
    const onExecute = jest.fn(async () => {})
    render(
      <QuickActionsMenu open onOpenChange={jest.fn()} mode="all" contactName="Laura Gómez" onExecute={onExecute}>
        <div>composer</div>
      </QuickActionsMenu>,
    )
    fireEvent.click(screen.getByRole("option", { name: /Link de pago/ }))
    expect(onExecute).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /Enviar a Laura/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Acciones" }))
    expect(screen.getByRole("option", { name: /Link de pago/ })).toBeInTheDocument()
  })
})
