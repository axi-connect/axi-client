/**
 * El tile de KPI vive en `shared/components/features/stat-tile`: lo consumen la
 * consola de plataforma y los módulos del tenant. Este archivo se conserva como
 * re-export para no tocar los consumidores de `/platform`.
 */
export { StatTile } from "@/shared/components/features/stat-tile";
