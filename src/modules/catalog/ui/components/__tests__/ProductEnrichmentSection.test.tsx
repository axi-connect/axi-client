import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ProductDTO, ProductEnrichmentDTO } from "@/modules/catalog/domain/product";
import { ProductEnrichmentSection } from "../ProductEnrichmentSection";

const getProductEnrichment = jest.fn();
const regenerateProductEnrichment = jest.fn();
const updateProductEnrichment = jest.fn();
const applySuggestedCategory = jest.fn();
jest.mock("@/modules/catalog/infrastructure/services/product-enrichment-service.adapter", () => ({
  getProductEnrichment: (id: string) => getProductEnrichment(id),
  regenerateProductEnrichment: (id: string) => regenerateProductEnrichment(id),
  updateProductEnrichment: (id: string, dto: unknown) => updateProductEnrichment(id, dto),
  applySuggestedCategory: (id: string) => applySuggestedCategory(id),
}));

const READY: ProductEnrichmentDTO = {
  status: "ready",
  source: "vision",
  description: "Short cargo verde oliva de dril, largo a la rodilla, fit relajado.",
  attributes: { color: "verde oliva", material: "dril", fit: "relajado" },
  attribute_labels: { color: "Color", material: "Material", fit: "Fit" },
  search_terms: ["bermuda", "short", "pantaloneta"],
  suggested_category: { id: "cat-shorts", name: "Shorts y bermudas" },
  locked_category: false,
  vertical_code: "fashion",
  model: "gpt-4o-mini",
  edited_by_user_at: null,
  generated_at: "2026-09-08T20:00:00.000Z",
  error: null,
  skipped_reason: null,
  updated_at: "2026-09-08T20:00:00.000Z",
};

function product(enrichment: ProductEnrichmentDTO | null): ProductDTO {
  return { id: "p1", name: "Short Cargo Verde Oliva", enrichment } as unknown as ProductDTO;
}

describe("ProductEnrichmentSection", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    updateProductEnrichment.mockResolvedValue(undefined);
    regenerateProductEnrichment.mockResolvedValue({ queued: true });
    applySuggestedCategory.mockResolvedValue(undefined);
    getProductEnrichment.mockResolvedValue(READY);
  });

  it("listo: pinta descripción, términos, atributos con etiqueta y la categoría sugerida", () => {
    render(
      <ProductEnrichmentSection product={product(READY)} canManage canApplyCategory onCategoryApplied={jest.fn()} />,
    );
    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción generada, editable")).toHaveValue(READY.description);
    expect(screen.getByText("bermuda")).toBeInTheDocument();
    expect(screen.getByText("Material")).toBeInTheDocument();
    expect(screen.getByLabelText("Material")).toHaveValue("dril");
    expect(screen.getByText("Shorts y bermudas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aplicar categoría/ })).toBeInTheDocument();
  });

  it("sin generar: botón «Generar con IA» que encola manual y pasa a Generando…", async () => {
    render(
      <ProductEnrichmentSection product={product(null)} canManage canApplyCategory onCategoryApplied={jest.fn()} />,
    );
    expect(screen.getByText("Sin generar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Generar con IA/ }));
    await waitFor(() => expect(regenerateProductEnrichment).toHaveBeenCalledWith("p1"));
    expect(screen.getByText("Generando…")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Generando metadatos con IA" })).toBeInTheDocument();
  });

  it("editar un término y guardar manda el PATCH completo y avisa que el automático ya no lo pisa", async () => {
    const setAlert = jest.fn();
    render(
      <ProductEnrichmentSection
        product={product(READY)}
        canManage
        canApplyCategory
        onCategoryApplied={jest.fn()}
        setAlert={setAlert}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quitar short" }));
    const input = screen.getByLabelText("Agregar término");
    fireEvent.change(input, { target: { value: "  Jort " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /Guardar metadatos/ }));
    await waitFor(() =>
      expect(updateProductEnrichment).toHaveBeenCalledWith("p1", {
        description: READY.description,
        search_terms: ["bermuda", "pantaloneta", "jort"],
        attributes: { color: "verde oliva", material: "dril", fit: "relajado" },
      }),
    );
    expect(setAlert).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });

  it("desactivar para este producto: PATCH status disabled", async () => {
    render(
      <ProductEnrichmentSection product={product(READY)} canManage canApplyCategory onCategoryApplied={jest.fn()} />,
    );
    getProductEnrichment.mockResolvedValue({ ...READY, status: "disabled" });
    fireEvent.click(screen.getByRole("button", { name: /Desactivar para este producto/ }));
    await waitFor(() => expect(updateProductEnrichment).toHaveBeenCalledWith("p1", { status: "disabled" }));
    expect(await screen.findByText("Desactivado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Activar de nuevo/ })).toBeInTheDocument();
  });

  it("editado por ti: el badge lo dice y explica que el automático no lo pisa", () => {
    render(
      <ProductEnrichmentSection
        product={product({ ...READY, edited_by_user_at: "2026-09-08T11:42:00.000Z" })}
        canManage
        canApplyCategory
        onCategoryApplied={jest.fn()}
      />,
    );
    expect(screen.getByText("Editado por ti")).toBeInTheDocument();
    expect(screen.getByText(/no se vuelven a generar solos/)).toBeInTheDocument();
  });

  it("aplicar la categoría llama al endpoint y recarga el producto", async () => {
    const onCategoryApplied = jest.fn();
    render(
      <ProductEnrichmentSection product={product(READY)} canManage canApplyCategory onCategoryApplied={onCategoryApplied} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Aplicar categoría/ }));
    await waitFor(() => expect(applySuggestedCategory).toHaveBeenCalledWith("p1"));
    expect(onCategoryApplied).toHaveBeenCalledTimes(1);
  });

  it("espejado de Shopify: se edita, pero «Aplicar categoría» no existe y se explica por qué", () => {
    render(
      <ProductEnrichmentSection
        product={product({ ...READY, locked_category: true })}
        canManage
        canApplyCategory={false}
        onCategoryApplied={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Aplicar categoría/ })).not.toBeInTheDocument();
    expect(screen.getByText(/La categoría la define tu tienda conectada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerar/ })).toBeInTheDocument();
  });

  it("sin permiso de gestión: solo lectura, sin acciones", () => {
    render(
      <ProductEnrichmentSection
        product={product(READY)}
        canManage={false}
        canApplyCategory={false}
        onCategoryApplied={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Regenerar/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Descripción generada, editable")).toHaveAttribute("readonly");
  });

  it("fallo: lo explica y ofrece intentar de nuevo", () => {
    render(
      <ProductEnrichmentSection
        product={product({ ...READY, status: "failed", error: "ai/provider_error" })}
        canManage
        canApplyCategory
        onCategoryApplied={jest.fn()}
      />,
    );
    expect(screen.getByText("No se pudo generar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Intentar de nuevo/ })).toBeInTheDocument();
  });
});
