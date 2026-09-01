import { BrandLoader } from "@/shared/components/ui/brand-loader";

export default function CallDetailLoading() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <BrandLoader label="Cargando la llamada" />
    </div>
  );
}
