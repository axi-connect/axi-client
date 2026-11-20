#!/usr/bin/env python3
"""Mockup «Escribirles» (Fase B2 · de una búsqueda a la secuencia con imagen).

La idea que ordena todo: **una búsqueda termina en un botón, «Escribirles»**, y ese botón abre UNA
pantalla con cuatro decisiones, ya resueltas por el nicho de la búsqueda:

1. **Imagen**: una sola por secuencia, la usan el encabezado de WhatsApp y el del correo. Viene
   elegida por el nicho (hoteles → la de hoteles); se cambia con un clic o se sube otra. Opción:
   «Con el nombre de cada negocio» (la imagen se personaliza por destinatario).
2. **WhatsApp**: la plantilla de Meta aprobada del nicho, con imagen POR ENVÍO (la misma plantilla
   sirve para cualquier imagen) y el botón de baja. Las variables se llenan solas.
3. **Correo**: diseño «Texto» o «Marca» (el del mockup anterior) y su botón.
4. **Secuencia**: la del nicho, en una línea de toques.

A la derecha, la vista previa EN VIVO de un negocio real de la búsqueda, y «Enviarme una prueba».
Abajo, una sola acción: «Inscribir N negocios» (o «Automatizar cada semana», que crea la rutina del
piloto con esta misma configuración). El MCP hace lo mismo con una herramienta.

Uso:  python3 outreach-from-search.build.py
"""
import base64
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("outreach-from-search")
ic, btn, badge = K.ic, K.btn, K.badge

IMG_DIR = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent / "outreach-from-search.assets"


def data_uri(name: str) -> str:
    return "data:image/jpeg;base64," + base64.b64encode((IMG_DIR / name).read_bytes()).decode()


HERO = data_uri("hoteles.jpg")
THUMBS = {n: data_uri(f"{n}_t.jpg") for n in ("hoteles", "clinicas", "agencias", "ropa")}
NICHE_LABEL = {"hoteles": "Hoteles", "clinicas": "Clínicas", "agencias": "Agencias", "ropa": "Ropa"}

