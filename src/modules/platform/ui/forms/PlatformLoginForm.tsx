"use client";

/**
 * Login del panel de plataforma. Mismo lenguaje visual que el login de
 * tenant, pero contra `POST /platform/auth/login` (sin refresh, sin cookies).
 * - `auth/invalid_credentials`: mensaje único, sin distinguir campo (spec §3.1).
 * - 429 (throttle 5/min): formulario deshabilitado con countdown.
 * - `?next` validado: solo rutas internas de /platform (anti open-redirect).
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
import { Form, FormControl, FormField, FormItem } from "@/shared/components/ui/form";
import { usePlatformAuth } from "../../infrastructure/auth/platform-auth.context";

const platformLoginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type PlatformLoginValues = z.infer<typeof platformLoginSchema>;

/** Solo se acepta un `next` interno del panel (nunca el login mismo). */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/platform") && !raw.startsWith("/platform/login")) return raw;
  return "/platform";
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
    <div className="space-y-6 rounded-2xl border border-border bg-background p-6 shadow-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" aria-label="Iniciar sesión en la consola de plataforma">
          <div>
            <label htmlFor="platform-email" className="text-sm font-medium">Correo</label>
            <FormField name="email" control={form.control} render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input id="platform-email" type="email" required autoComplete="username" placeholder="admin@axi.dev" disabled={disabled} {...field} />
                </FormControl>
              </FormItem>
            )} />
          </div>
          <div>
            <label htmlFor="platform-password" className="text-sm font-medium">Contraseña</label>
            <div className="relative">
              <FormField name="password" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input id="platform-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" placeholder="••••••••" disabled={disabled} {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 mt-2 mr-3 flex items-center"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff size={20} className="text-muted-foreground" />
                ) : (
                  <Eye size={20} className="text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <Button className="w-full" type="submit" disabled={disabled}>
            {isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {cooldown > 0
              ? `Demasiados intentos. Reintenta en ${cooldown} s`
              : isPending
                ? "Ingresando…"
                : "Iniciar sesión"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            La sesión dura 15 minutos y no se renueva automáticamente.
          </p>
        </form>
      </Form>
    </div>
  );
}
