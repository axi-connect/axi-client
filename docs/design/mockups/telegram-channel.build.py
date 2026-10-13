#!/usr/bin/env python3
"""Mockup «Canal Telegram» (axi-server/docs/plans/telegram_channel_plan.md, F0).

La idea que ordena estas pantallas: **Telegram es el canal de probar**. Ningún cliente de axi capta
por Telegram, pero es el único canal que se conecta en un minuto sin Meta, sin número y sin revisión.
De ahí:

1. **Un canal más, no un módulo aparte.** Entra por la misma galería, el mismo asistente de cuatro
   pasos y la misma tarjeta de canal (`ProviderCard` + `brand-telegram`). Lo único propio es el paso
   «Conectar»: la guía de @BotFather en tres pasos y un campo para el token.
2. **El final del alta es un QR.** «Todo listo» no dice «escríbele a ese número»: enseña el bot, el
   QR y «Abrir en Telegram». Probar el agente desde el celular es literalmente escanear.
3. **Cero jerga de Meta.** La tarjeta y el detalle hablan de «Bot» y «Recepción de mensajes», no de
   «Acceso de Meta». El webhook se diagnostica con palabras: «Recibiendo», «Telegram no nos alcanza».
4. **El inbox no cambia de idioma.** Los botones, el calendario y el «pedir teléfono» se pintan con
   el mismo `InteractiveMessage` de siempre; solo gana dos piezas: opciones agrupadas por día y la
   burbuja del contacto compartido.
5. **Lo que ve el cliente final** se enseña en su propio panel (vista «En Telegram»): no es producto
   de axi, es la promesa de cómo se verá allí.

Uso:  python3 telegram-channel.build.py
"""
import pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("telegram-channel")
ic, btn, badge = K.ic, K.btn, K.badge

# --------------------------------------------------------------------------- glifos de terceros
# react-icons en producto (FaTelegramPlane, FaWhatsapp…); aquí, el path del glifo a mano.
TG_PATH = (
    '<path fill="currentColor" d="M446.7 98.6l-67.6 318.8c-5.1 22.5-18.4 28.1-37.3 17.5l-103-75.9-49.7 47.8'
    'c-5.5 5.5-10.1 10.1-20.7 10.1l7.4-104.9 190.9-172.5c8.3-7.4-1.8-11.5-12.9-4.1L117.8 284 16.2 252.2'
    'c-22.1-6.9-22.5-22.1 4.6-32.7L418.2 66.4c18.4-6.9 34.5 4.1 28.5 32.2z"/>'
)


def tg(size: int = 20, cls: str = "text-logo-telegram") -> str:
    return f'<svg class="ic {cls}" width="{size}" height="{size}" viewBox="0 0 448 512" aria-hidden="true">{TG_PATH}</svg>'


def glyph(kind: str, size: int = 20) -> str:
    if kind == "telegram":
        return tg(size)
    names = {"whatsapp": "message-circle", "instagram": "instagram", "messenger": "facebook"}
    return ic(names[kind], f"text-logo-{kind}", size)


def plate(kind: str, size: int = 20) -> str:
    return f'<span class="plate">{glyph(kind, size)}</span>'


# --------------------------------------------------------------------------- QR determinista
def qr(cells: int = 29, px: int = 5, seed: int = 7) -> str:
    """Un QR de mentira pero creíble: tres patrones de posición y ruido determinista."""
    import random
    rnd = random.Random(seed)
    rects = []

    def finder(x: int, y: int) -> None:
        rects.append(f'<rect x="{x}" y="{y}" width="7" height="7" rx="1.2"/>')
        rects.append(f'<rect x="{x+1}" y="{y+1}" width="5" height="5" rx=".8" style="fill:var(--background)"/>')
        rects.append(f'<rect x="{x+2}" y="{y+2}" width="3" height="3" rx=".6"/>')

    def in_finder(x: int, y: int) -> bool:
        return (x < 8 and y < 8) or (x >= cells - 8 and y < 8) or (x < 8 and y >= cells - 8)

    for y in range(cells):
        for x in range(cells):
            if not in_finder(x, y) and rnd.random() < 0.47:
                rects.append(f'<rect x="{x}" y="{y}" width="1" height="1"/>')
    finder(0, 0)
    finder(cells - 7, 0)
    finder(0, cells - 7)
    size = cells * px
    # La placa central lleva el glifo: es lo que hace reconocible que el QR abre Telegram.
    c = cells / 2
    logo = (
        f'<rect x="{c-3}" y="{c-3}" width="6" height="6" rx="1.4" style="fill:var(--background)"/>'
        f'<g transform="translate({c-2.1},{c-2.3}) scale(.0095)">{TG_PATH.replace('fill="currentColor"', 'style="fill:var(--logo-telegram)"')}</g>'
    )
    return (
        f'<svg class="qr" width="{size}" height="{size}" viewBox="0 0 {cells} {cells}" role="img" '
        f'aria-label="Código QR que abre el bot en Telegram" style="fill:var(--foreground)" shape-rendering="crispEdges">'
        f'{"".join(rects)}{logo}</svg>'
    )