K.extra_css = """
.wrap2{display:grid;gap:20px;grid-template-columns:1fr}
@container (min-width: 1040px){.wrap2{grid-template-columns:minmax(0,1fr) 420px;align-items:start}}
.setup{display:flex;flex-direction:column;gap:0;padding:0}
.srow{padding:18px 22px;border-top:1px solid var(--border-soft);display:grid;gap:12px}
.srow:first-child{border-top:0}
.srow-h{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap}
.srow-h .t{display:flex;align-items:center;gap:8px;font-weight:500;font-size:14.5px}
.srow-h .s{font-size:12.5px;color:var(--muted-foreground)}
.thumbs{display:flex;gap:10px;flex-wrap:wrap}
.thumb{width:112px;border-radius:12px;border:1.5px solid var(--border);overflow:hidden;background:var(--background);display:flex;flex-direction:column;font-size:12px;cursor:pointer}
.thumb img{display:block;width:100%;aspect-ratio:1.91/1;object-fit:cover}
.thumb span{padding:6px 8px;display:flex;align-items:center;gap:6px;justify-content:space-between}
.thumb.on{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in oklab,var(--primary) 18%,transparent)}
.thumb.up{display:grid;place-items:center;aspect-ratio:auto;min-height:86px;color:var(--muted-foreground);border-style:dashed;gap:4px;text-align:center}
.inline{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13.5px}
.inline .muted{color:var(--muted-foreground)}
.tpl{display:flex;align-items:center;gap:10px;justify-content:space-between;border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 12px;flex-wrap:wrap}
.tpl .name{font-family:var(--font-mono);font-size:12.5px}
.steps{display:flex;gap:6px;flex-wrap:wrap}
.step{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:999px;padding:5px 10px;font-size:12.5px;background:var(--background)}
.step b{font-weight:500;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
.footbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 22px;border-top:1px solid var(--border);background:var(--secondary);border-radius:0 0 var(--radius-xl) var(--radius-xl)}
.footbar .sum{font-size:13px;color:var(--muted-foreground);max-width:56ch}
.footbar .acts{display:flex;gap:8px;flex-wrap:wrap}
.prev{position:sticky;top:12px;display:grid;gap:12px}
.prev-h{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.seg2{display:inline-flex;border:1px solid var(--border);border-radius:999px;padding:3px;gap:2px;background:var(--background)}
.seg2 b{font-weight:500;font-size:12.5px;padding:6px 12px;border-radius:999px;color:var(--muted-foreground);display:inline-flex;gap:6px;align-items:center}
.seg2 b.on{background:var(--foreground);color:var(--background)}
.as{font-size:12.5px;color:var(--muted-foreground);display:flex;align-items:center;gap:6px}
.as .select{min-width:0}
/* WhatsApp: colores del propio WhatsApp (es lo que verá el negocio) */
.wa{background:#efeae2;border-radius:16px;padding:16px 14px;min-height:420px}
.wa-b{background:#fff;color:#111b21;border-radius:10px;max-width:320px;box-shadow:0 1px 1px rgba(0,0,0,.08);overflow:hidden;font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
.wa-b .img{position:relative}
.wa-b .img img{display:block;width:100%}
.wa-b .tx{padding:8px 10px 4px}
.wa-b .ft{padding:0 10px 6px;color:#667781;font-size:12.5px}
.wa-b .hr{text-align:right;color:#667781;font-size:11px;padding:0 10px 6px}
.wa-btn{background:#fff;max-width:320px;margin-top:4px;border-radius:10px;text-align:center;color:#027eb5;font:500 14px/1 system-ui,sans-serif;padding:11px 0;box-shadow:0 1px 1px rgba(0,0,0,.08)}
.pers{position:absolute;left:10px;bottom:10px;background:rgba(17,17,20,.86);color:#fff;font:600 12px/1.2 system-ui,sans-serif;padding:6px 9px;border-radius:8px;max-width:80%}
/* Correo: colores literales del HTML del correo */
.mail{background:#e9e6e3;border-radius:16px;padding:14px}
.mail-h{font-size:12px;color:#6b6670;display:grid;gap:2px;margin-bottom:10px}
.mail-h b{color:#1f1d22;font-weight:600}
.mail-c{background:#fff;color:#1f1d22;border-radius:10px;overflow:hidden;font:400 14px/1.6 Arial,Helvetica,sans-serif}
.mail-c .pad{padding:20px 22px}
.mail-c .brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;margin-bottom:14px}
.mail-c .brand i{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#e8506a,#7c5ce0);display:block}
.mail-c .img{position:relative;margin-bottom:16px}
.mail-c .img img{display:block;width:100%;border-radius:8px}
.mail-c p{margin:0 0 12px}
.mail-c .cta{display:inline-block;background:#17151a;color:#fff;font-weight:700;font-size:14px;padding:11px 18px;border-radius:8px;margin:2px 0 16px}
.mail-c .sig{display:flex;gap:12px;align-items:center;border-top:1px solid #ece7e3;padding-top:14px;font-size:13px;line-height:1.45}
.mail-c .sig i{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#e8506a,#7c5ce0);display:grid;place-items:center;color:#fff;font-style:normal;font-weight:700;flex:none}
.mail-c .sig span{display:block;color:#6b6670}
.mail-c .foot{background:#ffffff;border-top:1px solid #ece7e3;color:#8a848d;font-size:11px;line-height:1.5;padding:12px 22px 16px}
/* MCP */
.chat{display:grid;gap:10px;font-size:13.5px}
.msg{border-radius:14px;padding:10px 14px;max-width:78ch}
.msg.u{background:var(--secondary);justify-self:end}
.msg.a{border:1px solid var(--border)}
.call{font-family:var(--font-mono);font-size:12px;background:var(--muted);border-radius:10px;padding:10px 12px;white-space:pre-wrap;overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th,.tbl td{text-align:left;padding:9px 10px;border-top:1px solid var(--border-soft);vertical-align:top}
.tbl th{font-weight:500;color:var(--muted-foreground);font-size:12px;border-top:0}
.tbl code{font-family:var(--font-mono);font-size:12px}
.tw{overflow-x:auto}
.list{display:grid;gap:0}
.lrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 0;border-top:1px solid var(--border-soft)}
.lrow:first-child{border-top:0}
.lrow b{font-weight:500}
.lrow .meta{font-size:12.5px;color:var(--muted-foreground);display:flex;gap:10px;flex-wrap:wrap;margin-top:2px}
"""


# ----------------------------------------------------------------------------- piezas
def thumbs(active: str = "hoteles") -> str:
    tiles = "".join(
        f'<div class="thumb {"on" if n == active else ""}" role="radio" aria-checked="{str(n == active).lower()}">'
        f'<img src="{THUMBS[n]}" alt="Encabezado de {NICHE_LABEL[n].lower()}"><span>{NICHE_LABEL[n]}'
        f'{ic("check", size=13) if n == active else ""}</span></div>'
        for n in ("hoteles", "clinicas", "agencias", "ropa")
    )
    up = f'<div class="thumb up" role="button">{ic("upload", size=18)}<span style="padding:0">Subir</span></div>'
    return f'<div class="thumbs" role="radiogroup" aria-label="Imagen">{tiles}{up}</div>'


