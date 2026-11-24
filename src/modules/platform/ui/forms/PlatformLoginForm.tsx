"use client";

/**
 * Login del panel de plataforma. Mismo lenguaje visual que el login de
 * tenant, pero contra `POST /platform/auth/login` (sin refresh, sin cookies).
 * - `auth/invalid_credentials`: mensaje único, sin distinguir campo (spec §3.1).
 * - 429 (throttle 5/min): formulario deshabilitado con countdown.
 * - `?next` validado: solo rutas internas de /platform (anti open-redirect).
 * - Rediseño F1: los errores de validación se pintan BAJO SU CAMPO (antes el
 *   `required`/`type=email` del navegador se adelantaba a Zod y sus mensajes
 *   nunca salían). El formulario va con `noValidate`.
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { usePlatformAuth } from "../../infrastructure/auth/platform-auth.context";
import { safeInternalNext } from "@/core/lib/safe-next";

export const platformLoginSchema = z.object({
  email: z.string().trim().min(1, "Ingresa tu correo").email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type PlatformLoginValues = z.infer<typeof platformLoginSchema>;

/** Solo se acepta un `next` interno de la consola (nunca el login mismo). */
export function safeNext(raw: string | null): string {
  return safeInternalNext(raw, {
    fallback: "/platform",
    allowedPrefixes: ["/platform"],
    blockedPrefixes: ["/platform/login"],
  });
}

/** Segundos restantes del cooldown de throttle (0 = sin cooldown). */
function useCooldown(): [number, (seconds: number) => void] {
  const [until, setUntil] = useState(0);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!until) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [until]);

  return [left, (seconds: number) => setUntil(Date.now() + seconds * 1000)];
}

export function PlatformLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { status, expired, login } = usePlatformAuth();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, startCooldown] = useCooldown();

  const next = safeNext(search.get("next"));

  // Sesión viva → no tiene sentido ver el login.
  useEffect(() => {
    if (status === "authenticated" && !expired) router.replace(next);
  }, [status, expired, router, next]);

  const form = useForm<PlatformLoginValues>({
    resolver: zodResolver(platformLoginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  function onSubmit(values: PlatformLoginValues) {
    setError(null);
    startTransition(async () => {
      try {
        await login(values.email, values.password);
        router.replace(next);
      } catch (e: unknown) {
        if (isHttpError(e)) {
          if (e.status === 429) {
            startCooldown(e.retryAfterSeconds ?? 60);
            setError(null);
          } else if (e.is(API_ERROR_CODES.invalidCredentials)) {
            setError("Credenciales inválidas");
          } else {
            setError(e.message || "No se pudo iniciar sesión");
          }
        } else {
          setError("No se pudo iniciar sesión. Verifica tu conexión.");
        }
      }
    });
  }

  const disabled = isPending || cooldown > 0;

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-float)] sm:p-7">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5"
          aria-label="Iniciar sesión en la consola de plataforma"
        >
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel htmlFor="platform-email" className="text-[13px] font-medium">Correo</FormLabel>
              <FormControl>
                <Input
                  id="platform-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="tu@axi-connect.co"
                  disabled={disabled}
                  className="h-11 rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[13px]" />
            </FormItem>
          )} />

          <FormField name="password" control={form.control} render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel htmlFor="platform-password" className="text-[13px] font-medium">Contraseña</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    id="platform-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    disabled={disabled}
                    className="h-11 rounded-xl pr-11"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-1 my-auto grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
              <FormMessage className="text-[13px]" />
            </FormItem>
          )} />

          {error && (
            <p
              className="flex gap-2 rounded-xl border border-destructive/30 px-3 py-2.5 text-[13px] text-foreground"
              role="alert"
            >
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{error}</span>
            </p>
          )}

          <Button className="h-11 w-full rounded-full text-[15px]" type="submit" disabled={disabled}>
            {isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {cooldown > 0
              ? `Demasiados intentos. Reintenta en ${cooldown} s`
              : isPending
                ? "Ingresando…"
                : "Iniciar sesión"}
          </Button>

          <p className="text-center text-xs text-muted-foreground text-pretty">
            La sesión dura 15 minutos y no se renueva automáticamente.
          </p>
        </form>
      </Form>
    </div>
  );
}
