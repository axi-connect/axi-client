import { BrandLoader } from "@/shared/components/ui/brand-loader";

/** Carga del wizard (estructura de pasos, sin silueta estable). */
export default function NewRunLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <BrandLoader label="Preparando el wizard…" />
    </div>
  );
}
