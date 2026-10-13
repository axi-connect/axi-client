import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ProductDTO, ProductImageDTO, ProductVariantDTO } from "@/modules/catalog/domain/product";

jest.mock("@/core/hooks/use-mobile", () => ({ useIsMobile: () => false }));
jest.mock("@/modules/catalog/infrastructure/services/product-service.adapter", () => ({
  getProductById: jest.fn(),
}));
jest.mock("@/modules/catalog/infrastructure/services/product-image-service.adapter", () => ({
  setProductPrimaryImage: jest.fn(),
  setVariantPrimaryImage: jest.fn(),
  setVariantPrimaryImages: jest.fn(),
  reorderProductImages: jest.fn(),
  deleteProductImage: jest.fn(),
  retryImageImport: jest.fn(),
  uploadProductImage: jest.fn(),
  uploadVariantImage: jest.fn(),
  getImageOriginalUrl: jest.fn(),
}));

import {
  setProductPrimaryImage,
  setVariantPrimaryImage,
} from "@/modules/catalog/infrastructure/services/product-image-service.adapter";
import { photoUploadQueue } from "@/modules/catalog/infrastructure/stores/photo-upload-queue";
import { useStorageStore } from "@/modules/storage/infrastructure/stores/storage.store";
import { ProductPhotosSection } from "../ProductPhotosSection";
import { ProductGalleryProvider, deleteDescription } from "../photos/product-gallery.context";

function image(id: string, overrides: Partial<ProductImageDTO> = {}): ProductImageDTO {
  return {
    id,
    variant_id: null,
    position: 0,
    alt_text: id,
    source: "upload",
    status: "ready",
    source_url: null,
    mime_type: "image/jpeg",
    size_bytes: 1024,
    width: 800,
    height: 800,
    error: null,
    url: `https://storage/${id}.jpg`,
    created_at: "2026-10-08T12:00:00.000Z",
    ...overrides,
  };
}

function variant(id: string, attributes: Record<string, string>, primary: string | null = null): ProductVariantDTO {
  return {
    id,
    sku: `SKU-${id}`,
    name: null,
    attributes,
    price_cents: 4_990_000,
    service_date: null,
    is_default: false,
    is_active: true,
    position: 0,
    primary_image_id: primary,
    stock: null,
  };
}

const product = {
  id: "p1",
  name: "Camiseta básica",
  kind: "product",
  primary_image_id: "espalda",
  primary_image: { id: "espalda", url: "https://storage/espalda.jpg" },
  images: [image("frente"), image("espalda", { position: 1 })],
  variants: [variant("v-s", { talla: "S" }, "frente"), variant("v-m", { talla: "M" })],
} as unknown as ProductDTO;

function renderGallery(value: ProductDTO = product, canManage = true) {
  return render(
    <ProductGalleryProvider product={value} canManage={canManage} onSaved={jest.fn()}>
      <ProductPhotosSection />
    </ProductGalleryProvider>,
  );
}

describe("ProductPhotosSection (galería única con principal)", () => {
  it("la principal elegida va primera, con su insignia; la píldora dice qué variante usa cada foto", () => {
    renderGallery();
    const tiles = screen.getAllByRole("img").map((img) => img.getAttribute("alt"));
    expect(tiles.slice(0, 2)).toEqual(["espalda", "frente"]);
    expect(screen.getAllByText("Principal")).toHaveLength(1);
    expect(screen.getByTitle("Principal de S")).toBeInTheDocument();
  });

  it("«Hacer principal» desde el menú de una foto la elige en el servidor", () => {
    (setProductPrimaryImage as jest.Mock).mockResolvedValue(product);
    renderGallery();
    const menus = screen.getAllByRole("button", { name: "Acciones de la foto" });
    fireEvent.click(menus[1]);
    fireEvent.click(screen.getByRole("menuitem", { name: /Hacer principal/ }));
    expect(setProductPrimaryImage).toHaveBeenCalledWith("p1", "frente");
  });

  it("sin permiso no hay menú de edición ni tile de subida", () => {
    renderGallery(product, false);
    const menus = screen.getAllByRole("button", { name: "Acciones de la foto" });
    fireEvent.click(menus[0]);
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["Ver original"]);
    expect(screen.queryByRole("button", { name: /Subir fotos/ })).not.toBeInTheDocument();
  });

  it("galería vacía: dice qué pierde el agente y ofrece elegir fotos", () => {
    renderGallery({ ...product, images: [], primary_image: null, primary_image_id: null } as ProductDTO);
    expect(screen.getByText("Aún sin fotos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Elegir fotos/ })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Fotos del producto" })).queryByText("General")).not.toBeInTheDocument();
  });
});

