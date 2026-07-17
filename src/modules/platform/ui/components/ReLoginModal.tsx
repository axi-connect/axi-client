"use client";

/**
 * Re-login superpuesto (spec D1): al vencer el token (T−0 o 401) el modal
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
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TimerOff aria-hidden="true" className="size-5 text-warning" />
            {expired ? "Tu sesión expiró" : "Renovar sesión"}
          </DialogTitle>
          <DialogDescription>
            {expired
              ? "Vuelve a ingresar tu contraseña para continuar donde estabas. Nada de lo que tenías abierto se pierde."
              : "Renueva ahora para no interrumpir lo que estás haciendo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Correo</span>
            <p className="truncate text-sm font-medium">{session?.email ?? ""}</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="relogin-password" className="text-sm font-medium">Contraseña</label>
            <Input
              id="relogin-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              placeholder="••••••••"
              disabled={isPending}
              {...form.register("password")}
            />
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={logout} disabled={isPending}>
              Salir
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {isPending ? "Renovando…" : "Renovar sesión"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
