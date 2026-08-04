import { BrandLoader } from "@/shared/components/ui/brand-loader";

/** Carga del depurador (master-detail sin silueta estable). */
export default function DebuggerLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <BrandLoader label="Abriendo el depurador…" />
    </div>
  );
}
