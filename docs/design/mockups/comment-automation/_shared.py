"""Base compartida del lienzo «Comenta y recibe» (Marketing › Redes) — F0 del plan comment-automation (2026-11-06).

La usan los dos constructores del mockup:
- `screens_list.py`   → Redes (lista + embudo + «Lo próximo») y Detalle (DetailSheet con actividad).
- `screens_editor.py` → Editor por pasos con vista previa de teléfono, estados y móvil.

Reglas del lienzo (DESIGN.md + DESIGN-SYSTEM.md):
- Acentos de la vista: coral (acción) + VIOLETA (IA: «entiende la intención», «Axi propone»). Sin ámbar.
- El color de un estado va en su punto o su icono, nunca en el texto (AA en ambos temas).
- Superficies de trabajo sólidas; glass solo en lo que flota (sheet, popover); isla de tinta para la barra de acción.
- Tenant ficticio: Norte Studio (moda, Medellín). Nada de datos personales reales: usuarios inventados.
- Los colores de Instagram/Facebook solo viven dentro de la vista previa del teléfono (contenido del canal), como `.wa-preview`.
"""
from __future__ import annotations

import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from _axi_mockup_kit import Kit, DARK  # noqa: E402

K = Kit("comment-automation/comment-automation")
ic, btn, badge = K.ic, K.btn, K.badge


# ----------------------------------------------------------------------------- miniaturas (contenido del tenant)
def _thumb(c1: str, c2: str, shape: str) -> str:
    return (
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 150'>"
        f"<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23{c1}'/>"
        f"<stop offset='1' stop-color='%23{c2}'/></linearGradient>"
        "<radialGradient id='s' cx='.7' cy='.25' r='.7'><stop offset='0' stop-color='%23fff' stop-opacity='.45'/>"
        "<stop offset='1' stop-color='%23fff' stop-opacity='0'/></radialGradient></defs>"
        f"<rect width='120' height='150' fill='url(%23g)'/><rect width='120' height='150' fill='url(%23s)'/>{shape}</svg>"
    )


# Prendas simples: chaqueta, vestido, tenis, gorra. Solo formas, sin marcas.
JACKET = "<path d='M38 40 l22 -10 l22 10 l14 30 l-12 6 l-6 -12 v58 h-36 v-58 l-6 12 l-12 -6z' fill='%23f3ebe2' opacity='.9'/><path d='M60 30 v94' stroke='%238a5a44' stroke-width='2' opacity='.5'/>"
DRESS = "<path d='M50 30 h20 l4 22 l20 70 h-68 l20 -70z' fill='%23fff' opacity='.85'/><path d='M50 30 q10 10 20 0' fill='none' stroke='%23000' stroke-opacity='.25' stroke-width='2'/>"
SHOES = "<path d='M20 98 q10 -26 34 -22 l22 14 q18 4 26 14 v10 h-82z' fill='%23fff' opacity='.9'/><path d='M20 114 h82' stroke='%23000' stroke-opacity='.3' stroke-width='4'/>"
CAP = "<path d='M28 86 q2 -40 34 -40 q32 0 34 40z' fill='%23f6f1ea' opacity='.92'/><path d='M60 86 h46 q-4 10 -20 10 h-26z' fill='%23f6f1ea' opacity='.7'/>"

POSTS = {
    "capsula": dict(title="Colección Cápsula · reel", kind="Reel", channel="instagram", when="hace 2 días", thumb=_thumb("c9a27e", "6b4a3a", JACKET)),
    "vestidos": dict(title="Vestidos de lino · carrusel", kind="Carrusel", channel="instagram", when="hace 5 días", thumb=_thumb("d8c7b5", "a3866b", DRESS)),
    "tenis": dict(title="Tenis Norte 01 · video", kind="Video", channel="facebook", when="hace 1 día", thumb=_thumb("8aa0a8", "2f3e46", SHOES)),
    "gorras": dict(title="Gorras de temporada · post", kind="Post", channel="instagram", when="hace 9 días", thumb=_thumb("b9b39a", "5e5a44", CAP)),
}

