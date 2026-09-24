/**
 * Banner de degradación parcial (spec D7): alguna DB dedicada no respondió
 * al fan-out cross-tenant → los datos visibles son PARCIALES, no un error.
 * Ámbar, no bloqueante; se comparte entre dashboard, triage y alertas.
 */
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";

export function DegradedBanner({ className }: { className?: string }) {
  return (
    <Alert variant="warning" className={className}>
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>Vista parcial</AlertTitle>
      <AlertDescription>
        Una o más bases de datos dedicadas no respondieron; los datos mostrados pueden estar
        incompletos.
      </AlertDescription>
    </Alert>
  );
}
