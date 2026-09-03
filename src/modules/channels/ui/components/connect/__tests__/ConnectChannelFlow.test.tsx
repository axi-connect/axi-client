import { fireEvent, render, screen } from "@testing-library/react"

import { ConnectChannelFlow } from "../ConnectChannelFlow"
import { ConnectChannelView } from "../ConnectChannelView"

const push = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: jest.fn() }) }))

// La página lleva el gate de correo: aquí el usuario ya lo tiene verificado
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ user: { email: "ana@axi.co", email_verified: true }, refresh: jest.fn() }),
}))

// Los sub-pasos reales hablan con Meta y con el store de canales: aquí se
// doblan por lo mínimo que el flujo necesita de cada uno. El REGISTRY es el
// real: qué botón toca a cada proveedor lo decide `domain/`, y eso es parte de
// lo que se prueba — antes se mockeaba con una estrategia inexistente
// ("embedded") y el flujo pasaba en verde sin ejercitar ninguna rama real.
jest.mock("../ProviderGallery", () => {
  const { channelProvider } = jest.requireActual("@/modules/channels/domain/channel-providers")
  return {
    ProviderGallery: ({ onSelect }: { onSelect: (provider: unknown) => void }) => (
      <>
        <button type="button" onClick={() => onSelect(channelProvider("whatsapp_cloud"))}>
          Elegir WhatsApp
        </button>
        <button type="button" onClick={() => onSelect(channelProvider("instagram_dm"))}>
          Elegir Instagram
        </button>
        <button
          type="button"
          onClick={() =>
            onSelect({ ...channelProvider("facebook_messenger"), availability: "manual_only" })
          }
        >
          Elegir Messenger manual
        </button>
      </>
    ),
  }
})
jest.mock("../PrerequisitesChecklist", () => ({
  PrerequisitesChecklist: ({ onContinue }: { onContinue: () => void }) => (
    <button type="button" onClick={onContinue}>
      Requisitos listos
    </button>
  ),
}))
jest.mock("../EmbeddedSignupButton", () => ({
  EmbeddedSignupButton: ({ onConnected }: { onConnected: (channel: unknown) => void }) => (
    <button type="button" onClick={() => onConnected({ id: "ch1", kind: "whatsapp_cloud", name: "Mi número" })}>
      Autorizar en Meta
    </button>
  ),
}))
jest.mock("../PageSignupButton", () => ({
  PageSignupButton: ({ provider }: { provider: { label: string } }) => <p>botón de páginas: {provider.label}</p>,
}))
jest.mock("../ManualCredentialsFallback", () => ({
  ManualCredentialsFallback: ({ kind, prominent }: { kind?: string; prominent?: boolean }) => (
    <p>
      manual: {kind ?? "sin kind"} {prominent ? "(destacado)" : ""}
    </p>
  ),
}))
jest.mock("../ConnectSuccess", () => ({
  ConnectSuccess: ({ channel }: { channel: { name: string } }) => <p>Conectado: {channel.name}</p>,
}))

async function walkToSuccess() {
  fireEvent.click(screen.getByRole("button", { name: /elegir whatsapp/i }))
  fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }))
  fireEvent.click(screen.getByRole("button", { name: /requisitos listos/i }))
  fireEvent.click(screen.getByRole("button", { name: /autorizar en meta/i }))
}

describe("ConnectChannelFlow", () => {
  beforeEach(() => jest.clearAllMocks())

  it("recorre los cuatro pasos y avisa del canal conectado a quien lo embebe", async () => {
    const onConnected = jest.fn()
    render(<ConnectChannelFlow embedded onConnected={onConnected} onManualCreated={jest.fn()} />)

    expect(screen.getByRole("heading", { level: 2, name: /conectar un canal/i })).toBeInTheDocument()
    await walkToSuccess()

    expect(onConnected).toHaveBeenCalledWith(expect.objectContaining({ id: "ch1" }))
    expect(screen.getByRole("heading", { level: 2, name: /todo listo/i })).toBeInTheDocument()
    expect(screen.getByText(/conectado: mi número/i)).toBeInTheDocument()
  })

  it("Instagram va por el botón de páginas, no por el de WhatsApp", () => {
    render(<ConnectChannelFlow onManualCreated={jest.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: /elegir instagram/i }))
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }))
    fireEvent.click(screen.getByRole("button", { name: /requisitos listos/i }))

    expect(screen.getByText(/botón de páginas: instagram/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /autorizar en meta/i })).toBeNull()
    expect(screen.getByRole("heading", { level: 1, name: /conecta instagram/i })).toBeInTheDocument()
  })

  it("un proveedor sin alta por botón va al camino manual con SU kind", () => {
    // `manualKind` fija el proveedor elegido en el paso 1: antes el ternario de
    // la vista mandaba cualquier cosa que no fuera Instagram a Messenger
    render(<ConnectChannelFlow onManualCreated={jest.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: /elegir messenger manual/i }))
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }))
    fireEvent.click(screen.getByRole("button", { name: /requisitos listos/i }))

    expect(screen.getByText(/manual: facebook_messenger \(destacado\)/i)).toBeInTheDocument()
    expect(screen.getByText(/se conecta con las credenciales de tu app de meta/i)).toBeInTheDocument()
  })

  it("con `only` de un solo proveedor se salta el paso «Canal»: elegir entre uno no informa de nada", () => {
    render(<ConnectChannelFlow embedded only={["whatsapp_cloud"]} onManualCreated={jest.fn()} />)

    expect(screen.getByRole("heading", { level: 2, name: /antes de empezar/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /elegir/i })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /requisitos listos/i }))
    expect(screen.getByRole("heading", { level: 2, name: /conecta whatsapp/i })).toBeInTheDocument()
  })

  it("la página de Canales sigue igual: enlace de vuelta, h1 y el mismo flujo", async () => {
    render(<ConnectChannelView />)

    expect(screen.getByRole("link", { name: /canales/i })).toHaveAttribute("href", "/settings/channels")
    expect(screen.getByRole("heading", { level: 1, name: /conectar un canal/i })).toBeInTheDocument()
    await walkToSuccess()
    expect(screen.getByRole("heading", { level: 1, name: /todo listo/i })).toBeInTheDocument()
  })
})