ACCOUNT = dict(ig="@norte.studio", fb="Norte Studio", business="Norte Studio")

# Comentaristas inventados (sin datos reales).
PEOPLE = [
    ("valen.rmz", "V"), ("camilo_ortiz.co", "C"), ("la.mona.estilo", "L"), ("juanpa_88", "J"),
    ("sofi.and.coffee", "S"), ("dani.k.moda", "D"), ("mateo.viajes", "M"), ("isa_bel.art", "I"),
]


# ----------------------------------------------------------------------------- CSS del lienzo
K.extra_css = """
/* ── Isla de tinta (Island material="ink", DS §9.5.1) ── */
.ink{ """ + DARK + """ }
.ink{--muted-foreground:color-mix(in srgb, var(--foreground) 70%, transparent);--secondary:color-mix(in srgb, var(--foreground) 8%, transparent);--border:color-mix(in srgb, var(--foreground) 14%, transparent);--border-soft:color-mix(in srgb, var(--foreground) 8%, transparent)}
.ink{background:var(--background);color:var(--foreground);border:1px solid color-mix(in srgb, var(--foreground) 10%, transparent)}
:root:not([data-theme="dark"]) .ink{--axi-brand:#e65759}
.btn.contrast{background:var(--foreground);color:var(--background);border-radius:999px}
.btn.glass{background:color-mix(in srgb, var(--foreground) 8%, transparent);color:var(--foreground);border:1px solid var(--border);border-radius:999px}

/* ── Página de Marketing (MarketingHeader + NavTabs) ── */
.page{max-width:1280px;margin:0 auto;padding:24px 24px 40px;display:flex;flex-direction:column;gap:20px}
@container (max-width: 640px){.page{padding:16px 16px 28px;gap:16px}}
.mh{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 20px}
.mh .kicker{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground)}
.mh h1{font-size:32px;line-height:1.1;margin-top:4px}
.mh .lead{color:var(--muted-foreground);font-size:13.5px;margin-top:6px;max-width:62ch;text-wrap:pretty}
.mh .right{display:flex;gap:8px;flex-wrap:wrap}
.tabsrow{display:flex;flex-direction:column;gap:10px;min-width:0}
.seg .soon{font-size:10.5px;font-weight:500;padding:1px 7px;border-radius:999px;border:1px solid var(--border);color:var(--muted-foreground)}

/* ── Salud de canales (chips) ── */
.health{display:flex;flex-wrap:wrap;gap:8px}
.hchip{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px 0 8px;border-radius:999px;border:1px solid var(--border);font-size:12.5px;white-space:nowrap;background:var(--background)}
.hchip .net{width:20px;height:20px;border-radius:6px;display:grid;place-items:center;color:#fff}
.net.ig{background:linear-gradient(45deg,#f09433,#dc2743 50%,#bc1888)} .net.fb{background:#1877f2}
.hchip .dot{width:7px;height:7px;border-radius:50%;background:var(--axi-success)}
.hchip .dot.warn{background:var(--axi-warning)} .hchip .dot.err{background:var(--axi-destructive)} .hchip .dot.off{background:var(--muted-foreground);opacity:.5}
.hchip b{font-weight:500}

/* ── Bento (DS §9.5) ── */
.bento{display:grid;gap:16px;grid-template-columns:1fr}
@container (min-width: 900px){.bento{grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)}}
.tile{border:1px solid var(--border);border-radius:24px;background:var(--background);padding:20px 22px;display:flex;flex-direction:column;gap:14px;min-width:0}
.tile .tk{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground);display:flex;justify-content:space-between;gap:8px;align-items:center}
.tile .tk .seg{box-shadow:none}

/* Embudo: barras horizontales; cada cifra con su procedencia al lado */
.funnel{display:flex;flex-direction:column;gap:10px}
.fstep{display:grid;grid-template-columns:minmax(0,11rem) minmax(0,1fr) auto;gap:6px 14px;align-items:center;min-width:0}
.fstep .lbl{font-size:13px;font-weight:500;min-width:0}
.fstep .lbl small{display:block;font-size:11.5px;font-weight:400;color:var(--muted-foreground)}
.fstep .track{height:10px;border-radius:999px;background:var(--secondary);overflow:hidden}
.fstep .track i{display:block;height:100%;border-radius:999px;background:color-mix(in srgb, var(--foreground) 78%, transparent)}
.fstep.sale .track i{background:var(--axi-brand)}
.fstep .num{font-family:var(--font-heading);font-size:20px;letter-spacing:-.02em;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.fstep .num small{font-family:var(--font-body);font-size:12px;color:var(--muted-foreground);margin-left:4px;letter-spacing:0}
@container (max-width: 560px){.fstep{grid-template-columns:minmax(0,1fr) auto}.fstep .track{grid-column:1/-1;grid-row:2}}
.next-line{display:flex;gap:10px;align-items:flex-start;font-size:13px;padding-top:12px;border-top:1px solid var(--border-soft)}
.next-line .ic{margin-top:2px;color:var(--axi-brand)}

/* Isla de cristal blanco «Lo próximo» (glow coral detrás) */
.island{position:relative;border-radius:24px;padding:20px 22px;display:flex;flex-direction:column;gap:12px;background:var(--background);border:1px solid var(--border);box-shadow:var(--shadow-float);overflow:hidden;min-width:0}
.island::before{content:"";position:absolute;inset:auto -30% -60% auto;width:70%;height:90%;background:radial-gradient(closest-side, color-mix(in srgb, var(--axi-brand) 22%, transparent), transparent);pointer-events:none}
.island > *{position:relative}
.island h3{font-family:var(--font-body);font-size:15px;font-weight:600;letter-spacing:0}
.island .item{display:grid;grid-template-columns:28px minmax(0,1fr);gap:4px 10px;font-size:13px;padding:10px 0;border-top:1px solid var(--border-soft)}
.island .item:first-of-type{border-top:0}
.island .item .ii{width:28px;height:28px;border-radius:9px;background:var(--secondary);display:grid;place-items:center}
.island .item b{font-weight:500}
.island .item .acts{grid-column:2;display:flex;gap:6px;margin-top:4px;flex-wrap:wrap}
.island .item.ai .ii{background:color-mix(in srgb, var(--axi-violet) 12%, transparent);color:var(--axi-violet)}
.sig{display:inline-flex;gap:5px;align-items:center;font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--axi-violet)}

/* ── Fila de automatización (molde AutomationsView: una tarjeta por regla) ── */
.autos{display:flex;flex-direction:column;gap:12px}
.auto{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px 16px 14px 14px;border:1px solid var(--border);border-radius:20px;background:var(--background);min-width:0}
.auto:hover{border-color:color-mix(in srgb, var(--foreground) 24%, var(--background))}
.auto .thumb{width:72px;height:90px;border-radius:14px;object-fit:cover;display:block}
.auto .main{display:flex;flex-direction:column;gap:6px;min-width:0}
.auto .t{display:flex;align-items:center;gap:8px;min-width:0}
.auto .t b{font-size:15px;font-weight:600}
.auto .meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:12.5px;color:var(--muted-foreground)}
.kw{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:7px;background:var(--secondary);font-family:var(--font-mono);font-size:11.5px;color:var(--foreground)}
.mini{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12.5px;color:var(--muted-foreground)}
.mini b{color:var(--foreground);font-weight:600;font-variant-numeric:tabular-nums}
.mini .sale b{color:var(--foreground)}
.auto .side{display:flex;align-items:center;gap:10px}
.netmini{display:inline-flex;gap:4px}
.netmini .net{width:18px;height:18px;border-radius:5px;display:grid;place-items:center;color:#fff}
@container (max-width: 640px){.auto{grid-template-columns:56px minmax(0,1fr);gap:12px}.auto .thumb{width:56px;height:70px}.auto .side{grid-column:1/-1;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border-soft)}}

/* StatePill: el color va en el punto */
.pill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:var(--secondary);font-size:12px;font-weight:500;white-space:nowrap}
.pill i{width:7px;height:7px;border-radius:50%;background:var(--muted-foreground);opacity:.6}
.pill.on i{background:var(--axi-success);opacity:1}
.pill.test i{background:var(--axi-info);opacity:1}
.pill.queue i{background:var(--axi-warning);opacity:1}
.pill.err i{background:var(--axi-destructive);opacity:1}
.pill.ai{background:color-mix(in srgb, var(--axi-violet) 10%, transparent)} .pill.ai .ic{color:var(--axi-violet)}

/* ── Vista previa de teléfono (contenido del canal: colores de IG/FB permitidos aquí) ── */
.phone-prev{--p-bg:#ffffff;--p-ink:#000000;--p-muted:#737373;--p-bubble:#efefef;--p-line:#dbdbdb;--p-btn:#0095f6;--p-me:#3797f0;
  background:var(--p-bg);color:var(--p-ink);border-radius:32px;border:1px solid var(--border);box-shadow:var(--shadow-float);overflow:hidden;
  font-family:-apple-system,"SF Pro Text",Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.35;width:100%;max-width:340px;margin:0 auto;display:flex;flex-direction:column}
.phone-prev.fb{--p-bubble:#f0f0f0;--p-btn:#0866ff;--p-me:#0866ff}
:root[data-theme="dark"] .phone-prev{--p-bg:#000000;--p-ink:#f5f5f5;--p-muted:#a8a8a8;--p-bubble:#262626;--p-line:#262626}
:root[data-theme="dark"] .phone-prev.fb{--p-bg:#18191a;--p-bubble:#303030;--p-line:#3a3b3c}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .phone-prev{--p-bg:#000;--p-ink:#f5f5f5;--p-muted:#a8a8a8;--p-bubble:#262626;--p-line:#262626}
 :root:not([data-theme="light"]) .phone-prev.fb{--p-bg:#18191a;--p-bubble:#303030;--p-line:#3a3b3c}}
.pp-top{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid var(--p-line)}
.pp-top .av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#c9a27e,#6b4a3a);flex:none}
.pp-top b{font-weight:600;font-size:13.5px} .pp-top small{display:block;color:var(--p-muted);font-size:11.5px}
.pp-body{padding:12px 14px 16px;display:flex;flex-direction:column;gap:8px;min-height:0}
.pp-sec{font-size:11px;color:var(--p-muted);text-align:center;margin:4px 0}
.pp-comment{display:grid;grid-template-columns:28px minmax(0,1fr);gap:2px 10px;font-size:13px}
.pp-comment .av{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:600;color:#fff;background:#8e8e8e}
.pp-comment .av.biz{background:linear-gradient(135deg,#c9a27e,#6b4a3a)}
.pp-comment b{font-weight:600;margin-right:4px}
.pp-comment small{grid-column:2;color:var(--p-muted);font-size:11.5px}
.pp-comment.reply{margin-left:38px}
.pp-in{align-self:flex-start;max-width:82%;background:var(--p-bubble);border-radius:18px;padding:8px 12px}
.pp-me{align-self:flex-end;max-width:82%;background:var(--p-me);color:#fff;border-radius:18px;padding:8px 12px}
.pp-card{align-self:flex-start;width:82%;border:1px solid var(--p-line);border-radius:18px;overflow:hidden;background:var(--p-bg)}
.pp-card .txt{padding:10px 12px;background:var(--p-bubble)}
.pp-card button{display:block;width:100%;padding:10px 12px;border-top:1px solid var(--p-line);color:var(--p-btn);font-weight:600;font-size:13.5px;text-align:center;font-family:inherit}
.pp-card img{display:block;width:100%;aspect-ratio:1.91/1;object-fit:cover}
.pp-media{align-self:flex-start;width:62%;border-radius:18px;overflow:hidden}
.pp-media img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover}
.pp-file{align-self:flex-start;display:flex;gap:10px;align-items:center;background:var(--p-bubble);border-radius:18px;padding:10px 12px;max-width:82%}
.pp-file .fi{width:34px;height:34px;border-radius:10px;background:var(--p-bg);display:grid;place-items:center}
.pp-file small{display:block;color:var(--p-muted);font-size:11.5px}
.pp-note{font-size:11.5px;color:var(--p-muted);text-align:center;padding:2px 10px}
.pp-input{margin:0 12px 14px;border:1px solid var(--p-line);border-radius:999px;padding:8px 14px;color:var(--p-muted);font-size:13px}
"""


