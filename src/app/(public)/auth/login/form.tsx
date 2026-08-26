"use client"

import { useForm } from "react-hook-form"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { useState, useTransition } from "react"
import { useAuth } from "@/shared/auth/auth.hooks"
import { useSplashOptional } from "@/core/providers/splash-provider"
import { Input } from '@/shared/components/ui/input'
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from '@/shared/components/ui/button'
import { loginSchema, type LoginFormValues } from "./schema"
import { useRouter, useSearchParams } from "next/navigation"
import { API_ERROR_CODES } from "@/core/api/problem"
import { LoginError } from "@/core/providers/auth-provider"
import { Form, FormControl, FormField, FormItem } from "@/shared/components/ui/form"

/** Mensajes por `code` RFC 7807 del backend. */
function loginErrorMessage(error: LoginError): string {
  switch (error.code) {
    case API_ERROR_CODES.invalidCredentials:
      return "Correo o contraseña incorrectos"
    case API_ERROR_CODES.ambiguousCompany:
      return "Tu correo existe en varias empresas: indica el NIT de la empresa"
    case API_ERROR_CODES.companySuspended:
      return "La empresa está suspendida. Contacta a soporte."
    case API_ERROR_CODES.trialExpired:
      return "Tu prueba gratuita terminó. Contáctanos para activar tu plan."
    // Distinto del genérico A PROPÓSITO: a quien solo le falta pagar no se le
    // manda a soporte. El enlace de pago le llegó por correo y WhatsApp.
    case API_ERROR_CODES.paymentOverdue:
      return "Tu servicio está suspendido por un pago pendiente. Revisa el enlace de pago que te enviamos por correo."
    default:
      if (error.status === 429) {
        const wait = error.retryAfterSeconds ? ` Reintenta en ${error.retryAfterSeconds}s.` : ""
        return `Demasiados intentos.${wait}`
      }
      return error.message || "No se pudo iniciar sesión"
  }
}

export default function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const splash = useSplashOptional()
  const search = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [needsCompanyNit, setNeedsCompanyNit] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", company_nit: undefined },
    mode: "onSubmit",
  })

  async function onSubmit(values: LoginFormValues) {
    setError(null)
    startTransition(async () => {
      try {
        await login({
          email: values.email,
          password: values.password,
          ...(needsCompanyNit && values.company_nit ? { company_nit: values.company_nit } : {}),
        })
        // El splash cubre la navegación completa (layout público → privado);
        // AppReadySignal en el layout privado dispara su salida animada.
        splash.start()
        const next = search.get("next") || "/dashboard"
        router.replace(next)
      } catch (e: unknown) {
        if (e instanceof LoginError) {
          if (e.code === API_ERROR_CODES.ambiguousCompany) setNeedsCompanyNit(true)
          setError(loginErrorMessage(e))
        } else {
          setError("No se pudo iniciar sesión")
        }
      }
    })
  }

  return (
    <div className="space-y-6 p-4 py-6 shadow sm:rounded-lg sm:p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="font-medium">Email</label>
            <FormField name="email" control={form.control} render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="email" required placeholder="tu@correo.com" {...field} />
                </FormControl>
              </FormItem>
            )} />
          </div>
          <div>
            <label className="font-medium">Contraseña</label>
            <div className="relative">
              <FormField name="password" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type={showPassword ? "text" : "password"} required placeholder="••••••••" {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 mt-2 mr-3 flex items-center" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {showPassword ? (
                  <EyeOff size={20} className="text-secondary" />
                ) : (
                  <Eye size={20} className="text-secondary" />
                )}
              </button>
            </div>
          </div>
          {needsCompanyNit && (
            <div>
              <label className="font-medium">NIT de la empresa</label>
              <FormField name="company_nit" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="900123456"
                      autoFocus
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                </FormItem>
              )} />
              <p className="mt-1 text-xs text-foreground/70">
                Tu correo está registrado en más de una empresa; indica a cuál quieres entrar.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {isPending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
