import {
  ArrowRight,
  Bot,
  Calculator,
  CircleCheck,
  Lock,
  PhoneCall,
  ReceiptText,
  ScanSearch,
  ShieldCheck,
  Tag,
  TicketPercent,
  Timer,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/core/lib/utils";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import type { Price } from "@/modules/landing/domain/film/film-content";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { Bubble, Phone } from "@/modules/landing/ui/film/parts/chat";
import { FILM_ICONS } from "@/modules/landing/ui/film/parts/film-icons";
import { Ribbon } from "@/modules/landing/ui/film/parts/Ribbon";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";

function ProductTile({ item, big, highlight }: { item: Price; big?: boolean; highlight?: boolean }) {
  const Icon = FILM_ICONS[item.icon];
  return (
    <div
      data-anim={highlight ? "match" : "tile"}
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--film-line)] bg-[var(--film-surface-2)]",
        highlight && "shadow-[0_0_0_2px_var(--axi-violet),0_0_40px_color-mix(in_srgb,var(--axi-violet)_45%,transparent)]",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center bg-[radial-gradient(120%_90%_at_50%_0%,color-mix(in_srgb,var(--foreground)_14%,var(--background)),var(--background))]",
          big ? "h-32" : "h-20",
        )}
      >
        <Icon className={cn("text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]", big ? "size-9" : "size-6")} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-[11.5px] font-semibold">{item.name}</p>
        <p className="film-dim text-[11px] tabular-nums">{item.price}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Chat ─────────────────────────────── */

