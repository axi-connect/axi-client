import { render, screen } from "@testing-library/react"
import type { ProductRecognition } from "@/modules/inbox/domain/inbox"
import { ProductRecognitionChip } from "../ProductRecognitionChip"

const candidate = (over: Partial<ProductRecognition["candidates"] extends (infer T)[] | undefined ? T : never> = {}) => ({
  product_id: "p1",
  sku: "VL-M",
  name: "Vestido Luna",
  score: 0.93,
  confidence: "high" as const,
  has_image: true,
  price_cents: 8_990_000,
  currency: "COP",
  available: true,
  ...over,
})

describe("ProductRecognitionChip", () => {
  it("foto reciente sin análisis → «Analizando la foto…»", () => {
    render(<ProductRecognitionChip recognition={null} createdAt={new Date().toISOString()} />)
    expect(screen.getByLabelText("Analizando la foto")).toBeInTheDocument()
  })

  it("foto vieja sin análisis → nada (el análisis nunca llegó o no aplicaba)", () => {
    const { container } = render(
      <ProductRecognitionChip recognition={null} createdAt={new Date(Date.now() - 60_000).toISOString()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("producto con coincidencias: descripción, nombre, sku, precio es-CO y confianza", () => {
    render(
      <ProductRecognitionChip
        recognition={{
          status: "done",
          kind: "product",
          description: "Vestido midi rojo de tirantes",
          candidates: [candidate(), candidate({ product_id: "p2", sku: "VS-M", name: "Vestido Sol", score: 0.61, confidence: "low", available: false })],
        }}
        createdAt={new Date().toISOString()}
      />,
    )
    expect(screen.getByText("Producto reconocido")).toBeInTheDocument()
    expect(screen.getByText("Vestido midi rojo de tirantes")).toBeInTheDocument()
    expect(screen.getByText("Vestido Luna")).toBeInTheDocument()
    expect(screen.getByText("VL-M")).toBeInTheDocument()
    expect(screen.getAllByText(/89\.900/)).toHaveLength(2)
    expect(screen.getByLabelText(/Confianza alta, similitud 93 %/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Confianza baja, similitud 61 %/)).toHaveTextContent("agotado")
  })

  it("producto sin coincidencias lo dice, en vez de callarse", () => {
    render(
      <ProductRecognitionChip
        recognition={{ status: "done", kind: "product", description: "Un carro rojo", candidates: [] }}
        createdAt={new Date().toISOString()}
      />,
    )
    expect(screen.getByText(/Sin coincidencias en el catálogo/)).toBeInTheDocument()
  })

  it("comprobante: se etiqueta como tal y no propone productos", () => {
    render(
      <ProductRecognitionChip
        recognition={{ status: "done", kind: "receipt", description: "Transferencia Nequi por 89.900" }}
        createdAt={new Date().toISOString()}
      />,
    )
    expect(screen.getByText("Comprobante de pago")).toBeInTheDocument()
    expect(screen.queryByText("Producto reconocido")).not.toBeInTheDocument()
  })

  it("skipped (cuota, tenant apagado) y failed → nada", () => {
    const { container, rerender } = render(
      <ProductRecognitionChip
        recognition={{ status: "skipped", skip_reason: "quota" }}
        createdAt={new Date().toISOString()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
    rerender(
      <ProductRecognitionChip recognition={{ status: "failed" }} createdAt={new Date().toISOString()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
