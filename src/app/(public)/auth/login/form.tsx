"use client"

import { useForm } from "react-hook-form"
import { Eye, EyeOff } from "lucide-react"
import { Input } from '@/shared/components/ui/input';
import { useState, useTransition } from "react"
import { Button } from '@/shared/components/ui/button';
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginFormValues } from "./schema"
import { useRouter, useSearchParams } from "next/navigation"
import { Form, FormControl, FormField, FormItem } from "@/shared/components/ui/form"
import { useAuth } from "@/shared/auth/auth.hooks"

export default function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const search = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  })

  async function onSubmit(values: LoginFormValues) {
    setError(null)
    startTransition(async () => {
      try {
        await login(values)
        const next = search.get("next") || "/dashboard"
        router.replace(next)
      } catch (e: any) {
        setError(e?.message || "No se pudo iniciar sesión")
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
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <span className="bg-secondary block h-px w-full"></span>
        <p className="absolute inset-x-0 -top-2 mx-auto inline-block w-fit px-2 text-sm">O continúa con</p>
      </div>

      <Button type="button" variant="outline" className="w-full" aria-label="Ingresar con Google">
          <svg className="h-5 w-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_17_40)">
              <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4" />
              <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853" />
              <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03298C-0.371021 20.0112 -0.371021 28.0009 3.03298 34.7825L11.0051 28.6006Z" fill="#FBBC04" />
              <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4414 -0.068932 24.48 0.00161733C15.4055 0.00161733 7.10718 5.11644 3.03296 13.2296L11.005 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335" />
              </g>
              <defs>
              <clipPath id="clip0_17_40">
                  <rect width="48" height="48" fill="white" />
              </clipPath>
              </defs>
          </svg>
          Ingresar con Google
      </Button>
    </div>
  )
}