# ----------------------------------------------------------------------------- piezas compartidas
def net(kind: str, size: int = 12) -> str:
    """Logo del canal en su color oficial (solo en el icono, DS: ChannelKindIcon)."""
    name = "instagram" if kind == "instagram" else "facebook"
    return f'<span class="net {"ig" if kind == "instagram" else "fb"}" aria-label="{name.title()}">{ic(name, size=size)}</span>'


MARKETING_TABS = [
    ("Resumen", "layout-dashboard"), ("Campañas", "megaphone"), ("Recuperación", "rotate-ccw"),
    ("Promociones", "ticket-percent"), ("Redes", "message-circle"), ("Captación", "radar"), ("Configuración", "settings"),
]


def marketing_header(right: str = "", lead: str = "Convierte comentarios en ventas: Axi responde en público, escribe por privado y entrega lo que prometiste. El agente sigue la conversación hasta el pedido.") -> str:
    sub = (
        '<nav class="seg inline sm" aria-label="Automatizaciones de Redes">'
        f'<a href="#" aria-current="page">{ic("reply", size=14)}Comenta y recibe</a>'
        f'<a href="#">{ic("radio", size=14)}En vivo <span class="soon">Pronto</span></a>'
        f'<a href="#">{ic("at-sign", size=14)}Historias <span class="soon">Pronto</span></a>'
        "</nav>"
    )
    return f"""
<header class="mh">
  <div><p class="kicker">Marketing</p><h1>Redes</h1><p class="lead">{lead}</p></div>
  <div class="right">{right}</div>
</header>
<div class="tabsrow">{K.nav(MARKETING_TABS, "Redes", "Secciones de Marketing")}{sub}</div>"""


