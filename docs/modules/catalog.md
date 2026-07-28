# Módulo Catálogo — alcance del backend y contrato para el frontend

> **Documento de alcance del módulo de catálogo de productos.** Redactado a partir del código real del backend (`axi-server/src/modules/catalog/`, julio 2026), no del roadmap.
>
> ⚠️ **Corrección de roadmap:** `axi-server/docs/integracion_frontend.md` §9 todavía marca el catálogo como "no disponible aún". Es **incorrecto**: el slice F8 está completo, con 13 rutas publicadas en `openapi/openapi.json` (ver `axi-server/docs/mvp_implementation_plan.md`, F8 ✅). Este documento es la referencia vigente para el frontend.

---

## 1. Qué es el módulo

Catálogo de productos **nivel ERP** para cada empresa (tenant). Cubre cuatro entidades:

| Entidad | Rol |
|---|---|
| **Catálogo** (`Catalog`) | Agrupador raíz de productos (p. ej. "Principal", "Temporada"). `code` único por tenant. |
| **Categoría** (`ProductCategory`) | Árbol jerárquico (máx. **6 niveles**) para clasificar productos. |
| **Tipo de producto** (`ProductType`) | *Attribute set* (EAV tipado): define atributos `text/number/boolean/select` con ámbito `product` (ficha) o `variant` (ejes de variación, p. ej. color/talla). |
| **Producto** (`Product`) | Físico (`kind=product`) o servicio agendable (`kind=service`). Siempre tiene ≥1 **variante** (SKU); las variantes físicas llevan **stock** con umbral de agotado. |

La IA del inbox consume este catálogo vía `catalog_lookup` (FTS); el frontend no interviene ahí.

## 2. Contrato REST (bajo `/api/v1`, autenticado)

Tipos generados en `src/core/api/schema.d.ts` (`npm run api:types`). Propiedades wire en `snake_case`.

### Catálogos
| Método/Path | Permiso | Nota |
|---|---|---|
| `GET /catalogs` | `catalog:read` | `{ data: CatalogDto[] }` sin meta (no pagina) |
| `GET /catalogs/:id` | `catalog:read` | |
| `POST /catalogs` | `catalog:manage` | `{ name (1..120), code (1..40, ^[a-z0-9_-]+$), description? (≤500) }` |
| `PATCH /catalogs/:id` | `catalog:manage` | partial; `description` admite `null` |
| `DELETE /catalogs/:id` | `catalog:manage` | 204, soft-delete |

### Categorías
| Método/Path | Permiso | Nota |
|---|---|---|
| `GET /catalog/categories?tree=true\|false` | `catalog:read` | plana o árbol anidado (`children[]`) |
| `POST /catalog/categories` | `catalog:manage` | `{ name, parent_id?, description?, position? }` |
| `PATCH /catalog/categories/:id` | `catalog:manage` | + `is_active`; `parent_id` movible (valida ciclos y profundidad) |
| `DELETE /catalog/categories/:id` | `catalog:manage` | hard-delete; **409 `catalog/category_in_use`** si tiene hijos o productos |

### Tipos de producto
| Método/Path | Permiso | Nota |
|---|---|---|
| `GET /catalog/product-types` | `catalog:read` | incluye `attributes[]` |
| `GET /catalog/product-types/:id` | `catalog:read` | |
| `POST /catalog/product-types` | `catalog:manage` | `{ name (único por tenant), description? }` — **no acepta atributos**: se definen con el PUT |
| `PATCH /catalog/product-types/:id` | `catalog:manage` | |
| `PUT /catalog/product-types/:id/attributes` | `catalog:manage` | **replace-set completo** (máx 50). Atributo: `{ code (snake_case ≤40), label, type, scope, is_required, options? (req. si select, ≤100), unit? }`. Eliminar un atributo borra sus valores en cascada. |
| `DELETE /catalog/product-types/:id` | `catalog:manage` | 409 `catalog/product_type_in_use` si tiene productos |

### Productos
| Método/Path | Permiso | Nota |
|---|---|---|
| `GET /catalog/products` | `catalog:read` | query `{ q?, catalog_id?, category_id?, kind?, is_active?, page=1, page_size=20 (máx 100) }` → `{ data, meta }`. **Orden fijo `created_at desc`** (sin sort). `category_id` es match exacto (no incluye descendientes). Cada item incluye `variants[]` con stock. |
| `GET /catalog/products/:id` | `catalog:read` | `ProductDto` con `attribute_values[]` (resueltos) y `variants[]` (precio resuelto + `stock \| null`) |
| `POST /catalog/products` | `catalog:manage` | ver invariantes §3 |
| `PATCH /catalog/products/:id` | `catalog:manage` | partial; **no permite mover `catalog_id`** |
| `DELETE /catalog/products/:id` | `catalog:manage` | 204, soft-delete |
| `PUT /catalog/products/:id/attribute-values` | `catalog:manage` | replace-set `{ values: Record<code, valor> }`; exige los `is_required` de ámbito `product` |

