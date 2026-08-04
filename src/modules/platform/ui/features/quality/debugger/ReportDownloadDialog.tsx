"use client";

/**
 * Diálogo PREVIO Y OBLIGATORIO a la descarga del diagnóstico (decisión
 * escrita en el collector del backend): el fichero contiene el system_prompt
 * completo del agente del tenant y el transcript íntegro con la PII del
 * contacto. Además recuerda que todo acceso queda auditado. Formato md
 * (caso de uso principal) o json; `include_raw` añade el apéndice crudo.
 */
import { useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import {
  downloadConversationReport,
  type ReportFormat,
} from "../../../../infrastructure/api/quality-report";

type ReportDownloadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conversación objetivo (null = cerrado). */
  target: { companyId: string; conversationId: string } | null;
};

export function ReportDownloadDialog({ open, onOpenChange, target }: ReportDownloadDialogProps) {
  const { showAlert } = useAlert();
  const [format, setFormat] = useState<ReportFormat>("md");
  const [includeRaw, setIncludeRaw] = useState(false);
  const [pending, setPending] = useState(false);

  async function download() {
    if (!target) return;
    setPending(true);
    try {
      await downloadConversationReport({
        companyId: target.companyId,
        conversationId: target.conversationId,
        format,
        includeRaw,
      });
      showAlert({
        tone: "success",
        title: "Diagnóstico descargado",
        description: "Trátalo como información sensible del tenant y su cliente.",
        autoCloseMs: 5000,
      });
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo generar el diagnóstico", description: errorMessage(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert aria-hidden="true" className="size-5 text-warning" />
            Descargar diagnóstico
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Este diagnóstico contiene <strong>datos personales del cliente</strong> (teléfono,
                correo, pedidos, score) y <strong>propiedad intelectual del tenant</strong> (el
                system prompt completo de su agente).
              </p>
              <p>Este acceso queda registrado en la auditoría de la plataforma.</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Formato</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Formato del diagnóstico">
              {(
                [
                  { value: "md", title: "Markdown", hint: "12 secciones legibles (recomendado)" },
                  { value: "json", title: "JSON", hint: "Diagnóstico estructurado crudo" },
                ] as { value: ReportFormat; title: string; hint: string }[]
              ).map(({ value, title, hint }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={format === value}
                  onClick={() => setFormat(value)}
                  disabled={pending}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    format === value ? "border-primary/50 bg-accent" : "border-border hover:border-foreground/20",
                  )}
                >
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-2">
            <input
              id="report-include-raw"
              type="checkbox"
              checked={includeRaw}
              onChange={(e) => setIncludeRaw(e.target.checked)}
              disabled={pending}
              className="size-4 accent-[var(--color-primary)]"
            />
            <Label htmlFor="report-include-raw" className="text-sm font-normal">
              Incluir apéndice con el diagnóstico crudo (JSON)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={() => void download()} disabled={pending}>
            <Download aria-hidden="true" />
            {pending ? "Generando…" : "Descargar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