EXTRA_CSS = r"""
:root{ --logo-telegram:#26a5e4; --logo-whatsapp:#25d366; --logo-instagram:#e1306c; --logo-messenger:#0084ff; }
.text-logo-telegram{color:var(--logo-telegram)} .text-logo-whatsapp{color:var(--logo-whatsapp)}
.text-logo-instagram{color:var(--logo-instagram)} .text-logo-messenger{color:var(--logo-messenger)}
.brand-telegram{--ch-glow:var(--logo-telegram)} .brand-whatsapp{--ch-glow:var(--logo-whatsapp)}
.brand-instagram{--ch-glow:var(--logo-instagram)} .brand-messenger{--ch-glow:var(--logo-messenger)}
.brand-fault{--ch-glow:var(--axi-destructive)}

/* ── ProviderCard (globals.css channel-surface, literal) ──────────────── */
.pc{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;gap:14px;width:100%;text-align:left;
  border:1px solid var(--border);background:var(--background);border-radius:var(--radius-lg);padding:16px;text-decoration:none;color:inherit;
  transition:border-color .25s ease, transform .25s ease}
.pc::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.75;
  background:radial-gradient(circle 96px at 34px 34px, color-mix(in srgb, var(--ch-glow, var(--axi-brand)) 34%, transparent) 0%, transparent 100%),
  radial-gradient(130% 120% at 0% 0%, color-mix(in srgb, var(--ch-glow, var(--axi-brand)) 20%, transparent) 0%, color-mix(in srgb, var(--ch-glow, var(--axi-brand)) 7%, transparent) 34%, transparent 66%)}
.pc:hover{border-color:color-mix(in srgb, var(--ch-glow, var(--axi-brand)) 45%, var(--border));transform:translateY(-1px)}
.pc[data-selected="true"]{border-color:color-mix(in srgb, var(--ch-glow) 55%, var(--border))}
.pc[data-selected="true"]::before{opacity:.95}
.pc .top{display:flex;align-items:flex-start;gap:12px}
.plate{display:grid;place-items:center;width:40px;height:40px;border-radius:var(--radius-md);flex:none;
  background:color-mix(in srgb, var(--ch-glow, var(--axi-brand)) 10%, var(--background));border:1px solid color-mix(in srgb, var(--ch-glow, var(--axi-brand)) 22%, transparent)}
.plate.lg{width:52px;height:52px;border-radius:14px}
.pc .tt{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.pc .tt b{font-weight:600;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pc .tt small{font-size:12px;color:var(--muted-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc p{color:var(--muted-foreground);font-size:13.5px}
.pc .foot{font-size:12px;color:var(--muted-foreground);margin-top:auto}
.pc .chk{position:absolute;top:12px;right:12px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--ch-glow);color:var(--background);z-index:1}
.pc dl{display:flex;flex-wrap:wrap;gap:10px 24px;margin:0}
.pc dt{font-size:12px;color:var(--muted-foreground)} .pc dd{margin:0;font-size:13px;font-weight:500;display:flex;gap:6px;align-items:center}
.pill{border-radius:999px;padding:2px 8px;font-size:12px;font-weight:500;background:var(--secondary);color:var(--muted-foreground)}
.pill.violet{background:color-mix(in srgb, var(--axi-violet) 12%, transparent);color:var(--axi-violet)}
.pcgrid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(20rem,100%),1fr))}

/* ── StepIndicator (step-indicator.tsx) ───────────────────────────────── */
.steps{display:flex;align-items:center;gap:8px;list-style:none;margin:0;padding:0}
.steps li{display:flex;align-items:center;gap:8px} .steps li+li{flex:1}
.steps .bar{height:1px;flex:1;background:var(--border)} .steps .bar.on{background:color-mix(in srgb, var(--axi-violet) 50%, transparent)}
.steps .st{display:flex;align-items:center;gap:8px;padding:4px 12px 4px 4px;border-radius:999px;font-size:14px;color:var(--muted-foreground)}
.steps .n{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:600;background:var(--axi-muted);color:var(--muted-foreground)}
.steps .done .n{background:color-mix(in srgb, var(--axi-violet) 15%, transparent);color:var(--axi-violet)}
.steps .cur .n{background:var(--foreground);color:var(--background)} .steps .cur{color:var(--foreground);font-weight:500}
@container (max-width: 640px){.steps .st span.l{display:none}}

.flow{max-width:880px;margin:0 auto;padding:24px 24px 72px;display:flex;flex-direction:column;gap:24px}
.flow header h1{font-size:30px;font-family:var(--font-body);font-weight:600;letter-spacing:-.02em}
.flow header p{color:var(--muted-foreground)}

/* checklist de requisitos */
.req{display:flex;flex-direction:column;gap:10px}
.req label{display:grid;grid-template-columns:20px 1fr;gap:12px;padding:14px 16px;border:1px solid var(--border);border-radius:var(--radius-lg);cursor:pointer}
.req .box{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--input);display:grid;place-items:center;margin-top:1px}
.req .box.on{background:var(--foreground);border-color:var(--foreground);color:var(--background)}
.req b{font-weight:500;display:block} .req small{font-size:13px;color:var(--muted-foreground)}

/* ── guía BotFather + token ────────────────────────────────────────────── */
.guide{display:grid;gap:12px;grid-template-columns:1fr}
@container (min-width: 760px){.guide{grid-template-columns:repeat(3,minmax(0,1fr))}}
.gstep{border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;display:flex;flex-direction:column;gap:8px;background:var(--background)}
.gstep .gn{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted-foreground);font-weight:500}
.gstep .gn span{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--secondary);color:var(--foreground);font-size:12px;font-weight:600}
.gstep b{font-weight:500}
.gstep p{font-size:13px;color:var(--muted-foreground)}
.gstep code,.mono-chip{font-family:var(--font-mono);font-size:12px;background:var(--secondary);border-radius:6px;padding:1px 6px;color:var(--foreground)}
.tokenbox{border:1px solid var(--border);border-radius:var(--radius-xl);padding:20px;display:flex;flex-direction:column;gap:14px}
.tokenrow{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap}
.tokenrow .input{flex:1;min-width:240px;font-family:var(--font-mono);font-size:13px}
.input .eye{margin-left:auto;color:var(--muted-foreground)}
.spin{animation:spin 1s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}

/* ── éxito ─────────────────────────────────────────────────────────────── */
.success{display:grid;gap:20px;grid-template-columns:1fr;align-items:start}
@container (min-width: 760px){.success{grid-template-columns:minmax(0,1fr) 248px}}
.qrcard{border:1px solid var(--border);border-radius:var(--radius-xl);padding:16px;display:flex;flex-direction:column;align-items:center;gap:12px;background:var(--background);text-align:center}
.qr{width:180px;height:180px;display:block}
.qrcard small{color:var(--muted-foreground);font-size:12px}
.linkrow{display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:var(--radius-md);padding:6px 6px 6px 12px;font-family:var(--font-mono);font-size:12.5px;width:100%;justify-content:space-between}
.linkrow span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.okbox{display:flex;gap:12px;border-radius:var(--radius-md);border:1px solid color-mix(in srgb, var(--axi-success) 40%, transparent);background:color-mix(in srgb, var(--axi-success) 9%, transparent);padding:16px}
.okbox .ic{color:var(--axi-success);margin-top:2px} .okbox b{font-weight:600;display:block}
.okbox p{color:var(--muted-foreground)}
details.tech{border:1px solid var(--border);border-radius:var(--radius-lg)}
details.tech summary{list-style:none;cursor:pointer;padding:14px 16px;font-weight:500;display:flex;gap:8px;align-items:center}
details.tech .in{border-top:1px solid var(--border);padding:14px 16px;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))}
details.tech dt{font-size:12px;color:var(--muted-foreground)} details.tech dd{margin:0;font-family:var(--font-mono);font-size:12px;word-break:break-all}

/* ── detalle: salud ────────────────────────────────────────────────────── */
.health{display:grid;gap:0;grid-template-columns:1fr}
.hrow{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-soft)}
.hrow:last-child{border-bottom:none}
.hrow .hi{width:36px;height:36px;border-radius:10px;background:var(--secondary);display:grid;place-items:center}
.hrow b{font-weight:500;display:block} .hrow small{font-size:12.5px;color:var(--muted-foreground)}
.hrow .ok{color:var(--axi-success)} .hrow .warn{color:var(--axi-warning)} .hrow .bad{color:var(--axi-destructive)}

/* ── inbox ─────────────────────────────────────────────────────────────── */
.ibx{display:grid;grid-template-columns:300px minmax(0,1fr);border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;min-height:760px;background:var(--background)}
@container (max-width: 860px){.ibx{grid-template-columns:1fr} .ibx .list{display:none}}
.ibx .list{border-right:1px solid var(--border);display:flex;flex-direction:column}
.ibx .lh{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-weight:600}
.conv{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:2px 10px;padding:12px 16px;border-bottom:1px solid var(--border-soft)}
.conv.on{background:var(--accent)}
.av{position:relative;width:40px;height:40px;border-radius:50%;background:var(--secondary);display:grid;place-items:center;font-weight:600;font-size:13px}
.av .kbadge{position:absolute;right:-3px;bottom:-3px;width:18px;height:18px;border-radius:50%;background:var(--background);display:grid;place-items:center;border:1px solid var(--border)}
.conv b{font-weight:500;font-size:13.5px} .conv small{color:var(--muted-foreground);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.conv time{font-size:11px;color:var(--muted-foreground)}
.thread{display:flex;flex-direction:column;min-width:0}
.th-head{padding:12px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}
.th-head b{font-weight:600} .th-head small{font-size:12px;color:var(--muted-foreground);display:flex;gap:6px;align-items:center}
.th-body{flex:1;padding:18px;display:flex;flex-direction:column;gap:10px;background:color-mix(in srgb, var(--secondary) 45%, var(--background))}
.row{display:flex;flex-direction:column} .row.out{align-items:flex-end} .row.in{align-items:flex-start}
.author{font-size:11px;color:var(--muted-foreground);padding:0 6px;margin-bottom:4px;display:flex;gap:6px;align-items:center}
.author .ic{color:var(--axi-violet)}
.bub{max-width:min(75%,34rem);border-radius:16px;font-size:14px;padding:8px 12px}
.row.out .bub{background:var(--foreground);color:var(--background);border-bottom-right-radius:6px}
.row.in .bub{background:var(--background);border:1px solid var(--border);border-bottom-left-radius:6px}
.bub .meta{display:flex;justify-content:flex-end;gap:4px;align-items:center;font-size:10.5px;opacity:.7;margin-top:4px}
.ifr{margin-top:8px;border-top:1px solid color-mix(in srgb, currentColor 20%, transparent);padding-top:8px}
.ilbl{display:flex;align-items:center;gap:4px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;margin-bottom:6px}
.iopt{border-radius:8px;padding:6px 12px;font-size:12px;margin-top:4px}
.row.out .iopt{background:color-mix(in srgb, var(--background) 15%, transparent)}
.row.in .iopt{background:var(--secondary)}
.iopt b{font-weight:500}
.isec{font-size:10.5px;opacity:.7;margin:8px 2px 0;font-weight:500}
.isec:first-of-type{margin-top:0}
.ichips{display:flex;flex-wrap:wrap;gap:4px}
.ichips .iopt{margin-top:0}
.rchip{display:flex;align-items:center;gap:4px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted-foreground);margin-bottom:4px}
.sys{align-self:center;border-radius:999px;background:var(--axi-muted);color:var(--muted-foreground);font-size:12px;padding:4px 12px;display:flex;gap:6px;align-items:center}
.contactcard{display:grid;grid-template-columns:36px minmax(0,1fr);gap:10px;align-items:center;min-width:240px}
.contactcard .ci{width:36px;height:36px;border-radius:50%;background:var(--secondary);display:grid;place-items:center}
.contactcard b{font-weight:500;display:block} .contactcard small{font-size:12px;color:var(--muted-foreground)}
.verif{display:inline-flex;gap:4px;align-items:center;font-size:11.5px;color:var(--muted-foreground);margin-top:6px}
.verif .ic{color:var(--axi-success)}
.react{display:inline-flex;align-items:center;gap:4px;margin-top:-6px;margin-right:10px;background:var(--background);border:1px solid var(--border);border-radius:999px;padding:1px 7px;font-size:12px;position:relative;z-index:1}
.voice{display:flex;align-items:center;gap:10px;min-width:220px}
.voice .pl{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb, currentColor 14%, transparent)}
.wave{display:flex;gap:2px;align-items:center;flex:1;height:22px}
.wave i{display:block;width:3px;border-radius:2px;background:currentColor;opacity:.55}
.transcript{font-size:12px;opacity:.75;margin-top:6px;font-style:italic}
.composer{border-top:1px solid var(--border);padding:12px 16px;display:flex;gap:8px;align-items:center}
.composer .input{flex:1}

/* ── En Telegram (vista previa, no es producto de axi) ─────────────────── */
.phones{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))}
.ph{border:1px solid var(--border);border-radius:28px;overflow:hidden;background:var(--background);display:flex;flex-direction:column;min-height:560px;box-shadow:var(--shadow-float)}
.ph .cap{padding:10px 14px;font-size:12px;color:var(--muted-foreground);border-bottom:1px solid var(--border);display:flex;gap:6px;align-items:center}
.ph .cap b{color:var(--foreground);font-weight:500}
.tgh{display:flex;align-items:center;gap:10px;padding:10px 14px;background:color-mix(in srgb, var(--logo-telegram) 10%, var(--background));border-bottom:1px solid var(--border)}
.tgh .ava{width:34px;height:34px;border-radius:50%;background:var(--logo-telegram);color:#fff;display:grid;place-items:center;font-weight:600;font-size:13px}
.tgh b{font-size:14px;font-weight:600;display:block} .tgh small{font-size:11.5px;color:var(--logo-telegram)}
.tgb{flex:1;padding:14px 10px;display:flex;flex-direction:column;gap:6px;justify-content:flex-end;
  background:color-mix(in srgb, var(--logo-telegram) 6%, var(--background))}
.tm{max-width:86%;padding:7px 10px 5px;border-radius:14px;font-size:13.5px;line-height:1.4;position:relative}
.tm.bot{align-self:flex-start;background:var(--background);border:1px solid var(--border-soft);border-bottom-left-radius:4px}
.tm.me{align-self:flex-end;background:color-mix(in srgb, var(--logo-telegram) 22%, var(--background));border-bottom-right-radius:4px}
.tm .t{display:block;text-align:right;font-size:10.5px;color:var(--muted-foreground);margin-top:2px}
.tm b{font-weight:600}
.kbd{align-self:flex-start;width:86%;display:grid;gap:4px;margin-top:-2px}
.kbd .r{display:grid;gap:4px}
.kbd .r.c2{grid-template-columns:1fr 1fr} .kbd .r.c3{grid-template-columns:1fr 1fr 1fr}
.kb{border-radius:9px;padding:8px 6px;text-align:center;font-size:12.5px;font-weight:500;background:color-mix(in srgb, var(--foreground) 22%, transparent);color:var(--foreground);backdrop-filter:blur(6px);
  display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kb.off{opacity:.4;text-decoration:line-through}
.kb.url .ic{opacity:.8}
.kb.chosen{background:color-mix(in srgb, var(--axi-success) 28%, transparent)}
.tgi{border-top:1px solid var(--border);padding:8px 10px;display:flex;gap:8px;align-items:center;color:var(--muted-foreground);font-size:13px}
.tgi .fake{flex:1;border-radius:999px;background:var(--secondary);padding:7px 12px}
.rkb{border-top:1px solid var(--border);padding:8px;display:grid;gap:6px;background:var(--secondary)}
.rkb .kb{background:var(--background);border:1px solid var(--border);padding:11px 6px;font-size:13.5px}
.typing{align-self:flex-start;font-size:12px;color:var(--logo-telegram);padding:2px 6px}
.tm .vm{display:flex;align-items:center;gap:8px;min-width:200px}
.tm .vm .pl{width:32px;height:32px;border-radius:50%;background:var(--logo-telegram);color:#fff;display:grid;place-items:center}
.legend{font-size:12.5px;color:var(--muted-foreground);padding:10px 14px;border-top:1px solid var(--border);line-height:1.45}
.legend b{color:var(--foreground);font-weight:500}

/* ── estudio del agente / onboarding ───────────────────────────────────── */
.pop{position:absolute;right:24px;top:118px;width:320px;border-radius:var(--radius-xl);border:1px solid var(--border);
  background:color-mix(in srgb, var(--background) 84%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  box-shadow:var(--shadow-overlay);padding:16px;display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;z-index:5}
.pop .qr{width:150px;height:150px}
.pop p{font-size:13px;color:var(--muted-foreground)}
.btn.pill{border-radius:999px}
.studio{display:grid;gap:24px;grid-template-columns:minmax(0,340px) minmax(0,1fr)}
@container (max-width: 820px){.studio{grid-template-columns:1fr}}
.stage{border:1px solid var(--border);border-radius:var(--radius-xl);min-height:340px;display:grid;place-items:center;background:radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--axi-violet) 12%, transparent), transparent 70%)}
.stage .face{width:120px;height:120px;border-radius:50%;background:color-mix(in srgb, var(--axi-violet) 18%, var(--background));display:grid;place-items:center;font-family:var(--font-heading);font-size:40px}
.flowscreen{max-width:720px;margin:0 auto;padding:40px 24px 72px;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center}
.flowscreen h1{font-size:30px}
.flowscreen .lead{color:var(--muted-foreground);max-width:52ch}
.obcard{width:100%;max-width:640px;border:1px solid var(--border);border-radius:20px;padding:20px;text-align:left;box-shadow:0 12px 40px rgb(0 0 0/.06);display:flex;flex-direction:column;gap:14px}
.alt{width:100%;max-width:640px;display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;text-align:left;border:1px dashed var(--border);border-radius:var(--radius-lg);padding:12px 14px}
.alt b{font-weight:500} .alt small{display:block;font-size:12.5px;color:var(--muted-foreground)}
.fa{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:640px;gap:12px;flex-wrap:wrap}
.fa small{color:var(--muted-foreground);font-size:12.5px}
"""

