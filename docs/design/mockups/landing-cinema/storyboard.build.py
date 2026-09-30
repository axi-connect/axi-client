#!/usr/bin/env python3
"""Storyboard de la landing cinematográfica (programa `landing_cinematica_plan.md`).

Genera un artboard `.dc.html` por fotograma clave de la película para el lienzo de diseño.
La película ocurre en un escenario oscuro; la guía es «la cinta de luz»: las tres cintas del
isotipo (coral, ámbar, violeta) que se desenrollan con el scroll e iluminan cada escena, y que
al final se vuelven la carretera del mapa de la meta.

Uso:
  AXI_SB_OUT=<dir>/project AXI_NEXA_700=/_blob/<id> AXI_NEXA_200=/_blob/<id> python3 storyboard.build.py

Colores: los tokens OSCUROS de `globals.css` escritos en literal (el lienzo no lee el CSS de la app).
Iconos: `__iconNode` de lucide-react, vía el kit compartido de mockups.
"""
from __future__ import annotations

import datetime as _dt
import json
import math
import os
import pathlib
import random
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(pathlib.Path("/root/axi/axi-client/docs/design/mockups")))
from _axi_mockup_kit import Icons  # noqa: E402

OUT = pathlib.Path(os.environ.get("AXI_SB_OUT", HERE / "_out" / "project"))
NEXA_700 = os.environ.get("AXI_NEXA_700", "")
NEXA_200 = os.environ.get("AXI_NEXA_200", "")
IC = Icons(HERE / "storyboard.lucide.json")

# ------------------------------------------------------------------ tokens (tema oscuro, literales)
BG = "#07070A"
FG = "#EDEDED"
MUT = "rgba(237,237,237,.64)"
DIM = "rgba(237,237,237,.42)"
LINE = "rgba(237,237,237,.10)"
SURF = "#111114"
SURF2 = "#18181B"
CORAL = "#FB7185"
VIOLET = "#A78BFA"
AMBER = "#FBBF24"
GREEN = "#4ADE80"
INK = "#0A0A0A"

W, H = 1440, 900
MW, MH = 390, 844


def helmet() -> str:
    return f"""<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&amp;family=Geist+Mono:wght@400;500&amp;display=swap">
<style>
@font-face{{font-family:"Nexa";font-weight:700;font-style:normal;font-display:swap;src:url({NEXA_700}) format("woff2")}}
@font-face{{font-family:"Nexa";font-weight:200;font-style:normal;font-display:swap;src:url({NEXA_200}) format("woff2")}}
body{{margin:0;background:{BG}}}
*{{box-sizing:border-box}}
.st{{position:relative;overflow:hidden;background:{BG};color:{FG};font-family:Poppins,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;font-size:14px;line-height:1.5}}
.nx{{font-family:Nexa,Poppins,sans-serif}}
.h{{font-family:Nexa,Poppins,sans-serif;font-weight:700;letter-spacing:-.035em;line-height:1.02;margin:0}}
.h .t{{font-weight:200;letter-spacing:-.03em}}
.mut{{color:{MUT}}}
.dim{{color:{DIM}}}
.eb{{font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;font-weight:600}}
.mono{{font-family:"Geist Mono",ui-monospace,monospace}}
.tn{{font-variant-numeric:tabular-nums}}
.card{{background:{SURF};border:1px solid {LINE};border-radius:24px}}
.glass{{background:rgba(24,24,27,.64);border:1px solid rgba(237,237,237,.11);-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);box-shadow:0 1px 2px rgba(0,0,0,.5),0 24px 64px rgba(0,0,0,.55)}}
.chip{{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:500;background:rgba(237,237,237,.06);border:1px solid rgba(237,237,237,.10);white-space:nowrap}}
.btn{{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;padding:0 24px;border-radius:12px;font-family:Poppins,sans-serif;font-weight:600;font-size:15px;text-decoration:none;border:0;cursor:pointer;white-space:nowrap}}
.btn-p{{background:{CORAL};color:{INK};box-shadow:0 18px 50px rgba(251,113,133,.32)}}
.btn-g{{background:rgba(237,237,237,.06);color:{FG};border:1px solid rgba(237,237,237,.16)}}
.btn-sm{{height:36px;padding:0 14px;font-size:13px;border-radius:10px}}
.bub{{max-width:80%;padding:9px 13px;border-radius:18px;font-size:13.5px;line-height:1.42}}
.bin{{background:#1E1E22;color:{FG};border-bottom-left-radius:6px;align-self:flex-start}}
.bout{{background:{FG};color:{INK};border-bottom-right-radius:6px;align-self:flex-end}}
.meta{{font-size:10.5px;color:{DIM};margin-top:3px}}
.ic{{flex:none}}
a{{color:{CORAL}}}
a:hover{{color:#fda4af}}
</style>
</helmet>"""


def page(title: str, body: str, w: int = W, h: int = H) -> str:
    props = json.dumps({"$preview": {"width": w, "height": h}})
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
{helmet()}
<div class="st" style="width: {w}px; height: {h}px">
{body.replace("$ ", "$\u00a0")}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{props}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""


def ic(name: str, size: int = 16, color: str | None = None) -> str:
    svg = IC(name, size=size)
    if color:
        svg = svg.replace('<svg class="ic ', f'<svg style="color:{color}" class="ic ', 1)
    return svg


# ------------------------------------------------------------------ piezas de marca
def isotype(size: int, uid: str, glow: bool = False) -> str:
    g = ""
    if glow:
        g = f'<div style="position:absolute;inset:-18%;border-radius:50%;background:radial-gradient(closest-side,rgba(251,113,133,.30),rgba(167,139,250,.16) 55%,transparent 75%);filter:blur(30px)"></div>'
    return f"""<div style="position:relative;width:{size}px;height:{size}px">{g}
<svg width="{size}" height="{size}" viewBox="0 0 500 500" fill="none" aria-hidden="true" style="position:relative">
<path fill-rule="evenodd" clip-rule="evenodd" d="M228.574 374.558C305.107 374.558 335.082 305.843 357.987 250.872C344.244 183.302 305.107 127.186 228.574 127.186C152.042 127.186 90 182.562 90 250.872C90 319.182 152.042 374.558 228.574 374.558ZM222.848 303.553C253.208 303.553 277.82 279.454 277.82 249.726C277.82 219.999 253.208 195.9 222.848 195.9C192.488 195.9 167.876 219.999 167.876 249.726C167.876 279.454 192.488 303.553 222.848 303.553Z" fill="url(#a{uid})"/>
<path d="M270.948 257.743C300.724 150.09 349.97 127.185 408.377 127.186C383.182 159.252 341.953 337.444 292.708 360.815C238.652 386.468 181.619 371.122 161.005 358.524C196.507 366.541 247.824 341.346 270.948 257.743Z" fill="url(#b{uid})"/>
<path d="M355.696 225.676C373.104 295.307 398.833 353.943 409.522 374.558C309.886 374.558 280.11 290.955 266.367 225.676C253.589 164.978 191.163 140.928 166.731 139.783C186.887 125.124 225.804 121.086 268.658 132.912C311.511 144.737 341.667 169.559 355.696 225.676Z" fill="url(#c{uid})"/>
<defs>
<linearGradient id="a{uid}" x1="90" y1="265.286" x2="358.293" y2="250.973" gradientUnits="userSpaceOnUse"><stop stop-color="#E65759"/><stop offset="1" stop-color="#803032"/></linearGradient>
<linearGradient id="b{uid}" x1="209.833" y1="374.8" x2="408.224" y2="127.145" gradientUnits="userSpaceOnUse"><stop stop-color="#4D03B0"/><stop offset="1" stop-color="#9A4FFF"/></linearGradient>
<linearGradient id="c{uid}" x1="394.576" y1="374.8" x2="184.868" y2="115.827" gradientUnits="userSpaceOnUse"><stop stop-color="#E39800"/><stop offset="1" stop-color="#FFD580"/></linearGradient>
</defs></svg></div>"""


def ribbon(d: str, uid: str, w: int = W, h: int = H, width: float = 2.4, spread: float = 7, opacity: float = 1) -> str:
    """Las tres cintas de luz: coral, ámbar y violeta, paralelas, con halo."""
    offs = [(-spread, CORAL), (0, AMBER), (spread, VIOLET)]
    strokes = "".join(
        f'<path d="{d}" transform="translate(0 {o})" style="fill:none;stroke:{c};stroke-width:{width};stroke-linecap:round"/>'
        for o, c in offs
    )
    halo = "".join(
        f'<path d="{d}" transform="translate(0 {o})" style="fill:none;stroke:{c};stroke-width:{width * 7};stroke-linecap:round;opacity:.35"/>'
        for o, c in offs
    )
    return f"""<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" aria-hidden="true" style="position:absolute;left:0;top:0;opacity:{opacity};pointer-events:none">
<defs><filter id="rb{uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter></defs>
<g filter="url(#rb{uid})">{halo}</g>{strokes}</svg>"""


def spot(x: int, y: int, r: int, color: str = CORAL, a: float = .20) -> str:
    rgb = {CORAL: "251,113,133", VIOLET: "167,139,250", AMBER: "251,191,36", GREEN: "74,222,128"}[color]
    return (
        f'<div style="position:absolute;left:{x - r}px;top:{y - r}px;width:{2 * r}px;height:{2 * r}px;border-radius:50%;'
        f'background:radial-gradient(closest-side,rgba({rgb},{a}),transparent);pointer-events:none"></div>'
    )


def header(active_cta: bool = True) -> str:
    return f"""<header style="position:absolute;left:0;top:0;width:{W}px;height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;z-index:5">
<a href="#" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:{FG}" aria-label="axi connect">{isotype(30, 'hd')}<span class="nx" style="font-weight:700;font-size:20px;letter-spacing:-.02em">axi connect</span></a>
<nav style="display:flex;align-items:center;gap:28px;font-size:14px">
<a href="#" style="color:{MUT};text-decoration:none">Producto</a>
<a href="#" style="color:{MUT};text-decoration:none">Precios</a>
<a href="#" style="color:{MUT};text-decoration:none">Entrar</a>
<a href="#" class="btn btn-p btn-sm" style="box-shadow:none">Prueba 7 días gratis</a>
</nav></header>"""


CHAPTERS = ["Captar", "Vender", "Cobrar", "Crecer"]


def rail(progress: float, chapter: int) -> str:
    """La guía de progreso: la misma cinta, en vertical, al borde izquierdo."""
    top, bot = 190, 710
    lit = top + (bot - top) * progress
    ticks = ""
    for i, name in enumerate(CHAPTERS):
        y = top + (bot - top) * (i / (len(CHAPTERS) - 1))
        on = i <= chapter
        ticks += (
            f'<div style="position:absolute;left:46px;top:{y - 3}px;width:6px;height:6px;border-radius:50%;background:{FG if on else "rgba(237,237,237,.22)"}"></div>'
            f'<div class="eb" style="position:absolute;left:62px;top:{y - 8}px;font-size:9.5px;color:{FG if i == chapter else DIM}">{name}</div>'
        )
    return f"""<div aria-hidden="true" style="position:absolute;left:0;top:0;width:140px;height:{H}px;pointer-events:none;z-index:4">
<div style="position:absolute;left:48px;top:{top}px;width:2px;height:{bot - top}px;background:rgba(237,237,237,.10);border-radius:2px"></div>
<div style="position:absolute;left:48px;top:{top}px;width:2px;height:{lit - top}px;background:linear-gradient({CORAL},{AMBER},{VIOLET});border-radius:2px;box-shadow:0 0 14px rgba(251,113,133,.6)"></div>
<div style="position:absolute;left:43px;top:{lit - 6}px;width:12px;height:12px;border-radius:50%;background:{FG};box-shadow:0 0 0 4px rgba(251,113,133,.25),0 0 22px rgba(251,191,36,.8)"></div>
{ticks}</div>"""