def steps_line() -> str:
    seq = [("mail", "Correo", "Día 0"), ("message-circle", "WhatsApp", "Día 1"), ("reply", "Correo «Re:»", "Día 3"),
           ("smartphone", "SMS", "Día 6"), ("mail", "Correo", "Día 8"), ("mail", "Correo", "Día 13")]
    return '<div class="steps">' + "".join(
        f'<span class="step">{ic(i, size=13)}{t} <b>{d}</b></span>' for i, t, d in seq
    ) + "</div>"


def setup_card(personalized: bool, design: str = "marca") -> str:
    seg = lambda opts, on: '<div class="seg2">' + "".join(  # noqa: E731
        f'<b class="{"on" if o == on else ""}">{o}</b>' for o in opts) + "</div>"
    return f"""<section class="card setup" aria-label="Lo que se va a enviar">
      <div class="srow">
        <div class="srow-h"><span class="t">{ic("image", size=16)} Imagen</span><span class="s">Va en el WhatsApp y en el correo</span></div>
        {thumbs()}
        <div class="inline">{K.switch(personalized, label="Con el nombre de cada negocio")}<span>Con el nombre de cada negocio</span><span class="muted">«Para Casa Almendro Hotel» en la imagen</span></div>
      </div>
      <div class="srow">
        <div class="srow-h"><span class="t">{ic("message-circle", size=16)} WhatsApp</span>{badge("31 con celular", "outline")}</div>
        <div class="tpl"><div><div class="name">axi_prospeccion_hoteles_v2</div><div class="s small" style="color:var(--muted-foreground)">Marketing · Español · imagen por envío · botón de baja</div></div>{badge("Aprobada", "ok")}</div>
      </div>
      <div class="srow">
        <div class="srow-h"><span class="t">{ic("mail", size=16)} Correo</span>{badge("38 con correo", "outline")}</div>
        <div class="inline">{seg(["Texto", "Marca"], "Marca" if design == "marca" else "Texto")}<span class="muted">Botón:</span>{K.select("Quiero la prueba gratis → Responder", fid="cta")}</div>
      </div>
      <div class="srow">
        <div class="srow-h"><span class="t">{ic("list-ordered", size=16)} Secuencia</span>{K.select("Hoteles boutique", fid="seq")}</div>
        {steps_line()}
      </div>
      <div class="footbar">
        <span class="sum">Se detiene si responde. WhatsApp en frío: hoy salen 20 y el resto mañana (tu tope diario).</span>
        <div class="acts">{btn("Automatizar cada semana", icon="repeat", cls="outline")}{btn("Inscribir 38 negocios", icon="send")}</div>
      </div>
    </section>"""


def wa_preview(personalized: bool) -> str:
    pers = '<span class="pers">Para Casa Almendro Hotel</span>' if personalized else ""
    return f"""<div class="wa" aria-label="Así le llega por WhatsApp">
      <div class="wa-b">
        <div class="img"><img src="{HERO}" alt="Hoteles: así respondería tu WhatsApp. Conversación de ejemplo">{pers}</div>
        <div class="tx">Hola, te escribe Cristian Velásquez, fundador de Axi. Ayudamos a hoteles como <b>Casa Almendro Hotel</b> a responder por WhatsApp en segundos, a cualquier hora, con sus tarifas reales, para que el huésped reserve directo y no por una plataforma con comisión. Te lo dejamos funcionando gratis 7 días. ¿Te gustaría probarlo?</div>
        <div class="ft">Toca «No me interesa» y no te escribimos más.</div>
        <div class="hr">10:02</div>
      </div>
      <div class="wa-btn">Quiero probarlo</div>
      <div class="wa-btn">Más adelante</div>
      <div class="wa-btn">No me interesa</div>
    </div>"""


