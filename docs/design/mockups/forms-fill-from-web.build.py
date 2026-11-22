#!/usr/bin/env python3
"""Mockup «Completar con la web del negocio» (plan `captacion_enriquecimiento_al_contacto.md`, Fase 2).

El servidor ya sabe llenar el formulario de captura de un contacto con lo que dice la web del
negocio (rama `feat/captacion-formulario-ia`, a53a8f4c): solo huecos, nada personal, cita literal de
la página y confianza ≥ 0,6. El ajuste (`settings.prospecting.fill_form_from_web`) nace APAGADO y hoy
solo se cambia por el conector. Este mockup le da su interruptor.

Dónde: Configuración › Automatización › Formularios de captura, pestaña «Datos del cliente», entre la
barra del flujo y la lista de datos. Es ahí donde se decide QUÉ datos pide el formulario, así que es
ahí donde se entiende cuáles puede leer una web. No va en las pestañas de pedido ni de cita: esos
formularios no se llenan desde la web.

Reglas que respeta:
- El interruptor guarda AL INSTANTE (es un ajuste de Captación, no parte del borrador del
  formulario): no entra al «Guardar cambios» ni a la barra de cambios sin guardar.
- Dice qué datos podría leer y cuáles nunca (personales), con la MISMA regla del servidor.
- Dice lo que no hace: no pisa lo que dijo el cliente o el equipo; deja la frase de donde salió;
  cuesta una consulta pequeña de IA por negocio.
- Sin permiso de Captación (`leads:manage`) se ve el estado pero no se cambia.

Vistas: apagado · encendido · nada que leer · sin permiso · en el contacto · móvil.

Uso:  python3 forms-fill-from-web.build.py
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("forms-fill-from-web")
ic, btn, badge = K.ic, K.btn, K.badge

K.extra_css = """
.ph-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.ph-head h1{margin:0;font-size:30px;letter-spacing:-.02em;line-height:1.15}
.ai-badge{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:999px;background:color-mix(in oklab,var(--primary) 12%,transparent);color:var(--primary)}
.ph-desc{margin:4px 0 0;max-width:42rem;font-size:14px;color:var(--muted-foreground)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin:20px 0 16px;overflow-x:auto}
.tabs a{display:inline-flex;align-items:center;gap:6px;padding:9px 12px;font-size:14px;color:var(--muted-foreground);text-decoration:none;border-bottom:2px solid transparent;white-space:nowrap}
.tabs a[aria-current]{color:var(--foreground);border-color:var(--foreground);font-weight:500}
.tabs .count{font-size:12px;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.toolbar p{margin:0;font-size:14px;color:var(--muted-foreground)}
.toolbar .r{display:flex;align-items:center;gap:8px;font-size:14px}
.iconbtn{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:var(--muted-foreground);background:transparent;border:0}

/* La tarjeta nueva */
.web{border:1px solid var(--border);border-radius:24px;background:var(--card);padding:18px 20px;margin-bottom:16px}
.web-top{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:14px;align-items:start}
.web-tile{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--muted);color:var(--foreground)}
.web.on .web-tile{background:color-mix(in oklab,var(--primary) 14%,transparent);color:var(--primary)}
.web h2{margin:0;font-size:15.5px;font-weight:600;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.web .sub{margin:3px 0 0;font-size:13.5px;color:var(--muted-foreground);max-width:46rem}
.web .sw-wrap{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted-foreground);padding-top:6px}
.web-body{margin:16px 0 0 54px;display:grid;gap:14px}
.web-split{display:grid;gap:14px;grid-template-columns:1fr}
@media (min-width:900px){.web-split{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}}
.web-split>*{min-width:0}
.web h3{margin:0 0 8px;font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-foreground)}
.fchips{display:flex;flex-wrap:wrap;gap:6px}
.fchip{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:5px 10px;border-radius:999px;border:1px solid var(--border);font-size:13px;background:var(--background)}
.fchip span{min-width:0;white-space:nowrap;overflow:hidden}
.fchip.personal{color:var(--muted-foreground);background:transparent;border-style:dashed}
.fchip svg{flex:none;color:var(--muted-foreground)}
.promises{list-style:none;margin:0;padding:12px 0 0;border-top:1px solid var(--border-soft);display:grid;gap:6px}
.promises li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px;font-size:13px;color:var(--muted-foreground);align-items:start}
.promises svg{margin-top:1px;color:var(--foreground)}
.web .summary{margin:10px 0 0 54px;font-size:13px;color:var(--muted-foreground);display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
.linkbtn{background:none;border:0;padding:0;font:inherit;color:var(--foreground);text-decoration:underline;text-decoration-color:var(--border);text-underline-offset:3px;cursor:pointer}
@media (max-width:640px){.web{padding:16px}.web-top{grid-template-columns:36px minmax(0,1fr)}.web-top .sw-wrap{grid-column:1/-1;padding:0}.web-body,.web .summary{margin-left:0}.web-tile{width:36px;height:36px}}

/* Lista de datos (réplica de FieldMasterList) */
.grid2{display:grid;gap:16px;grid-template-columns:1fr}
@media (min-width:1024px){.grid2{grid-template-columns:300px minmax(0,1fr)}}
.grid2>*{min-width:0}
.mlist{border:1px solid var(--border);border-radius:20px;background:var(--background);padding:8px}
.mlist .hd{display:flex;justify-content:space-between;align-items:baseline;padding:4px 8px 6px}
.mlist .hd b{font-size:11.5px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground)}
.mlist ol{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.mrow{display:grid;grid-template-columns:16px 16px minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 8px;border-radius:10px;font-size:14px}
.mrow.sel{background:var(--muted);font-weight:500}
.mrow .n{font-size:12px;color:var(--muted-foreground);text-align:right;font-variant-numeric:tabular-nums}
.mrow .t{color:var(--muted-foreground);display:grid;place-items:center}
.mrow .lbl{min-width:0;white-space:nowrap;overflow:hidden;-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 1.5rem),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 1.5rem),transparent)}
.mrow .opt{font-size:11px;color:var(--muted-foreground)}
.mrow .req{font-size:11px;font-weight:500;padding:1px 7px;border-radius:999px;background:var(--muted)}
.mrow .wb{width:16px;display:grid;place-items:center;color:var(--primary)}
.mlist .ft{padding:8px 8px 2px;font-size:12px;color:var(--muted-foreground)}
.detail{border:1px solid var(--border);border-radius:20px;background:var(--background);padding:22px}
.detail .ghost{border:1px dashed var(--border);border-radius:14px;padding:14px;color:var(--muted-foreground);font-size:13px}
.detail h3{margin:0 0 4px;font-size:17px}
.webline{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--muted-foreground);margin:14px 0}
.webline svg{flex:none;margin-top:1px;color:var(--primary)}