# --------------------------------------------------------------------------- piezas comunes
STAGES = ["Canal", "Antes de empezar", "Conectar", "Listo"]


def steps(current: int) -> str:
    items = []
    for i, label in enumerate(STAGES):
        state = "done" if i < current else ("cur" if i == current else "")
        bar = f'<span class="bar {"on" if i <= current else ""}"></span>' if i else ""
        n = ic("check", size=13) if i < current else str(i + 1)
        items.append(f'<li>{bar}<span class="st {state}"><span class="n">{n}</span><span class="l">{label}</span></span></li>')
    return f'<ol class="steps" aria-label="Progreso de la conexión">{"".join(items)}</ol>'


def flow(current: int, title: str, sub: str, body: str) -> str:
    return (
        f'<div class="flow">{K.crumb("Ajustes", "Canales", "Conectar")}'
        f'<header><h1>{title}</h1><p>{sub}</p></header>{steps(current)}{body}</div>'
    )


def provider_card(kind: str, label: str, tagline: str, foot: str, selected: bool = False, tag: str = "") -> str:
    chk = f'<span class="chk">{ic("check", size=13)}</span>' if selected else ""
    return (
        f'<button class="pc brand-{kind}" role="radio" aria-checked="{str(selected).lower()}" data-selected="{str(selected).lower()}">{chk}'
        f'<div class="top">{plate(kind)}<span class="tt"><b>{label}{tag}</b></span></div>'
        f'<p>{tagline}</p><span class="foot">{foot}</span></button>'
    )


