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
const getEnrichmentStats = jest.fn()
const requestEnrichmentBackfill = jest.fn()
const getClassificationStats = jest.fn()
const requestClassificationBackfill = jest.fn()
jest.mock("@/modules/agents/infrastructure/services/recognition-service.adapter", () => ({
  getRecognitionSettings: () => getRecognitionSettings(),
  updateRecognitionSettings: (dto: unknown) => updateRecognitionSettings(dto),
  getRecognitionUsage: () => getRecognitionUsage(),
  getRecognitionIndexStatus: () => getRecognitionIndexStatus(),
  requestRecognitionReindex: () => requestRecognitionReindex(),
  getEnrichmentStats: () => getEnrichmentStats(),
  requestEnrichmentBackfill: () => requestEnrichmentBackfill(),
  getClassificationStats: () => getClassificationStats(),
  requestClassificationBackfill: () => requestClassificationBackfill(),
}))

const CLASSIFICATION = {
  products: 157,
  categorized: 141,
  automatic: 128,
  tenant_set: 13,
  unresolved: 9,
  pending: 7,
}

const STATS = {
  enabled: true,
  model: "gpt-4o-mini",
  vertical: "fashion",
  products: 158,
  ready: 151,
  pending: 4,
  pending_rate_limited: 0,
  pending_cap: 0,
  failed: 0,
  disabled: 3,
  user_edited: 12,
  monthly_used: 151,
  monthly_cap: 1500,
}

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
    getRecognitionSettings.mockResolvedValue({
      ai_enabled: true,
      enrichment_auto_enabled: true,
      enrichment_vertical: null,
    })
    getEnrichmentStats.mockResolvedValue(STATS)
    requestEnrichmentBackfill.mockResolvedValue({ queued: true })
    getClassificationStats.mockResolvedValue(CLASSIFICATION)
    requestClassificationBackfill.mockResolvedValue({ queued: true })
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
    expect(
      await screen.findByRole("switch", { name: "Activar reconocimiento de producto para la empresa" }),
    ).toBeChecked()
    expect(screen.getByText("Activo")).toBeInTheDocument()
    expect(screen.getByText("57 / 200")).toBeInTheDocument()
    expect(screen.getByText("412")).toBeInTheDocument()
    expect(screen.getByText("/ 420")).toBeInTheDocument()
    expect(screen.getByText(/8 pendientes/)).toBeInTheDocument()
    expect(screen.getByText(/3 productos sin foto/)).toBeInTheDocument()
  })

  it("apagar el switch llama al PUT y avisa; si falla, revierte", async () => {
    render(<RecognitionSettingsView />)
    const toggle = await screen.findByRole("switch", {
      name: "Activar reconocimiento de producto para la empresa",
    })
    fireEvent.click(toggle)
    // El DTO viaja COMPLETO (strict): los flags del enriquecimiento no se pierden
    await waitFor(() =>
      expect(updateRecognitionSettings).toHaveBeenCalledWith({
        ai_enabled: false,
        enrichment_auto_enabled: true,
        enrichment_vertical: null,
      }),
    )
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }))

    updateRecognitionSettings.mockRejectedValueOnce(new Error("500"))
    fireEvent.click(toggle)
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" })))
    expect(
      screen.getByRole("switch", { name: "Activar reconocimiento de producto para la empresa" }),
    ).not.toBeChecked()
  })

  it("metadatos con IA: pinta las cifras y el interruptor automático escribe solo su hoja", async () => {
    render(<RecognitionSettingsView />)
    const auto = await screen.findByRole("switch", { name: "Enriquecer automáticamente el catálogo con IA" })
    expect(auto).toBeChecked()
    expect(screen.getByText("Automático")).toBeInTheDocument()
    expect(screen.getByText("151")).toBeInTheDocument()
    expect(screen.getByText("/ 158")).toBeInTheDocument()
    expect(screen.getByText(/4 pendientes · en curso/)).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText(/Consumo del mes:/)).toBeInTheDocument()
    expect(screen.getByText("151 de 1.500")).toBeInTheDocument()

    fireEvent.click(auto)
    await waitFor(() =>
      expect(updateRecognitionSettings).toHaveBeenCalledWith({
        ai_enabled: true,
        enrichment_auto_enabled: false,
        enrichment_vertical: null,
      }),
    )
    expect(screen.getByText("Bajo demanda")).toBeInTheDocument()
  })

  it("«Enriquecer catálogo» encola el backfill (202)", async () => {
    render(<RecognitionSettingsView />)
    fireEvent.click(await screen.findByRole("button", { name: /Enriquecer catálogo/ }))
    await waitFor(() => expect(requestEnrichmentBackfill).toHaveBeenCalledTimes(1))
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Enriquecimiento en marcha" }))
  })

  it("saturación del proveedor (incidente 2026-09-09): dice que esperan y que se reanudan solos, no «pendientes»", async () => {
    getEnrichmentStats.mockResolvedValue({
      ...STATS,
      ready: 50,
      pending: 107,
      pending_rate_limited: 107,
      failed: 0,
      disabled: 0,
      products: 157,
    })
    render(<RecognitionSettingsView />)
    expect(
      await screen.findByText(/107 en espera por el límite del proveedor · se reanudan solos/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/pendientes · en curso/)).not.toBeInTheDocument()
  })

  it("pendientes por tope y fallidos se desglosan en la misma nota", async () => {
    getEnrichmentStats.mockResolvedValue({
      ...STATS,
      ready: 100,
      pending: 50,
      pending_rate_limited: 0,
      pending_cap: 40,
      failed: 2,
      disabled: 0,
      products: 158,
    })
    render(<RecognitionSettingsView />)
    expect(await screen.findByText(/40 esperan al tope del mes/)).toBeInTheDocument()
    expect(screen.getByText(/18 pendientes · en curso/)).toBeInTheDocument()
    expect(screen.getByText(/2 fallidos/)).toBeInTheDocument()
  })

  it("tope del mes alcanzado: lo dice y promete lo que el cron hace (retomar el próximo mes)", async () => {
    getEnrichmentStats.mockResolvedValue({ ...STATS, monthly_used: 1500 })
    render(<RecognitionSettingsView />)
    expect(await screen.findByText(/Tope del mes alcanzado/)).toBeInTheDocument()
    expect(screen.getByText(/próximo mes/)).toBeInTheDocument()
  })

  it("metadatos apagados en la plataforma: botón deshabilitado y explicación", async () => {
    getEnrichmentStats.mockResolvedValue({ ...STATS, enabled: false })
    render(<RecognitionSettingsView />)
    expect(await screen.findByRole("button", { name: /Enriquecer catálogo/ })).toBeDisabled()
    expect(screen.getByText(/no están disponibles en la plataforma/)).toBeInTheDocument()
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
  it("clasificación automática: pinta las cifras, el interruptor escribe solo su hoja y «Clasificar catálogo» encola", async () => {
    render(<RecognitionSettingsView />)
    await screen.findByText("Clasificación automática")
    expect(screen.getByText("141")).toBeInTheDocument()
    expect(screen.getByText(/9 sin resolver · elígelas a mano/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("switch", { name: "Clasificar automáticamente el catálogo" }))
    await waitFor(() => expect(updateRecognitionSettings).toHaveBeenCalled())
    expect(updateRecognitionSettings.mock.calls.at(-1)?.[0]).toMatchObject({
      ai_enabled: true,
      enrichment_auto_enabled: true,
      classification_auto_enabled: false,
    })

    fireEvent.click(screen.getByRole("button", { name: /Clasificar catálogo/ }))
    await waitFor(() => expect(requestClassificationBackfill).toHaveBeenCalledTimes(1))
  })
})
