"use client";

/**
 * Re-login superpuesto (spec D1; lenguaje premium en el rediseño F1, mismo
 * comportamiento): al vencer el token (T−0 o 401) el modal
 * cubre la vista SIN redirect — ruta, tabs y borradores se preservan. Email
 * pre-llenado (solo pide contraseña). Con el token vencido es bloqueante
 * (sin ✕, sin ESC); abierto desde "Renovar ahora" sí se puede descartar.
 */
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { LoaderCircle, TimerOff } from "lucide-react";
import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { usePlatformAuth } from "../../infrastructure/auth/platform-auth.context";

export function ReLoginModal() {
  const { session, expired, reloginOpen, relogin, dismissRelogin, logout } = usePlatformAuth();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<{ password: string }>({ defaultValues: { password: "" } });

  function onSubmit(values: { password: string }) {
    if (!values.password) {
      setError("Ingresa tu contraseña");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await relogin(values.password);
        form.reset();
      } catch (e: unknown) {
        if (isHttpError(e) && e.is(API_ERROR_CODES.invalidCredentials)) {
          setError("Credenciales inválidas");
        } else if (isHttpError(e) && e.status === 429) {
          setError(`Demasiados intentos. Reintenta en ${e.retryAfterSeconds ?? 60} s`);
        } else {
          setError("No se pudo renovar la sesión. Inténtalo de nuevo.");
        }
      }
    });
  }

  return (
    <Dialog open={reloginOpen} onOpenChange={(open) => { if (!open) dismissRelogin(); }}>
      <DialogContent
        showCloseButton={!expired}
        onEscapeKeyDown={(e) => { if (expired) e.preventDefault(); }}
        className="gap-5 rounded-3xl p-6 sm:max-w-md sm:p-7"
      >
        <DialogHeader className="gap-2 text-left">
          <span className="grid size-10 place-items-center rounded-2xl bg-muted">
            <TimerOff aria-hidden="true" className="size-5 text-warning" />
          </span>
          <DialogTitle className="font-heading text-xl leading-tight font-bold tracking-tight">
            {expired ? "Tu sesión expiró" : "Renovar sesión"}
          </DialogTitle>
          <DialogDescription className="text-pretty">
            {expired
              ? "Vuelve a ingresar tu contraseña para continuar donde estabas. Nada de lo que tenías abierto se pierde."
              : "Renueva ahora para no interrumpir lo que estás haciendo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-medium">Correo</span>
            <p
              className="flex h-10 min-w-0 items-center rounded-xl border border-border bg-muted/50 px-3 text-sm text-muted-foreground"
              title={session?.email ?? undefined}
            >
              <span className="min-w-0 truncate">{session?.email ?? ""}</span>
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="relogin-password" className="text-[13px] font-medium">Contraseña</label>
            <Input
              id="relogin-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              placeholder="••••••••"
              disabled={isPending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "relogin-error" : undefined}
              className="h-10 rounded-xl"
              {...form.register("password")}
            />
            {error && (
              <p id="relogin-error" className="text-[13px] text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="ghost" className="rounded-full" onClick={logout} disabled={isPending}>
              Salir
            </Button>
            <Button type="submit" className="rounded-full" disabled={isPending}>
              {isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {isPending ? "Renovando…" : "Renovar sesión"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
