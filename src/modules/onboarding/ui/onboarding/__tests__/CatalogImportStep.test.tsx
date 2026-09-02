import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CatalogImportStep } from "../steps/CatalogImportStep"
import type { CatalogImportDTO, CatalogImportItemDTO } from "@/modules/onboarding/domain/catalog-import"

const createCatalogImport = jest.fn()
const getCatalogImport = jest.fn()
const patchCatalogImportItem = jest.fn()
const commitCatalogImport = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/catalog-import-service.adapter", () => ({
  createCatalogImport: (...args: unknown[]) => createCatalogImport(...args),
  getCatalogImport: (...args: unknown[]) => getCatalogImport(...args),
  patchCatalogImportItem: (...args: unknown[]) => patchCatalogImportItem(...args),
  commitCatalogImport: (...args: unknown[]) => commitCatalogImport(...args),
  cancelCatalogImport: jest.fn(),
}))

const item = (overrides: Partial<CatalogImportItemDTO>): CatalogImportItemDTO => ({
  id: "i1",
  position: 1,
  status: "ready",
  name: "Hamburguesa La Parrilla",
  description: null,
  price_cents: 2490000,
  currency: "COP",
  category: "Platos",
  kind: "product",
  duration_minutes: null,
  variants: [],
  image_urls: [],
  confidence: 0.95,
  source_ref: "Fila 4",
  missing_fields: [],
  duplicate_of_product_id: null,
  error: null,
  ...overrides,
})

const job = (overrides: Partial<CatalogImportDTO>): CatalogImportDTO => ({
  id: "imp1",
  status: "queued",
  filename: "menu-parrilla-2026.xlsx",
  mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  size_bytes: 236_000,
  source_kind: "sheet",
  pages_total: null,
  pages_processed: 0,
  items_total: 0,
  items_ready: 0,
  items_missing_fields: 0,
  items_excluded: 0,
  created_count: 0,
  updated_count: 0,
  skipped_count: 0,
  error: null,
  ai_cost_usd: null,
  started_at: null,
  finished_at: null,
  created_at: "2026-09-01T10:00:00Z",
  ...overrides,
})

const reviewJob = job({
  status: "review_required",
  items_total: 3,
  items: [
    item({ id: "ok" }),
    item({ id: "noprice", name: "Papas rústicas", price_cents: null, status: "missing_fields", missing_fields: ["price_cents"], source_ref: "Fila 12" }),
    item({ id: "low", name: "Limonada de coco", price_cents: 950000, confidence: 0.5, source_ref: "Fila 21" }),
  ],
})

const props = () => ({
  nicheCode: "restaurants",
  initialImportId: null,
  saving: false,
  onBack: jest.fn(),
  onSkip: jest.fn(),
  onDone: jest.fn(),
  onImportStarted: jest.fn(),
})

describe("CatalogImportStep", () => {
  // `resetAllMocks`, no `clearAllMocks`: un `mockResolvedValueOnce` sin consumir
  // en un test se colaría en el siguiente y cambiaría el estado del job.
  beforeEach(() => jest.resetAllMocks())

  it("sube el archivo, sondea el job y llega a la revisión", async () => {
    createCatalogImport.mockResolvedValueOnce(job({ status: "queued" }))
    getCatalogImport.mockResolvedValue(reviewJob)
    const p = props()
    render(<CatalogImportStep {...p} />)

    expect(screen.getByRole("heading", { name: /carga tu catálogo/i })).toBeInTheDocument()
    const input = screen.getByLabelText(/archivo del catálogo/i)
    const file = new File(["a,b"], "menu.xlsx", { type: "text/csv" })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(createCatalogImport).toHaveBeenCalledTimes(1))
    expect(p.onImportStarted).toHaveBeenCalledWith("imp1")
    expect(await screen.findByRole("heading", { name: /revisa lo que encontramos/i })).toBeInTheDocument()
    expect(screen.getByText(/1 necesitan un dato/i)).toBeInTheDocument()
  })

  it("rechaza un formato que no leemos sin llamar al backend", () => {
    render(<CatalogImportStep {...props()} />)
    fireEvent.change(screen.getByLabelText(/archivo del catálogo/i), {
      target: { files: [new File(["x"], "lista.docx", { type: "application/msword" })] },
    })
    expect(screen.getByRole("alert")).toHaveTextContent(/formato/i)
    expect(createCatalogImport).not.toHaveBeenCalled()
  })

  it("reanuda la revisión desde un import guardado, excluye lo incompleto y crea solo lo listo", async () => {
    getCatalogImport.mockResolvedValueOnce(reviewJob)
    patchCatalogImportItem.mockResolvedValue({})
    const committing = job({ ...reviewJob, status: "committing" })
    commitCatalogImport.mockResolvedValueOnce(committing)
    getCatalogImport.mockResolvedValueOnce(job({ status: "completed", created_count: 2, skipped_count: 1 }))
    const p = props()
    render(<CatalogImportStep {...p} initialImportId="imp1" />)

    expect(await screen.findByRole("heading", { name: /revisa lo que encontramos/i })).toBeInTheDocument()
    // Sin precio, la fila bloquea el commit hasta completarla o excluirla.
    expect(screen.getByRole("button", { name: /crear 2 productos/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /excluir los incompletos/i }))
    fireEvent.click(screen.getByRole("button", { name: /crear 2 productos/i }))

    await waitFor(() => expect(commitCatalogImport).toHaveBeenCalledWith("imp1", { create_categories: true, on_duplicate: "skip" }))
    expect(patchCatalogImportItem).toHaveBeenCalledWith("imp1", "noprice", { status: "excluded" })

    expect(await screen.findByRole("heading", { name: /tu catálogo está creado/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
    expect(p.onDone).toHaveBeenCalledWith({ import_id: "imp1", created_count: 2 })
  })

  it("un precio escrito por el usuario habilita la fila y viaja en el PATCH", async () => {
    getCatalogImport.mockResolvedValueOnce(reviewJob)
    patchCatalogImportItem.mockResolvedValue({})
    commitCatalogImport.mockResolvedValueOnce(job({ ...reviewJob, status: "committing" }))
    getCatalogImport.mockResolvedValueOnce(job({ status: "completed", created_count: 3 }))
    render(<CatalogImportStep {...props()} initialImportId="imp1" />)

    await screen.findByRole("heading", { name: /revisa lo que encontramos/i })
    // La fila sin precio es la única con el campo vacío.
    const price = screen.getAllByPlaceholderText(/escribe el precio/i).find((input) => (input as HTMLInputElement).value === "")
    expect(price).toBeDefined()
    fireEvent.change(price as HTMLInputElement, { target: { value: "9.500" } })
    fireEvent.blur(price as HTMLInputElement)

    fireEvent.click(await screen.findByRole("button", { name: /crear 3 productos/i }))
    await waitFor(() => expect(patchCatalogImportItem).toHaveBeenCalledWith("imp1", "noprice", { price_cents: 950000 }))
  })

  it("un archivo ilegible ofrece probar otro o cargar a mano", async () => {
    getCatalogImport.mockResolvedValueOnce(job({ status: "failed", error: { code: "catalog/import_pdf_scanned", message: "PDF escaneado sin texto." } }))
    const p = props()
    render(<CatalogImportStep {...p} initialImportId="imp1" />)

    expect(await screen.findByRole("heading", { name: /no pudimos leer este archivo/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /cargarlo a mano después/i }))
    expect(p.onSkip).toHaveBeenCalled()
  })
})
