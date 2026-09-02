import { fireEvent, render, screen } from "@testing-library/react"

import { ConnectChannelFlow } from "../ConnectChannelFlow"
import { ConnectChannelView } from "../ConnectChannelView"

const push = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: jest.fn() }) }))

// Los sub-pasos reales hablan con Meta y con el store de canales: aquí se
// doblan por lo mínimo que el flujo necesita de cada uno.
const whatsapp = { kind: "whatsapp_cloud", label: "WhatsApp", meta_product: "whatsapp" }
jest.mock("../ProviderGallery", () => ({
  ProviderGallery: ({ onSelect }: { onSelect: (provider: unknown) => void }) => (
    <button type="button" onClick={() => onSelect(whatsapp)}>
      Elegir WhatsApp
    </button>
  ),
}))
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
jest.mock("../PageSignupButton", () => ({ PageSignupButton: () => null }))
jest.mock("../ManualCredentialsFallback", () => ({ ManualCredentialsFallback: () => null }))
jest.mock("../QrPairingPanel", () => ({ QrPairingPanel: () => null }))
jest.mock("../ConnectSuccess", () => ({
  ConnectSuccess: ({ channel }: { channel: { name: string } }) => <p>Conectado: {channel.name}</p>,
}))
jest.mock("@/modules/channels/domain/channel-providers", () => ({
  effectiveConnectStrategy: () => "embedded",
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

  it("la página de Canales sigue igual: enlace de vuelta, h1 y el mismo flujo", async () => {
    render(<ConnectChannelView />)

    expect(screen.getByRole("link", { name: /canales/i })).toHaveAttribute("href", "/settings/channels")
    expect(screen.getByRole("heading", { level: 1, name: /conectar un canal/i })).toBeInTheDocument()
    await walkToSuccess()
    expect(screen.getByRole("heading", { level: 1, name: /todo listo/i })).toBeInTheDocument()
  })
})
