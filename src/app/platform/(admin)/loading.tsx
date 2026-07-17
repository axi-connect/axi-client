import { BrandLoader } from "@/shared/components/ui/brand-loader";

/** Carga de ruta del árbol admin (estructura de la vista aún desconocida en FE1). */
export default function PlatformLoading() {
  return <BrandLoader className="min-h-[50vh]" label="Cargando la consola" />;
}
