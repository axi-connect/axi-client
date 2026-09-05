import { fireEvent, render, screen } from "@testing-library/react"

import { CatalogScan } from "../CatalogScan"
import type { CatalogImportDTO } from "@/modules/onboarding/domain/catalog-import"

const job = (overrides: Partial<CatalogImportDTO>): CatalogImportDTO => ({
  id: "imp1",
  status: "parsing",
  file_name: "carta-joaos.pdf",
  source_kind: "pdf",
  catalog_id: null,
  size_bytes: 1_200_000,
  pages_total: 0,
  pages_processed: 0,
  items_total: 0,
  items_ready: 0,
  items_missing: 0,
  items_committed: 0,
  items_created: 0,
  items_updated: 0,
  items_skipped: 0,
  error: null,
  ai_cost_usd: 0,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
  ...overrides,
})

const noop = () => {}

describe("CatalogScan", () => {
  it("con páginas informadas el haz es determinado y la barra dice cuánto lleva", () => {
    render(<CatalogScan job={job({ pages_total: 4, pages_processed: 2 })} stalled={false} onKeepWaiting={noop} onContinueLater={noop} />)
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "50")
    expect(bar).toHaveAttribute("aria-valuetext", "Leyendo página 2 de 4")
    expect(bar.querySelector(".flow-scan-beam--sweep")).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("Leyendo página 2 de 4")
  })

  it("sin páginas el haz barre y no hay avance numérico", () => {
    render(<CatalogScan job={job({ status: "queued" })} stalled={false} onKeepWaiting={noop} onContinueLater={noop} />)
    const bar = screen.getByRole("progressbar")
    expect(bar).not.toHaveAttribute("aria-valuenow")
    expect(bar.querySelector(".flow-scan-beam--sweep")).not.toBeNull()
    expect(screen.getByText("Analizando")).toBeInTheDocument()
  })

  it("muestra hasta seis productos encontrados y resume el resto", () => {
    render(<CatalogScan job={job({ status: "extracting", items_total: 9 })} stalled={false} onKeepWaiting={noop} onContinueLater={noop} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(6)
    expect(screen.getByText("y 3 más")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("9 productos encontrados hasta ahora")
  })

  it("cuando tarda más de lo normal detiene el haz y ofrece las dos salidas", () => {
    const keep = jest.fn()
    const later = jest.fn()
    render(<CatalogScan job={job({ status: "extracting", items_total: 2 })} stalled onKeepWaiting={keep} onContinueLater={later} />)
    expect(screen.getByText("Tardando más")).toBeInTheDocument()
    expect(screen.getByRole("progressbar").querySelector(".flow-scan-beam--paused")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /seguir esperando/i }))
    fireEvent.click(screen.getByRole("button", { name: /continuar con los agentes/i }))
    expect(keep).toHaveBeenCalledTimes(1)
    expect(later).toHaveBeenCalledTimes(1)
  })
})