def niche_pill(label: str = "Tecnología") -> str:
    return f"""<div class="glass" style="position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;height:44px;padding:0 8px 0 16px;border-radius:999px;z-index:5;font-size:13px">
{ic('smartphone', 15, MUT)}<span class="mut">Viendo como</span><strong style="font-weight:600">{label}</strong>
<a href="#" class="chip" style="color:{FG};text-decoration:none;height:30px">Cambiar</a></div>"""


def title_block(x: int, y: int, eyebrow: str, color: str, h_html: str, sub: str, w: int = 520, size: int = 64) -> str:
    return f"""<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;z-index:3">
<div class="eb" style="color:{color};margin-bottom:18px">{eyebrow}</div>
<h2 class="h" style="font-size:{size}px">{h_html}</h2>
<p class="mut" style="margin:22px 0 0;font-size:18px;line-height:1.55;max-width:{w - 40}px">{sub}</p></div>"""


def bub(text: str, out: bool, meta: str = "") -> str:
    m = f'<div class="meta" style="text-align:{"right" if out else "left"}">{meta}</div>' if meta else ""
    return f'<div style="display:flex;flex-direction:column;align-items:{"flex-end" if out else "flex-start"}"><div class="bub {"bout" if out else "bin"}">{text}</div>{m}</div>'


def phone(x: int, y: int, inner: str, title: str, status: str, w: int = 372, h: int = 740) -> str:
    return f"""<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:52px;padding:10px;background:linear-gradient(160deg,#2a2a30,#0d0d10 40%,#1a1a1f);box-shadow:0 40px 120px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.08);z-index:2">
<div style="width:100%;height:100%;border-radius:43px;background:#0C0C0F;overflow:hidden;display:flex;flex-direction:column">
<div style="height:34px;display:flex;justify-content:center;align-items:center"><div style="width:96px;height:26px;border-radius:999px;background:#000"></div></div>
<div style="display:flex;align-items:center;gap:10px;padding:10px 16px 12px;border-bottom:1px solid {LINE}">
<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,{CORAL},{VIOLET});display:flex;align-items:center;justify-content:center;color:{INK};font-weight:700;font-size:13px">A</div>
<div><div style="font-size:14px;font-weight:600">{title}</div><div style="font-size:11px;color:{GREEN}">{status}</div></div></div>
<div style="flex:1;display:flex;flex-direction:column;gap:9px;padding:14px 12px">{inner}</div>
</div></div>"""


def floating_bubble(x: int, y: int, text: str, meta: str, blur: float, op: float, out: bool = False) -> str:
    return (
        f'<div style="position:absolute;left:{x}px;top:{y}px;filter:blur({blur}px);opacity:{op};z-index:1">'
        f'<div class="bub {"bout" if out else "bin"}" style="max-width:none;white-space:nowrap;font-size:14px;box-shadow:0 18px 40px rgba(0,0,0,.45)">{text}</div>'
        f'<div class="meta">{meta}</div></div>'
    )


# ------------------------------------------------------------------ escenas de escritorio
def s01_hero() -> str:
    bubbles = [
        (820, 150, "¿Tienen domicilio a Laureles?", "respondido en 3 s", 2.5, .45),
        (1080, 240, "¿Precio del iPhone 17 de 256?", "respondido en 4 s", 0, .95),
        (760, 560, "¿Hay cita el sábado a las 10?", "agendada · 10:00 a. m.", 0, .9),
        (1110, 640, "Necesito 200 cajas de guantes", "cotización enviada", 1.5, .6),
        (900, 760, "¿Me mandas el link de pago?", "pago reportado", 3.5, .35),
        (1210, 90, "¿Tienen envío a Cali?", "respondido en 2 s", 4, .25),
    ]
    fb = "".join(floating_bubble(*b) for b in bubbles)
    return f"""{spot(1030, 440, 520, CORAL, .14)}{spot(1180, 300, 380, VIOLET, .10)}
{ribbon("M 1010 560 C 1020 700, 880 800, 700 860 S 300 940, 120 1000", "h1")}
<div style="position:absolute;left:840px;top:250px;z-index:2">{isotype(380, 'hero', glow=True)}</div>
{fb}
{header()}
<div style="position:absolute;left:120px;top:210px;width:640px;z-index:3">
<div class="chip" style="margin-bottom:28px">{ic('message-circle', 14, GREEN)}<span>Agentes de IA que venden por WhatsApp</span></div>
<h1 class="h" style="font-size:92px"><span class="t">Vende en</span><br>cada conversación.</h1>
<p class="mut" style="margin:28px 0 0;font-size:19px;line-height:1.55;max-width:540px">Axi atiende tu WhatsApp como tu mejor vendedor: responde en segundos, cotiza con tus precios, cobra y te lleva a tu meta del mes.</p>
<div style="display:flex;gap:14px;margin-top:36px"><a href="#" class="btn btn-p" style="height:54px;padding:0 30px;font-size:16px">Prueba 7 días gratis</a><a href="#" class="btn btn-g" style="height:54px;padding:0 26px;font-size:16px">{ic('message-circle', 17)}Habla con nuestro agente</a></div>
<p class="dim" style="margin:16px 0 0;font-size:13.5px">Sin tarjeta. Tu cuenta queda lista hoy.</p>
</div>
<div style="position:absolute;left:120px;bottom:40px;display:flex;align-items:center;gap:12px;z-index:3" class="dim"><div style="width:1px;height:34px;background:linear-gradient(transparent,{FG})"></div><span style="font-size:12.5px;letter-spacing:.04em">Baja y míralo vender</span></div>"""


def s02_niche() -> str:
    opts = [
        ("utensils-crossed", "Restaurantes", "¿Tienen domicilio a Laureles?", False),
        ("smartphone", "Tecnología", "¿Tienen el iPhone 17 de 256?", True),
        ("sparkles", "Salud y belleza", "¿Hay cita para el sábado?", False),
        ("briefcase-business", "Servicios y B2B", "¿Me cotizas 200 cajas de guantes?", False),
    ]
    cards = ""
    for i, (icon, label, msg, sel) in enumerate(opts):
        ring = f"box-shadow:0 0 0 2px {CORAL},0 30px 80px rgba(251,113,133,.25);background:#15151A" if sel else ""
        badge = f'<span class="chip" style="position:absolute;right:20px;top:-13px;background:#2a1519;border-color:rgba(251,113,133,.4);color:{FG}">{ic("check", 13, CORAL)}Elegido</span>' if sel else ""
        cards += f"""<button class="card" style="position:relative;width:282px;height:250px;padding:26px;text-align:left;color:{FG};font-family:Poppins,sans-serif;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;{ring}">{badge}
<div class="bub bin" style="max-width:none;font-size:15px;border-bottom-left-radius:6px">{msg}</div>
<div style="display:flex;align-items:center;gap:10px"><div style="width:40px;height:40px;border-radius:12px;background:rgba(237,237,237,.06);display:flex;align-items:center;justify-content:center">{ic(icon, 19, FG)}</div><div><div style="font-weight:600;font-size:16px">{label}</div><div class="dim" style="font-size:12.5px">Un cliente te escribe</div></div></div>
</button>"""
    return f"""{spot(720, 520, 560, CORAL, .10)}
{ribbon("M -40 610 C 300 520, 520 700, 760 600 S 1180 520, 1500 580", "h2", opacity=.9)}
{header()}{rail(.02, 0)}
<div style="position:absolute;left:0;top:150px;width:{W}px;text-align:center;z-index:3">
<div class="eb" style="color:{CORAL};margin-bottom:18px">Empieza la película</div>
<h2 class="h" style="font-size:72px">¿Quién te <span class="t">escribe hoy?</span></h2>
<p class="mut" style="margin:18px 0 0;font-size:18px">Elige y todo lo que sigue pasa en tu negocio.</p></div>
<div style="position:absolute;left:0;top:400px;width:{W}px;display:flex;justify-content:center;gap:24px;z-index:3">{cards}</div>
<p class="dim" style="position:absolute;left:0;bottom:44px;width:{W}px;text-align:center;font-size:13px;margin:0">O sigue bajando: te mostramos un negocio de ejemplo.</p>"""


