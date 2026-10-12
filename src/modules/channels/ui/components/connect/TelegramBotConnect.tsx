"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle, Send, TriangleAlert } from "lucide-react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { connectTelegramBot } from "@/modules/channels/infrastructure/services/telegram.adapter";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";

/** `<id numérico>:<secreto>`: la forma del token que da @BotFather. */
const BOT_TOKEN = /^\d{5,15}:[A-Za-z0-9_-]{30,}$/;
const BOTFATHER_URL = "https://t.me/BotFather";

const STEPS = [
  {
    title: "Abre @BotFather",
    body: (
      <>
        Es el bot oficial de Telegram para crear bots.{" "}
        <a
          href={BOTFATHER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground underline-offset-2 hover:underline"
        >
          t.me/BotFather
        </a>
      </>
    ),
  },
  {
    title: "Crea tu bot",
    body: (
      <>
        Escríbele <Code>/newbot</Code>, ponle un nombre (el que verán tus clientes) y un usuario que
        termine en <Code>bot</Code>.
      </>
    ),
  },
  {
    title: "Copia el token",
    body: (
      <>
        BotFather te responde con un token como <Code>123456:ABC…</Code>. Pégalo aquí abajo.
      </>
    ),
  },
] as const;

/**
 * Paso «Conectar» del canal Telegram (mockup `telegram-channel.html`, vistas 3,
 * 3b y 3c): la guía de @BotFather en tres pasos y UN campo.
 *
 * No hay popup ni identificadores que pedir: el servidor saca el id y el
 * usuario del bot del propio token. La validación local es solo de forma —que
 * no se mande media línea copiada—; la de verdad la hace Telegram.
 */
export function TelegramBotConnect({ onConnected }: { onConnected: (channel: ChannelDTO) => void }) {
  const fieldId = useId();
  const hintId = useId();
  const [token, setToken] = useState("");
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upsertChannel = useChannelStore((state) => state.upsertChannel);

  const trimmed = token.trim();
  const looksValid = BOT_TOKEN.test(trimmed);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!looksValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const channel = await connectTelegramBot({ bot_token: trimmed });
      upsertChannel(channel);
      onConnected(channel);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <ol className="grid gap-3 md:grid-cols-3" aria-label="Cómo crear tu bot">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-2 rounded-lg border border-border bg-background px-4 py-3.5"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="grid size-5.5 place-items-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                {index + 1}
              </span>
              Paso {index + 1}
            </span>
            <span className="font-medium">{step.title}</span>
            <p className="text-sm text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border p-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId}>Token del bot</Label>
          <div className="flex flex-wrap items-stretch gap-2">
            <div className="relative min-w-60 flex-1">
              <KeyRound
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={fieldId}
                name="bot_token"
                value={token}
                onChange={(event) => {
                  setToken(event.target.value);
                  setError(null);
                }}
                type={visible ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder="Pega aquí el token de tu bot"
                aria-invalid={error !== null}
                aria-describedby={hintId}
                disabled={submitting}
                className={cn("pr-10 pl-9 font-mono text-[13px]", error !== null && "border-destructive")}
              />
              <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? "Ocultar el token" : "Mostrar el token"}
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
              >
                {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            <Button type="submit" disabled={!looksValid || submitting}>
              {submitting ? (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {submitting ? "Conectando…" : "Conectar bot"}
            </Button>
          </div>
          {error !== null ? (
            <p id={hintId} role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : (
            <p id={hintId} className="text-xs text-muted-foreground">
              {submitting
                ? "Comprobando el token con Telegram y dejando listo el bot…"
                : trimmed !== "" && !looksValid
                  ? "Parece incompleto: el token tiene números, dos puntos y unas 35 letras."
                  : "Lo guardamos cifrado. Nunca se vuelve a mostrar completo."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2.5 rounded-md border border-dashed border-border px-3.5 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 text-warning" aria-hidden />
          <p>
            <span className="font-medium">Si el bot ya responde en otra herramienta</span>, al conectarlo
            aquí dejará de hacerlo allí: Telegram entrega los mensajes de un bot a un solo sistema.
          </p>
        </div>
      </form>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>;
}

/** El error dice qué hacer, con palabras de Telegram y no de la API. */
function describeError(err: unknown): string {
  if (isHttpError(err)) {
    switch (err.code) {
      case "channels/invalid_credentials":
        return "Telegram no reconoce ese token. Cópialo otra vez desde @BotFather: si lo regeneraste, el anterior deja de servir.";
      case "channels/provider_account_taken":
        return "Ese bot ya está conectado en otra cuenta de axi. Crea otro bot en @BotFather para esta.";
      default:
        return errorMessage(err, "No pudimos conectar el bot.");
    }
  }
  return "No pudimos conectar el bot. Revisa tu conexión y vuelve a intentarlo.";
}