def mail_preview(personalized: bool, design: str = "marca") -> str:
    pers = '<span class="pers">Para Casa Almendro Hotel</span>' if personalized else ""
    head = f"""<div class="mail-h"><b>Cristian Velásquez · Axi Connect</b><span>reservas directas</span></div>"""
    body = """<p>Hola, equipo de Casa Almendro Hotel:</p>
        <p>Muchos huéspedes escriben al WhatsApp antes de reservar: disponibilidad, precio, si aceptan mascotas. Si nadie responde a tiempo, reservan por una plataforma que te cobra comisión, o en otro hotel.</p>
        <p>Axi responde en segundos, a cualquier hora, con tus tarifas reales, toma los datos de la reserva y se la pasa a tu equipo.</p>
        <p>¿Te activo la prueba gratis de 7 días? La dejamos funcionando nosotros.</p>"""
    if design == "texto":
        return f"""<div class="mail">{head}<div class="mail-c"><div class="pad">{body}<p>Cristian Velásquez<br>Fundador y CTO · Axi Connect</p></div></div></div>"""
    return f"""<div class="mail" aria-label="Así le llega por correo">{head}
      <div class="mail-c"><div class="pad">
        <div class="brand"><i></i>axi connect</div>
        <div class="img"><img src="{HERO}" alt="Hoteles: así respondería tu WhatsApp. Conversación de ejemplo">{pers}</div>
        {body}
        <span class="cta">Quiero la prueba gratis</span>
        <div class="sig"><i>CV</i><div><b>Cristian Velásquez</b><span>Fundador y CTO · Axi Connect</span><span>axi-connect.co · +57 318 013 9091</span></div></div>
      </div>
      <div class="foot">Axi Connect S.A.S. · Te escribimos porque el contacto de tu hotel es público (Ley 1581 de 2012). Responde «no» o <u>deja de recibir estos correos</u>.</div></div>
    </div>"""


def preview_card(tab: str, personalized: bool) -> str:
    wa_on = "on" if tab == "wa" else ""
    mail_on = "on" if tab == "mail" else ""
    body = wa_preview(personalized) if tab == "wa" else mail_preview(personalized)
    return f"""<aside class="card prev" aria-label="Vista previa">
      <div class="prev-h"><div class="seg2"><b class="{wa_on}">{ic("message-circle", size=13)}WhatsApp</b><b class="{mail_on}">{ic("mail", size=13)}Correo</b></div>
        <span class="as">Ver como {K.select("Casa Almendro Hotel", fid="as")}</span></div>
      {body}
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span class="small" style="color:var(--muted-foreground)">Con los datos reales de este negocio.</span>{btn("Enviarme una prueba", icon="send", cls="outline")}</div>
    </aside>"""


def head() -> str:
    return f"""
    {K.crumb("Marketing", "Leads", "Búsquedas", "Hoteles boutique en Cartagena")}
    <div class="header">
      <div><h1>Escribirles a 38 hoteles</h1><p class="lead">Hoteles boutique en Cartagena · Google Maps · hoy</p></div>
    </div>"""


def view_panel(tab: str, personalized: bool) -> str:
    return f"""<div class="page">{head()}
      <div class="wrap2">{setup_card(personalized)}{preview_card(tab, personalized)}</div>
    </div>"""


def view_searches() -> str:
    rows = [
        ("Hoteles boutique en Cartagena", "Google Maps · 38 negocios · hoy", True, "Lista"),
        ("Clínicas estéticas en Medellín", "Google Maps · 52 negocios · 18 nov", False, "Escribiéndoles · 52 en secuencia"),
        ("Agencias de viajes en Bogotá", "Google Maps · 41 negocios · 17 nov", False, "Escribiéndoles · 41 en secuencia"),
    ]
    items = "".join(
        f"""<div class="lrow"><div><b>{t}</b><div class="meta">{m}</div></div>
        <div>{btn("Escribirles", icon="send") if ready else badge(state, "ok")}</div></div>"""
        for t, m, ready, state in rows
    )
    return f"""<div class="page">
      {K.crumb("Marketing", "Leads", "Búsquedas")}
      <div class="header"><div><h1>Búsquedas</h1><p class="lead">Negocios que encontraste. Escríbeles con la secuencia de su nicho.</p></div>
      <div class="right">{btn("Nueva búsqueda", icon="search", cls="outline")}</div></div>
      <section class="card"><div class="list">{items}</div></section>
    </div>"""


def view_states() -> str:
    a = K.notice("warn", "<b>Esta plantilla tiene la imagen fija.</b> Para que cambie por negocio o por búsqueda hace falta la versión con imagen por envío. Meta la revisa en unas horas.", acts=btn("Crear la versión con imagen por envío", cls="outline sm"))
    b = K.notice("info", "<b>No hay plantilla aprobada para hoteles.</b> Creamos una con esta imagen y el texto del playbook; mientras Meta la aprueba, la secuencia sale sin el paso de WhatsApp.", acts=btn("Crear plantilla", cls="outline sm"))
    c = K.notice("info", "<b>7 hoteles no tienen celular.</b> Recibirán solo los correos.")
    d = K.notice("err", "<b>La imagen pesa 6 MB.</b> WhatsApp acepta hasta 5 MB; la reducimos al subirla (JPG de 1200 px, menos de 100 KB para el correo).")
    return f"""<div class="page">{head()}
      <section class="card" style="display:grid;gap:12px"><h2>Avisos posibles</h2>{a}{b}{c}{d}</section>
    </div>"""


