"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { http } from "@/services/http"
import { useSearchParams } from "next/navigation"

const schema = z.object({ password: z.string().min(6, "Mínimo 6 caracteres") })

export default function ResetPasswordPage() {
  const sp = useSearchParams()
  const token = sp.get("token") || ""
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<{ password: string }>({ resolver: zodResolver(schema), defaultValues: { password: "" } })

  async function onSubmit(values: { password: string }) {
    setMessage(null)
    setError(null)
    try {
      await http.post("/auth/reset-password", { token, password: values.password })
      setMessage("Tu contraseña fue actualizada. Ahora puedes iniciar sesión")
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar la contraseña")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Cambiar contraseña</h1>
        <p className="text-sm text-muted-foreground">Ingresa tu nueva contraseña</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField name="password" control={form.control} render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
            </FormItem>
          )} />
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">Actualizar</Button>
        </form>
      </Form>
    </div>
  )
}