describe("deleteDescription (la confirmación dice qué pasa después)", () => {
  it("borrar la principal nombra a la que toma su lugar y a las variantes que la usaban", () => {
    const value = { ...product, primary_image_id: "frente" } as ProductDTO;
    const text = deleteDescription(value, image("frente"), image("frente"));
    expect(text).toContain("«espalda» pasa a ser la principal");
    expect(text).toContain("S volverá a usar la principal del producto");
  });

  it("borrar una que no es principal no promete un cambio de portada", () => {
    const text = deleteDescription(product, image("frente"), image("espalda", { position: 1 }));
    expect(text).not.toContain("pasa a ser la principal");
    expect(text).toContain("tu agente dejará de enviarla");
  });
});

describe("SortablePhotoGallery sin arrastre posible", () => {
  it("una sola foto movible no deja su menú dentro de un contenedor aria-disabled", () => {
    renderGallery({ ...product, images: [image("frente"), image("espalda", { position: 1 })], primary_image_id: "frente" } as ProductDTO);
    // La principal va fija; queda una sola movible: no se puede ordenar
    const menus = screen.getAllByRole("button", { name: "Acciones de la foto" });
    for (const menu of menus) expect(menu.closest('[aria-disabled="true"]')).toBeNull();
  });
});

describe("Galería · hallazgos de la auditoría", () => {
  afterEach(() => {
    useStorageStore.setState((state) => ({ live: { ...state.live, blocks_uploads: false, state: "ok" } }));
    jest.restoreAllMocks();
  });

  it("C-1: soltar UN archivo sobre el tile «Subir fotos» lo encola UNA sola vez", () => {
    const enqueue = jest.spyOn(photoUploadQueue, "enqueue").mockReturnValue([]);
    renderGallery();
    const tile = screen.getByRole("button", { name: /Subir fotos/ });
    const files = [new File(["x"], "foto.jpg", { type: "image/jpeg" })];

    fireEvent.drop(tile, { dataTransfer: { files, types: ["Files"] } });

    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("C-1: soltar sobre la sección (fuera del tile) también encola una vez", () => {
    const enqueue = jest.spyOn(photoUploadQueue, "enqueue").mockReturnValue([]);
    renderGallery();
    const files = [new File(["x"], "foto.jpg", { type: "image/jpeg" })];

    fireEvent.drop(screen.getByRole("region", { name: "Fotos del producto" }), {
      dataTransfer: { files, types: ["Files"] },
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("C-7: dentro del filtro de una variante, «Hacer principal» es de ESA variante, no del producto", () => {
    (setVariantPrimaryImage as jest.Mock).mockResolvedValue(product);
    (setProductPrimaryImage as jest.Mock).mockClear();
    const conPropias = {
      ...product,
      images: [image("frente"), image("m-1", { variant_id: "v-m" }), image("m-2", { variant_id: "v-m", position: 1 })],
      primary_image_id: "frente",
    } as ProductDTO;
    renderGallery(conPropias);
    fireEvent.click(within(screen.getByRole("group", { name: "Filtrar fotos" })).getByRole("button", { name: "M" }));
    const segunda = document.querySelector('[data-photo-id="m-2"]') as HTMLElement;
    fireEvent.click(within(segunda).getByRole("button", { name: "Acciones de la foto" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Hacer principal de M/ }));

    expect(setVariantPrimaryImage).toHaveBeenCalledWith("v-m", "m-2");
    expect(setProductPrimaryImage).not.toHaveBeenCalled();
  });

  it("C-7: una foto cuya descarga falló se puede borrar (no ocupa un cupo para siempre)", () => {
    renderGallery({
      ...product,
      images: [image("frente"), image("rota", { status: "failed", url: null, source: "url_import", position: 1 })],
    } as ProductDTO);
    const rota = document.querySelector('[data-photo-id="rota"]') as HTMLElement;

    fireEvent.click(within(rota).getByRole("button", { name: "Borrar foto" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("C-3: con el espacio lleno, «Subir» se apaga y un aviso dice por qué, antes de cualquier 507", () => {
    useStorageStore.setState((state) => ({ live: { ...state.live, blocks_uploads: true, state: "full" } }));
    renderGallery();

    expect(screen.getByRole("button", { name: /^Subir$/ })).toBeDisabled();
    expect(screen.getByText("Tu espacio de almacenamiento está lleno.")).toBeInTheDocument();
  });
});