def s03_radar() -> str:
    cx, cy, r = 1010, 470, 300
    rings = "".join(
        f'<div style="position:absolute;left:{cx - rr}px;top:{cy - rr}px;width:{2 * rr}px;height:{2 * rr}px;border-radius:50%;border:1px solid rgba(237,237,237,{.05 + .03 * k})"></div>'
        for k, rr in enumerate([300, 225, 150, 75])
    )
    rnd = random.Random(7)
    dots = ""
    for _ in range(26):
        a = rnd.uniform(0, math.tau)
        d = rnd.uniform(40, 290)
        x, y = cx + d * math.cos(a), cy + d * math.sin(a)
        dots += f'<div style="position:absolute;left:{x - 3:.0f}px;top:{y - 3:.0f}px;width:6px;height:6px;border-radius:50%;background:rgba(237,237,237,{rnd.choice([.25, .35, .5])})"></div>'
    hits = [(cx + 120, cy - 160), (cx - 190, cy + 60), (cx + 60, cy + 150)]
    for x, y in hits:
        dots += f'<div style="position:absolute;left:{x - 5}px;top:{y - 5}px;width:10px;height:10px;border-radius:50%;background:{CORAL};box-shadow:0 0 0 6px rgba(251,113,133,.18),0 0 18px {CORAL}"></div>'
    sel = (cx - 80, cy - 90)
    dots += f'<div style="position:absolute;left:{sel[0] - 8}px;top:{sel[1] - 8}px;width:16px;height:16px;border-radius:50%;background:{FG};box-shadow:0 0 0 8px rgba(237,237,237,.14),0 0 30px rgba(251,191,36,.9)"></div>'
    sweep = f'<div style="position:absolute;left:{cx - r}px;top:{cy - r}px;width:{2 * r}px;height:{2 * r}px;border-radius:50%;background:conic-gradient(from 20deg,rgba(251,113,133,.34),rgba(251,113,133,0) 70deg,transparent 360deg)"></div>'
    cross = (
        f'<div style="position:absolute;left:{cx - r}px;top:{cy}px;width:{2 * r}px;height:1px;background:rgba(237,237,237,.07)"></div>'
        f'<div style="position:absolute;left:{cx}px;top:{cy - r}px;width:1px;height:{2 * r}px;background:rgba(237,237,237,.07)"></div>'
    )
    bars = ""
    for name, v in [("Contactabilidad", 92), ("Identidad", 88), ("Ajuste a tu cliente ideal", 81), ("Procedencia", 84)]:
        bars += f'<div style="display:grid;grid-template-columns:150px 1fr 26px;align-items:center;gap:10px;font-size:12px"><span class="mut">{name}</span><div style="height:4px;border-radius:4px;background:rgba(237,237,237,.08)"><div style="width:{v}%;height:100%;border-radius:4px;background:{FG}"></div></div><span class="tn" style="text-align:right">{v}</span></div>'
    srcs = "".join(
        f'<div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px"><span style="display:flex;align-items:center;gap:8px">{ic(i, 14, MUT)}{n}</span><span style="display:flex;align-items:center;gap:5px;color:{GREEN}">{ic("check", 13, GREEN)}Encontró datos</span></div>'
        for i, n in [("map-pin", "Google Maps"), ("globe", "Sitio web"), ("phone", "Teléfono")]
    )
    card = f"""<div class="glass" style="position:absolute;left:1040px;top:300px;width:356px;border-radius:24px;padding:22px;z-index:3;display:flex;flex-direction:column;gap:16px">
<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-weight:600;font-size:16px">Dotaciones Andina</div><div class="dim" style="font-size:12.5px">Itagüí · Dotación industrial</div></div><span class="chip" style="color:{GREEN}">Calificado</span></div>
<div style="display:flex;align-items:baseline;gap:6px"><span class="nx tn" style="font-size:44px;font-weight:700;letter-spacing:-.03em">86</span><span class="dim">/ 100 · índice de calidad</span></div>
<div style="display:flex;flex-direction:column;gap:8px">{bars}</div>
<div style="height:1px;background:{LINE}"></div>
<div style="display:flex;flex-direction:column;gap:8px">{srcs}</div>
<div style="border-radius:16px;padding:14px;background:rgba(167,139,250,.10);border:1px solid rgba(167,139,250,.28)">
<div class="eb" style="font-size:10px;color:{VIOLET};margin-bottom:6px">Decisor</div>
<div style="font-weight:600">Marta Restrepo · Gerente general</div>
<div class="mut" style="font-size:12.5px">Confianza alta · 3 fuentes concuerdan</div></div>
<div style="display:flex;justify-content:space-between;align-items:center"><span class="mut" style="font-size:12.5px">Puedo contactar por: Correo · Llamada</span><a href="#" class="btn btn-p btn-sm" style="box-shadow:none">Promover al CRM</a></div>
</div>"""
    return f"""{spot(cx, cy, 420, CORAL, .10)}
{ribbon("M -40 760 C 260 720, 420 540, 640 520 S 860 480, 1010 470", "h3", opacity=.85)}
{rings}{cross}{sweep}{dots}
<div style="position:absolute;left:{sel[0]}px;top:{sel[1]}px;width:{1040 - sel[0] + 4}px;height:1px;background:linear-gradient(90deg,{FG},transparent)"></div>
{card}{header()}{rail(.08, 0)}
{title_block(160, 250, "Captar", CORAL, 'Encuentra a quien <span class="t">te va a comprar.</span>', "Axi recorre tu zona, califica cada negocio y te dice con quién hablar.", 520, 62)}
{niche_pill('Servicios y B2B')}"""


def s04_followup() -> str:
    y0 = 560
    nodes = [
        (230, "Mar · 9:12 p. m.", "Armó un pedido de $ 89.900 y no lo terminó", "shopping-cart", DIM),
        (560, "Mié · 10:00 a. m.", "Axi retoma con una plantilla aprobada por Meta", "send", AMBER),
        (880, "10:07 a. m.", "Leída", "check-check", AMBER),
        (1190, "10:09 a. m.", "«Sí, envíalo hoy»", "message-circle", GREEN),
    ]
    pins = ""
    for x, when, what, icon, col in nodes:
        pins += f"""<div style="position:absolute;left:{x - 22}px;top:{y0 - 22}px;width:44px;height:44px;border-radius:50%;background:{SURF2};border:1px solid rgba(237,237,237,.16);display:flex;align-items:center;justify-content:center;z-index:3;box-shadow:0 0 0 6px {BG}">{ic(icon, 18, col)}</div>
<div style="position:absolute;left:{x - 120}px;top:{y0 + 40}px;width:240px;text-align:center;z-index:3"><div class="mono dim" style="font-size:11.5px">{when}</div><div style="font-size:14px;margin-top:4px">{what}</div></div>"""
    template = f"""<div style="position:absolute;left:420px;top:392px;width:300px;z-index:3">{bub("Hola Andrés, tu pedido sigue apartado. ¿Te lo enviamos hoy? Responde SÍ y lo despachamos.", True, "Enviada · Entregada · Leída ✓✓")}</div>
<div style="position:absolute;left:1080px;top:440px;width:260px;z-index:3">{bub("Sí, envíalo hoy 🙌".replace(" 🙌", ""), False, "10:09 a. m.")}</div>
<div class="glass" style="position:absolute;left:1090px;top:690px;border-radius:18px;padding:14px 18px;z-index:3;display:flex;align-items:center;gap:12px">{ic('circle-check', 20, GREEN)}<div><div style="font-weight:600">Venta recuperada · $ 89.900</div><div class="dim" style="font-size:12px">La tarea se cerró sola cuando respondió</div></div></div>"""
    track = f"""<div style="position:absolute;left:230px;top:{y0 - 1}px;width:960px;height:2px;background:rgba(237,237,237,.10)"></div>"""
    return f"""{spot(880, 520, 520, AMBER, .08)}
{ribbon(f"M -40 {y0} L 1500 {y0}", "h4", width=2, spread=5)}
{track}{pins}{template}{header()}{rail(.2, 0)}
{title_block(160, 130, "Captar", AMBER, 'Nadie se queda <span class="t">esperando.</span>', "Si una venta no cerró, Axi vuelve en el momento justo. Y se detiene cuando te responden.", 640, 62)}
{niche_pill()}"""


def product_tile(label: str, price: str, hl: bool = False, big: bool = False, icon: str = "smartphone") -> str:
    h = 150 if big else 92
    ring = f"box-shadow:0 0 0 2px {VIOLET},0 0 40px rgba(167,139,250,.45);" if hl else ""
    return f"""<div style="border-radius:16px;background:{SURF2};border:1px solid {LINE};overflow:hidden;{ring}">
<div style="height:{h}px;background:radial-gradient(120% 90% at 50% 0%,#2b2b33,#141418);display:flex;align-items:center;justify-content:center">{ic(icon, 34 if big else 26, "rgba(237,237,237,.55)")}</div>
<div style="padding:8px 10px"><div style="font-size:11.5px;font-weight:600">{label}</div><div class="dim tn" style="font-size:11px">{price}</div></div></div>"""


def s05_chat() -> str:
    inner = (
        bub("Hola, ¿tienen el iPhone 17 de 256?", False, "8:47 p. m.")
        + bub("¡Sí! Nos quedan 3 en tienda. Te comparto la foto.", True, "8:47 p. m. · 4 s")
        + f'<div style="align-self:flex-end;width:200px">{product_tile("iPhone 17 · 256 GB", "$ 4.899.000", big=True)}</div>'
        + bub("Me lo llevo. ¿Cómo pago?", False, "8:49 p. m.")
        + bub("Listo: pedido #2087 por $ 4.899.000. Puedes pagar por Nequi, Bancolombia o link de pago.", True, "8:49 p. m.")
        + f'<div style="align-self:center" class="chip">{ic("receipt", 12, AMBER)}Pago reportado · lo verifica tu equipo</div>'
    )
    sale = f"""<div class="glass" style="position:absolute;left:600px;top:560px;width:300px;border-radius:22px;padding:20px;z-index:3">
<div class="eb" style="font-size:10px;color:{GREEN}">Venta pagada</div>
<div class="nx tn" style="font-size:38px;font-weight:700;letter-spacing:-.03em;margin-top:6px">$ 4.899.000</div>
<div class="dim" style="font-size:12.5px">verificada por tu equipo · 8:53 p. m.</div></div>
<div class="chip" style="position:absolute;left:610px;top:210px;z-index:3;height:32px">{ic('timer', 14, CORAL)}Respondió en 4 s</div>"""
    return f"""{spot(420, 500, 480, CORAL, .12)}
{ribbon("M -40 880 C 160 820, 220 700, 300 640", "h5", opacity=.8)}
{phone(230, 110, inner, "Tecnología Medellín", "agente en línea · 8:47 p. m.")}
{sale}{header()}{rail(.3, 1)}
{title_block(900, 250, "Vender", CORAL, 'Responde en segundos. <span class="t">Con tus precios reales.</span>', "Busca en tu catálogo, cotiza, arma el pedido y comparte tus medios de pago. Como tu mejor vendedor, a cualquier hora.", 480, 56)}
{niche_pill()}"""


def s06_photo() -> str:
    names = [("iPhone 16 · 128 GB", "$ 3.899.000", "smartphone"), ("iPhone 17 · 256 GB", "$ 4.899.000", "smartphone"), ("iPhone 17 Pro", "$ 6.299.000", "smartphone"),
             ("iPad Air", "$ 3.499.000", "tablet"), ("AirPods Pro", "$ 1.249.000", "headphones"), ("Apple Watch SE", "$ 1.249.000", "watch"),
             ("Galaxy S25", "$ 3.999.000", "smartphone"), ("MacBook Air", "$ 5.999.000", "laptop"), ("iPhone 16 Pro", "$ 5.499.000", "smartphone")]
    grid = "".join(product_tile(n, p, hl=(i == 1), icon=k) for i, (n, p, k) in enumerate(names))
    shot = f"""<div style="position:absolute;left:250px;top:250px;width:260px;height:470px;border-radius:26px;background:{SURF};border:1px solid {LINE};overflow:hidden;z-index:2">
<div style="padding:12px 14px;display:flex;align-items:center;gap:8px;font-size:12px"><div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,{AMBER},{CORAL})"></div><span style="font-weight:600">@techmedellin</span></div>
<div style="height:300px;background:radial-gradient(120% 80% at 50% 10%,#30303a,#121216);display:flex;align-items:center;justify-content:center">{ic('smartphone', 90, "rgba(237,237,237,.6)")}</div>
<div class="dim" style="padding:10px 14px;font-size:11.5px">Captura enviada por el cliente</div>
<div style="position:absolute;left:0;top:190px;width:100%;height:2px;background:{CORAL};box-shadow:0 0 24px 6px rgba(251,113,133,.55)"></div></div>"""
    return f"""{spot(900, 470, 520, VIOLET, .12)}
{ribbon("M -40 520 C 120 500, 180 480, 250 480 M 510 480 C 600 480, 640 470, 700 470", "h6", opacity=.9)}
{shot}
<div style="position:absolute;left:700px;top:230px;width:470px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;z-index:2">{grid}</div>
<div class="glass" style="position:absolute;left:830px;top:180px;border-radius:999px;padding:8px 16px;z-index:3;display:flex;gap:8px;align-items:center;font-size:13px">{ic('scan-search', 15, VIOLET)}<strong>Reconocido</strong><span class="mut">iPhone 17 · 256 GB · similitud 0,93</span></div>
<div style="position:absolute;left:1196px;top:560px;width:220px;z-index:3">{bub("Es el iPhone 17 de 256 GB: $ 4.899.000. ¿Te lo aparto?", True, "8:51 p. m.")}</div>
{header()}{rail(.38, 1)}
{title_block(160, 120, "Vender", VIOLET, 'Una foto <span class="t">basta.</span>', "", 520, 62)}
<p class="mut" style="position:absolute;left:160px;top:760px;width:560px;font-size:18px;margin:0;z-index:3">Tu cliente manda una captura y Axi encuentra el producto exacto en tu catálogo.</p>
{niche_pill()}"""