# --------------------------------------------------------------------------- 1 · galería
def gallery() -> str:
    cards = "".join([
        provider_card("whatsapp", "WhatsApp", "El canal oficial de negocio. Tu número queda en la nube de Meta, sin depender de un celular encendido.",
                      "Se conecta con un botón · unos 2 minutos", tag='<span class="pill violet">Recomendado</span>'),
        provider_card("instagram", "Instagram", "Mensajes directos de tu cuenta profesional de Instagram.", "Eliges tu cuenta desde Meta, sin pegar tokens"),
        provider_card("messenger", "Messenger", "Mensajes de la página de Facebook de tu negocio.", "Eliges tu página desde Meta, sin pegar tokens"),
        provider_card("telegram", "Telegram", "Ideal para demos y para probar tu agente hoy mismo: botones, calendario y notas de voz nativos.",
                      "Pegas el token de tu bot · 1 minuto", selected=True, tag='<span class="pill">Para probar</span>'),
    ])
    body = f'<div class="pcgrid" role="radiogroup" aria-label="Canal que quieres conectar">{cards}</div><div>{btn("Continuar")}</div>'
    return flow(0, "Conectar un canal", "Elige por dónde quieres atender a tus clientes.", body)


# --------------------------------------------------------------------------- 2 · antes de empezar
def prerequisites() -> str:
    def item(on: bool, t: str, d: str) -> str:
        box = f'<span class="box {"on" if on else ""}">{ic("check", size=12) if on else ""}</span>'
        return f'<label>{box}<span><b>{t}</b><small>{d}</small></span></label>'
    body = (
        '<div class="req">'
        + item(True, "Tengo Telegram en mi celular o en el computador",
               "El bot se crea desde tu propia cuenta de Telegram, con @BotFather. Es gratis y no pide número de empresa.")
        + item(False, "El bot es nuevo, o no lo usa otra plataforma",
               "Un bot solo puede entregar sus mensajes a un sistema. Si ya lo usas en otra herramienta, al conectarlo aquí dejará de recibir allí.")
        + "</div>"
        + K.notice("info", "<b>Telegram no se usa para captar clientes</b> como WhatsApp, pero es la forma más rápida de que tú y tu equipo "
                   "conversen con el agente hoy mismo. Puedes crear un bot por cada prueba.")
        + f'<div>{btn("Continuar", attrs="aria-disabled=true")}</div>'
    )
    return flow(1, "Antes de empezar", "Revisa estos puntos. Si algo falta, es mejor saberlo ahora que a mitad del proceso.", body)


# --------------------------------------------------------------------------- 3 · conectar (token)
TOKEN = "7712406623:AAH9xQ-3k2LmZ0pWcR8vN1sTqY5uE4oJb7c"
TOKEN_MASK = "7712406623:AAH9••••••••••••••••••••••••••Jb7c"


def gstep(n: int, title: str, body: str) -> str:
    return f'<div class="gstep"><span class="gn"><span>{n}</span>Paso {n}</span><b>{title}</b><p>{body}</p></div>'


