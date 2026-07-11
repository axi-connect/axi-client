import { redirect } from "next/navigation";

/** `/catalog` no tiene contenido propio: la vista principal son los productos. */
export default function CatalogIndexPage() {
  redirect("/catalog/products");
}