def s07_call() -> str:
    stages = ["Apertura", "Motivo", "Descubrimiento", "Propuesta", "Objeciones", "Cierre"]
    route = ""
    for i, s in enumerate(stages):
        done = i < 5
        cur = i == 5
        col = FG if done else DIM
        dot = (f'<div style="width:14px;height:14px;border-radius:50%;background:{CORAL};box-shadow:0 0 0 5px rgba(251,113,133,.2),0 0 18px {CORAL}"></div>' if cur
               else f'<div style="width:14px;height:14px;border-radius:50%;background:{FG if done else "rgba(237,237,237,.2)"}"></div>')
        route += f'<div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:120px">{dot}<span style="font-size:12.5px;color:{col}">{s}</span></div>'
    lines = [
        ("Axi", "Hola Andrés, te llamo de Tecnología Medellín por el iPhone que cotizaste ayer."),
        ("Andrés", "Sí, justo lo estaba pensando. ¿Me lo pueden llevar hoy?"),
        ("Axi", "Claro. Si confirmas ahora, sale en el despacho de las 3 p. m."),
        ("Andrés", "Hágale, confírmelo."),
    ]
    tr = "".join(
        f'<div style="display:flex;gap:12px;font-size:15px;line-height:1.5"><span class="eb" style="width:72px;flex:none;font-size:10px;padding-top:4px;color:{VIOLET if who == "Axi" else DIM}">{who}</span><span style="color:{FG if i == len(lines) - 1 else MUT}">{t}</span></div>'
        for i, (who, t) in enumerate(lines)
    )
    return f"""{spot(1010, 380, 360, VIOLET, .28)}{spot(1010, 380, 220, CORAL, .30)}
<div style="position:absolute;left:910px;top:280px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2a33,#0c0c10);box-shadow:0 0 0 1px rgba(237,237,237,.12),0 0 120px rgba(167,139,250,.35);display:flex;align-items:center;justify-content:center;z-index:2">{isotype(96, 'call')}</div>
<div class="chip" style="position:absolute;left:930px;top:510px;height:32px;z-index:3">{ic('phone-call', 14, GREEN)}En conversación · 02:14</div>
<div style="position:absolute;left:640px;top:600px;width:740px;display:flex;justify-content:space-between;z-index:3">{route}</div>
<div style="position:absolute;left:700px;top:607px;width:620px;height:1px;background:linear-gradient(90deg,{FG} 80%,rgba(237,237,237,.15) 80%);z-index:2"></div>
<div class="glass" style="position:absolute;left:1060px;top:700px;border-radius:16px;padding:12px 16px;z-index:3;display:flex;align-items:center;gap:10px;white-space:nowrap">{ic('circle-check', 18, GREEN)}<strong>Objetivo cumplido</strong><span class="dim" style="font-size:12.5px">pedido confirmado</span></div>
<div style="position:absolute;left:160px;top:470px;width:420px;display:flex;flex-direction:column;gap:14px;z-index:3">{tr}</div>
{ribbon("M -40 380 C 300 360, 600 400, 910 380", "h7", opacity=.7)}
{header()}{rail(.46, 1)}
{title_block(160, 130, "Vender", VIOLET, 'Y cuando hay que llamar, <span class="t">llama.</span>', "Retoma cotizaciones, confirma citas y lleva la llamada por etapas.", 560, 56)}
{niche_pill()}"""


def s08_vault() -> str:
    cx, cy = 720, 500
    rings = "".join(
        f'<div style="position:absolute;left:{cx - r}px;top:{cy - r}px;width:{2 * r}px;height:{2 * r}px;border-radius:50%;border:1px solid rgba(237,237,237,{a})"></div>'
        for r, a in [(250, .06), (190, .09), (130, .14)]
    )
    facts = [
        (cx - 470, cy - 90, "tag", "Precio", "de tu catálogo"),
        (cx + 250, cy - 90, "ticket-percent", "Descuento", "solo con un cupón válido"),
        (cx - 470, cy + 90, "calculator", "Total", "lo calcula el sistema"),
        (cx + 250, cy + 90, "user-check", "Pago", "lo confirma tu equipo"),
    ]
    fx = "".join(
        f'<div class="card" style="position:absolute;left:{x}px;top:{y - 36}px;width:230px;height:72px;border-radius:18px;padding:14px 16px;display:flex;align-items:center;gap:12px;z-index:3">{ic(i, 18, FG)}<div><div style="font-weight:600;font-size:14px">{t}</div><div class="dim" style="font-size:12px">{s}</div></div>{ic("lock", 13, DIM)}</div>'
        for x, y, i, t, s in facts
    )
    return f"""{spot(cx, cy, 380, CORAL, .10)}
{rings}
<div style="position:absolute;left:{cx - 70}px;top:{cy - 70}px;width:140px;height:140px;border-radius:50%;background:{SURF2};border:1px solid rgba(237,237,237,.18);display:flex;align-items:center;justify-content:center;box-shadow:0 0 80px rgba(251,113,133,.25);z-index:2">{ic('shield-check', 46, FG)}</div>
{fx}
<div style="position:absolute;left:{cx - 170}px;top:{cy - 240}px;width:280px;z-index:3">{bub("¿Me lo dejas en 4 millones?", False)}</div>
<div style="position:absolute;left:{cx + 20}px;top:{cy + 150}px;width:320px;z-index:3">{bub("Puedo aplicarte el cupón OCTUBRE10: queda en $ 4.409.100.", True, "precio y total del sistema")}</div>
{header()}{rail(.52, 1)}
<div style="position:absolute;left:0;top:112px;width:{W}px;text-align:center;z-index:3"><div class="eb" style="color:{CORAL};margin-bottom:14px">Vender, con reglas</div><h2 class="h" style="font-size:56px">Nunca inventa <span class="t">un precio.</span></h2></div>
<p class="mut" style="position:absolute;left:0;bottom:92px;width:{W}px;text-align:center;font-size:17px;margin:0;z-index:3">Precios, cupones y totales salen de tu sistema, no de la IA. Y ningún pago se da por hecho sin tu equipo.</p>
{niche_pill()}"""


def s09_team() -> str:
    modes = ""
    for i, (label, col, on) in enumerate([("Axi atiende", VIOLET, False), ("En cola · 1 min", AMBER, False), ("Contigo", CORAL, True)]):
        st = f"background:{FG};color:{INK};border-color:{FG}" if on else ""
        modes += f'<span class="chip" style="height:34px;padding:0 14px;{st}"><span style="width:7px;height:7px;border-radius:50%;background:{col}"></span>{label}</span>'
        if i < 2:
            modes += ic("arrow-right", 15, DIM)
    rows = "".join(
        f'<div style="display:flex;gap:10px;padding:12px;border-radius:14px;{"background:rgba(237,237,237,.06)" if i == 0 else ""}"><div style="width:34px;height:34px;border-radius:50%;background:{c};flex:none"></div><div style="min-width:0"><div style="font-size:13px;font-weight:600">{n}</div><div class="dim" style="font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{m}</div></div></div>'
        for i, (n, m, c) in enumerate([("Andrés Gómez", "Quiero hablar con una persona", "#3a3a44"), ("Valeria Ríos", "Axi: listo, tu pedido va en camino", "#2c2c34"), ("Camilo Díaz", "Axi: te comparto los medios de pago", "#2c2c34"), ("Luisa Mejía", "¿Tienen factura?", "#2c2c34")])
    )
    thread = (
        bub("¿Puedo hablar con una persona? Es por la garantía.", False, "10:31 a. m.")
        + f'<div style="align-self:center;font-size:11.5px;color:{MUT};padding:6px 12px;border-radius:999px;background:rgba(237,237,237,.05)">Axi te la pasó: el cliente pidió hablar con una persona · hace 1 min</div>'
        + bub("Hola Andrés, soy Laura. Te ayudo con la garantía ahora mismo.", True, "Laura · 10:32 a. m.")
    )
    inbox = f"""<div class="card" style="position:absolute;left:600px;top:230px;width:780px;height:520px;border-radius:24px;display:grid;grid-template-columns:260px 1fr;overflow:hidden;z-index:2;box-shadow:0 40px 120px rgba(0,0,0,.6)">
<div style="border-right:1px solid {LINE};padding:14px;display:flex;flex-direction:column;gap:4px"><div class="eb dim" style="font-size:10px;padding:4px 8px 10px">Bandeja</div>{rows}</div>
<div style="display:flex;flex-direction:column">
<div style="height:60px;border-bottom:1px solid {LINE};display:flex;align-items:center;justify-content:space-between;padding:0 18px"><strong>Andrés Gómez</strong><a href="#" class="btn btn-g btn-sm">{ic('bot', 15)}Devolver a Axi</a></div>
<div style="flex:1;display:flex;flex-direction:column;gap:12px;padding:18px">{thread}</div>
<div style="margin:14px;height:46px;border-radius:14px;border:1px solid {LINE};display:flex;align-items:center;padding:0 14px;color:{DIM};font-size:13px">Escribe como Laura…</div>
</div></div>
<div style="position:absolute;left:600px;top:170px;display:flex;align-items:center;gap:10px;z-index:3">{modes}</div>"""
    return f"""{spot(960, 480, 520, CORAL, .09)}
{ribbon("M -40 870 C 260 860, 460 720, 600 620", "h9", opacity=.7)}
{inbox}{header()}{rail(.6, 1)}
{title_block(160, 250, "Vender, en equipo", CORAL, 'Cuando hace falta una persona, <span class="t">entra tu equipo.</span>', "El cliente no nota el cambio. Cuando se la devuelves, Axi sigue donde quedó.", 400, 44)}
{niche_pill()}"""


