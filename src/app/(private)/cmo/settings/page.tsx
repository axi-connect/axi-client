import { CmoSettingsView } from "@/modules/cmo/ui/CmoSettingsView";

export default function CmoSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl overflow-y-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl">Configuración de Axel</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Su interruptor, los topes que no puede pasarse y las reglas que le has dado.
        </p>
      </header>
      <CmoSettingsView />
    </div>
  );
}