export function ChatScene() {
  return (
    <section id="vender" data-scene="chat" data-chapter="Vender" aria-labelledby="chat-h" className="film-scene">
      <div className="film-spot top-[0%] left-[0%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_12%,transparent),transparent)]" />
      <Ribbon d="M -40 880 C 160 820, 220 700, 320 640" className="max-lg:hidden" />
      <div className="film-wrap grid items-center gap-12 lg:grid-cols-2">
        <div className="max-lg:order-2">
          <Phone
            className="mx-auto h-[min(740px,78svh)] w-[min(372px,86vw)] max-lg:h-[min(560px,66svh)]"
            title={<ByNiche as="span">{(c) => c.business}</ByNiche>}
            status="agente en línea"
          >
            <ByNiche>
              {(c) => (
                <>
                  <Bubble side="in" meta="8:47 p. m.">
                    {c.chat.customer1}
                  </Bubble>
                  <Bubble side="out" meta="respondió en 4 s">
                    {c.chat.agent1}
                  </Bubble>
                  <div className="flex justify-end" data-anim="msg">
                    <div className="w-[200px] max-lg:w-[160px]">
                      <ProductTile item={c.chat.product} big />
                    </div>
                  </div>
                  <Bubble side="in">{c.chat.customer2}</Bubble>
                  <Bubble side="out">{c.chat.agent2}</Bubble>
                  <div className="flex justify-center" data-anim="msg">
                    <span className="film-chip text-xs">
                      <ReceiptText className="size-3 text-[var(--axi-amber)]" aria-hidden="true" />
                      {c.chat.system}
                    </span>
                  </div>
                </>
              )}
            </ByNiche>
          </Phone>
        </div>
        <div className="max-lg:order-1">
          <SceneHead
            id="chat-h"
            eyebrow="Vender"
            strong="Responde en segundos."
            thin="Con tus precios reales."
            lead="Busca en tu catálogo, cotiza, arma el pedido y comparte tus medios de pago. Como tu mejor vendedor, a cualquier hora."
          />
          <ByNiche>
            {(c) => (
              <div data-anim="sale" className="film-glass mt-9 inline-block min-w-[280px] rounded-3xl p-5 max-lg:hidden">
                <p className="film-eyebrow text-[10px] text-[var(--axi-success)]">{c.chat.sale.label}</p>
                <p className="film-h mt-1 text-[38px] tabular-nums">{c.chat.sale.amount}</p>
                <p className="film-dim text-[12.5px]">{c.chat.sale.caption}</p>
              </div>
            )}
          </ByNiche>
          <p className="mt-4 max-lg:hidden">
            <span className="film-chip">
              <Timer className="size-3.5 text-[var(--axi-brand)]" aria-hidden="true" />
              Respondió en 4 s
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Foto ─────────────────────────────── */

export function PhotoScene() {
  return (
    <section id="foto" data-scene="photo" aria-labelledby="foto-h" className="film-scene">
      <div className="film-spot top-[20%] left-[40%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-violet)_12%,transparent),transparent)]" />
      <div className="film-wrap">
        <SceneHead
          id="foto-h"
          eyebrow="Vender"
          tone="violet"
          strong="Una foto"
          thin="basta."
          lead="Tu cliente manda una captura y Axi encuentra el producto exacto en tu catálogo."
        />
        <ByNiche>
          {(c) => {
            const match = c.photo.catalog[c.photo.matchIndex];
            const Icon = FILM_ICONS[match.icon];
            return (
              <div className="mt-12 grid items-center gap-8 lg:grid-cols-[260px_minmax(0,1fr)_240px] max-lg:mt-8">
                <div data-anim="shot" className="film-card relative mx-auto w-[240px] overflow-hidden" aria-hidden="true">
                  <div className="flex items-center gap-2 px-3.5 py-3 text-xs">
                    <span className="size-6 rounded-full bg-[linear-gradient(135deg,var(--axi-amber),var(--axi-brand))]" />
                    <span className="font-semibold">{c.photo.handle}</span>
                  </div>
                  <div className="flex h-[240px] items-center justify-center bg-[radial-gradient(120%_80%_at_50%_10%,color-mix(in_srgb,var(--foreground)_16%,var(--background)),var(--background))] max-lg:h-[180px]">
                    <Icon className="size-20 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]" strokeWidth={1.4} />
                  </div>
                  <p className="film-dim px-3.5 py-3 text-[11.5px]">Captura enviada por el cliente</p>
                  <div data-anim="scan" className="absolute inset-x-0 top-[45%] h-0.5 bg-[var(--axi-brand)] shadow-[0_0_24px_6px_color-mix(in_srgb,var(--axi-brand)_55%,transparent)]" />
                </div>
                <div className="flex flex-col gap-4">
                  <span data-anim="recognized" className="film-glass inline-flex w-fit max-w-full items-center gap-2 rounded-full px-4 py-2 text-[13px]">
                    <ScanSearch className="size-4 shrink-0 text-[var(--axi-violet)]" aria-hidden="true" />
                    <strong className="font-semibold">Reconocido</strong>
                    <span className="film-lead truncate">
                      {match.name} · similitud {c.photo.similarity}
                    </span>
                  </span>
                  <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2">
                    {c.photo.catalog.map((item, i) => (
                      <ProductTile key={item.name} item={item} highlight={i === c.photo.matchIndex} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col">
                  <Bubble side="out" meta="8:51 p. m.">
                    {c.photo.reply}
                  </Bubble>
                </div>
              </div>
            );
          }}
        </ByNiche>
      </div>
    </section>
  );
}

/* ────────────────────────────── Llamada ────────────────────────────── */

const CALL_STAGES = ["Apertura", "Motivo", "Descubrimiento", "Propuesta", "Objeciones", "Cierre"] as const;

export function CallScene() {
  return (
    <section id="llamada" data-scene="call" aria-labelledby="llamada-h" className="film-scene">
      <div className="film-spot top-[10%] right-[5%] size-[720px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-violet)_24%,transparent),transparent)]" />
      <div className="film-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <SceneHead
            id="llamada-h"
            eyebrow="Vender"
            tone="violet"
            strong="Y cuando hay que llamar,"
            thin="llama."
            lead="Retoma cotizaciones, confirma citas y lleva la llamada por etapas."
          />
          <ByNiche>
            {(c) => (
              <ol className="mt-9 flex flex-col gap-3.5" aria-label="Transcripción de ejemplo">
                {c.call.lines.map(([who, text], i) => (
                  <li key={i} data-anim="line" className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 text-[15px] leading-relaxed">
                    <span className={cn("film-eyebrow pt-1 text-[10px]", who === "axi" ? "text-[var(--axi-violet)]" : "film-dim")}>
                      {who === "axi" ? "Axi" : c.call.customer}
                    </span>
                    <span className={i === c.call.lines.length - 1 ? "" : "film-lead"}>{text}</span>
                  </li>
                ))}
              </ol>
            )}
          </ByNiche>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div data-anim="aura" className="relative flex size-[200px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,color-mix(in_srgb,var(--foreground)_16%,var(--background)),var(--background))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_12%,transparent),0_0_120px_color-mix(in_srgb,var(--axi-violet)_35%,transparent)] max-lg:size-[150px]" aria-hidden="true">
            <BrandMark className="size-24 max-lg:size-16" />
          </div>
          <span className="film-chip h-8">
            <PhoneCall className="size-3.5 text-[var(--axi-success)]" aria-hidden="true" />
            En conversación · 02:14
          </span>
          <ol className="relative grid w-full max-w-[600px] grid-cols-6 gap-1" aria-label="Etapas de la llamada">
            <span className="absolute top-[6px] right-[8%] left-[8%] h-px bg-[linear-gradient(90deg,var(--foreground)_80%,var(--film-line)_80%)]" aria-hidden="true" data-anim="stage-line" />
            {CALL_STAGES.map((s, i) => (
              <li key={s} data-anim="stage" className="relative flex flex-col items-center gap-2.5 text-center">
                <span
                  className={cn(
                    "size-3.5 rounded-full",
                    i < 5 ? "bg-foreground" : "bg-[var(--axi-brand)] shadow-[0_0_0_5px_color-mix(in_srgb,var(--axi-brand)_20%,transparent),0_0_18px_var(--axi-brand)]",
                  )}
                />
                <span className={cn("text-[11.5px] max-sm:text-[9.5px]", i < 5 ? "" : "film-dim")}>{s}</span>
              </li>
            ))}
          </ol>
          <ByNiche>
            {(c) => (
              <p data-anim="outcome" className="film-glass flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm">
                <CircleCheck className="size-[18px] text-[var(--axi-success)]" aria-hidden="true" />
                <strong className="font-semibold">Objetivo cumplido</strong>
                <span className="film-dim">{c.call.outcome}</span>
              </p>
            )}
          </ByNiche>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Bóveda ─────────────────────────────── */

const LOCKS: readonly { Icon: LucideIcon; title: string; note: string }[] = [
  { Icon: Tag, title: "Precio", note: "de tu catálogo" },
  { Icon: TicketPercent, title: "Descuento", note: "solo con un cupón válido" },
  { Icon: Calculator, title: "Total", note: "lo calcula el sistema" },
  { Icon: UserCheck, title: "Pago", note: "lo confirma tu equipo" },
];

function LockCard({ Icon, title, note }: (typeof LOCKS)[number]) {
  return (
    <li data-anim="lock" className="film-card flex items-center gap-3 rounded-2xl px-4 py-3.5">
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="film-dim block text-xs">{note}</span>
      </span>
      <Lock className="film-dim size-3.5 shrink-0" aria-hidden="true" />
    </li>
  );
}

export function VaultScene() {
  return (
    <section id="garantias" data-scene="vault" aria-labelledby="boveda-h" className="film-scene">
      <div className="film-spot top-[20%] left-[calc(50%-380px)] size-[760px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_10%,transparent),transparent)]" />
      <div className="film-wrap text-center">
        <div data-anim="head">
          <p className="film-eyebrow mb-4 text-[var(--axi-brand)]">Vender, con reglas</p>
          <h2 id="boveda-h" className="film-h text-[clamp(34px,4.4vw,60px)]">
            Nunca inventa <span className="t">un precio.</span>
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-[1040px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] max-lg:mt-8">
          <ul className="flex flex-col gap-4 text-left max-lg:order-2">
            <LockCard {...LOCKS[0]} />
            <LockCard {...LOCKS[2]} />
          </ul>
          <div className="relative mx-auto flex aspect-square w-[260px] flex-col items-center justify-center max-lg:order-1 max-lg:w-[200px]">
            {[1, 0.76, 0.52].map((s, i) => (
              <span
                key={s}
                data-anim="ring"
                aria-hidden="true"
                className="absolute rounded-full border"
                style={{ inset: `${((1 - s) / 2) * 100}%`, borderColor: `color-mix(in srgb, var(--foreground) ${6 + i * 4}%, transparent)` }}
              />
            ))}
            <span className="flex size-28 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-[var(--film-surface-2)] shadow-[0_0_80px_color-mix(in_srgb,var(--axi-brand)_25%,transparent)] max-lg:size-20" aria-hidden="true">
              <ShieldCheck className="size-11 max-lg:size-8" />
            </span>
          </div>
          <ul className="flex flex-col gap-4 text-left max-lg:order-3">
            <LockCard {...LOCKS[1]} />
            <LockCard {...LOCKS[3]} />
          </ul>
        </div>
        <ByNiche>
          {(c) => (
            <div className="mx-auto mt-10 flex max-w-[640px] flex-col gap-3 text-left">
              <Bubble side="in">{c.vault.ask}</Bubble>
              <Bubble side="out" meta="precio y total del sistema">
                {c.vault.answer}
              </Bubble>
            </div>
          )}
        </ByNiche>
        <p className="film-lead mx-auto mt-10 max-w-2xl text-[clamp(15px,1.3vw,17px)]">
          Precios, cupones y totales salen de tu sistema, no de la IA. Y ningún pago se da por hecho sin tu equipo.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Equipo ─────────────────────────────── */

const MODES = [
  { label: "Axi atiende", dot: "bg-[var(--axi-violet)]" },
  { label: "En cola · 1 min", dot: "bg-[var(--axi-amber)]" },
  { label: "Contigo", dot: "bg-[var(--axi-brand)]" },
] as const;

export function TeamScene() {
  return (
    <section id="equipo" data-scene="team" aria-labelledby="equipo-h" className="film-scene">
      <div className="film-spot top-[20%] right-[0%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_9%,transparent),transparent)]" />
      <Ribbon d="M -40 880 C 260 870, 460 720, 600 640" className="max-lg:hidden" />
      <div className="film-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
        <SceneHead
          id="equipo-h"
          eyebrow="Vender, en equipo"
          strong="Cuando hace falta una persona,"
          thin="entra tu equipo."
          lead="El cliente no nota el cambio. Cuando se la devuelves, Axi sigue donde quedó."
          size="md"
        />
        <div className="min-w-0">
          <ol className="mb-4 flex flex-wrap items-center gap-2.5" aria-label="Quién atiende la conversación">
            {MODES.map((m, i) => (
              <li key={m.label} className="flex items-center gap-2.5">
                <span data-anim="mode" data-last={i === MODES.length - 1 || undefined} className={cn("film-chip h-8 px-3.5", i === MODES.length - 1 && "border-foreground bg-foreground text-background")}>
                  <span className={cn("size-[7px] rounded-full", m.dot)} />
                  {m.label}
                </span>
                {i < MODES.length - 1 ? <ArrowRight className="film-dim size-4" aria-hidden="true" /> : null}
              </li>
            ))}
          </ol>
          <ByNiche>
            {(c) => (
              <div data-anim="inbox" className="film-card grid min-h-[440px] grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-3xl shadow-[0_40px_120px_rgb(0_0_0/.6)] max-md:grid-cols-1">
                <div className="flex flex-col gap-1 border-r border-[var(--film-line)] p-3.5 max-md:hidden">
                  <p className="film-eyebrow film-dim px-2 pt-1 pb-2.5 text-[10px]">Bandeja</p>
                  {[c.team.customer, "Valeria Ríos", "Camilo Díaz", "Luisa Mejía"].map((n, i) => (
                    <div key={n} className={cn("flex items-center gap-2.5 rounded-xl p-2.5", i === 0 && "bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]")}>
                      <span className="size-8 shrink-0 rounded-full bg-[var(--film-surface-2)]" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{n}</span>
                        <span className="film-dim block truncate text-[11.5px]">{i === 0 ? c.team.ask : "Axi: listo, va en camino"}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex min-w-0 flex-col">
                  <div className="flex h-14 items-center justify-between gap-3 border-b border-[var(--film-line)] px-4">
                    <strong className="truncate text-sm">{c.team.customer}</strong>
                    <span data-anim="return" className="film-chip h-9 shrink-0 px-3">
                      <Bot className="size-4" aria-hidden="true" />
                      Devolver a Axi
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-end gap-3 p-4">
                    <Bubble side="in" meta="10:31 a. m.">
                      {c.team.ask}
                    </Bubble>
                    <p data-anim="msg" className="film-lead self-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-1.5 text-center text-[11.5px]">
                      Axi te la pasó: el cliente pidió hablar con una persona · hace 1 min
                    </p>
                    <Bubble side="out" meta={`${c.team.operator} · 10:32 a. m.`}>
                      {c.team.reply}
                    </Bubble>
                  </div>
                  <div className="film-dim m-3.5 flex h-11 items-center rounded-2xl border border-[var(--film-line)] px-3.5 text-[13px]">
                    Escribe como {c.team.operator}…
                  </div>
                </div>
              </div>
            )}
          </ByNiche>
        </div>
      </div>
    </section>
  );
}