def s10_collect() -> str:
    meter = f"""<div style="display:flex;gap:3px;height:12px;border-radius:999px;overflow:hidden">
<div style="width:30.6%;background:{CORAL}"></div><div style="width:34.7%;background:{CORAL};opacity:.8"></div><div style="flex:1;background:rgba(237,237,237,.10)"></div></div>"""
    order = f"""<div class="glass" style="position:absolute;left:520px;top:240px;width:420px;border-radius:24px;padding:24px;z-index:3;display:flex;flex-direction:column;gap:16px">
<div style="display:flex;justify-content:space-between"><div><div class="dim" style="font-size:12px">Pedido #2087</div><div style="font-weight:600;font-size:16px">Andrés Gómez</div></div><span class="chip">Abonado</span></div>
<div><div class="dim" style="font-size:12px">Cobro del pedido</div><div class="nx tn" style="font-size:34px;font-weight:700;letter-spacing:-.03em">$ 4.899.000</div></div>
{meter}
<div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
<div style="display:flex;justify-content:space-between"><span>Anticipo · verificado</span><span class="tn">$ 1.500.000</span></div>
<div style="display:flex;justify-content:space-between"><span>Cuota 2 · verificada</span><span class="tn">$ 1.700.000</span></div>
<div style="display:flex;justify-content:space-between;font-weight:600"><span>Falta por cobrar</span><span class="tn">$ 1.699.000</span></div></div></div>"""
    reminders = f"""<div class="card" style="position:absolute;left:990px;top:200px;width:360px;border-radius:24px;padding:20px;z-index:3;display:flex;flex-direction:column;gap:10px">
<div class="eb dim" style="font-size:10px">Antes de vencer</div>
{bub("Hola Andrés, la cuota 3 de 3 por $ 1.699.000 vence el viernes 16 de octubre. Te dejo los medios de pago.", True, "WhatsApp · 14 oct")}
{bub("Pago el lunes sin falta", False, "14 oct")}
<div class="chip" style="align-self:flex-start;height:30px">{ic('calendar-check', 13, AMBER)}Promesa · lunes 19 · recordatorios en pausa</div></div>"""
    doc = f"""<div style="position:absolute;left:1030px;top:600px;display:flex;align-items:center;gap:14px;z-index:3">
<div style="width:74px;height:96px;border-radius:8px;background:{FG};box-shadow:0 20px 50px rgba(0,0,0,.6);padding:10px;display:flex;flex-direction:column;gap:5px"><div style="height:6px;width:60%;background:#c9c9cf;border-radius:3px"></div><div style="height:4px;width:90%;background:#e0e0e4;border-radius:3px"></div><div style="height:4px;width:80%;background:#e0e0e4;border-radius:3px"></div><div style="height:4px;width:85%;background:#e0e0e4;border-radius:3px"></div><div style="margin-top:auto;height:6px;width:40%;background:{CORAL};border-radius:3px"></div></div>
<div><div style="font-weight:600">Recibo de pago · N.º 0142</div><div class="dim" style="font-size:12.5px">PDF · enviado por WhatsApp</div></div></div>"""
    return f"""{spot(760, 470, 520, CORAL, .10)}
{ribbon("M -40 820 C 200 760, 380 520, 520 470", "h10", opacity=.75)}
{order}{reminders}{doc}{header()}{rail(.68, 2)}
{title_block(160, 250, "Cobrar", CORAL, 'Cada venta, <span class="t">cobrada.</span>', "Abonos que se reparten solos, recordatorios que suenan a conversación y el recibo listo para enviar.", 340, 56)}
{niche_pill()}"""


def s11_pipeline() -> str:
    cols = [("Nuevo", 6), ("Contactado", 4), ("Cita", 3), ("Propuesta", 5), ("Compromiso", 2)]
    board = ""
    for ci, (name, n) in enumerate(cols):
        cards = ""
        for k in range(3):
            hl = ci == 4 and k == 0
            ghost = ci == 3 and k == 0
            if hl:
                cards += f'<div style="border-radius:14px;padding:12px;background:#1d1d22;border:1px solid rgba(251,113,133,.5);box-shadow:0 18px 50px rgba(251,113,133,.18)"><div style="font-size:12.5px;font-weight:600">Andrés Gómez</div><div class="dim" style="font-size:11.5px">iPhone 17 · $ 4.899.000</div><span class="chip" style="height:22px;font-size:10.5px;margin-top:8px">{ic("sparkles", 11, VIOLET)}La abrió Axi</span></div>'
            elif ghost:
                cards += '<div style="border-radius:14px;height:86px;border:1px dashed rgba(237,237,237,.18)"></div>'
            else:
                cards += f'<div style="border-radius:14px;padding:12px;background:{SURF2};border:1px solid {LINE}"><div style="height:7px;width:{60 + 9 * k}%;border-radius:4px;background:rgba(237,237,237,.22)"></div><div style="height:6px;width:40%;border-radius:4px;background:rgba(237,237,237,.1);margin-top:8px"></div></div>'
        board += f'<div style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;font-size:12.5px"><strong>{name}</strong><span class="dim tn">{n}</span></div>{cards}</div>'
    kanban = f"""<div class="card" style="position:absolute;left:520px;top:220px;width:860px;border-radius:24px;padding:20px;z-index:2">
<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px"><strong>Pipeline</strong><span class="mut" style="font-size:12.5px">Pronóstico ponderado <strong class="tn" style="color:{FG}">$ 38,2 M</strong></span></div>
<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px">{board}</div></div>
<div class="glass" style="position:absolute;left:1040px;top:600px;width:320px;border-radius:20px;padding:16px;z-index:3;display:flex;gap:14px;align-items:center">
<div style="width:52px;height:56px;border-radius:12px;background:{FG};color:{INK};display:flex;flex-direction:column;align-items:center;justify-content:center"><span style="font-size:10px;font-weight:600">SÁB</span><span class="nx" style="font-size:22px;font-weight:700;line-height:1">3</span></div>
<div><div style="font-weight:600;font-size:13.5px">10:00 a. m. · Entrega y configuración</div><div class="dim" style="font-size:12px">Andrés · recordatorio 24 h antes ✓</div></div></div>"""
    return f"""{spot(950, 480, 520, VIOLET, .08)}
{ribbon("M -40 880 C 260 860, 420 680, 520 560", "h11", opacity=.7)}
{kanban}{header()}{rail(.76, 2)}
{title_block(160, 250, "Ordenar", VIOLET, 'Todo queda <span class="t">en su lugar.</span>', "Cada conversación abre su oportunidad, agenda lo que haga falta y avanza sola en tu pipeline.", 340, 56)}
{niche_pill()}"""


# --- el mapa de la meta ---------------------------------------------------
ROAD = [  # segmentos cúbicos (p0, c1, c2, p3)
    ((70, 830), (260, 800), (330, 650), (520, 640)),
    ((520, 640), (700, 630), (720, 470), (880, 440)),
    ((880, 440), (1040, 410), (1060, 250), (1210, 220)),
    ((1210, 220), (1290, 205), (1320, 185), (1350, 175)),
]


def _bez(p0, c1, c2, p3, t):
    u = 1 - t
    return (
        u ** 3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p3[0],
        u ** 3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p3[1],
    )


def _samples(road, scale=1.0, dx=0, dy=0):
    pts = []
    for seg in road:
        for i in range(200):
            x, y = _bez(*seg, i / 200)
            pts.append((x * scale + dx, y * scale + dy))
    x, y = road[-1][3]
    pts.append((x * scale + dx, y * scale + dy))
    acc = [0.0]
    for a, b in zip(pts, pts[1:]):
        acc.append(acc[-1] + math.dist(a, b))
    return pts, acc


def point_at(frac, road=ROAD, scale=1.0, dx=0, dy=0):
    pts, acc = _samples(road, scale, dx, dy)
    target = frac * acc[-1]
    for i, L in enumerate(acc):
        if L >= target:
            return pts[i]
    return pts[-1]


def road_d(road=ROAD, scale=1.0, dx=0, dy=0):
    f = lambda p: f"{p[0] * scale + dx:.1f} {p[1] * scale + dy:.1f}"  # noqa: E731
    d = f"M {f(road[0][0])}"
    for _, c1, c2, p3 in road:
        d += f" C {f(c1)}, {f(c2)}, {f(p3)}"
    return d


def city(w, h, seed=3, cell=74, gap=12) -> str:
    rnd = random.Random(seed)
    blocks = []
    for gx in range(0, w, cell):
        for gy in range(0, h, cell):
            if rnd.random() < .12:
                continue
            ww = cell - gap - rnd.choice([0, 0, 10, 20])
            hh = cell - gap - rnd.choice([0, 0, 10])
            blocks.append(f'<rect x="{gx}" y="{gy}" width="{ww}" height="{hh}" rx="7" style="fill:#101014"/>')
    river = f'<path d="M -20 {h * .18:.0f} C {w * .3:.0f} {h * .05:.0f}, {w * .45:.0f} {h * .42:.0f}, {w * .7:.0f} {h * .3:.0f} S {w + 40} {h * .5:.0f}, {w + 40} {h * .5:.0f}" style="fill:none;stroke:rgba(167,139,250,.10);stroke-width:46"/>'
    park = f'<rect x="{w * .08:.0f}" y="{h * .32:.0f}" width="190" height="150" rx="20" style="fill:rgba(74,222,128,.06)"/>'
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" aria-hidden="true" style="position:absolute;left:0;top:0">{"".join(blocks)}{river}{park}</svg>'


def route_svg(w, h, scale=1.0, dx=0, dy=0, uid="m") -> str:
    d = road_d(ROAD, scale, dx, dy)
    sw = max(3.0, 8 * scale)
    return f"""<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" aria-hidden="true" style="position:absolute;left:0;top:0">
<defs><linearGradient id="g{uid}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="{CORAL}"/><stop offset=".6" stop-color="{AMBER}"/><stop offset="1" stop-color="{VIOLET}"/></linearGradient>
<filter id="f{uid}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="10"/></filter></defs>
<path d="{d}" style="fill:none;stroke:#1a1a20;stroke-width:{sw * 3.2};stroke-linecap:round"/>
<path d="{d}" pathLength="1" style="fill:none;stroke:rgba(237,237,237,.35);stroke-width:{sw * .45};stroke-dasharray:.004 .012;stroke-linecap:round"/>
<path d="{d}" pathLength="1" filter="url(#f{uid})" style="fill:none;stroke:url(#g{uid});stroke-width:{sw * 2.2};stroke-dasharray:.63 2;opacity:.7"/>
<path d="{d}" pathLength="1" style="fill:none;stroke:url(#g{uid});stroke-width:{sw};stroke-dasharray:.63 2;stroke-linecap:round"/>
<path d="{d}" pathLength="1" style="fill:none;stroke:{AMBER};stroke-width:{sw};stroke-dasharray:0 .63 .087 2;stroke-linecap:round;opacity:.95"/>
</svg>"""