def connect(state: str = "empty") -> str:
    guide = (
        '<div class="guide">'
        + gstep(1, "Abre @BotFather", 'Es el bot oficial de Telegram para crear bots. '
                f'<a class="mono-chip" href="#">t.me/BotFather</a>')
        + gstep(2, "Crea tu bot", 'Escríbele <code>/newbot</code>, ponle un nombre (el que verán tus clientes) y un usuario que termine en <code>bot</code>.')
        + gstep(3, "Copia el token", 'BotFather te responde con un token como <code>123456:ABC…</code>. Pégalo aquí abajo.')
        + "</div>"
    )
    if state == "empty":
        field = K.input(placeholder="Pega aquí el token de tu bot", icon="key-round")
        extra = '<p class="hint">Lo guardamos cifrado. Nunca se vuelve a mostrar completo.</p>'
        action = btn("Conectar bot", "send", attrs="aria-disabled=true")
    elif state == "busy":
        field = f'<div class="input adorn" role="textbox">{ic("key-round", size=15)}<span>{TOKEN_MASK}</span><span class="eye">{ic("eye-off", size=15)}</span></div>'
        extra = '<p class="hint">Comprobando el token con Telegram y dejando listo el bot…</p>'
        action = btn("Conectando…", "loader-circle", attrs="aria-disabled=true").replace('class="ic ', 'class="ic spin ', 1)
    else:  # error
        field = f'<div class="input adorn err" role="textbox">{ic("key-round", size=15)}<span>7712406623:AAH9xQ-3k2LmZ0pWcR8vN1sTqY5uE4oJb</span><span class="eye">{ic("eye-off", size=15)}</span></div>'
        extra = ('<p class="err-msg">Telegram no reconoce ese token. Cópialo otra vez desde @BotFather: '
                 'si lo regeneraste, el anterior deja de servir.</p>')
        action = btn("Conectar bot", "send")
    box = (
        '<div class="tokenbox">'
        f'<div class="field"><label for="tok">Token del bot</label><div class="tokenrow">{field}{action}</div>{extra}</div>'
        + K.notice("warn", "<b>Si el bot ya responde en otra herramienta</b>, al conectarlo aquí dejará de hacerlo allí: "
                   "Telegram entrega los mensajes de un bot a un solo sistema.", cls="inline")
        + "</div>"
    )
    return flow(2, "Conecta Telegram", "Crea un bot en Telegram y pega su token. Nosotros hacemos el resto.", guide + box)


# --------------------------------------------------------------------------- 4 · listo
def success() -> str:
    left = (
        '<div class="pc brand-telegram" style="gap:18px;padding:20px 24px">'
        f'<div class="top">{plate("telegram", 24)}<span class="tt"><b style="font-size:19px">Tu Telegram ya está conectado</b>'
        '<small style="white-space:normal;font-size:13.5px">Desde ahora los mensajes que le escriban a <b style="color:var(--foreground)">@donjoao_pruebas_bot</b> aparecen en Conversaciones.</small></span>'
        f'{badge("Conectado", "ok")}</div>'
        '<hr style="border:0;border-top:1px solid var(--border);margin:0">'
        '<div class="form">'
        + K.field("Nombre del canal", K.input("Telegram · Pruebas Joao's", fid="n"), fid="n")
        + K.field("Agente que responde", K.select("Alba · Ventas y reservas", icon="sparkles", fid="a"),
                  hint="El mismo agente que atiende tu WhatsApp: así pruebas exactamente lo que verán tus clientes.", fid="a")
        + f'<div class="form-actions" style="justify-content:flex-start">{btn("Guardar cambios", cls="outline sm")}</div></div></div>'
    )
    right = (
        '<div class="qrcard">'
        f'{qr()}'
        '<div><b style="font-weight:600">Escanéalo con tu celular</b><br><small>Abre el chat con tu bot en Telegram</small></div>'
        f'<a class="btn" style="width:100%" href="#">{tg(16, "")}Abrir en Telegram</a>'
        f'<div class="linkrow"><span>t.me/donjoao_pruebas_bot</span>{btn("", "copy", "ghost icon sm", "aria-label=\"Copiar enlace\"")}</div>'
        '</div>'
    )
    tech = (
        '<details class="tech"><summary>' + ic("chevron-right", size=16) + 'Detalles técnicos</summary><div class="in">'
        '<div><dt>Identificador del canal</dt><dd>0199d3a2-7c41-7e1b-9a55-2f1c8e6b0d14</dd></div>'
        '<div><dt>Id del bot</dt><dd>7712406623</dd></div>'
        '<div><dt>Usuario</dt><dd>@donjoao_pruebas_bot</dd></div>'
        '<div><dt>Forma de conexión</dt><dd>bot_token</dd></div>'
        '<div><dt>Recepción</dt><dd>webhook</dd></div>'
        '</div></details>'
    )
    ok = (
        f'<div class="okbox">{ic("circle-check", size=18)}<div><b>Pruébalo ahora</b>'
        '<p>Escanea el código o toca «Abrir en Telegram» y escríbele «Hola». Pídele horarios: verás el calendario con botones.</p></div></div>'
    )
    acts = f'<div style="display:flex;gap:8px;flex-wrap:wrap">{btn("Ir a Conversaciones")}{btn("Ver mis canales", cls="outline")}</div>'
    body = f'<div class="success"><div class="stack">{left}{ok}{tech}{acts}</div>{right}</div>'
    return flow(3, "Todo listo", "Tu bot quedó conectado y ya está recibiendo mensajes.", body)


# --------------------------------------------------------------------------- 5 · mis canales
def channel_tile(kind: str, name: str, sub: str, status: str, metrics: list[tuple[str, str]], faulted: bool = False) -> str:
    st = {"ok": badge("Conectado", "ok"), "err": badge("Con error", "warn")}[status]
    dl = "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in metrics)
    brand = "brand-fault" if faulted else f"brand-{kind}"
    return (
        f'<a class="pc {brand}" href="#"><div class="top">{plate(kind)}<span class="tt"><b>{name}</b><small>{sub}</small></span>{st}</div>'
        f'<dl>{dl}</dl></a>'
    )


def channels() -> str:
    tiles = "".join([
        channel_tile("whatsapp", "WhatsApp principal", "WhatsApp · +57 300 555 0101", "ok",
                     [("Calidad del número", "Alta"), ("Puedes iniciar", "1.000 al día"), ("Acceso de Meta", "Vigente")]),
        channel_tile("instagram", "@donjoaos", "Instagram", "ok", [("Acceso de Meta", "Vigente")]),
        channel_tile("telegram", "Telegram · Pruebas Joao's", "Telegram · @donjoao_pruebas_bot", "ok",
                     [("Recepción de mensajes", f'<span class="dot" style="width:7px;height:7px;border-radius:50%;background:var(--axi-success)"></span>Recibiendo'),
                      ("Último mensaje", "hace 3 min")]),
        channel_tile("telegram", "Telegram · Demo feria", "Telegram · @donjoao_feria_bot", "err",
                     [("Última comprobación", "hoy, 7:42 a. m."), ("Qué pasó", "El token fue revocado en BotFather")], faulted=True),
    ])
    head = (
        f'<div class="header"><div><h1>Canales</h1><p class="lead">Por dónde te escriben tus clientes y quién les responde.</p></div>'
        f'<div class="right">{btn("Conectar canal", "plus")}</div></div>'
    )
    return f'<div class="page">{K.crumb("Ajustes", "Canales")}{head}<div class="pcgrid">{tiles}</div></div>'