### Variantes y stock
| Método/Path | Permiso | Nota |
|---|---|---|
| `POST /catalog/products/:id/variants` | `catalog:manage` | `UpsertVariantDto`; **devuelve el Product completo** |
| `PATCH /catalog/variants/:id` | `catalog:manage` | ⚠️ devuelve `{ status: "updated" }` → el cliente debe **re-fetch** del producto |
| `DELETE /catalog/variants/:id` | `catalog:manage` | hard-delete; protege la última variante activa (`catalog/last_variant_protected`); si era default, promueve otra |
| `PATCH /catalog/variants/:id/stock` | **`catalog:stock`** | `{ op: "set"\|"increment", quantity, out_of_stock_threshold? }` → `{ on_hand, out_of_stock_threshold }`. `increment` admite negativos. Rechazado para servicios (`catalog/stock_not_applicable`). |

## 3. Invariantes y reglas de negocio

- **Todo producto nace con ≥1 variante**: el `POST /catalog/products` exige `default_sku` **o** `variants[]` (uno de los dos).
- **`kind=service`** exige `duration_minutes` (5..480); admite `buffer_minutes` (0..240) y `requires_booking`. Los servicios **no tienen stock** y se consideran siempre disponibles.
- **Precio**: `price_cents` (int, base del producto) + `currency` (ISO-4217, default `COP`). La variante puede fijar su propio `price_cents` o heredar (`null`). En las respuestas la variante ya trae el **precio resuelto**.
- **Disponibilidad**: `available = on_hand > out_of_stock_threshold`; variante física sin fila de inventario = no disponible.
- **Unicidad por tenant**: `catalog.code`, `variant.sku`, `product_type.name`. Por producto: combinación de atributos de variante (`catalog/duplicate_variant`).
- **Imágenes (F16)**: galería real por producto y por variante (ver §3.1). El `image_url` de los forms dejó de ser "URL ya resuelta": ahora dispara un **import asíncrono** (el backend la descarga y la sirve desde storage propio).
- **Sin WebSocket**: no hay eventos de catálogo (tampoco del import de imágenes); tras cada mutación se refresca por REST, y el import se sigue por **polling** del detalle.
- Máximos: 50 atributos por tipo, 100 options por atributo select, 100 variantes por producto, 6 niveles de categorías.

### 3.1 Galería de imágenes (F16)

El agente IA vendedor envía **fotos reales del catálogo por SKU** (tool `send_product_images`). Resolución server-side: fotos de la **variante** → si no tiene, fotos del **producto** ("comodín") → si no hay, la IA describe con texto. La primera posición de cada galería es la **foto principal** (la que la IA envía primero).

**Endpoints** (tipos: `Schemas["ProductImageDto" | "ProductImageUrlDto" | "ReorderProductImagesDto"]`):

| Método/Path | Permiso | Nota |
|---|---|---|
| `POST /catalog/products/:id/images` | `catalog:manage` | multipart `file` + `alt_text?` → 201 `ProductImageDto` |
| `POST /catalog/variants/:id/images` | `catalog:manage` | ídem, a la galería de la variante |
| `GET /catalog/images/:id/url` | `catalog:read` | presigned del ORIGINAL (lightbox), `expires_in_seconds` 300 |
| `PUT /catalog/products/:id/images/reorder` | `catalog:manage` | replace-set de UN contenedor: `{ variant_id, image_ids }` con el set **completo** → 204 |
| `DELETE /catalog/images/:id` | `catalog:manage` | 204, soft-delete (los mensajes enviados conservan su copia) |

**Reglas** (validadas también en cliente, `domain/product.ts`):

- Formatos JPEG/PNG/WebP (magic bytes), máx **5 MB** por archivo (límite de WhatsApp Cloud API).
- Topes: **10** fotos de producto, **5** por variante (`PRODUCT_GALLERY_MAX` / `VARIANT_GALLERY_MAX`).
- `GET /catalog/products/:id` incluye `images[]` (producto primero, luego por variante, orden por `position`); el listado incluye solo `image_count` (no firma URLs por fila).
- ⚠️ **`images[].url` es un thumbnail presigned con TTL 300 s**: no cachear; ante error de `<img>`, re-fetch del detalle.