def s12_goal() -> str:
    marks = ""
    for frac, lab in [(.227, "S1 · $ 6,8 M"), (.437, "S2 · $ 13,1 M")]:
        x, y = point_at(frac)
        marks += f'<div style="position:absolute;left:{x - 6:.0f}px;top:{y - 6:.0f}px;width:12px;height:12px;border-radius:50%;background:{FG};z-index:3"></div><div class="chip" style="position:absolute;left:{x + 12:.0f}px;top:{y + 8:.0f}px;height:24px;font-size:11px;background:rgba(10,10,10,.8);z-index:3">{lab}</div>'
    sx, sy = point_at(0)
    marks += f'<div class="chip" style="position:absolute;left:{sx + 14:.0f}px;top:{sy - 40:.0f}px;background:rgba(10,10,10,.85);z-index:3">{ic("navigation", 12, FG)}Salida · 1 oct</div>'
    ex, ey = point_at(.717)
    marks += f'<div style="position:absolute;left:{ex - 10:.0f}px;top:{ey - 10:.0f}px;width:20px;height:20px;border-radius:50%;border:2px solid {FG};background:{BG};z-index:3"></div><div class="chip" style="position:absolute;left:{ex + 18:.0f}px;top:{ey - 4:.0f}px;height:24px;font-size:11px;background:rgba(10,10,10,.85);z-index:3">Deberías ir en $ 21,5 M</div>'
    lx, ly = point_at(.675)
    marks += f'<div class="chip" style="position:absolute;left:{lx - 300:.0f}px;top:{ly - 58:.0f}px;height:26px;font-size:11.5px;color:{AMBER};background:rgba(10,10,10,.85);border-color:rgba(251,191,36,.35);z-index:3">Tramo lento · vas $ 2,6 M por debajo</div>'
    px, py = point_at(.82)
    marks += f'<div style="position:absolute;left:{px - 11:.0f}px;top:{py - 11:.0f}px;width:22px;height:22px;border-radius:50%;border:2px dashed {FG};z-index:3"></div><div style="position:absolute;left:{px - 380:.0f}px;top:{py - 18:.0f}px;padding:8px 12px;border-radius:12px;background:{FG};color:{INK};font-size:12px;z-index:3;white-space:nowrap"><strong>82 %</strong> · Si sigues así llegas a $ 24,6 M</div>'
    mx, my = point_at(1)
    marks += f'<div style="position:absolute;left:{mx - 22:.0f}px;top:{my - 56:.0f}px;width:44px;height:44px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:{FG};z-index:3;display:flex;align-items:center;justify-content:center"><div style="transform:rotate(45deg)">{ic("flag", 18, INK)}</div></div><div style="position:absolute;left:{mx - 250:.0f}px;top:{my - 60:.0f}px;text-align:right;width:210px;z-index:3"><div style="font-weight:600">Meta · $ 30.000.000</div><div class="dim" style="font-size:12px">viernes 30 de octubre</div></div>'
    vx, vy = point_at(.63)
    marks += f"""<div style="position:absolute;left:{vx - 40:.0f}px;top:{vy - 40:.0f}px;width:80px;height:80px;border-radius:50%;background:rgba(251,113,133,.20);z-index:3"></div>
<div style="position:absolute;left:{vx - 15:.0f}px;top:{vy - 15:.0f}px;width:30px;height:30px;border-radius:50%;background:{CORAL};box-shadow:0 0 0 5px rgba(10,10,10,.9),0 0 30px {CORAL};z-index:4;display:flex;align-items:center;justify-content:center">{ic("navigation", 14, INK)}</div>
<div class="glass" style="position:absolute;left:{vx - 190:.0f}px;top:{vy + 26:.0f}px;border-radius:14px;padding:10px 14px;z-index:4"><div class="eb" style="font-size:9.5px;color:{CORAL}">Vas aquí</div><div class="nx tn" style="font-size:22px;font-weight:700">$ 18,9 M · 63 %</div></div>"""
    steps = "".join(
        f'<div style="display:flex;align-items:center;gap:12px;font-size:13.5px"><div style="width:30px;height:30px;border-radius:9px;background:rgba(237,237,237,.07);display:flex;align-items:center;justify-content:center">{ic(i, 15, FG)}</div>{t}</div>'
        for i, t in [("corner-up-right", "Cierra 2 ventas hoy"), ("corner-up-left", "Envía 5 cotizaciones"), ("arrow-up", "Agenda 3 citas")]
    )
    routes = f"""<div style="display:flex;flex-direction:column;gap:8px">
<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:12px;border:1px solid {LINE};font-size:13px"><span style="display:flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border-radius:50%;border:1.5px solid {DIM}"></span>Seguir al ritmo de hoy</span><span class="tn mut">82 %</span></div>
<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:12px;border:1px solid rgba(167,139,250,.55);background:rgba(167,139,250,.10);font-size:13px"><span style="display:flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border-radius:50%;border:4px solid {VIOLET}"></span>Retomar 14 cotizaciones frías</span><span class="tn" style="font-weight:600">91 %</span></div></div>"""
    panel = f"""<div class="glass" style="position:absolute;left:1010px;top:250px;width:380px;border-radius:26px;padding:20px;z-index:5;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="dim" style="font-size:12px">Destino · octubre</div><div class="nx tn" style="font-size:26px;font-weight:700;letter-spacing:-.02em">Vender $ 30.000.000</div></div><a href="#" style="font-size:12.5px">Cambiar</a></div>
<div style="display:flex;align-items:center;gap:10px"><span class="chip" style="color:{AMBER};border-color:rgba(251,191,36,.35);background:rgba(251,191,36,.08)">Ritmo bajo</span><span class="dim" style="font-size:12px">6 días hábiles · hasta el 30 oct</span></div>
<p style="margin:0;font-size:15px;line-height:1.5">Para llegar faltan $ 11,1 M: <strong>2 ventas al día</strong> en los 6 días hábiles que quedan.</p>
<div class="dim" style="font-size:11.5px">Ticket promedio $ 925.000 · según tu historia</div>
<div style="height:1px;background:{LINE}"></div>
<div class="eb dim" style="font-size:10px">Indicaciones de hoy</div>{steps}
<div style="height:1px;background:{LINE}"></div>
<div class="eb" style="font-size:10px;color:{VIOLET}">Rutas · las prepara Axi</div>{routes}
<a href="#" class="btn btn-p" style="height:44px;box-shadow:none">Tomar esta ruta · aprobar</a>
<div class="dim" style="font-size:11.5px;text-align:center;margin-top:-6px">Nada se envía sin tu aprobación.</div></div>"""
    fade = f'<div style="position:absolute;left:0;top:0;width:{W}px;height:{H}px;background:linear-gradient(90deg,rgba(7,7,10,.92) 0%,rgba(7,7,10,.55) 30%,transparent 55%),linear-gradient(0deg,rgba(7,7,10,.8),transparent 25%);z-index:2;pointer-events:none"></div>'
    return f"""{city(W, H)}{route_svg(W, H)}{fade}{marks}{panel}{header()}{rail(.9, 3)}
{title_block(160, 140, "Crecer", CORAL, 'Tú pones la meta.<br><span class="t">Axi traza la ruta.</span>', "Tu meta del mes se vuelve un camino con indicaciones para hoy. Si vas lento, Axi te prepara otra ruta.", 640, 58)}
{niche_pill()}"""


def s13_axel() -> str:
    cards = ""
    for t, title, meta, st, icon in [
        ("Recuperación", "Retomar 14 cotizaciones frías mañana a las 9:00", "Solo mensaje · sin descuento", "Por decidir", "rotate-ccw"),
        ("Campaña", "Clientes que compraron hace 60 días", "212 contactos · plantilla aprobada", "Por decidir", "megaphone"),
        ("Ritmo de la meta", "Con 2 ventas al día llegas el 30", "según tu historia", "Hallazgo", "gauge"),
    ]:
        cards += f"""<div class="card" style="border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:10px">
<div style="display:flex;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:8px;font-size:12px" class="mut"><span style="width:24px;height:24px;border-radius:7px;background:{FG};display:flex;align-items:center;justify-content:center">{ic(icon, 13, INK)}</span>{t}</span><span class="dim" style="font-size:11px;white-space:nowrap">{st}</span></div>
<div style="font-weight:600;font-size:14.5px;line-height:1.35">{title}</div><div class="dim" style="font-size:12px">{meta}</div>
<a href="#" class="btn btn-g btn-sm" style="align-self:flex-start;margin-top:auto">Revisar y decidir</a></div>"""
    brief = f"""<div style="position:absolute;left:640px;top:190px;width:700px;z-index:3">
<div style="display:flex;align-items:center;gap:14px"><div style="width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3b3553,#141220);box-shadow:0 0 0 1px rgba(167,139,250,.4),0 0 50px rgba(167,139,250,.4);display:flex;align-items:center;justify-content:center;color:{VIOLET};font-size:22px">✦</div><div><div style="font-size:12px;color:{VIOLET};font-weight:600">✦ Axel</div><div class="nx" style="font-size:30px;font-weight:700;letter-spacing:-.02em">Hola, Camila</div></div></div>
<p style="font-size:17px;line-height:1.55;margin:18px 0 14px;max-width:620px">Ayer cerraste 3 ventas y quedaron 14 cotizaciones sin respuesta. Hoy te propongo retomarlas antes de las 10.</p>
<div style="display:flex;gap:8px;margin-bottom:22px"><span class="chip">Meta · 63 %</span><span class="chip"><span style="width:6px;height:6px;border-radius:50%;background:{GREEN}"></span>3 ventas ayer</span><span class="chip"><span style="width:6px;height:6px;border-radius:50%;background:{AMBER}"></span>14 cotizaciones frías</span></div>
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px">{cards}</div>
<div class="dim" style="font-size:12px;margin-top:16px">Nada sale sin tu aprobación.</div></div>"""
    return f"""{spot(980, 420, 560, VIOLET, .16)}
{ribbon("M -40 860 C 280 840, 500 620, 640 460", "h13", opacity=.6)}
{brief}{header()}{rail(.95, 3)}
{title_block(160, 250, "Crecer", VIOLET, 'Cada mañana, <span class="t">un plan.</span>', "Axel, tu director comercial con IA, revisa tus números y te propone qué hacer. Tú decides.", 400, 56)}
{niche_pill()}"""


def s14_measure() -> str:
    steps = [("Conversaciones", "1.240", 1.0), ("Cotizaciones", "312", .72), ("Pedidos", "148", .5), ("Ventas pagadas", "121", .38)]
    bars = ""
    for i, (lab, n, f) in enumerate(steps):
        x = 180 + i * 250
        hh = 380 * f
        bars += f"""<div style="position:absolute;left:{x}px;top:{690 - hh:.0f}px;width:200px;height:{hh:.0f}px;border-radius:18px 18px 6px 6px;background:linear-gradient(180deg,rgba(237,237,237,{.10 + .05 * i}),rgba(237,237,237,.03));border:1px solid {LINE};z-index:2"></div>
<div style="position:absolute;left:{x}px;top:{700:.0f}px;width:200px;z-index:3"><div class="nx tn" style="font-size:40px;font-weight:700;letter-spacing:-.03em">{n}</div><div class="mut" style="font-size:13.5px">{lab}</div></div>"""
    return f"""{spot(720, 560, 560, CORAL, .10)}
{ribbon("M -40 292 C 400 286, 860 290, 1130 330", "h14", opacity=.85)}
{bars}
<div style="position:absolute;left:1150px;top:300px;width:270px;z-index:3"><div class="eb" style="font-size:10px;color:{CORAL}">Lo que produjeron</div><div class="nx tn" style="white-space:nowrap;font-size:52px;font-weight:700;letter-spacing:-.04em;background:linear-gradient(90deg,{CORAL},{AMBER});-webkit-background-clip:text;background-clip:text;color:transparent">$ 48,6 M</div><div class="mut" style="font-size:13px">en ventas pagadas este mes</div></div>
<div class="glass" style="position:absolute;left:1150px;top:470px;width:240px;border-radius:18px;padding:14px;z-index:3"><div style="display:flex;align-items:baseline;gap:6px"><span class="nx tn" style="font-size:28px;font-weight:700">92</span><span class="dim">/ 100</span></div><div style="font-size:12.5px">Calidad del agente</div><div class="dim" style="font-size:11px">evaluada por una IA supervisora</div></div>
<div class="chip" style="position:absolute;left:180px;top:840px;z-index:3">Cifras de ejemplo</div>
{header()}{rail(1, 3)}
{title_block(160, 120, "Medir", CORAL, 'Sabes cuánto te vendió <span class="t">cada conversación.</span>', "", 900, 56)}
{niche_pill()}"""


