/**
 * SUPERFICIE PÚBLICA del slice `catalog` (architecture.md §3.3).
 *
 * Lo que otros slices pueden consumir del catálogo se declara AQUÍ y solo
 * aquí; un import de `@/modules/catalog/...` desde otro slice es una
 * violación de frontera.
 *
 * Consumidores actuales: `modules/scheduling` (servicios agendables
 * `kind=service` para nombrar el servicio de una cita y para el selector
 * del formulario de cita).
 */

export {
  PRODUCT_KIND_LABELS,
  type ProductDTO,
  type ProductKind,
  type ProductListItemDTO,
  type ListProductsParams,
} from "./domain/product";

export { listProducts, getProductById } from "./infrastructure/services/product-service.adapter";