# --------------------------------------------------------------------------- 6 · detalle + rotar token
def hrow(icon: str, t: str, d: str, tone: str, right: str = "") -> str:
    return f'<div class="hrow"><span class="hi {tone}">{ic(icon, tone, 17)}</span><span><b>{t}</b><small>{d}</small></span>{right}</div>'


def detail(rotate: bool = False) -> str:
    head = (
        f'<div class="header"><div style="display:flex;gap:14px;align-items:center">{plate("telegram", 24).replace("plate", "plate lg brand-telegram")}'
        '<div><h1>Telegram · Pruebas Joao\'s</h1><p class="lead">@donjoao_pruebas_bot · conectado el 12 oct</p></div></div>'
        f'<div class="right">{btn("Abrir en Telegram", "square-arrow-out-up-right", "outline sm")}{btn("Desconectar", "unplug", "ghost sm")}</div></div>'
    )
    health = (
        '<div class="card"><div class="card-head"><div><h2>' + ic("shield-check", size=18) + 'Salud del canal</h2>'
        '<p class="lead">Lo revisamos cada 6 horas y cada vez que Telegram nos avisa de un problema.</p></div>'
        + badge("Todo en orden", "ok") + '</div><div class="health">'
        + hrow("bot", "Bot activo", "Telegram reconoce el token de @donjoao_pruebas_bot.", "ok")
        + hrow("webhook", "Recibiendo mensajes", "Telegram nos entrega los mensajes al instante. Sin mensajes pendientes.", "ok")
        + hrow("clock-3", "Última comprobación", "Hoy, 9:12 a. m.", "", btn("Comprobar ahora", "refresh-cw", "outline xs"))
        + '</div><div class="card-foot"><span>¿Regeneraste el token en @BotFather? Pega el nuevo para no perder mensajes.</span>'
        + btn("Rotar token", "key-round", "outline sm") + '</div></div>'
    )
    degraded = (
        '<div class="card"><div class="card-head"><div><h2>' + ic("triangle-alert", size=18) + 'Así se ve cuando algo falla</h2>'
        '<p class="lead">Mismo bloque, otro estado. Cada fila dice qué pasó y qué hacer, sin jerga.</p></div>'
        + badge("Requiere atención", "warn") + '</div><div class="health">'
        + hrow("bot", "El token ya no sirve", "Se revocó o regeneró en @BotFather. Pega el nuevo con «Rotar token».", "bad", btn("Rotar token", "key-round", "xs"))
        + hrow("webhook", "Telegram no nos alcanzaba", "Entre las 3:10 y las 3:25 a. m. Ya se recuperó solo; los mensajes llegaron completos.", "warn")
        + '</div></div>'
    )
    agent = (
        '<div class="card"><div class="card-head"><div><h2>' + ic("sparkles", size=18) + 'Quién responde</h2>'
        '<p class="lead">Los mensajes de este bot los atiende este agente.</p></div></div>'
        '<div class="form">' + K.field("Nombre del canal", K.input("Telegram · Pruebas Joao's", fid="dn"), fid="dn")
        + K.field("Agente", K.select("Alba · Ventas y reservas", icon="sparkles", fid="da"), fid="da") + '</div></div>'
    )
    overlay = ""
    if rotate:
        overlay = (
            '<div class="overlay"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="rt">'
            '<h2 id="rt">Rotar el token del bot</h2>'
            '<p>Pega el token nuevo que te dio @BotFather. Debe ser del mismo bot: si es de otro, te avisamos y no cambiamos nada.</p>'
            + K.field("Token nuevo", K.input(placeholder="Pega aquí el token", icon="key-round", fid="nt"), fid="nt")
            + f'<div class="modal-foot">{btn("Cancelar", cls="ghost")}{btn("Guardar token", "check")}</div></div></div>'
        )
    return (
        f'<div class="page" style="position:relative">{K.crumb("Ajustes", "Canales", "Telegram · Pruebas Joao&#39;s")}{head}'
        f'<div class="grid2">{health}{agent}</div>{degraded}</div>{overlay}'
    )


# --------------------------------------------------------------------------- 7 · inbox
def wave(n: int = 34, seed: int = 3) -> str:
    import random
    r = random.Random(seed)
    return "".join(f'<i style="height:{r.randint(4, 22)}px"></i>' for _ in range(n))