def s15_pricing() -> str:
    plans = [
        ("Free Trial", "7 días", "gratis", ["El producto completo", "Sin tarjeta de crédito", "Tus datos quedan intactos"], True, "Comienza tus 7 días gratis"),
        ("Esencial", "$ 189.900", "COP/mes", ["WhatsApp oficial, Instagram y Messenger", "Agente vendedor con tu catálogo", "Inbox, CRM y agenda"], False, "Comienza tus 7 días gratis"),
        ("Crecimiento", "$ 449.900", "COP/mes", ["Axel, tu CMO con IA", "Captación con datos verificados", "Llamadas con voz natural"], False, "Comienza tus 7 días gratis"),
        ("Escala", "$ 899.900", "COP/mes", ["Varias líneas y equipos", "Roles sin límite de usuarios", "Shopify, Salesforce y tu ERP"], False, "Comienza tus 7 días gratis"),
    ]
    cards = ""
    for name, price, unit, bullets, feat, cta in plans:
        ring = f"box-shadow:0 0 0 1.5px {CORAL},0 30px 80px rgba(251,113,133,.18);" if feat else ""
        bl = "".join(f'<div style="display:flex;gap:8px;font-size:13px">{ic("check", 14, FG)}<span class="mut">{b}</span></div>' for b in bullets)
        badge = f'<span class="chip" style="position:absolute;top:18px;right:18px;height:22px;font-size:10.5px;color:{CORAL}">Empieza aquí</span>' if feat else ""
        cards += f"""<div class="card" style="position:relative;padding:26px;display:flex;flex-direction:column;gap:18px;{ring}">{badge}
<div style="font-weight:600;font-size:16px">{name}</div>
<div><span class="nx tn" style="font-size:36px;font-weight:700;letter-spacing:-.03em">{price}</span> <span class="dim" style="font-size:13px">{unit}</span></div>
<div style="display:flex;flex-direction:column;gap:9px">{bl}</div>
<a href="#" class="btn {"btn-p" if feat else "btn-g"}" style="margin-top:auto;height:44px;font-size:14px;{"box-shadow:none" if feat else ""}">{cta}</a></div>"""
    tiers = "".join(f'<span class="chip" style="height:32px;padding:0 14px;{"background:#EDEDED;color:#0A0A0A" if i == 0 else ""}">{t}</span>' for i, t in enumerate(["500", "1.000", "2.500", "5.000", "10.000"]))
    return f"""{spot(720, 300, 520, CORAL, .08)}
{header()}
<div style="position:absolute;left:0;top:120px;width:{W}px;text-align:center"><h2 class="h" style="font-size:56px">Empieza gratis. <span class="t">Crece a tu ritmo.</span></h2>
<p class="mut" style="font-size:17px;margin:16px 0 0">Todos los paquetes traen el producto completo. Lo que cambia es cuántas conversaciones atiende Axi al mes.</p></div>
<div style="position:absolute;left:0;top:300px;width:{W}px;display:flex;justify-content:center;align-items:center;gap:8px"><span class="dim" style="font-size:13px;margin-right:6px">Conversaciones al mes</span>{tiers}</div>
<div style="position:absolute;left:160px;top:370px;width:1120px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px">{cards}</div>
<p class="dim" style="position:absolute;left:0;bottom:36px;width:{W}px;text-align:center;font-size:12.5px;margin:0">Enterprise desde $ 2.900.000 COP/mes · base de datos dedicada · <a href="#">Hablar con ventas</a></p>"""


def s16_faq() -> str:
    qs = [
        ("¿Puede el agente inventar precios o dar descuentos?", "No. Precios y totales salen de tu catálogo y del sistema. Un descuento solo existe si hay un cupón válido en tus reglas."),
        ("¿La IA va a reemplazar a mi equipo?", ""),
        ("¿Qué pasa si la IA no sabe responder?", ""),
        ("¿Cuánto tarda quedar funcionando?", ""),
        ("¿Mis datos están seguros? ¿Quién más los ve?", ""),
        ("¿Sirve si vendo servicios y no productos?", ""),
    ]
    items = ""
    for i, (q, a) in enumerate(qs):
        items += f"""<div style="border-bottom:1px solid {LINE};padding:20px 0">
<button style="width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:0;color:{FG};font-family:Poppins,sans-serif;font-size:17px;font-weight:500;text-align:left;padding:0;cursor:pointer">{q}{ic("minus" if a else "plus", 18, MUT)}</button>
{f'<p class="mut" style="margin:12px 0 0;font-size:15px;line-height:1.6;max-width:640px">{a}</p>' if a else ""}</div>"""
    return f"""{header()}
<div style="position:absolute;left:160px;top:160px;width:360px"><h2 class="h" style="font-size:52px">Lo que nos <span class="t">preguntan.</span></h2>
<p class="mut" style="font-size:16px;margin:18px 0 26px">¿Tienes otra pregunta? Házsela a nuestro agente: atiende con Axi.</p>
<a href="#" class="btn btn-g">{ic("message-circle", 16)}Habla con nuestro agente</a></div>
<div style="position:absolute;left:620px;top:140px;width:680px">{items}</div>"""


def s17_cta() -> str:
    return f"""{spot(720, 420, 600, CORAL, .16)}{spot(900, 330, 420, VIOLET, .12)}
{ribbon("M -40 150 C 300 170, 500 330, 660 370", "h17a", opacity=.8)}
{ribbon("M 1480 150 C 1140 170, 940 330, 780 370", "h17b", opacity=.8)}
<div style="position:absolute;left:600px;top:220px;z-index:2">{isotype(240, 'cta', glow=True)}</div>
{header()}
<div style="position:absolute;left:0;top:500px;width:{W}px;text-align:center;z-index:3">
<h2 class="h" style="font-size:76px">Tu próxima venta <span class="t">ya está escribiendo.</span></h2>
<div style="display:flex;justify-content:center;gap:14px;margin-top:34px"><a href="#" class="btn btn-p" style="height:56px;padding:0 32px;font-size:16px">Prueba 7 días gratis</a><a href="#" class="btn btn-g" style="height:56px;padding:0 26px;font-size:16px">{ic("message-circle", 17)}Habla con nuestro agente</a></div>
<p class="dim" style="font-size:13.5px;margin:16px 0 0">Sin tarjeta. Tu cuenta queda lista hoy.</p></div>
<footer style="position:absolute;left:0;bottom:0;width:{W}px;height:64px;border-top:1px solid {LINE};display:flex;align-items:center;justify-content:space-between;padding:0 48px;font-size:12.5px;z-index:3" class="dim"><span>© 2026 KODECOL S.A.S · Axi Connect</span><span style="display:flex;gap:22px"><a href="#" style="color:{DIM};text-decoration:none">Términos</a><a href="#" style="color:{DIM};text-decoration:none">Privacidad</a><a href="#" style="color:{DIM};text-decoration:none">Contacto</a></span></footer>"""


# ------------------------------------------------------------------ móvil
def m_header() -> str:
    return f"""<header style="position:absolute;left:0;top:0;width:{MW}px;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;z-index:5">
<a href="#" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:{FG}" aria-label="axi connect">{isotype(26, 'mh')}<span class="nx" style="font-weight:700;font-size:17px">axi connect</span></a>
<a href="#" class="btn btn-p btn-sm" style="height:34px;padding:0 12px;font-size:12.5px;box-shadow:none">Prueba gratis</a></header>"""


def m_progress(p: float) -> str:
    return f'<div aria-hidden="true" style="position:absolute;left:16px;top:60px;width:{MW - 32}px;height:2px;background:rgba(237,237,237,.1);border-radius:2px;z-index:5"><div style="width:{p * 100:.0f}%;height:100%;background:linear-gradient(90deg,{CORAL},{AMBER},{VIOLET});border-radius:2px;box-shadow:0 0 10px rgba(251,113,133,.6)"></div></div>'


def m_hero() -> str:
    return f"""{spot(260, 300, 300, CORAL, .16)}
<div style="position:absolute;left:150px;top:96px;z-index:1;opacity:.95">{isotype(220, 'mhero', glow=True)}</div>
{floating_bubble(20, 120, "¿Precio del iPhone 17?", "respondido en 4 s", 0, .9)}
{floating_bubble(170, 300, "¿Hay cita el sábado?", "agendada", 1.5, .55)}
{m_header()}
<div style="position:absolute;left:16px;top:380px;width:{MW - 32}px;z-index:3">
<div class="chip" style="margin-bottom:18px;font-size:11px">{ic('message-circle', 12, GREEN)}Agentes de IA que venden por WhatsApp</div>
<h1 class="h" style="font-size:48px"><span class="t">Vende en</span><br>cada conversación.</h1>
<p class="mut" style="margin:16px 0 0;font-size:15.5px;line-height:1.55">Responde en segundos, cotiza con tus precios, cobra y te lleva a tu meta del mes.</p>
<a href="#" class="btn btn-p" style="width:100%;height:52px;margin-top:24px">Prueba 7 días gratis</a>
<a href="#" class="btn btn-g" style="width:100%;height:48px;margin-top:10px">{ic('message-circle', 16)}Habla con nuestro agente</a>
<p class="dim" style="margin:12px 0 0;font-size:12.5px;text-align:center">Sin tarjeta. Tu cuenta queda lista hoy.</p></div>"""


def m_niche() -> str:
    opts = [("utensils-crossed", "Restaurantes", "¿Tienen domicilio a Laureles?", False), ("smartphone", "Tecnología", "¿Tienen el iPhone 17 de 256?", True),
            ("sparkles", "Salud y belleza", "¿Hay cita para el sábado?", False), ("briefcase-business", "Servicios y B2B", "¿Me cotizas 200 cajas de guantes?", False)]
    cards = "".join(
        f'<button class="card" style="width:100%;border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:12px;text-align:left;color:{FG};font-family:Poppins,sans-serif;{"box-shadow:0 0 0 2px " + CORAL if s else ""}"><div class="bub bin" style="max-width:none">{m}</div><div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px">{ic(i, 16, FG)}{l}</div></button>'
        for i, l, m, s in opts
    )
    return f"""{m_header()}{m_progress(.04)}
<div style="position:absolute;left:16px;top:96px;width:{MW - 32}px;z-index:3"><h2 class="h" style="font-size:40px">¿Quién te <span class="t">escribe hoy?</span></h2>
<p class="mut" style="font-size:14.5px;margin:10px 0 20px">Elige y todo lo que sigue pasa en tu negocio.</p>
<div style="display:flex;flex-direction:column;gap:12px">{cards}</div></div>"""


def m_chat() -> str:
    inner = (
        bub("Hola, ¿tienen el iPhone 17 de 256?", False)
        + bub("¡Sí! Nos quedan 3 en tienda. Te comparto la foto.", True, "4 s")
        + f'<div style="align-self:flex-end;width:150px">{product_tile("iPhone 17 · 256 GB", "$ 4.899.000")}</div>'
        + bub("Me lo llevo. ¿Cómo pago?", False)
    )
    return f"""{spot(195, 560, 260, CORAL, .14)}{m_header()}{m_progress(.3)}
<div style="position:absolute;left:16px;top:88px;width:{MW - 32}px;z-index:3"><div class="eb" style="color:{CORAL};margin-bottom:10px">Vender</div><h2 class="h" style="font-size:34px">Responde en segundos. <span class="t">Con tus precios reales.</span></h2></div>
{phone(45, 300, inner, "Tecnología Medellín", "agente en línea", w=300, h=600)}
"""


