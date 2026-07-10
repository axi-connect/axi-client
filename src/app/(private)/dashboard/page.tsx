import { Home } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2">
        <Home className="size-6 text-foreground" />
        <h1 className="text-3xl tracking-tight font-semibold">Dashboard</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Ruta privada de ejemplo.</p>
    </div>
  );
}
