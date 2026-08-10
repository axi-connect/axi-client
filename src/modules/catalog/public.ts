/**
 * SUPERFICIE PÚBLICA del slice `catalog` (architecture.md §3.3.5).
 *
 * Lo que otros slices pueden consumir del catálogo se declara AQUÍ y solo aquí.
 * Un import de `@/modules/catalog/...` desde otro slice es una violación de
 * frontera; el import correcto es `@/modules/catalog/public`.
 *
 * Consumidores actuales:
 * - `modules/marketing`: promoción de tipo "producto de regalo", que
 *   referencia una variante del catálogo.
 * - `modules/scheduling`: servicios agendables `kind=service` para nombrar el
 *   servicio de una cita y para el selector del formulario de cita.
 */

export {
  PRODUCT_KIND_LABELS,
  type ProductDTO,
  type ProductKind,
  type ProductListItemDTO,
  type ProductVariantDTO,
  type ListProductsParams,
} from "./domain/product";

/**
 * Selector de variante en dos pasos. Vive en `catalog` y no en el consumidor
 * porque lee recursos del catálogo y conoce su forma (las variantes solo
 * llegan embebidas en el producto completo).
 */
export { VariantPicker, variantLabel, type VariantSelection } from "./ui/components/VariantPicker";

/** Lectura del catálogo (listado y resolución de nombres por id). */
export { getProductById, listProducts } from "./infrastructure/services/product-service.adapter";
