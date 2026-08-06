/**
 * SUPERFICIE PÚBLICA del slice `catalog` (architecture.md §3.3.5).
 *
 * Lo que otros slices pueden consumir del catálogo se declara AQUÍ y solo aquí.
 * Un import de `@/modules/catalog/...` desde otro slice es una violación de
 * frontera; el import correcto es `@/modules/catalog/public`.
 *
 * Consumidor actual: `modules/marketing` (promoción de tipo "producto de
 * regalo", que referencia una variante del catálogo).
 */

export type {
  ProductDTO,
  ProductListItemDTO,
  ProductVariantDTO,
} from "./domain/product";

/**
 * Selector de variante en dos pasos. Vive en `catalog` y no en el consumidor
 * porque lee recursos del catálogo y conoce su forma (las variantes solo
 * llegan embebidas en el producto completo).
 */
export { VariantPicker, variantLabel, type VariantSelection } from "./ui/components/VariantPicker";

/** Lectura del catálogo para resolver el nombre de una variante ya guardada. */
export { getProductById, listProducts } from "./infrastructure/services/product-service.adapter";
