"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { http } from "@/services/http"

const schema = z.object({ email: z.string().email("Correo inválido") })

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<{ email: string }>({ resolver: zodResolver(schema), defaultValues: { email: "" } })

  async function onSubmit(values: { email: string }) {
    setMessage(null)
    setError(null)
    try {
      await http.post("/auth/forgot-password", values)
      setMessage("Te enviamos un correo con instrucciones si existe una cuenta asociada")
    } catch (e: any) {
      setError(e?.message || "No se pudo enviar el correo")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground">Ingresa tu correo para recibir un enlace</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="email" placeholder="tu@correo.com" {...field} />
              </FormControl>
            </FormItem>
          )} />
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">Enviar instrucciones</Button>
        </form>
      </Form>
    </div>
  )
}