import { fireEvent, render, screen, waitFor } from "@testing-library/react"

const mockSummary = {
  search_id: "s-1",
  label: "Hoteles boutique en Cartagena",
  leads: 38,
  with_email: 38,
  with_phone: 31,
  suggested_image: "nicho:hoteles",
  sample_businesses: ["Casa Almendro Hotel", "Hotel Nácar"],
}
const mockSequences = [
  {
    id: "seq-1",
    name: "Hoteles boutique",
    is_active: true,
    steps: [
      { task_channel: "email", offset_hours: 0, message_template: { subject: "reservas directas", body: "Hola" } },
      { task_channel: "message", offset_hours: 24, message_template: null },
      { task_channel: "email", offset_hours: 72, message_template: { subject: "Re: reservas directas", body: "Con números" } },
    ],
  },
]
const mockLook = {
  image: null,
  email_design: "text",
  cta: null,
  whatsapp: {
    template_name: "axi_prospeccion_hoteles_v2",
    approval_status: "approved",
    has_image_header: true,
    body: "Ayudamos a hoteles como {{1}}.",
    params: ["company_name"],
    topic: null,
  },
}
const mockImages = [
  { id: "nicho:hoteles", label: "Hoteles", kind: "niche", url: "https://api.axi.test/i/h.jpg" },
  { id: "nicho:ropa", label: "Ropa", kind: "niche", url: "https://api.axi.test/i/r.jpg" },
]
const mockEnroll = jest.fn()

jest.mock("@/modules/prospecting/infrastructure/services/search-outreach.adapter", () => ({
  getSearchOutreach: () => Promise.resolve(mockSummary),
  listSequenceOptions: () => Promise.resolve(mockSequences),
  listOutreachImages: () => Promise.resolve(mockImages),
  getSequenceLook: () => Promise.resolve(mockLook),
  outreachImageUrl: () => Promise.resolve("https://api.axi.test/i/h-casa.jpg"),
  previewEmail: () =>
    Promise.resolve({ subject: "reservas directas", html: "<p>Hola</p>", text: "Hola", sender_name: "Cristian · Axi", sample: true }),
  sendTestEmail: () => Promise.resolve({ sent_to: "cristian@ejemplo.com" }),
  uploadOutreachImage: jest.fn(),
  enrollSearch: (...args: unknown[]) => mockEnroll(...args),
}))

const mockHasPermission = jest.fn<boolean, [string]>()
jest.mock("@/core/providers/auth-provider", () => ({
  useAuthContext: () => ({ hasPermission: (p: string) => mockHasPermission(p) }),
}))
const mockShowAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: mockShowAlert }) }))

import { WriteToSearchView } from "../WriteToSearchView"

describe("WriteToSearchView («Escribirles», B2)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockReturnValue(true)
  })

  it("abre con la imagen del nicho elegida, la plantilla de WhatsApp y los toques", async () => {
    render(<WriteToSearchView searchId="s-1" />)
    expect(await screen.findByRole("heading", { name: "Escribirles a 38 negocios" })).toBeInTheDocument()
    expect(await screen.findByRole("radio", { name: /Hoteles/ })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByText("axi_prospeccion_hoteles_v2")).toBeInTheDocument()
    expect(screen.getByText("31 con celular")).toBeInTheDocument()
    expect(screen.getByText("Correo «Re:»")).toBeInTheDocument()
    expect(await screen.findByText("Ayudamos a hoteles como Casa Almendro Hotel.")).toBeInTheDocument()
  })

  it("inscribir pide confirmar y manda el look elegido", async () => {
    mockEnroll.mockResolvedValue({ leads: 38, promoted: 38, enrolled: 36, skipped: { opted_out: 2 } })
    render(<WriteToSearchView searchId="s-1" />)
    fireEvent.click(await screen.findByRole("button", { name: "Inscribir 38 negocios" }))
    expect(screen.getByText(/¿Inscribir 38 negocios en «Hoteles boutique»\?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Sí, inscribir" }))
    await waitFor(() =>
      expect(mockEnroll).toHaveBeenCalledWith("s-1", "seq-1", {
        image_id: "nicho:hoteles",
        personalize: false,
        email_design: "text",
        cta: null,
      }),
    )
    expect(await screen.findByText(/Inscribiste 36 de 38 negocios\. No entraron: 2 se dieron de baja\./)).toBeInTheDocument()
  })

  it("sin permiso de automatizar se ve, pero no se inscribe ni se sube nada", async () => {
    mockHasPermission.mockReturnValue(false)
    render(<WriteToSearchView searchId="s-1" />)
    await screen.findByRole("heading", { name: "Escribirles a 38 negocios" })
    expect(screen.queryByRole("button", { name: /Inscribir/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Subir" })).not.toBeInTheDocument()
  })
})