/* Toast */
.page{position:relative}
.mk-toast{position:absolute;height:auto;z-index:5;top:176px;right:24px;max-width:24rem;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--card);box-shadow:0 10px 30px -12px rgb(0 0 0 / .25);font-size:13.5px}
.mk-toast svg{flex:none;color:var(--success,#16a34a);margin-top:1px}

/* Ficha del contacto */
.cd{border:1px solid var(--border);border-radius:24px;background:var(--card);padding:18px 20px;max-width:44rem}
.cd h2{margin:0 0 2px;font-size:16px}
.cd .grp{margin:14px 0 4px;font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-foreground)}
.cdrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:10px 0;border-top:1px solid var(--border-soft)}
.cdrow .k{font-size:12px;color:var(--muted-foreground)}
.cdrow .v{font-size:14.5px;font-weight:500}
.cdrow .m{grid-column:1/-1;font-size:12px;color:var(--muted-foreground);display:flex;flex-wrap:wrap;gap:2px 6px;align-items:center}
.cdrow .m .dot-sep::before{content:"·";margin-right:6px}
.cdrow .m .quote-line{flex-basis:100%;color:var(--foreground)}
.cdrow .acts{display:flex;gap:2px;align-self:start}
.webmark{display:inline-flex;align-items:center;gap:4px;color:var(--primary);font-weight:500}
"""

TYPE_ICON = {
    "text": "type",
    "select": "list",
    "number": "hash",
    "boolean": "toggle-left",
    "phone": "phone",
    "date": "calendar",
    "email": "mail",
}

# El formulario de registro sugerido para Axi (plan §2, Fase 2, punto 7) + los dos datos personales de siempre.
FIELDS = [
    ("Nombre", "text", True, False),
    ("Celular", "phone", True, False),
    ("Tipo de negocio", "select", False, True),
    ("Número de sedes", "number", False, True),
    ("¿Vende por Instagram?", "boolean", False, True),
    ("¿Tiene tienda en línea?", "boolean", False, True),
    ("Herramienta de agenda o reservas", "text", False, True),
    ("Horario de atención", "text", False, True),
]
WEBBY = [f for f in FIELDS if f[3]]
PERSONAL = [f for f in FIELDS if not f[3]]


def chip(label: str, kind: str, personal: bool = False) -> str:
    lead = ic("lock", size=13) if personal else ic(TYPE_ICON[kind], size=13)
    return f'<span class="fchip {"personal" if personal else ""}" title="{label}">{lead}<span>{label}</span></span>'


def promises() -> str:
    items = [
        ("shield-check", "Solo llena datos <b>vacíos</b>: nunca cambia lo que dijo el cliente, lo que anotó tu agente o lo que escribió tu equipo."),
        ("quote", "Cada dato guarda la <b>frase de su web</b> de donde salió. Si la web no lo dice con claridad, se queda vacío y tu agente lo pregunta."),
        ("gauge", "Una consulta pequeña de IA por negocio (lee su portada y «nosotros»), como mucho una vez al mes. Cuenta en tu consumo de IA."),
    ]
    lis = "".join(f"<li>{ic(i, size=15)}<span>{t}</span></li>" for i, t in items)
    return f'<ul class="promises">{lis}</ul>'


def web_card(state: str) -> str:
    on = state in ("on", "noperm")
    disabled = state == "noperm"
    sw_label = "Encendido" if on else "Apagado"
    sub = (
        "Cuando Captación pasa un negocio a tus contactos, Axi lee su página web y llena los datos de este "
        "formulario que la web diga con claridad."
    )
    noperm = (
        f'<p class="muted small" style="margin:8px 0 0">{ic("lock", size=13)} Solo quien administra Captación puede cambiarlo.</p>'
        if disabled
        else ""
    )
    top = f"""
    <div class="web-top">
      <div class="web-tile">{ic("globe", size=20)}</div>
      <div style="min-width:0">
        <h2>Completar con la web del negocio <span class="ai-badge">{ic("sparkles", size=12)}IA</span></h2>
        <p class="sub">{sub}</p>{noperm}
      </div>
      <div class="sw-wrap">{K.switch(on, disabled=disabled, label="Completar con la web del negocio")}<span>{sw_label}</span></div>
    </div>"""

    if state == "off":
        return f"""<section class="web" aria-labelledby="web-h">{top}
      <p class="summary">{ic("globe", size=14)}<span><b style="color:var(--foreground)">{len(WEBBY)} de tus {len(FIELDS)} datos</b> se pueden leer en una web. {len(PERSONAL)} solo los da el cliente.</span>
        <button class="linkbtn">Ver cuáles</button></p>
    </section>"""

    if state == "empty":
        return f"""<section class="web" aria-labelledby="web-h">
    <div class="web-top">
      <div class="web-tile">{ic("globe", size=20)}</div>
      <div style="min-width:0">
        <h2>Completar con la web del negocio <span class="ai-badge">{ic("sparkles", size=12)}IA</span></h2>
        <p class="sub">{sub}</p>
      </div>
      <div class="sw-wrap">{K.switch(True, label="Completar con la web del negocio")}<span>Encendido</span></div>
    </div>
    <div class="web-body">
      {K.notice("info", "<b>Ninguno de estos datos se puede leer en una web.</b> Nombre y celular son de la persona que te escribe. Añade datos de su negocio —tipo de negocio, número de sedes, si vende en línea— y Axi los completará con su web.", acts=btn("Añadir un dato", "plus", "outline sm"))}
      <div><h3>Siempre los da el cliente · 2</h3><div class="fchips">{chip("Nombre", "text", True)}{chip("Celular", "phone", True)}</div></div>
    </div>
    </section>"""

    webby = "".join(chip(label, kind) for label, kind, _, _ in WEBBY)
    personal = "".join(chip(label, kind, True) for label, kind, _, _ in PERSONAL)
    return f"""<section class="web on" aria-labelledby="web-h">{top}
    <div class="web-body">
      <div class="web-split">
        <div><h3>Puede leerlos en su web · {len(WEBBY)}</h3><div class="fchips">{webby}</div></div>
        <div><h3>Siempre los da el cliente · {len(PERSONAL)}</h3><div class="fchips">{personal}</div></div>
      </div>
      {promises()}
    </div>
    </section>"""


def master_list(on: bool, fields=FIELDS, selected: int = 3) -> str:
    rows = []
    for i, (label, kind, req, webby) in enumerate(fields, start=1):
        tag = '<span class="req">Obligatorio</span>' if req else '<span class="opt">Opcional</span>'
        rows.append(
            f'<li class="mrow {"sel" if i == selected else ""}"><span class="n">{i}</span><span class="t">{ic(TYPE_ICON[kind], size=15)}</span>'
            f'<span class="lbl" title="{label}">{label}</span>{tag}</li>'
        )
    req = sum(1 for f in fields if f[2])
    return f"""<div class="mlist">
      <div class="hd"><b>Datos que pide</b><span class="muted small">{len(fields)} de 8</span></div>
      <ol>{''.join(rows)}</ol>
      <p class="ft">{req} de {len(fields)} son obligatorios</p>
    </div>"""


def detail(on: bool, label: str = "Número de sedes", meta: str = "Número · Opcional") -> str:
    web = (
        f'<p class="webline">{ic("globe", size=15)}<span>Axi lo completa con la web del negocio cuando la web lo dice. Si no, tu agente lo pregunta.</span></p>'
        if on
        else ""
    )
    return f"""<div class="detail">
      <h3>{label}</h3><p class="muted small" style="margin:0">{meta}</p>
      {web}
      <div class="ghost">Panel del dato (nombre, tipo, obligatorio, indicación para la IA) · sin cambios</div>
    </div>"""


def page(state: str, toast: bool = False) -> str:
    on = state in ("on", "noperm")
    fields = FIELDS if state != "empty" else PERSONAL
    t = (
        f'<div class="mk-toast" role="status">{ic("circle-check", size=18)}<div><b>Listo.</b> Axi completará estos datos con la web de cada negocio que pase a tus contactos.</div></div>'
        if toast
        else ""
    )
    return f"""<div class="page">
      {K.crumb("Configuración", "Automatización", "Formularios de captura")}
      <div class="ph-head"><h1>Formularios de captura</h1><span class="ai-badge">{ic("sparkles", size=12)}IA</span></div>
      <p class="ph-desc">Tu agente pide estos datos por WhatsApp antes de cerrar. Si falta uno obligatorio, no cierra la venta.</p>
      <nav class="tabs" aria-label="Formularios">
        <a href="#" aria-current="page">Datos del cliente <span class="count">{len(fields)}</span></a>
        <a href="#">Datos del pedido <span class="count">3</span></a>
        <a href="#">Datos de la cita <span class="count">0</span></a>
      </nav>
      <div class="toolbar"><p>Antes de registrar al cliente, tu agente pedirá estos datos.</p>
        <div class="r">{K.switch(True, label="Formulario activo")}<span>Activo</span><button class="iconbtn" aria-label="Más acciones">{ic("ellipsis", size=16)}</button></div></div>
      {t}
      {web_card(state)}
      <div class="grid2">{master_list(on, fields, 3 if state != "empty" else 1)}{detail(on) if state != "empty" else detail(False, "Nombre", "Texto · Obligatorio")}</div>
    </div>"""


def view_contact() -> str:
    def row(k: str, v: str, meta: str) -> str:
        acts = f'<span class="acts"><button class="iconbtn" aria-label="Confirmar" style="width:28px;height:28px">{ic("check", size=15)}</button><button class="iconbtn" aria-label="Corregir" style="width:28px;height:28px">{ic("pencil", size=15)}</button></span>'
        return f'<div class="cdrow"><div><div class="k">{k}</div><div class="v">{v}</div></div>{acts}<div class="m">{meta}</div></div>'

    web = lambda quote, when="hace 2 h": (
        f'<span class="webmark">{ic("globe", size=13)}De su web</span><span class="dot-sep">{when}</span>'
        f'<span class="quote-line">«{quote}»</span>'
    )
    agent = f'<span class="webmark" style="color:var(--foreground)">{ic("sparkles", size=13)}Agente IA</span><span class="dot-sep">ayer</span>'
    return f"""<div class="page">
      {K.crumb("CRM", "Contactos", "Spa Lumbre")}
      <p class="lead" style="margin:6px 0 14px">Contacto 360 · «Datos del cliente». Lo que llenó la web lleva «De su web» y la frase exacta de la página; se confirma o corrige como cualquier dato (corregirlo lo protege).</p>
      <section class="cd">
        <h2>Datos del cliente</h2>
        <p class="muted small" style="margin:0">Lo que recopilaron el agente, el equipo, un formulario o su web.</p>
        <div class="grp">Registro</div>
        {row("Nombre", "Laura Gómez", agent)}
        {row("Tipo de negocio", "Clínica estética", web("Somos un spa de bienestar y estética facial"))}
        {row("Número de sedes", "3", web("con 3 sedes en Bogotá"))}
        {row("¿Vende por Instagram?", "Sí", web("Compra bonos de regalo por nuestro Instagram @spalumbre"))}
        {row("Herramienta de agenda o reservas", "Agenda Pro", web("Agenda tu cita en línea con Agenda Pro"))}
        <div class="cdrow"><div><div class="k">¿Tiene tienda en línea?</div><div class="v muted" style="font-weight:400">Sin dato</div></div><span></span><div class="m">Opcional · aún no se ha pedido</div></div>
      </section>
    </div>"""


def view_mobile() -> str:
    return f"""<div class="page" style="padding:12px 16px 40px">
      {K.crumb("Formularios de captura")}
      <nav class="tabs" aria-label="Formularios" style="margin-top:8px">
        <a href="#" aria-current="page">Datos del cliente <span class="count">8</span></a><a href="#">Datos del pedido <span class="count">3</span></a><a href="#">Datos de la cita</a>
      </nav>
      {web_card("on")}
      {master_list(True)}
    </div>"""


VIEWS = [
    ("apagado", "1 · Apagado", page("off"), "Así nace: apagado. Pestaña «Datos del cliente», entre la barra del formulario y la lista. Una línea dice cuántos de sus datos se pueden leer en una web; «Ver cuáles» despliega lo mismo que la vista 2 sin encenderlo."),
    ("encendido", "2 · Encendido", page("on", toast=True), "Al encenderlo se guarda AL INSTANTE (es un ajuste de Captación, no entra al «Guardar cambios» del formulario) y sale el aviso. La tarjeta separa lo que puede leer de lo que siempre da el cliente (misma regla que el servidor: teléfono, correo, fechas, nombre, documento…). El panel de cada dato que se puede leer lo dice en una línea; la lista no cambia."),
    ("vacio", "3 · Nada que leer", page("empty"), "Si el formulario solo tiene datos personales, la tarjeta lo dice y ofrece añadir un dato del negocio, en vez de prometer algo que no va a pasar."),
    ("sinpermiso", "4 · Sin permiso", page("noperm"), "Quien edita formularios pero no administra Captación (leads:manage) ve el estado, con el interruptor deshabilitado y el motivo."),
    ("contacto", "5 · En el contacto", view_contact(), "El resultado en el Contacto 360: «De su web» con la frase exacta de la página, al lado de lo que capturó el agente. Lo que la web no dijo se queda vacío y el agente lo pide. Requiere que el servidor exponga la herramienta de la procedencia en la ficha (cambio pequeño)."),
    ("movil", "6 · Móvil", view_mobile(), "A 390 px el interruptor baja bajo el título, los grupos de datos se apilan y las fichas cortan con difuminado."),
]

if __name__ == "__main__":
    K.build_html("Completar con la web", "Mockup F0 · no es producto", "Captación · el formulario de captura se llena con la web del negocio", VIEWS)
    K.ic.save()