**Import por URL** (asíncrono): `image_url` en `POST/PATCH` de producto y variante crea una fila `source: "url_import", status: "pending"`; un job la descarga y optimiza. El frontend hace **polling** del detalle (3 s, tope ~30 s → botón "Actualizar"; `use-product-images-polling.ts`). `failed` → tooltip con `error` + **Reintentar** (re-guardar con la misma URL re-encola la fila). Solo http/https públicos, timeout 10 s, máx 3 redirects.

## 4. Permisos RBAC

| Permiso | Cubre | Roles seed |
|---|---|---|
| `catalog:read` | Todos los GET | owner, admin, supervisor, operator |
| `catalog:manage` | POST/PATCH/PUT/DELETE (excepto stock) | owner, admin |
| `catalog:stock` | `PATCH /catalog/variants/:id/stock` | owner, admin, supervisor |

El sidebar del backend emite `{ code: "catalog", path: "/catalog", icon: "package", required_permission_code: "catalog:read" }`. El frontend resuelve `/catalog → /catalog/products` vía `NAV_PATH_ALIASES` (`src/core/config/routes.ts`).

## 5. Errores de dominio (`code` RFC 7807, prefijo `catalog/`)

`catalog_not_found`, `category_not_found`, `product_type_not_found`, `product_not_found`, `variant_not_found`, `attribute_not_found`, `duplicate_code`, `duplicate_sku`, `duplicate_variant`, `category_in_use`, `product_type_in_use`, `category_cycle`, `category_too_deep`, `attribute_invalid`, `service_fields_required`, `stock_not_applicable`, `last_variant_protected`; imágenes (F16): `invalid_image` (422: formato/tamaño/corrupto), `image_limit_reached` (422: tope de galería), `image_not_found` (404: id inexistente o reorder con set incompleto).

Todos mapeados a español en `src/core/lib/error-messages.ts` (`MESSAGES_BY_CODE`).

## 6. Implementación frontend (resumen de decisiones)

- **Slice** `src/modules/catalog/` (domain + infrastructure/services + stores + ui), rutas en `src/app/(private)/(content)/catalog/` con sub-nav: **Productos** (índice), **Categorías**, **Tipos de producto**, **Catálogos**. `/catalog` redirige a `/catalog/products`.
- Productos: listado server-side (`usePaginatedList`, `page_size` 20, búsqueda `q`, filtros catálogo/categoría/tipo/estado) con **vista tabla ⇄ grid** conmutable; crear en página completa; detalle como hub de secciones editables (info base / atributos EAV / variantes+stock).
- Categorías: `TreeView` compartido + `CategoryForm` en `Modal`. Tipos: páginas create/`[id]` con editor de attribute set (replace-set). Catálogos: DataTable + `Modal`.
- Estado: `CatalogProvider` (Context) cachea datos de referencia (catálogos/categorías/tipos) para selects y filtros. Sin Zustand (no hay realtime).
- Dinero: `formatMoney` / `parseMoneyToCents` en `src/core/lib/format.ts` (es-CO, COP sin decimales); celdas con `tabular-nums`.
- Permisos en UI: `hasPermission("catalog:manage")` oculta mutaciones; `hasPermission("catalog:stock")` habilita el ajuste de stock.
- **Fotos (F16)**: sección "Fotos" en el detalle (`ProductPhotosSection` + `ui/components/photos/`): galería del producto y por variante con drag&drop (`@dnd-kit/sortable`, un `SortableContext` por contenedor, reorden **optimista** con rollback), uploader con validación cliente (mime/5 MB) y subida secuencial, lightbox del original (`Dialog` + URL fresca), variante vacía muestra "usará las del producto" (semántica real del fallback). Adapter: `product-image-service.adapter.ts`. Los `<img>` van planos (presigned rotativas ≠ caché de `next/image`). Listado: columna/badge `image_count` (0 = aviso "tu agente no podrá mostrar este producto"). Banner educativo one-shot (`localStorage: axi.catalog.photos_banner_dismissed`). En el inbox, las fotos que envía la IA llevan chip con el SKU (`extractCatalogSku` lee `payload.media.catalog_sku`).
- Diseño: superficies sólidas (sin glass en tablas/forms), coral como color de acción, ámbar como acento secundario de la vista (stock bajo, destacados); light + dark; estados cargando/vacío/error en todas las vistas (DESIGN-SYSTEM §9.1).