def inbox() -> str:
    def conv(initials: str, kind: str, name: str, last: str, t: str, on: bool = False) -> str:
        kb = tg(11) if kind == "telegram" else ic("message-circle", "text-logo-whatsapp", 11)
        return (f'<div class="conv {"on" if on else ""}"><span class="av">{initials}<span class="kbadge">{kb}</span></span>'
                f'<span><b>{name}</b><small>{last}</small></span><time>{t}</time></div>')
    lst = (
        '<aside class="list"><div class="lh">Conversaciones' + badge("3", "outline") + '</div>'
        + conv("CR", "telegram", "Camila Rojas", "Compartió su número", "9:41", True)
        + conv("JM", "whatsapp", "Julián Mesa", "¿Tienen domicilio a Chapinero?", "9:20")
        + conv("AP", "telegram", "Andrés Pinto", "🎤 Nota de voz", "ayer")
        + "</aside>"
    )
    meta_out = f'<span class="meta">9:38 {ic("check", size=12)}</span>'
    msgs = [
        f'<span class="sys">{tg(12)}Inició el chat por Telegram</span>',
        '<div class="row in"><div class="bub">Hola! quiero reservar para el sábado, somos 4<span class="meta">9:37</span></div></div>',
        # opciones agrupadas por día (section)
        '<div class="row out"><p class="author">' + ic("sparkles", size=12) + 'Alba · agente IA</p><div class="bub">'
        '¡Hola Camila! Con gusto 🙌 Estos son los horarios que tengo para 4 personas:'
        '<div class="ifr"><div class="ilbl">' + ic("calendar-days", size=12) + 'Horarios por día</div>'
        '<p class="isec">Sáb 18 oct</p><div class="ichips"><span class="iopt"><b>12:30</b></span><span class="iopt"><b>1:00 p. m.</b></span><span class="iopt"><b>7:30 p. m.</b></span></div>'
        '<p class="isec">Dom 19 oct</p><div class="ichips"><span class="iopt"><b>12:00</b></span><span class="iopt"><b>1:30 p. m.</b></span></div>'
        '</div>' + meta_out + '</div><span class="react">❤️</span></div>',
        '<div class="row in"><div class="bub"><div class="rchip">' + ic("corner-down-right", size=12) + 'Botón</div>Sáb 18 oct · 7:30 p. m.<span class="meta">9:39</span></div></div>',
        # request phone
        '<div class="row out"><p class="author">' + ic("sparkles", size=12) + 'Alba · agente IA</p><div class="bub">'
        'Listo, te aparto el sábado 18 a las 7:30 p. m. para 4 ✨ ¿Me compartes tu número para confirmarte la reserva?'
        '<div class="ifr"><div class="ilbl">' + ic("smartphone", size=12) + 'Pidió compartir su teléfono</div>'
        '<span class="iopt" style="display:inline-flex;gap:6px;align-items:center">' + ic("phone", size=12) + '<b>Compartir mi número</b></span></div>'
        + meta_out + '</div></div>',
        # contact shared
        '<div class="row in"><div class="bub"><div class="rchip">' + ic("user-round", size=12) + 'Contacto compartido</div>'
        '<div class="contactcard"><span class="ci">' + ic("phone", size=16) + '</span><span><b>Camila Rojas</b><small class="tnum">+57 310 482 7719</small></span></div>'
        '<span class="verif">' + ic("shield-check", size=12) + 'Su propio número, verificado por Telegram · guardado en su ficha</span>'
        '<span class="meta">9:40</span></div></div>',
        # voice in
        '<div class="row in"><div class="bub"><div class="voice"><span class="pl">' + ic("play", size=14) + '</span><span class="wave">' + wave() + '</span><span class="small tnum">0:07</span></div>'
        '<p class="transcript">«¿Y tienen parqueadero? vamos en carro»</p><span class="meta">9:41</span></div></div>',
        # voice out
        '<div class="row out"><p class="author">' + ic("sparkles", size=12) + 'Alba · agente IA · nota de voz</p><div class="bub"><div class="voice"><span class="pl">'
        + ic("play", size=14) + '</span><span class="wave">' + wave(seed=9) + '</span><span class="small tnum">0:09</span></div>'
        '<p class="transcript">«Sí, Camila, tenemos parqueadero gratis para clientes…»</p>' + meta_out + '</div></div>',
    ]
    thread = (
        '<section class="thread"><div class="th-head"><span class="av">CR<span class="kbadge">' + tg(11) + '</span></span>'
        '<div style="flex:1;min-width:0"><b>Camila Rojas</b><small>' + tg(12) + '@camirojas · Telegram · Pruebas Joao\'s</small></div>'
        + badge("IA atendiendo", "violet") + btn("Intervenir", cls="sm") + '</div>'
        f'<div class="th-body">{"".join(msgs)}</div>'
        '<div class="composer">' + K.input(placeholder="Escribe un mensaje…") + btn("", "send", "icon", 'aria-label="Enviar"') + '</div></section>'
    )
    return f'<div class="page">{K.crumb("Workspace", "Conversaciones")}<div class="ibx">{lst}{thread}</div></div>'


# --------------------------------------------------------------------------- 8 · lo que ve el cliente en Telegram
def phone(cap: str, body: str, foot: str, legend: str, typing: bool = False) -> str:
    t = '<span class="typing">escribiendo…</span>' if typing else ""
    return (
        f'<div class="ph"><div class="cap">{tg(13)}<b>{cap}</b></div>'
        '<div class="tgh"><span class="ava">DJ</span><span><b>Don Joao\'s</b><small>bot</small></span></div>'
        f'<div class="tgb">{body}{t}</div>{foot}<div class="legend">{legend}</div></div>'
    )


TGI = f'<div class="tgi">{ic("paperclip", size=18)}<span class="fake">Mensaje</span>{ic("mic", size=18)}</div>'


def in_telegram() -> str:
    p1 = phone(
        "Opciones",
        '<div class="tm me">Hola, ¿qué tienen para almorzar hoy?<span class="t">12:02</span></div>'
        '<div class="tm bot">¡Hola! 👋 Hoy tenemos estos platos del día. ¿Cuál te provoca?<span class="t">12:02</span></div>'
        '<div class="kbd"><div class="r"><span class="kb">Bandeja paisa · $38.000</span></div>'
        '<div class="r"><span class="kb">Ajiaco santafereño · $32.000</span></div>'
        '<div class="r"><span class="kb">Cazuela de mariscos · $46.000</span></div>'
        f'<div class="r"><span class="kb url">{ic("square-arrow-out-up-right", size=12)}Ver la carta completa</span></div></div>',
        TGI,
        "<b>Botones bajo el mensaje</b> (teclado inline). El precio viaja en el botón cuando cabe; si no, va en el texto. "
        "El enlace es un botón de URL, no un link suelto.",
    )
    p2 = phone(
        "Calendario · paso 1",
        '<div class="tm me">Quiero reservar para el fin de semana, somos 4<span class="t">9:37</span></div>'
        '<div class="tm bot">¡Con gusto! 🙌 ¿Qué día te queda mejor?<span class="t">9:38</span></div>'
        '<div class="kbd"><div class="r c3"><span class="kb">Vie 17</span><span class="kb">Sáb 18</span><span class="kb">Dom 19</span></div>'
        '<div class="r c3"><span class="kb off">Lun 20</span><span class="kb">Mar 21</span><span class="kb">Mié 22</span></div></div>',
        TGI,
        "<b>Primero el día.</b> Solo se ofrecen días con cupo real de la agenda. Tocar un día <b>no gasta IA</b>: el mismo mensaje "
        "se transforma en las horas de ese día.",
    )
    p3 = phone(
        "Calendario · paso 2",
        '<div class="tm me">Quiero reservar para el fin de semana, somos 4<span class="t">9:37</span></div>'
        '<div class="tm bot">¡Con gusto! 🙌 ¿Qué día te queda mejor?<br><b>Sábado 18 de octubre</b><span class="t">9:38</span></div>'
        '<div class="kbd"><div class="r c3"><span class="kb">12:30</span><span class="kb">1:00 p. m.</span><span class="kb">7:30 p. m.</span></div>'
        f'<div class="r"><span class="kb">{ic("chevron-left", size=13)}Otros días</span></div></div>',
        TGI,
        "<b>Luego la hora.</b> Cada hora lleva el horario exacto: el agente reserva ese cupo sin volver a consultar la agenda. "
        "«Otros días» vuelve atrás.",
    )
    p4 = phone(
        "Elegido + pedir teléfono",
        '<div class="tm bot">¡Con gusto! 🙌 ¿Qué día te queda mejor?<span class="t">9:38</span></div>'
        f'<div class="kbd"><div class="r"><span class="kb chosen">{ic("check", size=13)}Sáb 18 · 7:30 p. m.</span></div></div>'
        '<div class="tm bot">Listo, te aparto el sábado 18 a las 7:30 p. m. para 4 ✨ ¿Me compartes tu número para confirmarte?<span class="t">9:39</span></div>',
        f'<div class="rkb"><span class="kb">{ic("phone", size=15)}Compartir mi número</span></div>',
        "<b>La elección se cierra:</b> el teclado se reduce a «✓ lo elegido», así nadie toca un horario viejo. "
        "<b>Pedir el número</b> reemplaza el teclado del celular por un botón; el número llega verificado por Telegram.",
    )
    p5 = phone(
        "Voz y «escribiendo…»",
        '<div class="tm me"><span class="vm"><span class="pl">' + ic("play", size=14) + '</span><span class="wave" style="color:var(--logo-telegram)">' + wave(24, 5) + '</span></span><span class="t">9:41</span></div>'
        '<div class="tm bot"><span class="vm"><span class="pl">' + ic("play", size=14) + '</span><span class="wave" style="color:var(--logo-telegram)">' + wave(24, 11) + '</span></span><span class="t">9:41</span></div>'
        '<div class="tm me">❤️ gracias!!<span class="t">9:42</span></div>',
        TGI,
        "<b>Notas de voz de ida y vuelta</b> con la misma voz del agente. Mientras piensa, el cliente ve «escribiendo…». "
        "Escribir <b>/asesor</b> pasa la conversación a una persona del equipo al instante.",
        typing=True,
    )
    note = K.notice("info", "<b>Esta vista no es producto de axi:</b> es cómo se verá la conversación en la app de Telegram del cliente. "
                    "El texto, los botones y los horarios salen del agente y de la agenda reales del tenant.")
    return f'<div class="page"><div class="header"><div><h1>En Telegram</h1><p class="lead">Lo que ve el cliente en su celular.</p></div></div>{note}<div class="phones">{p1}{p2}{p3}{p4}{p5}</div></div>'


