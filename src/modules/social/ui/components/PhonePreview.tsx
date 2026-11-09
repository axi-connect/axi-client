import { cn } from "@/core/lib/utils";
import {
  DEFAULT_BUTTON_TITLE,
  previewPublicReply,
  type DeliveryBlock,
} from "@/modules/social/domain/social";
import { NetworkIcon } from "./SocialPieces";

/**
 * «Así lo verá quien comenta»: el comentario con la respuesta pública y el chat
 * con la apertura, el toque y la entrega. Se arma con lo que el dueño va
 * escribiendo; no es una captura de Instagram ni de Facebook, es la secuencia.
 */
export function PhonePreview({
  network,
  accountName,
  keyword,
  publicReply,
  openerText,
  buttonTitle,
  delivery,
  inviteFollow,
  className,
}: {
  network: "instagram" | "facebook";
  accountName: string;
  keyword: string | null;
  publicReply: string | null;
  openerText: string;
  buttonTitle: string;
  delivery: readonly DeliveryBlock[];
  inviteFollow: boolean;
  className?: string;
}) {
  const commenter = "cliente.demo";
  return (
    <figure
      aria-label="Vista previa de lo que recibe quien comenta"
      className={cn("border-border bg-card flex min-w-0 flex-col gap-3 rounded-[2rem] border p-3", className)}
    >
      <figcaption className="flex items-center gap-2 px-2 pt-1">
        <NetworkIcon network={network} className="size-4" />
        <span className="truncate text-sm font-semibold">Así lo verá quien comenta</span>
      </figcaption>

      <section aria-label="En la publicación" className="bg-background flex flex-col gap-2.5 rounded-3xl p-3.5">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">
          En la publicación
        </p>
        <p className="text-sm">
          <b className="font-semibold">{commenter}</b>{" "}
          {keyword === null ? <span className="text-muted-foreground">escribe la palabra</span> : keyword}
        </p>
        {publicReply !== null && publicReply.trim().length > 0 && (
          <p className="border-border border-l-2 pl-3 text-sm">
            <b className="font-semibold">{accountName}</b> {previewPublicReply(publicReply, commenter)}
          </p>
        )}
      </section>

      <section aria-label="En el chat" className="bg-background flex flex-col gap-2 rounded-3xl p-3.5">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">
          En el chat
        </p>
        <Bubble side="business">
          {openerText.trim().length > 0 ? (
            openerText
          ) : (
            <span className="text-muted-foreground">Tu mensaje privado aparece aquí.</span>
          )}
          <span className="border-border mt-2 block rounded-xl border py-1.5 text-center text-sm font-semibold">
            {buttonTitle.trim() || DEFAULT_BUTTON_TITLE}
          </span>
        </Bubble>
        <Bubble side="person">{buttonTitle.trim() || DEFAULT_BUTTON_TITLE}</Bubble>
        {delivery.length === 0 && !inviteFollow ? (
          <p className="text-muted-foreground px-1 text-xs">Lo que entregas aparece aquí, bloque a bloque.</p>
        ) : null}
        {delivery.map((block, index) => (
          <Bubble key={index} side="business">
            {block.type === "text" && block.text}
            {block.type === "media" && (
              <span className="text-muted-foreground">{block.filename ?? "Archivo adjunto"}</span>
            )}
            {block.type === "link" && (
              <>
                {block.text}
                <span className="border-border mt-2 block truncate rounded-xl border py-1.5 text-center text-sm font-semibold">
                  {block.button_title}
                </span>
              </>
            )}
          </Bubble>
        ))}
        {inviteFollow && (
          <Bubble side="business">Si te gustó, síguenos para no perderte lo próximo que publiquemos.</Bubble>
        )}
      </section>
    </figure>
  );
}

function Bubble({ side, children }: { side: "business" | "person"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm text-pretty break-words",
        side === "business" ? "bg-muted self-start rounded-bl-md" : "bg-primary text-primary-foreground self-end rounded-br-md",
      )}
    >
      {children}
    </p>
  );
}
