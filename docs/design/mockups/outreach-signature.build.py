#!/usr/bin/env python3
"""Mockup «Firma comercial» (Fase B2 del piloto de prospección).

El bug: las secuencias en frío firmaban «Axi Connect» porque `{{sender_name}}` era el nombre
comercial. Ahora el negocio guarda QUIÉN escribe (nombre, cargo, foto, teléfono, sitio) y eso firma
los correos; el remitente visible pasa a «Persona · Negocio».

Dónde: Mi empresa › General, en la tarjeta «Correo de prospección» que ya existe (solo lectura hoy).
La tarjeta gana una segunda mitad «Quién firma» con vista previa de la firma y un botón «Editar
firma» que abre un formulario en la misma tarjeta (no un modal: son cinco campos).

Vistas: con firma · editando · sin firma (estado de hoy, con llamado) · error de validación · móvil.

Uso:  python3 outreach-signature.build.py
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("outreach-signature")
ic, btn, badge = K.ic, K.btn, K.badge

COMPANY_TABS = [("General", "building-2"), ("Sucursales", "map-pin"), ("Funciones", "sliders-horizontal")]

K.extra_css = """
.sig-split{display:grid;gap:20px;grid-template-columns:1fr}
@container (min-width: 820px){.sig-split{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.sig-block h3{font-size:14px;font-weight:500;margin:0 0 4px;display:flex;align-items:center;gap:6px}
.sig-block .lead{margin-bottom:12px}
.sig-preview{border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;display:flex;gap:14px;align-items:center;background:var(--background)}
.sig-photo{width:52px;height:52px;border-radius:999px;flex:none;background:var(--muted);display:grid;place-items:center;font-weight:600;color:var(--muted-foreground);font-size:16px;overflow:hidden}
.sig-photo.has{background:linear-gradient(135deg,#e8506a,#7c5ce0);color:#fff}
.sig-who{min-width:0;font-size:13.5px;line-height:1.5}
.sig-who b{display:block;font-size:14.5px;font-weight:600}
.sig-who span{display:block;color:var(--muted-foreground)}
.sig-vars{margin-top:12px;font-size:12.5px;color:var(--muted-foreground);display:flex;flex-wrap:wrap;gap:6px 12px}
.sig-vars code{font-family:var(--font-mono);font-size:12px;background:var(--muted);border-radius:6px;padding:2px 6px;color:var(--foreground)}
.sig-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
.input.err{border-color:var(--axi-destructive)}
.hint.err{color:var(--axi-destructive)}
.divider{border-top:1px solid var(--border-soft);margin:18px 0}
"""


def head(name: str = "Axi Connect") -> str:
    return f"""
    {K.crumb("Ajustes", "Mi empresa")}
    <div class="header">
      <div><h1>{name}</h1><p class="lead">Datos, sucursales y funciones de tu empresa.</p></div>
      <div class="right">{badge("Plan Pro", "outline")}{badge("Activa", "ok")}</div>
    </div>
    {K.nav(COMPANY_TABS, "General", "Secciones de la empresa")}"""


def sender_block(display: str) -> str:
    return f"""<div class="sig-block">
      <h3>{ic("mail", size=15)} Sale desde</h3>
      <p class="lead small">Tus correos de prospección salen de esta dirección y las respuestas llegan a tu CRM. La dirección no se configura.</p>
      <dl class="kv" style="grid-template-columns:1fr">
        <div><dt>Dirección</dt><dd style="word-break:break-all">axiconnect@comercial.axi-connect.co</dd></div>
        <div><dt>Lo que ve quien recibe</dt><dd>{display}</dd></div>
      </dl>
    </div>"""


def preview_card(filled: bool) -> str:
    if filled:
        return f"""<div class="sig-preview">
          <div class="sig-photo has" aria-hidden="true">CV</div>
          <div class="sig-who"><b>Cristian Velásquez</b><span>Fundador y CTO · Axi Connect</span><span>axi-connect.co · +57 318 013 9091</span></div>
        </div>"""
    return f"""<div class="sig-preview">
          <div class="sig-photo" aria-hidden="true">{ic("building-2", size=20)}</div>
          <div class="sig-who"><b>Axi Connect</b><span>Sin persona: firma el negocio</span></div>
        </div>"""


def signature_block(state: str) -> str:
    if state == "edit" or state == "error":
        err = state == "error"
        photo_cls = "err" if err else ""
        photo_hint = (
            '<p class="hint err">Debe ser una dirección https://</p>' if err else ""
        )
        return f"""<div class="sig-block">
          <h3>{ic("pen-line", size=15)} Quién firma</h3>
          <p class="lead small">La persona que firma tus correos y SMS de prospección.</p>
          <div class="form">
            {K.field("Nombre", K.input("Cristian Velásquez", fid="sig-name"), fid="sig-name")}
            {K.field("Cargo", K.input("Fundador y CTO", fid="sig-title"), fid="sig-title")}
            <div class="field full"><label for="sig-photo">Foto (URL)</label>{K.input("http://axi-connect.co/cristian.jpg" if err else "https://axi-connect.co/equipo/cristian.jpg", cls=photo_cls, fid="sig-photo")}{photo_hint or '<p class="hint">Cuadrada, de frente. Sin foto van tus iniciales.</p>'}</div>
            {K.field("Teléfono", K.input("+57 318 013 9091", fid="sig-phone"), hint="Opcional.", fid="sig-phone")}
            {K.field("Sitio web", K.input("https://axi-connect.co", fid="sig-web"), fid="sig-web")}
          </div>
          <div class="sig-actions">{btn("Cancelar", cls="ghost")}{btn("Guardar firma", attrs='disabled' if err else '')}</div>
        </div>"""
    filled = state == "filled"
    vars_line = (
        '<div class="sig-vars"><span><code>{{sender_name}}</code> = Cristian Velásquez</span>'
        '<span><code>{{sender_signature}}</code> = este bloque</span></div>'
        if filled
        else '<div class="sig-vars"><span><code>{{sender_name}}</code> = Axi Connect</span></div>'
    )
    call = (
        ""
        if filled
        else K.notice(
            "info",
            "Un correo en frío firmado por una persona se lee como un correo, no como publicidad. Agrega quién escribe.",
            cls="small",
        )
    )
    return f"""<div class="sig-block">
          <h3>{ic("pen-line", size=15)} Quién firma</h3>
          <p class="lead small">La persona que firma tus correos y SMS de prospección.</p>
          {call}
          {preview_card(filled)}
          {vars_line}
          <div class="sig-actions">{btn("Editar firma" if filled else "Agregar firma", icon="pencil" if filled else "plus", cls="outline")}</div>
        </div>"""


def card(state: str) -> str:
    display = "Cristian Velásquez · Axi Connect" if state in ("filled", "edit") else "Axi Connect"
    return f"""<section class="card" aria-labelledby="ops-title">
      <h2 id="ops-title">Correo de prospección</h2>
      <p class="lead" style="margin-bottom:16px">Desde dónde salen tus correos en frío y quién los firma.</p>
      <div class="sig-split">
        {sender_block(display)}
        {signature_block(state)}
      </div>
    </section>"""


def page(state: str) -> str:
    return f"""<div class="page">{head()}
    <section class="card"><h2>Información general</h2><p class="lead">Nombre, tipo de negocio, ciudad, logo… (sin cambios)</p></section>
    {card(state)}
    <section class="card">
      <h2>Horario de atención</h2><p class="lead">Horario general de la empresa: fuera de él la IA lo informa al cliente.</p>
    </section>
    </div>"""


def view_mobile() -> str:
    return f"""<div class="page" style="padding:12px 16px 40px">
      {K.crumb("Mi empresa")}
      <div class="header"><div><h1 style="font-size:22px">Axi Connect</h1></div></div>
      {K.nav(COMPANY_TABS, "General", "Secciones de la empresa", "sm")}
      {card("filled")}
    </div>"""


VIEWS = [
    ("con-firma", "1 · Con firma", page("filled"), "La tarjeta «Correo de prospección» de Mi empresa › General gana la mitad «Quién firma»: vista previa de la firma tal como cierra el correo y qué valen las variables. El remitente visible pasa a «Cristian Velásquez · Axi Connect»; la dirección no cambia."),
    ("editando", "2 · Editando", page("edit"), "«Editar firma» abre el formulario EN la tarjeta (cinco campos, sin modal). Guardar es un PUT de la firma entera; Cancelar vuelve a la vista previa. Mismo permiso que editar la empresa."),
    ("sin-firma", "3 · Sin firma (hoy)", page("empty"), "Así queda un negocio que no ha guardado firma: todo sigue como antes (firma el negocio) y un aviso suave invita a agregar la persona."),
    ("error", "4 · Error", page("error"), "Foto y sitio solo https://. El error va debajo del campo, en rojo (destructivo), y Guardar se apaga hasta corregirlo."),
    ("movil", "5 · Móvil", view_mobile(), "A 390 px las dos mitades se apilan: primero la dirección, después quién firma."),
]

if __name__ == "__main__":
    K.build_html("Firma comercial", "Mockup F0 · no es producto", "Fase B2 · quién firma los correos de prospección", VIEWS)
    K.ic.save()
