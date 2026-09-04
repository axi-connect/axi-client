import { BrandLoader } from "@/shared/components/ui/brand-loader";

export default function CallDetailLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <BrandLoader label="Cargando la llamada" />
    </div>
  );
}
