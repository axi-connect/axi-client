#!/usr/bin/env python3
"""Mockup «El negocio» en la ficha del contacto (plan `captacion_enriquecimiento_al_contacto.md`, Fase 1).

Lo que la Captación encuentra de un negocio (web, redes, categoría, NIT, ficha de Google Maps) ya
llega al contacto (servidor `feat/captacion-enriquecimiento-contacto`, b3ef156f), pero hoy esas
claves caen en «N claves técnicas» de «Datos del cliente»: invisibles. Este mockup les da su lugar.

Dónde: Contacto 360, columna derecha, primera tarjeta (encima del Copiloto): es identidad del
negocio, se consulta antes de escribirle o llamarlo. En el rail del Inbox, una fila de accesos.

Reglas que el mockup respeta:
- La ficha es LISTA, no tabla; cada fila: icono, etiqueta, valor (corte con difuminado + title) y
  acciones (abrir, copiar, corregir).
- Solo se pintan las filas con dato; sin ningún dato del negocio la tarjeta no aparece.
- La procedencia va al lado («según Google Maps y su web · Captación»), no en un tooltip.
- Corregir un dato lo PROTEGE: la Captación ya no lo vuelve a cambiar (mismo modelo que «Datos del
  cliente»).
- Esas claves dejan de salir en «claves técnicas».

Vistas: completo · parcial (la captación sigue buscando) · corrigiendo · rail del Inbox · móvil.

Uso:  python3 crm-contact-business.build.py
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("crm-contact-business")
ic, btn, badge = K.ic, K.btn, K.badge

K.extra_css = """
.c360-head{display:flex;align-items:center;gap:16px;margin-bottom:18px}
.avatar{width:56px;height:56px;border-radius:999px;display:grid;place-items:center;font-weight:600;font-size:18px;background:var(--muted);color:var(--muted-foreground);flex:none}
.c360-head h1{margin:0;font-size:26px;line-height:1.15}
.c360-head .meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;align-items:center}
.cols{display:grid;gap:16px;grid-template-columns:1fr}
@media (min-width:1180px){.cols{grid-template-columns:minmax(0,1fr) minmax(20rem,24rem)}}
.cols>*{min-width:0}
.ghost-card{border:1px dashed var(--border);border-radius:24px;padding:18px;color:var(--muted-foreground);font-size:13px}
.biz h2{display:flex;align-items:center;gap:8px}
.biz .lead{margin-bottom:12px}
.biz-sec{margin-top:6px}
.biz-sec h3{font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted-foreground);margin:14px 0 6px}
.biz-list{list-style:none;margin:0;padding:0;display:grid}
.biz-row{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border-soft)}
.biz-row .txt{min-width:0;display:grid;gap:1px}
.biz-row:first-child{border-top:0}
.biz-row .ico{color:var(--muted-foreground);display:grid;place-items:center}
.biz-row .lab{font-size:11.5px;color:var(--muted-foreground);line-height:1.3}
.biz-row .val{font-size:13.5px;min-width:0;white-space:nowrap;overflow:hidden;-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 2rem),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 2rem),transparent)}
.biz-row .val.fits{-webkit-mask-image:none;mask-image:none}
.biz-row .val a{color:var(--foreground);text-decoration:underline;text-decoration-color:var(--border);text-underline-offset:3px}
.biz-row .acts{display:flex;gap:2px}
.iconbtn{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--muted-foreground);background:transparent;border:0}
.iconbtn:hover{background:var(--muted);color:var(--foreground)}
.prot{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--muted-foreground);margin-left:8px;vertical-align:-1px}
.prov{margin-top:14px;font-size:12px;color:var(--muted-foreground);display:flex;gap:6px;align-items:flex-start}
.prov details{margin-top:4px}
.prov summary{cursor:pointer;text-decoration:underline;text-decoration-color:var(--border);text-underline-offset:3px;list-style:none}
.prov summary::-webkit-details-marker{display:none}
.orig{margin-top:6px;font-size:12px;color:var(--foreground);background:var(--muted);border-radius:12px;padding:8px 10px;overflow-wrap:anywhere}
.searching{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted-foreground);margin-top:12px}
.pulse{width:8px;height:8px;border-radius:999px;background:var(--axi-violet,#7c3aed);opacity:.7}
.edit-row{grid-template-columns:20px minmax(0,1fr)}
.edit-row .form-inline{display:grid;gap:8px}
.edit-row .acts2{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.rail-demo{max-width:360px;border:1px solid var(--border);border-radius:20px;padding:16px;background:var(--card)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:999px;padding:5px 10px;font-size:12.5px;color:var(--foreground);max-width:100%;min-width:0}
.chip span{overflow:hidden;white-space:nowrap;min-width:0}
"""

NAME = "Almejatours"
ORIGINAL = "Agencia de viajes en Bogotá Almejatours | Asesoría y diseño de viajes personalizados | Vuelos | Alojamientoss"
LONG_SITE = "www.agencia-de-viajes-almejatours-colombia.com.co"


def row(icon: str, label: str, value: str, href: bool = True, protected: bool = False, fits: bool = False) -> str:
    val = f'<a href="#" title="{value}">{value}</a>' if href else f'<span title="{value}">{value}</span>'
    prot = f'<span class="prot">{ic("lock", size=12)}corregido</span>' if protected else ""
    return f"""<li class="biz-row">
      <span class="ico" aria-hidden="true">{ic(icon, size=16)}</span>
      <span class="txt"><span class="lab">{label}{prot}</span><span class="val {'fits' if fits else ''}">{val}</span></span>
      <span class="acts"><button class="iconbtn" aria-label="Copiar {label}">{ic("copy", size=15)}</button><button class="iconbtn" aria-label="Corregir {label}">{ic("pencil", size=15)}</button></span>
    </li>"""


def provenance(full: bool = True) -> str:
    original = (
        f"""<details><summary>Nombre en Google Maps</summary><div class="orig">{ORIGINAL}</div></details>"""
        if full
        else ""
    )
    return f"""<div class="prov">{ic("map-pin", size=14)}<div>Según Google Maps y su web · Captación, 22 nov.{original}</div></div>"""


def business_card(state: str) -> str:
    if state == "partial":
        web = [
            row("globe", "Sitio web", "turismauro.com", fits=True),
        ]
        ficha = [
            row("tag", "Categoría", "Agencia de viajes", href=False, fits=True),
            row("map", "Google Maps", "Abrir su ficha en Maps", fits=True),
        ]
        extra = f'<div class="searching"><span class="pulse"></span>La captación sigue buscando sus redes; aparecen aquí solas.</div>'
        prov = provenance(full=False)
    else:
        insta = (
            row("instagram", "Instagram", "@almeja_oficial", protected=True, fits=True)
            if state == "corrected"
            else row("instagram", "Instagram", "@almejatours", fits=True)
        )
        web = [
            row("globe", "Sitio web", LONG_SITE),
            insta,
            row("facebook", "Facebook", "facebook.com/almejatours", fits=True),
            row("music-2", "TikTok", "@almeja.viajes", fits=True),
            row("message-circle", "WhatsApp", "+57 300 314 8451", fits=True),
        ]
        ficha = [
            row("tag", "Categoría", "Agencia de viajes", href=False, fits=True),
            row("hash", "NIT", "900.123.456-7", href=False, fits=True),
            row("map", "Google Maps", "Abrir su ficha en Maps", fits=True),
        ]
        extra = ""
        prov = provenance()
    if state == "editing":
        web[1] = f"""<li class="biz-row edit-row">
          <span class="ico" aria-hidden="true">{ic("instagram", size=16)}</span>
          <div class="form-inline">
            {K.field("Instagram", K.input("@almeja_oficial", fid="biz-ig"), hint="Al guardar queda protegido: la captación ya no lo cambia.", fid="biz-ig")}
            <div class="acts2">{btn("Cancelar", cls="ghost")}{btn("Guardar")}</div>
          </div>
        </li>"""
    return f"""<section class="card biz" aria-labelledby="biz-title">
      <h2 id="biz-title">{ic("store", size=18)} El negocio</h2>
      <p class="lead small">Lo que encontró la captación. Se completa solo; lo que corrijas se respeta.</p>
      <div class="biz-sec"><h3>En internet</h3><ul class="biz-list">{''.join(web)}</ul></div>
      <div class="biz-sec"><h3>Ficha</h3><ul class="biz-list">{''.join(ficha)}</ul></div>
      {extra}
      {prov}
    </section>"""


def header(name: str = NAME) -> str:
    return f"""
    {K.crumb("CRM", "Contactos", name)}
    <div class="c360-head">
      <div class="avatar" aria-hidden="true">{name[:2].upper()}</div>
      <div style="min-width:0">
        <h1>{name}</h1>
        <div class="meta">{badge("Lead", "outline")}{badge("De captación", "outline", icon="radar")}<span class="muted small">{"Bogotá · +57 300 314 8451 · reservas@almejatours.com" if name == NAME else "Bogotá · +57 317 326 3282"}</span></div>
      </div>
    </div>
    <div class="ghost-card" style="margin-bottom:16px">Bento del contacto (recorrido, puntaje, valor, lo próximo) · sin cambios</div>"""


def page(state: str, name: str = NAME) -> str:
    return f"""<div class="page">{header(name)}
    <div class="cols">
      <div class="stack">
        <section class="card"><h2>Datos del cliente</h2><p class="lead">Lo que recopilaron el agente, el equipo o un formulario, con su origen y verificación (sin cambios). La web, las redes y la ficha del negocio <b>ya no</b> aparecen aquí como «claves técnicas»: viven en «El negocio».</p></section>
        <div class="ghost-card">Historial del contacto · sin cambios</div>
      </div>
      <div class="stack">
        {business_card(state)}
        <div class="ghost-card">Copiloto · sin cambios</div>
        <div class="ghost-card">Etiquetas · Oportunidades · Pedidos · sin cambios</div>
      </div>
    </div></div>"""


def view_rail() -> str:
    chip = lambda icon, text: f'<a href="#" class="chip" title="{text}">{ic(icon, size=14)}<span>{text}</span></a>'
    return f"""<div class="page">
      <p class="lead" style="margin-bottom:14px">Inbox · panel de contexto del contacto (derecha de la conversación).</p>
      <div class="rail-demo">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="avatar" style="width:44px;height:44px;font-size:15px">AL</div>
          <div style="min-width:0"><b style="display:block">{NAME}</b><span class="muted small">Lead · De captación</span></div>
        </div>
        <div class="chips" aria-label="El negocio en internet">
          {chip("globe", "almejatours.com")}{chip("instagram", "@almejatours")}{chip("facebook", "Facebook")}{chip("map", "Maps")}
        </div>
        <p class="muted small" style="margin-top:10px">Un toque abre la web o la red en otra pestaña. La ficha completa, en el contacto.</p>
      </div>
    </div>"""


def view_mobile() -> str:
    return f"""<div class="page" style="padding:12px 16px 40px">
      {K.crumb("Contactos", NAME)}
      <div class="c360-head"><div class="avatar" aria-hidden="true">AL</div><div style="min-width:0"><h1 style="font-size:22px">{NAME}</h1><div class="meta">{badge("Lead", "outline")}</div></div></div>
      {business_card("full")}
    </div>"""


VIEWS = [
    ("completo", "1 · Completo", page("full"), "Primera tarjeta de la columna derecha del Contacto 360: «El negocio», con «En internet» (web, Instagram, Facebook, TikTok, WhatsApp) y «Ficha» (categoría, NIT, Google Maps). Cada fila abre, copia o corrige. El sitio largo se corta con difuminado y el title lo muestra completo. Abajo, de dónde salió y el nombre tal como venía de Google Maps."),
    ("parcial", "2 · Parcial", page("partial", "Turismauro"), "Solo se pintan las filas con dato. Si el enriquecimiento sigue corriendo, una línea lo dice: las redes aparecen solas cuando llegan (el servidor ya completa el contacto tras promover)."),
    ("corrigiendo", "3 · Corrigiendo", page("editing"), "Corregir abre la fila en línea (sin modal). Al guardar, el dato queda protegido: la captación nunca lo vuelve a cambiar."),
    ("corregido", "4 · Corregido", page("corrected"), "Un dato corregido por el equipo lleva «corregido» con candado al lado."),
    ("rail", "5 · Inbox", view_rail(), "En el panel del contacto del Inbox, una fila de accesos: quien atiende abre la web o el Instagram del negocio sin salir de la conversación."),
    ("movil", "6 · Móvil", view_mobile(), "A 390 px la tarjeta va a lo ancho; las acciones de cada fila se mantienen y el valor se corta con difuminado."),
]

if __name__ == "__main__":
    K.build_html("El negocio en la ficha", "Mockup F0 · no es producto", "Captación · lo que se sabe del negocio, en el contacto", VIEWS)
    K.ic.save()
