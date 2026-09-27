import { Suspense } from "react";
import { ProductsView } from "@/modules/catalog/ui/products/ProductsView";
import ProductsLoading from "./loading";

/**
 * Listado de productos (`/catalog/products`). La vista lee la URL
 * (`useSearchParams`), así que va dentro de `Suspense`: sin él, Next
 * pre-renderiza la ruta sin poder resolver los parámetros.
 */
export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsView />
    </Suspense>
  );
}