def m_goal() -> str:
    scale, dx, dy = .34, -8, 330
    marks = ""
    vx, vy = point_at(.63, ROAD, scale, dx, dy)
    marks += f'<div style="position:absolute;left:{vx - 11:.0f}px;top:{vy - 11:.0f}px;width:22px;height:22px;border-radius:50%;background:{CORAL};box-shadow:0 0 0 4px rgba(10,10,10,.9),0 0 22px {CORAL};z-index:4"></div>'
    mx, my = point_at(1, ROAD, scale, dx, dy)
    marks += f'<div style="position:absolute;left:{mx - 12:.0f}px;top:{my - 30:.0f}px;width:24px;height:24px;border-radius:50% 50% 50% 3px;transform:rotate(-45deg);background:{FG};z-index:3"></div>'
    return f"""<div style="position:absolute;left:0;top:250px;width:{MW}px;height:360px;overflow:hidden">{city(MW, 360, seed=5, cell=46, gap=8)}</div>
{route_svg(MW, MH, scale, dx, dy, uid="mm")}{marks}
{m_header()}{m_progress(.9)}
<div style="position:absolute;left:16px;top:88px;width:{MW - 32}px;z-index:3"><div class="eb" style="color:{CORAL};margin-bottom:10px">Crecer</div><h2 class="h" style="font-size:34px">Tú pones la meta. <span class="t">Axi traza la ruta.</span></h2></div>
<div class="glass" style="position:absolute;left:16px;top:560px;width:{MW - 32}px;border-radius:22px;padding:16px;z-index:5;display:flex;flex-direction:column;gap:10px">
<div style="display:flex;justify-content:space-between;align-items:center"><span class="nx tn" style="font-size:20px;font-weight:700">$ 18,9 M · 63 %</span><span class="chip" style="color:{AMBER};height:24px;font-size:11px">Ritmo bajo</span></div>
<p style="margin:0;font-size:13.5px">Para llegar faltan $ 11,1 M: <strong>2 ventas al día</strong>.</p>
<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 11px;border-radius:12px;border:1px solid rgba(167,139,250,.55);background:rgba(167,139,250,.10);font-size:12.5px"><span>Retomar 14 cotizaciones frías</span><strong class="tn">91 %</strong></div>
<a href="#" class="btn btn-p" style="height:42px;font-size:14px;box-shadow:none">Tomar esta ruta · aprobar</a></div>"""


def m_cta() -> str:
    return f"""{spot(195, 300, 280, CORAL, .18)}
<div style="position:absolute;left:95px;top:130px;z-index:2">{isotype(200, 'mcta', glow=True)}</div>
{m_header()}
<div style="position:absolute;left:16px;top:400px;width:{MW - 32}px;text-align:center;z-index:3"><h2 class="h" style="font-size:40px">Tu próxima venta <span class="t">ya está escribiendo.</span></h2>
<a href="#" class="btn btn-p" style="width:100%;height:52px;margin-top:26px">Prueba 7 días gratis</a>
<a href="#" class="btn btn-g" style="width:100%;height:48px;margin-top:10px">{ic('message-circle', 16)}Habla con nuestro agente</a>
<p class="dim" style="font-size:12.5px;margin:12px 0 0">Sin tarjeta. Tu cuenta queda lista hoy.</p></div>"""


# ------------------------------------------------------------------ guion (notas del lienzo)
SCENES = [
    # (archivo, título, fn, fila, nota)
    ("Main.dc.html", "01 · Apertura", s01_hero, 0, "Carga: solo el hero y el motor. La α se arma con sus tres cintas (0,8 s, una vez). Al bajar, las burbujas se abren en profundidad (parallax por capas) y las cintas se desenrollan hacia abajo: ES la luz guía de toda la película. Reduced-motion: fotograma final quieto."),
    ("S02-quien-escribe.dc.html", "02 · ¿Quién te escribe hoy?", s02_niche, 0, "Escena fija (pin). Las 4 fichas entran en cascada; la cinta cruza por detrás y enciende la elegida. Elegir reescribe TODA la película en vivo (datos del nicho) y deja la píldora «Viendo como…». ?nicho= en la URL salta la pregunta. Sin elegir: negocio de ejemplo."),
    ("S03-radar.dc.html", "03 · Captar: el radar", s03_radar, 1, "Pin + scrub: el barrido gira con el scroll, aparecen negocios, uno se abre y sus fuentes se encienden una a una (Google Maps → sitio web → teléfono), el índice sube a 86 y aparece el Decisor. B2B: radar de negocios. Nichos de consumo: leads de anuncios Click-to-WhatsApp. Vocabulario del Decisor: verificar contra la rama del Radar antes de F-final."),
    ("S04-seguimiento.dc.html", "04 · Captar: nadie espera", s04_followup, 1, "Tramo HORIZONTAL: el scroll vertical desplaza la línea de tiempo de izquierda a derecha (carrito → plantilla → leída → respuesta → venta recuperada). La cinta es la propia línea. Honesto: plantilla aprobada por Meta, solo WhatsApp; se detiene cuando responde."),
    ("S05-chat.dc.html", "05 · Vender: el chat", s05_chat, 2, "El teléfono se fija y el scroll escribe la conversación burbuja por burbuja (el estilo que ya aprobaste). Remata la tarjeta «Venta pagada». Tecnología: producto SIN variantes. El pago lo verifica tu equipo."),
    ("S06-foto.dc.html", "06 · Vender: una foto basta", s06_photo, 2, "Transición: la foto del chat anterior vuela y se vuelve la captura. Un haz coral la escanea, el catálogo se ordena por similitud y el match se ilumina en violeta (IA). Es la escena de reconocimiento actual, llevada al escenario."),
    ("S07-llamada.dc.html", "07 · Vender: llama", s07_call, 2, "El aura respira solo mientras la escena está en pantalla. La transcripción aparece palabra a palabra con el scroll y las etapas del marco se encienden hasta Cierre → «Objetivo cumplido». Honesto: llamadas salientes; nada de entrantes."),
    ("S08-boveda.dc.html", "08 · Garantías: nunca inventa", s08_vault, 2, "Las garantías de la IA como escena de la película, no como sección aparte: la petición del cliente entra, choca con la bóveda y sale con el precio real. Los cuatro candados se cierran en secuencia."),
    ("S09-equipo.dc.html", "09 · Vender: entra tu equipo", s09_team, 2, "Los tres modos avanzan con el scroll (Axi atiende → En cola → Contigo); la línea de evento aparece y Laura responde. Cierra con «Devolver a Axi». Es el inbox real en su tema oscuro."),
    ("S10-cobro.dc.html", "10 · Cobrar", s10_collect, 3, "El medidor se llena tramo a tramo (anticipo, cuota), el recordatorio llega como conversación, la promesa pausa los avisos y el recibo sale en PDF. Honesto: Cobros se enciende por nicho; se muestra con el lenguaje de «tu equipo verifica»."),
    ("S11-pipeline.dc.html", "11 · Ordenar: el pipeline", s11_pipeline, 3, "La tarjeta «La abrió Axi» salta de Propuesta a Compromiso con un spring; la cita del sábado se asienta en su hueco con su recordatorio. CRM + agenda en una sola escena."),
    ("S12-meta.dc.html", "12 · Crecer: la meta es un mapa", s12_goal, 3, "EL CLÍMAX. La cinta de luz que guió toda la película aterriza y se vuelve la carretera. Con el scroll: el disco «Vas aquí» avanza, aparece el tramo ámbar, Axi propone otra ruta y la llegada salta de 82 % a 91 %. Es RouteMap real (tipo Waze), cifras coherentes: 63 % de 30 M = 18,9 M."),
    ("S13-axel.dc.html", "13 · Crecer: cada mañana, un plan", s13_axel, 3, "El informe de Axel se escribe y se convierte en tarjetas de propuesta (monocromas, como /comercial). «Nada sale sin tu aprobación» siempre visible."),
    ("S14-medir.dc.html", "14 · Medir", s14_measure, 3, "Las barras del embudo crecen y los números cuentan hacia arriba (una vez). La cinta termina de caer en «$ 48,6 M». Cifras de ejemplo marcadas como tales."),
    ("S15-precios.dc.html", "15 · Precios", s15_pricing, 4, "Fuera de la película: el escenario se asienta. Cifras reales del catálogo público (ISR); aquí van las del fixture. Todos los CTA → /comenzar?plan=…&nicho=…"),
    ("S16-faq.dc.html", "16 · Preguntas", s16_faq, 4, "Acordeón sobrio. Sigue emitiendo FAQPage (JSON-LD): el copy llega a Google."),
    ("S17-cierre.dc.html", "17 · Cierre", s17_cta, 4, "Las dos cintas vuelven y se cierran en la α: la película termina donde empezó. Segundo y último CTA grande."),
    ("M01-hero.dc.html", "Móvil · Apertura", m_hero, 5, "Misma película, vertical y más corta: sin tramos horizontales, escenas de una pantalla, la guía pasa a ser la barra de progreso bajo la cabecera."),
    ("M02-quien.dc.html", "Móvil · ¿Quién te escribe?", m_niche, 5, "Fichas en columna, tocables a 44 px+."),
    ("M05-chat.dc.html", "Móvil · El chat", m_chat, 5, "El teléfono ocupa la pantalla; el scroll escribe la conversación."),
    ("M12-meta.dc.html", "Móvil · La meta", m_goal, 5, "Mapa recortado y panel de navegación como hoja inferior."),
    ("M17-cierre.dc.html", "Móvil · Cierre", m_cta, 5, "CTA a todo el ancho."),
]

ROWS = [
    ("Apertura · lo entiendes en 5 segundos", "orange"),
    ("Captar · te encuentran y nadie espera", "orange"),
    ("Vender · el chat, la foto, la llamada, las reglas y tu equipo", "pink"),
    ("Cobrar, ordenar, crecer y medir · el mapa es el clímax", "purple"),
    ("Después de la película · precios, preguntas y cierre", "gray"),
    ("Móvil · la misma película, adaptada (390 px)", "blue"),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    row_y = [i * 1780 for i in range(len(ROWS))]
    per_row: dict[int, int] = {}
    boards, order, notes = {}, [], {}
    for fname, title, fn, row, note in SCENES:
        mobile = fname.startswith("M") and fname[1].isdigit()
        w, h = (MW, MH) if mobile else (W, H)
        col = per_row.get(row, 0)
        per_row[row] = col + 1
        x = col * (w + 80)
        y = row_y[row]
        (OUT / fname).write_text(page(title, fn(), w, h))
        boards[fname] = {"x": x, "y": y, "w": w, "h": h, "title": title}
        order.append(fname)
        nid = "n" + fname.split(".")[0].replace("-", "_")
        notes[nid] = {"x": x, "y": y + h + 40, "text": note, "w": w if not mobile else 390, "maxH": 330, "fill": ROWS[row][1], "size": "m"}
    for i, (t, _) in enumerate(ROWS):
        widths = [boards[f]["x"] + boards[f]["w"] for f, *_ in SCENES if f in boards and boards[f]["y"] == row_y[i]]
        notes[f"row{i}"] = {"x": 0, "y": row_y[i] - 300, "text": t, "kind": "title1", "maxW": max(widths)}
    canvas = {
        "v": 3,
        "createdOnFiles": {"v": 1, "at": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
        "title": "Landing cinematográfica · Storyboard",
        "launch": {"view": "canvas"},
        "pages": [],
        "boards": boards,
        "order": order,
        "notes": notes,
        "designSystems": [],
    }
    (OUT / "canvas.json").write_text(json.dumps(canvas, ensure_ascii=False, indent=1))
    IC.save()
    print(f"{len(boards)} artboards → {OUT}")


if __name__ == "__main__":
    main()
