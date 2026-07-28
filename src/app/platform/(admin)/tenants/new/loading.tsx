import { FormSkeleton } from "@/shared/components/features/loading";

/** Silueta del wizard de alta (formulario conocido → skeleton estructural). */
export default function NewTenantLoading() {
  return (
    <div className="mx-auto max-w-3xl">
      <FormSkeleton />
    </div>
  );
}