def view_mcp() -> str:
    call1 = """busqueda_escribir {
  "busqueda_id": "01a2…",          // la de hoteles en Cartagena
  "accion": "vista_previa",          // vista_previa | enviarme_prueba | inscribir | automatizar
  "imagen": "nicho",                 // nicho | <url https> | null (sin imagen)
  "personalizar_imagen": true,
  "correo_diseno": "marca",          // texto | marca
  "secuencia_id": null               // null = la del nicho
}"""
    rows = [
        ("<code>busqueda_escribir</code> <span class='badge outline'>nueva</span>", "Todo el panel en una llamada: vista previa (texto e imagen de un negocio real), prueba a mi correo, inscribir o automatizar. Inscribir y automatizar piden confirmación."),
        ("<code>secuencia_guardar</code>", "Gana <code>imagen</code> (de toda la secuencia) y, por paso de correo, <code>diseno</code> y <code>boton</code>. Campos nuevos opcionales."),
        ("<code>plantilla_meta_enviar</code>", "Gana el encabezado de imagen POR ENVÍO: una plantilla por nicho sirve para cualquier imagen."),
        ("<code>ajustes_guardar · firma_comercial</code>", "Ya existe (B2): quién firma."),
    ]
    tbl = "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in rows)
    return f"""<div class="page">
      {K.crumb("MCP", "Axi Connect")}
      <div class="header"><div><h1>Lo mismo desde el MCP</h1><p class="lead">Una herramienta hace lo que hace el panel; las demás ganan campos opcionales.</p></div></div>
      <section class="card chat">
        <div class="msg u">Escríbele a los hoteles de la búsqueda de Cartagena con la imagen de hoteles y su nombre en la imagen. Primero muéstrame cómo queda.</div>
        <div class="call">{call1}</div>
        <div class="msg a">Así le llega a <b>Casa Almendro Hotel</b>: WhatsApp con la imagen «Para Casa Almendro Hotel» y la plantilla axi_prospeccion_hoteles_v2 (aprobada), y correo «reservas directas» con diseño Marca. Saldrían 38 correos y 31 WhatsApp (20 hoy, 11 mañana). ¿Te mando una prueba o los inscribo?</div>
      </section>
      <section class="card"><h2 style="margin-bottom:8px">Herramientas</h2><div class="tw"><table class="tbl"><thead><tr><th>Herramienta</th><th>Qué hace</th></tr></thead><tbody>{tbl}</tbody></table></div></section>
    </div>"""


def view_mobile() -> str:
    return f"""<div class="page" style="padding:12px 16px 40px">
      {K.crumb("Búsquedas")}
      <div class="header"><div><h1 style="font-size:22px">Escribirles a 38 hoteles</h1></div></div>
      {setup_card(False)}
      <div style="margin-top:16px">{preview_card("wa", False)}</div>
    </div>"""


VIEWS = [
    ("busquedas", "1 · Búsquedas", view_searches(), "Cada búsqueda terminada tiene UN botón: «Escribirles». Las que ya están en secuencia lo dicen."),
    ("whatsapp", "2 · Preparar (WhatsApp)", view_panel("wa", False), "Una pantalla, cuatro filas ya resueltas por el nicho: imagen, plantilla de WhatsApp, diseño del correo y secuencia. A la derecha, cómo le llega a un negocio REAL de la búsqueda. Una acción: inscribir (o automatizar cada semana con la rutina del piloto)."),
    ("correo", "3 · Preparar (Correo, imagen con nombre)", view_panel("mail", True), "Con «Con el nombre de cada negocio», la imagen lleva «Para Casa Almendro Hotel». Es la MISMA imagen en el correo y en el WhatsApp. El correo es el diseño «Marca» del mockup anterior."),
    ("avisos", "4 · Avisos", view_states(), "Lo que puede faltar, dicho en una línea con su arreglo al lado: plantilla con imagen fija, sin plantilla aprobada, negocios sin celular, imagen pesada."),
    ("mcp", "5 · MCP", view_mcp(), "Una herramienta nueva, busqueda_escribir, hace lo del panel (con vista previa y confirmación). Las existentes ganan campos opcionales: nunca obligatorios."),
    ("movil", "6 · Móvil", view_mobile(), "A 390 px: la configuración arriba y la vista previa debajo."),
]

if __name__ == "__main__":
    K.build_html("Escribirles", "Mockup F0 · no es producto", "Fase B2 · de una búsqueda a WhatsApp y correo con imagen", VIEWS)
    K.ic.save()
