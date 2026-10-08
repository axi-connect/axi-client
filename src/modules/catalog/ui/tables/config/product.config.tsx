import { formatMoney } from "@/core/lib/format";
import {
  aggregateStock,
  effectiveCategoryNote,
  productPriceRangeLabel,
  productSku,
  unavailableVariantCount,
  type ProductListItemDTO,
  type ProductRow,
} from "@/modules/catalog/domain/product";

/**
 * Mapea el DTO del listado a la fila plana que pintan la tabla y las tarjetas
 * (catálogo premium F2: las dos muestran lo mismo). La categoría es la
 * EFECTIVA (D5): un producto espejado de Shopify no tiene `category_id`
 * propio —su categoría la puso el clasificador— y mirar solo ese campo dejaba
 * la columna en «—» para todo el catálogo espejado.
 */
export function mapProductToRow(
  item: ProductListItemDTO,
  categoryNameById: Map<string, string>,
): ProductRow {
  const stock = aggregateStock(item);
  const effective = item.effective_category;
  const categoryId = effective?.id ?? item.category_id;
  const categoryName =
    effective?.name ?? (categoryId !== null ? (categoryNameById.get(categoryId) ?? null) : null);
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    thumb_url: item.primary_image?.url ?? null,
    category_id: categoryId,
    category_name: categoryName ?? "Sin categoría",
    category_is_automatic: effective?.is_automatic ?? false,
    category_note: effective ? effectiveCategoryNote(effective) : "",
    category_missing: categoryName === null,
    price_cents: item.price_cents,
    currency: item.currency,
    price_label: formatMoney(item.price_cents, item.currency),
    price_range_label: productPriceRangeLabel(item, formatMoney),
    sku: productSku(item),
    variant_count: item.variants.length,
    unavailable_variant_count: unavailableVariantCount(item),
    image_count: item.image_count ?? 0,
    stock_total: stock.total,
    stock_state: stock.state,
    duration_minutes: item.duration_minutes,
    requires_booking: item.requires_booking,
    is_active: item.is_active,
    governed: item.governed_by_connection_id !== null,
    created_at: item.created_at,
  };
}
