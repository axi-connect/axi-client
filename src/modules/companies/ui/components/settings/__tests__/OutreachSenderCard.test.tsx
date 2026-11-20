import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import type { OutreachSenderDTO, UpdateOutreachSignatureDTO } from "@/modules/companies/domain/company"

const EMPTY = { person_name: null, title: null, photo_url: null, phone: null, website: null }

const sender = (overrides: Partial<OutreachSenderDTO> = {}): OutreachSenderDTO => ({
  address: "axiconnect@comercial.axi-connect.co",
  from_name: "Axi Connect",
  display_name: "Axi Connect",
  paused: false,
  pause_reason: null,
  signature: EMPTY,
  ...overrides,
})

const mockGet = jest.fn<Promise<OutreachSenderDTO>, []>()
const mockPut = jest.fn<Promise<unknown>, [UpdateOutreachSignatureDTO]>()
jest.mock("@/modules/companies/infrastructure/services/company-service.adapter", () => ({
  getOutreachSender: () => mockGet(),
  updateOutreachSignature: (dto: UpdateOutreachSignatureDTO) => mockPut(dto),
}))

const mockHasPermission = jest.fn<boolean, [string]>()
jest.mock("@/core/providers/auth-provider", () => ({
  useAuthContext: () => ({ hasPermission: (p: string) => mockHasPermission(p) }),
}))

const mockShowAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}))

import { OutreachSenderCard } from "@/modules/companies/ui/components/settings/OutreachSenderCard"

describe("OutreachSenderCard · quién firma (B2)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockReturnValue(true)
  })

  it("sin firma: firma el negocio y se invita a agregar la persona", async () => {
    mockGet.mockResolvedValue(sender())
    render(<OutreachSenderCard />)
    expect(await screen.findByText("Sin persona: firma el negocio")).toBeInTheDocument()
    expect(screen.getByText(/firmado por una persona se lee como un correo/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Agregar firma" })).toBeInTheDocument()
    expect(screen.queryByText(/sender_name/)).not.toBeInTheDocument()
  })

  it("con firma: la vista previa y el remitente visible muestran a la persona", async () => {
    mockGet.mockResolvedValue(
      sender({
        display_name: "Cristian Velásquez · Axi Connect",
        signature: { ...EMPTY, person_name: "Cristian Velásquez", title: "Fundador y CTO", website: "https://axi-connect.co/" },
      }),
    )
    render(<OutreachSenderCard />)
    expect(await screen.findByText("Cristian Velásquez · Axi Connect")).toBeInTheDocument()
    expect(screen.getByText("Fundador y CTO · Axi Connect")).toBeInTheDocument()
    expect(screen.getByText("axi-connect.co")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Editar firma" })).toBeInTheDocument()
  })

  it("sin permiso de gestionar la empresa no se ofrece editar", async () => {
    mockHasPermission.mockReturnValue(false)
    mockGet.mockResolvedValue(sender())
    render(<OutreachSenderCard />)
    await screen.findByText("Sin persona: firma el negocio")
    expect(screen.queryByRole("button", { name: "Agregar firma" })).not.toBeInTheDocument()
  })

  it("editar: foto sin https bloquea Guardar; con https guarda la firma entera", async () => {
    mockGet.mockResolvedValueOnce(sender())
    render(<OutreachSenderCard />)
    fireEvent.click(await screen.findByRole("button", { name: "Agregar firma" }))

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Cristian Velásquez" } })
    fireEvent.change(screen.getByLabelText("Foto (URL)"), { target: { value: "http://x.co/a.jpg" } })
    // Mientras se escribe no grita; al salir del campo, sí.
    expect(screen.queryByText("Debe ser una dirección https://")).not.toBeInTheDocument()
    fireEvent.blur(screen.getByLabelText("Foto (URL)"))
    expect(screen.getByText("Debe ser una dirección https://")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Guardar firma" }))
    expect(screen.getByRole("button", { name: "Guardar firma" })).toBeDisabled()
    expect(mockPut).not.toHaveBeenCalled()

    // El sitio se escribe como se dice: va con https://.
    fireEvent.change(screen.getByLabelText("Sitio web"), { target: { value: "axi-connect.co" } })

    fireEvent.change(screen.getByLabelText("Foto (URL)"), { target: { value: "https://x.co/a.jpg" } })
    mockPut.mockResolvedValue({})
    mockGet.mockResolvedValueOnce(
      sender({ display_name: "Cristian Velásquez · Axi Connect", signature: { ...EMPTY, person_name: "Cristian Velásquez", photo_url: "https://x.co/a.jpg" } }),
    )
    fireEvent.click(screen.getByRole("button", { name: "Guardar firma" }))

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith({
        person_name: "Cristian Velásquez",
        title: null,
        photo_url: "https://x.co/a.jpg",
        phone: null,
        website: "https://axi-connect.co",
      }),
    )
    expect(await screen.findByText("Cristian Velásquez · Axi Connect")).toBeInTheDocument()
    expect(mockShowAlert).toHaveBeenCalledWith({ tone: "success", title: "Firma guardada" })
  })

  it("si la API no responde, la tarjeta no estorba", async () => {
    mockGet.mockRejectedValue(new Error("403"))
    const { container } = render(<OutreachSenderCard />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it("si guardó pero la recarga falla, no dice que falló: pinta la firma guardada", async () => {
    mockGet.mockResolvedValueOnce(sender())
    render(<OutreachSenderCard />)
    fireEvent.click(await screen.findByRole("button", { name: "Agregar firma" }))
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana Ruiz" } })
    mockPut.mockResolvedValue({ ...EMPTY, person_name: "Ana Ruiz" })
    mockGet.mockRejectedValueOnce(new Error("503"))
    fireEvent.click(screen.getByRole("button", { name: "Guardar firma" }))
    expect(await screen.findByText("Ana Ruiz · Axi Connect")).toBeInTheDocument()
    expect(mockShowAlert).toHaveBeenCalledWith({ tone: "success", title: "Firma guardada" })
    expect(mockShowAlert).not.toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }))
  })

  it("sin permiso tampoco se le pide «agrega quién escribe»", async () => {
    mockHasPermission.mockReturnValue(false)
    mockGet.mockResolvedValue(sender())
    render(<OutreachSenderCard />)
    await screen.findByText("Sin persona: firma el negocio")
    expect(screen.queryByText(/Agrega quién escribe/)).not.toBeInTheDocument()
  })
})
