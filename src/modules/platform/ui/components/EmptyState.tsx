/**
 * El estado vacío vive en `shared/components/features/empty-state`: lo consumen
 * la consola de plataforma y los módulos del tenant, y `shared` es su sitio
 * (arquitectura §12). Este archivo se conserva como re-export para no tocar los
 * 16 consumidores de `/platform`; el acento por defecto sigue siendo el violeta.
 */
export { EmptyState } from "@/shared/components/features/empty-state";
