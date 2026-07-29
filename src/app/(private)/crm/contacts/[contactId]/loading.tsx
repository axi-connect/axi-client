import { BrandLoader } from "@/shared/components/ui/brand-loader";

/** El hub tiene secciones heterogéneas: loader de marca a pantalla de sección. */
export default function Contact360Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <BrandLoader label="Cargando contacto" />
    </div>
  );
}
