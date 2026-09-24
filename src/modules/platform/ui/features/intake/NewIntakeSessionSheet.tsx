"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Globe, Link as LinkIcon, Sparkles } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { useTenantsQuery } from "../../../infrastructure/api/hooks/use-tenants";
import {
  useCreateIntakeSession,
  useIntakeBlueprintsQuery,
} from "../../../infrastructure/api/hooks/use-intake";
import { IntakeLadder } from "./IntakeLadder";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";

/**
 * Emitir una entrevista.
 *
 * **El campo que más importa es el sitio web**, y por eso lleva su propia
 * explicación en vez de ser un input más: es lo que dispara el pre-llenado, y
 * el pre-llenado es lo que convierte la conversación en una confirmación de
 * ocho toques en vez de un interrogatorio de cuarenta preguntas. Sin él la
 * entrevista funciona igual, solo que preguntando el doble.
 *
 * Al emitir, la respuesta trae la URL COMPLETA con su token **y es la única vez
 * que se puede leer**: en la base vive solo el sha256. Por eso el panel no se
 * cierra solo al terminar — se queda con el enlace y un botón de copiar, que es
 * lo que hay que hacer a continuación.
 */
export function NewIntakeSessionSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const blueprints = useIntakeBlueprintsQuery();
  const tenants = useTenantsQuery();
  const create = useCreateIntakeSession();

  const [blueprintId, setBlueprintId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // `useMemo`: sin él, el array nace nuevo en cada render y el efecto que
  // depende de él se dispararía siempre.
  const active = useMemo(
    () => blueprints.data?.data.filter((row) => row.is_active) ?? [],
    [blueprints.data],
  );

  useEffect(() => {
    if (blueprintId === "" && active.length > 0) setBlueprintId(active[0]!.id);
  }, [active, blueprintId]);

  // Reabrir el panel tiene que empezar de cero: dejar el enlace de la anterior
  // a la vista es la forma más rápida de mandarle a alguien el de otro.
  useEffect(() => {
    if (open) {
      create.reset();
      setCopied(false);
    }
    // `create` cambia de identidad en cada render de la mutación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const result = create.data;

  function submit(): void {
    if (blueprintId === "" || companyId === "") return;
    create.mutate({
      blueprint_id: blueprintId,
      company_id: companyId,
      invite_name: inviteName.trim() === "" ? null : inviteName.trim(),
      invite_email: inviteEmail.trim() === "" ? null : inviteEmail.trim(),
      invite_phone: invitePhone.trim() === "" ? null : invitePhone.trim(),
      source_url: sourceUrl.trim() === "" ? null : sourceUrl.trim(),
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nueva entrevista</SheetTitle>
          <SheetDescription>
            Se emite un enlace sin login. Mándaselo por WhatsApp: se abre en el móvil y ya está
            preguntando.
          </SheetDescription>
        </SheetHeader>

        {result === undefined ? (
          <div className="space-y-4 px-4 pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="intake-blueprint">Guion</Label>
              <select
                id="intake-blueprint"
                value={blueprintId}
                onChange={(event) => {
                  setBlueprintId(event.target.value);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {active.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} (v{row.version})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intake-company">Empresa</Label>
              <select
                id="intake-company"
                value={companyId}
                onChange={(event) => {
                  setCompanyId(event.target.value);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Elige una empresa…</option>
                {(tenants.data?.data ?? []).map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              <p className="text-[11.5px] text-muted-foreground">
                La entrevista siempre pertenece a un tenant. Si el cliente todavía no lo es, créalo
                en trial primero.
              </p>
            </div>

            <IntakeLadder companyId={companyId} onPick={setBlueprintId} />

            <div className="rounded-lg border border-accent-violet/25 bg-accent-violet/5 p-3">
              <Label htmlFor="intake-url" className="flex items-center gap-1.5">
                <Globe className="size-3.5 text-accent-violet" aria-hidden="true" />
                Sitio web o red del negocio
              </Label>
              <Input
                id="intake-url"
                value={sourceUrl}
                onChange={(event) => {
                  setSourceUrl(event.target.value);
                }}
                placeholder="https://savage.com.co"
                className="mt-1.5"
              />
              <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-muted-foreground">
                <Sparkles className="mt-0.5 size-3 flex-none text-accent-violet" aria-hidden="true" />
                Lo leemos antes de empezar y la entrevista arranca sabiendo de qué va el negocio.
                El cliente solo confirma en vez de contestar de cero.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="intake-name">Quién contesta</Label>
                <Input
                  id="intake-name"
                  value={inviteName}
                  onChange={(event) => {
                    setInviteName(event.target.value);
                  }}
                  placeholder="Daniela"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intake-phone">WhatsApp</Label>
                <Input
                  id="intake-phone"
                  value={invitePhone}
                  onChange={(event) => {
                    setInvitePhone(event.target.value);
                  }}
                  placeholder="+57 300 000 0000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intake-email">Correo (opcional)</Label>
              <Input
                id="intake-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => {
                  setInviteEmail(event.target.value);
                }}
              />
            </div>

            {create.isError ? (
              <p className="text-sm text-destructive">{errorMessage(create.error)}</p>
            ) : null}

            <Button
              className="w-full"
              disabled={companyId === "" || blueprintId === "" || create.isPending}
              onClick={submit}
            >
              {create.isPending
                ? sourceUrl.trim() === ""
                  ? "Emitiendo…"
                  : "Leyendo su web y emitiendo…"
                : "Emitir enlace"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-6">
            <Alert variant="success">
              <Check aria-hidden="true" />
              <AlertTitle>Enlace listo</AlertTitle>
              <AlertDescription>
                {result.prefill.known + result.prefill.derived === 0
                  ? "La entrevista arranca de cero."
                  : `Arranca sabiendo ${String(result.prefill.known + result.prefill.derived)} datos` +
                    (result.prefill.derived > 0
                      ? ` (${String(result.prefill.derived)} deducidos de su web, se le confirman).`
                      : ".")}
                {/* Lo propuesto se cuenta APARTE de lo sabido: no es un dato de
                    este negocio, es de su sector. Sumarlos diría que arrancamos
                    sabiendo cosas que en realidad estamos suponiendo. */}
                {result.prefill.proposed > 0
                  ? ` Además le dejamos ${String(result.prefill.proposed)} ${
                      result.prefill.proposed === 1 ? "propuesta" : "propuestas"
                    } por su tipo de negocio, para que corrija en vez de dictar.`
                  : ""}
                {result.prefill.website_failed
                  ? " No pudimos leer su página: puede estar caída o hecha toda en el navegador."
                  : ""}
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <LinkIcon className="size-3.5" aria-hidden="true" />
                El enlace (solo se ve ahora)
              </Label>
              <div className="flex gap-2">
                <Input readOnly value={result.url} className="font-mono text-[11.5px]" />
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-none"
                  onClick={() => {
                    void navigator.clipboard.writeText(result.url).then(() => {
                      setCopied(true);
                      window.setTimeout(() => {
                        setCopied(false);
                      }, 1600);
                    });
                  }}
                  aria-label="Copiar enlace"
                >
                  {copied ? (
                    <Check className="size-4 text-success" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                En la base solo queda su huella, así que esta es la única vez que se puede leer. Si
                se pierde, se reemite desde la ficha (y el anterior deja de servir).
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
