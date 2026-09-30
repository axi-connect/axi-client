import { CircleCheck, MailX } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import type { UnsubscribeResult, UnsubscribeView as View } from "../infrastructure/unsubscribe.loader"

const GONE_COPY: Record<Exclude<UnsubscribeResult["status"], "ok">, { title: string; text: string }> = {
  gone: {
    title: "Este enlace no es válido",
    // Solo el SMS entiende «BAJA» sola; la respuesta a un correo la lee una persona.
    text: "Puede que esté incompleto. Copia el enlace completo del mensaje, o respóndelo pidiendo que no te escriban más.",
  },
  busy: { title: "Un momento", text: "Hay mucho tráfico ahora. Recarga en unos segundos." },
  unavailable: {
    title: "No pudimos abrir tu baja",
    text: "Algo falló de nuestro lado. Vuelve a abrir el enlace en unos minutos.",
  },
}

/**
 * La página de baja de un correo o SMS en frío (P3a). La ve el CLIENTE del
 * negocio, no el negocio: sin marca de axi en grande, sin pedir nada, y con el
 * nombre de quien le escribe. Confirmar es un botón (y no el propio enlace)
 * porque los escáneres de correo abren los enlaces: una baja que se dispara
 * sola daría de baja a quien no lo pidió.
 */
export function UnsubscribeView({
  result,
  done,
  failed = false,
  action,
}: {
  result: UnsubscribeResult
  done: boolean
  /** El POST no salió: se dice y se deja volver a intentarlo. */
  failed?: boolean
  action: () => Promise<void>
}) {
  if (result.status !== "ok") {
    const copy = GONE_COPY[result.status]
    return (
      <Shell>
        <h1 className="font-heading text-2xl font-bold text-balance">{copy.title}</h1>
        <p className="text-muted-foreground text-pretty">{copy.text}</p>
      </Shell>
    )
  }
  const view: View = result.view
  const what = view.channel === "email" ? "correos" : "SMS"
  if (done) {
    return (
      <Shell>
        <CircleCheck aria-hidden className="text-success size-10" />
        <h1 className="font-heading text-2xl font-bold text-balance">Listo, no te escribiremos más</h1>
        <p className="text-muted-foreground text-pretty">
          {view.sender_name} no te enviará más {what} comerciales
          {view.destination_masked === "" ? "" : ` a ${view.destination_masked}`}.
        </p>
      </Shell>
    )
  }
  return (
    <Shell>
      <MailX aria-hidden className="text-muted-foreground size-10" />
      <h1 className="font-heading text-2xl font-bold text-balance">
        ¿Dejar de recibir {what} de {view.sender_name}?
      </h1>
      <p className="text-muted-foreground text-pretty">
        {view.destination_masked === ""
          ? "No te volverán a escribir por este medio."
          : `No te volverán a escribir a ${view.destination_masked} por este medio.`}
      </p>
      {failed && (
        <p role="alert" className="text-destructive text-sm text-pretty">
          No pudimos registrar tu baja. Inténtalo otra vez en unos segundos.
        </p>
      )}
      <form action={action}>
        <Button type="submit" size="lg" className="rounded-full">
          Sí, no quiero recibir más
        </Button>
      </form>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background grid min-h-dvh place-items-center px-4 py-12">
      <div className="border-border bg-card flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border p-8 text-center shadow-sm">
        {children}
      </div>
    </main>
  )
}
