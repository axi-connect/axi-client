import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { RecognitionSettingsView } from "../RecognitionSettingsView"

const showAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}))

const getRecognitionSettings = jest.fn()
const updateRecognitionSettings = jest.fn()
const getRecognitionUsage = jest.fn()
const getRecognitionIndexStatus = jest.fn()
const requestRecognitionReindex = jest.fn()
jest.mock("@/modules/agents/infrastructure/services/recognition-service.adapter", () => ({
  getRecognitionSettings: () => getRecognitionSettings(),
  updateRecognitionSettings: (dto: unknown) => updateRecognitionSettings(dto),
  getRecognitionUsage: () => getRecognitionUsage(),
  getRecognitionIndexStatus: () => getRecognitionIndexStatus(),
  requestRecognitionReindex: () => requestRecognitionReindex(),
}))

const INDEX = {
  enabled: true,
  model: "voyage-multimodal-3.5",
  products: 420,
  products_indexed: 412,
  images: 806,
  images_indexed: 806,
  products_without_photo: 3,
}

describe("RecognitionSettingsView", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    getRecognitionSettings.mockResolvedValue({ ai_enabled: true })
    getRecognitionUsage.mockResolvedValue({
      metric: "product_recognitions",
      used: 57,
      limit: { value: 200, pct_used: 28.5 },
    })
    getRecognitionIndexStatus.mockResolvedValue(INDEX)
    updateRecognitionSettings.mockResolvedValue(undefined)
    requestRecognitionReindex.mockResolvedValue({ queued: true })
  })

  it("pinta el switch, el consumo del ciclo y el estado del índice con las cifras reales", async () => {
    render(<RecognitionSettingsView />)
    expect(await screen.findByRole("switch")).toBeChecked()
    expect(screen.getByText("Activo")).toBeInTheDocument()
    expect(screen.getByText("57 / 200")).toBeInTheDocument()
    expect(screen.getByText("412")).toBeInTheDocument()
    expect(screen.getByText("/ 420")).toBeInTheDocument()
    expect(screen.getByText(/8 pendientes/)).toBeInTheDocument()
    expect(screen.getByText(/3 productos sin foto/)).toBeInTheDocument()
  })

  it("apagar el switch llama al PUT y avisa; si falla, revierte", async () => {
    render(<RecognitionSettingsView />)
    const toggle = await screen.findByRole("switch")
    fireEvent.click(toggle)
    await waitFor(() => expect(updateRecognitionSettings).toHaveBeenCalledWith({ ai_enabled: false }))
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }))

    updateRecognitionSettings.mockRejectedValueOnce(new Error("500"))
    fireEvent.click(toggle)
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" })))
    expect(screen.getByRole("switch")).not.toBeChecked()
  })

  it("«Indexar ahora» encola el reindexado", async () => {
    render(<RecognitionSettingsView />)
    fireEvent.click(await screen.findByRole("button", { name: /Indexar ahora/ }))
    await waitFor(() => expect(requestRecognitionReindex).toHaveBeenCalledTimes(1))
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Indexación en marcha" }))
  })

  it("cuota agotada: badge «En pausa» y aviso que dice qué pasa con las fotos", async () => {
    getRecognitionUsage.mockResolvedValue({
      metric: "product_recognitions",
      used: 200,
      limit: { value: 200, pct_used: 100 },
    })
    render(<RecognitionSettingsView />)
    expect(await screen.findByText("En pausa")).toBeInTheDocument()
    expect(screen.getByText(/Cuota de reconocimientos agotada/)).toBeInTheDocument()
  })

  it("reconocimiento no disponible en la plataforma: el botón se deshabilita y se explica", async () => {
    getRecognitionIndexStatus.mockResolvedValue({ ...INDEX, enabled: false })
    render(<RecognitionSettingsView />)
    expect(await screen.findByRole("button", { name: /Indexar ahora/ })).toBeDisabled()
    expect(screen.getByText(/no está disponible en la plataforma/)).toBeInTheDocument()
  })

  it("si la configuración no carga, muestra el error y nada más", async () => {
    // errorMessage() muestra el mensaje real del error cuando lo hay; el
    // fallback «No se pudo cargar…» solo aparece con errores sin mensaje
    getRecognitionSettings.mockRejectedValue(new Error("Sin permiso para ver esta sección"))
    render(<RecognitionSettingsView />)
    expect(await screen.findByText("Sin permiso para ver esta sección")).toBeInTheDocument()
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })
})