# --------------------------------------------------------------------------- 9 · probar el agente
def studio() -> str:
    head = (
        '<div class="header"><div><h1>Alba</h1><p class="lead">Cambia su cara, su voz o sus reglas. Lo que guardes aplica en la siguiente conversación.</p></div>'
        f'<div class="right">{btn("Probar en una conversación", "message-square-text", "outline sm pill")}'
        f'<button class="btn outline sm pill" aria-expanded="true">{tg(15)}Probar en Telegram</button></div></div>'
    )
    pop = (
        '<div class="pop" role="dialog" aria-label="Probar en Telegram">'
        '<b style="font-weight:600">Habla con Alba desde tu celular</b>'
        f'{qr(seed=11)}'
        '<p>Escanea el código o abre el enlace: hablas con Alba igual que un cliente, con botones, calendario y notas de voz.</p>'
        f'<a class="btn sm" style="width:100%" href="#">{tg(14, "")}Abrir @donjoao_pruebas_bot</a>'
        '</div>'
    )
    body = (
        '<div class="studio"><div class="stage"><span class="face">A</span></div>'
        '<div class="stack"><div class="card"><h2>Instrucciones</h2><p class="lead">Atiende reservas y pedidos de Don Joao\'s con calidez paisa…</p></div>'
        '<div class="card"><h2>Herramientas</h2><p class="lead">Agenda · Catálogo · Pedidos · Pasar a una persona</p></div></div></div>'
    )
    no_channel = K.notice(
        "info",
        "<b>Sin ningún canal conectado</b>, el mismo botón dice «Conecta Telegram en 1 minuto» y lleva directo al paso del token. "
        "Es la vía más corta para conversar con el agente el primer día.",
        acts=f'<button class="btn outline sm pill">{tg(15)}Conecta Telegram en 1 minuto</button>',
    )
    return f'<div class="page" style="position:relative">{K.crumb("Agentes", "Alba")}{head}{no_channel}{body}{pop}</div>'


def onboarding() -> str:
    return (
        '<div class="flowscreen">'
        '<p class="small muted">Paso 5 de 5 · Canal</p>'
        '<h1>Conecta tu WhatsApp</h1>'
        '<p class="lead">Es opcional ahora, pero es lo que pone a trabajar a tu agente. También puedes hacerlo después desde Canales.</p>'
        '<div class="obcard"><div style="display:flex;gap:12px;align-items:center">' + plate("whatsapp").replace("plate", "plate brand-whatsapp")
        + '<span><b style="font-weight:600">WhatsApp</b><br><small class="muted">Se conecta con un botón · unos 2 minutos</small></span></div>'
        + btn("Conectar con Meta", "message-circle") + '</div>'
        '<div class="alt">' + plate("telegram").replace("plate", "plate brand-telegram")
        + '<span><b>¿Solo quieres probar a tu agente hoy?</b><small>Conecta un bot de Telegram en 1 minuto, sin Meta ni número de empresa. WhatsApp lo conectas cuando quieras.</small></span>'
        + btn("Usar Telegram", cls="outline sm") + '</div>'
        '<div class="fa">' + btn("Volver", "chevron-left", "ghost") + '<small>Instagram y Messenger se conectan después desde Canales.</small>'
        + f'<span style="display:flex;gap:8px">{btn("Conectar después", cls="ghost")}{btn("Continuar", attrs="aria-disabled=true")}</span></div>'
        '</div>'
    )


VIEWS = [
    ("galeria", "1 · Canal", gallery(), "Telegram entra por la misma galería, con su propia marca. Etiqueta «Para probar»: no compite con WhatsApp (que sigue siendo el recomendado)."),
    ("requisitos", "2 · Antes de empezar", prerequisites(), "Dos puntos honestos: tener Telegram y que el bot no lo use otra herramienta (un bot entrega a un solo sistema)."),
    ("token", "3 · Conectar", connect("empty"), "Guía de @BotFather en tres pasos y un solo campo. Estados en las dos vistas siguientes."),
    ("token-busy", "3b · Conectando", connect("busy"), "Mientras se valida el token con Telegram y se deja listo el bot (webhook, comandos /start y /asesor)."),
    ("token-error", "3c · Token inválido", connect("error"), "El error dice qué hacer: copiarlo otra vez; si se regeneró, el anterior ya no sirve."),
    ("listo", "4 · Listo", success(), "El final del alta es un QR: probar el agente es escanear. Nombre y agente se ajustan aquí mismo."),
    ("canales", "Mis canales", channels(), "Tarjetas de Telegram sin jerga de Meta: «Recepción de mensajes» y «Último mensaje». Un bot con token revocado se pinta como fallo."),
    ("detalle", "Detalle del canal", detail(), "Salud con palabras: bot activo, recibiendo mensajes, última comprobación. Abajo, el mismo bloque cuando algo falla."),
    ("rotar", "Rotar token", detail(rotate=True), "Si regeneras el token en @BotFather, lo pegas aquí. Si es de otro bot, se avisa y no se cambia nada."),
    ("inbox", "Inbox", inbox(), "Mismo inbox: chip «Inició el chat», opciones agrupadas por día, respuesta por botón, «Pidió compartir su teléfono», contacto compartido verificado, notas de voz con transcripción y reacción ❤️."),
    ("telegram", "En Telegram", in_telegram(), "Vista previa de lo que ve el cliente en su app: opciones, calendario de dos pasos, elección cerrada, pedir número y voz."),
    ("estudio", "Probar el agente", studio(), "En el estudio del agente: «Probar en Telegram» abre un QR con el bot. Sin canales, el botón lleva a conectar Telegram."),
    ("onboarding", "Onboarding", onboarding(), "El paso de canal del onboarding ofrece Telegram como vía secundaria para probar hoy. WhatsApp sigue siendo el principal."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("Canal Telegram", "Mockup F0 · no es producto", "Canales · Telegram para demos y primeras pruebas", VIEWS)