def health(ig: str = "ok", fb: str = "ok") -> str:
    label = {"ok": "Comentarios activos", "pending": "Pendiente de Meta", "reconnect": "Reconectar", "off": "Sin conectar"}
    dot = {"ok": "", "pending": "warn", "reconnect": "err", "off": "off"}
    return (
        '<div class="health" aria-label="Salud de los canales">'
        f'<span class="hchip">{net("instagram")}<b>{ACCOUNT["ig"]}</b><span class="dot {dot[ig]}"></span>{label[ig]}</span>'
        f'<span class="hchip">{net("facebook")}<b>{ACCOUNT["fb"]}</b><span class="dot {dot[fb]}"></span>{label[fb]}</span>'
        "</div>"
    )


def pill(text: str, kind: str = "on", icon: str = "") -> str:
    lead = ic(icon, size=12) if icon else "<i></i>"
    return f'<span class="pill {kind}">{lead}{text}</span>'


def phone(kind: str, body: str, title: str | None = None, sub: str = "") -> str:
    """Teléfono de quien comenta. kind: 'instagram' | 'facebook'."""
    t = title or (ACCOUNT["ig"].lstrip("@") if kind == "instagram" else ACCOUNT["fb"])
    return (
        f'<div class="phone-prev {"fb" if kind == "facebook" else ""}" role="img" aria-label="Vista previa en {kind}">'
        f'<div class="pp-top"><span class="av"></span><div><b>{t}</b><small>{sub}</small></div></div>'
        f'<div class="pp-body">{body}</div>'
        '<div class="pp-input">Mensaje…</div></div>'
    )
