/**
 * El input de dinero vive en `shared/components/features/price-input`: lo
 * consumen catálogo y marketing, y `modules/*` no puede importarse entre sí
 * por ruta profunda (arquitectura §3.3.5). Este archivo se conserva como
 * re-export para no tocar los consumidores existentes.
 */
export { PriceInput } from "@/shared/components/features/price-input";
