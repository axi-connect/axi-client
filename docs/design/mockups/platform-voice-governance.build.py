#!/usr/bin/env python3
"""Mockup F0 · Gobierno de la voz desde platform + sidebar de platform por secciones
(voice_governance_platform_plan.md, tanda 2 del estudio de agentes).

Vistas: sidebar de platform agrupado por secciones (expandido y en modo icono); pestaña «Voz» de la
ficha del tenant en sus estados (activa con llave propia · apagada sin llave · quitar la llave);
el estudio del agente cuando la empresa tiene la voz apagada (texto honesto: ya no hay pantalla del
tenant a la que enviar). El tema (claro/oscuro) se alterna con el botón de la barra.

Uso:  python3 platform-voice-governance.build.py
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("platform-voice-governance")
ic, btn, badge = K.ic, K.btn, K.badge

# ----------------------------------------------------------------------------- sidebar de platform
# Secciones aprobadas por el dueño (V4): orden de secciones FIJO; dentro de cada una, de menor a mayor
# longitud (misma regla que `flattenUiModuleTree` en el tenant). Dashboard va solo arriba, como «Inicio».
SECTIONS = [
    (None, [("Dashboard", "layout-dashboard")]),
    ("Operación", [("Tenants", "building-2"), ("Llamadas", "phone"), ("Puesta en marcha", "message-circle-heart")]),
    ("Dinero", [("Planes", "layers"), ("Pricing IA", "circle-dollar-sign"), ("Facturación", "receipt")]),
    ("IA", [("Calidad", "flask-conical"), ("Voces IA", "audio-lines")]),
    ("Control", [("Analytics", "activity"), ("Auditoría", "scroll-text")]),
    ("Configuración", [("Proveedores", "plug")]),
]
for _, items in SECTIONS:
    assert [t for t, _ in items] == sorted((t for t, _ in items), key=len), items  # la regla, también en el mockup

SIDEBAR_CSS = """<style>
.psb{width:256px;flex:none;display:flex;flex-direction:column;border-right:1px solid var(--border);background:var(--sidebar,var(--background));min-height:100%}
.psb.icon{width:56px}
.psb-head{display:flex;align-items:center;gap:10px;padding:12px 14px}
.psb-mark{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,var(--axi-brand),var(--axi-violet));flex:none}
.psb-head .t{display:flex;flex-direction:column;line-height:1.15}
.psb-head .t span{font-size:13.5px;font-weight:500}
.psb-head .t small{display:inline-flex;width:fit-content;margin-top:3px;padding:1px 6px;border-radius:999px;border:1px solid color-mix(in srgb,var(--axi-violet) 40%,transparent);background:color-mix(in srgb,var(--axi-violet) 10%,transparent);color:var(--axi-violet);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase}
.psb-body{padding:6px 8px;display:flex;flex-direction:column;gap:6px;flex:1}
.psb-group{display:flex;flex-direction:column;gap:2px}
.psb-label{height:28px;display:flex;align-items:center;padding:0 8px;font-size:11px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:var(--muted-foreground)}
.psb.icon .psb-label{height:8px;overflow:hidden;color:transparent;margin:0 8px;border-top:1px solid var(--border-soft)}
.psb a{display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;border-radius:8px;color:var(--foreground);text-decoration:none;font-size:13.5px;white-space:nowrap;overflow:hidden}
.psb a .ic{flex:none;color:var(--muted-foreground)}
.psb a[aria-current="page"]{background:var(--accent);font-weight:500}
.psb a[aria-current="page"] .ic{color:var(--axi-brand)}
.psb a .cnt{margin-left:auto;font-size:11px;padding:0 6px;border-radius:999px;background:color-mix(in srgb,var(--axi-warning) 16%,transparent);color:var(--axi-warning);font-weight:500}
.psb.icon a{justify-content:center;padding:0}
.psb.icon a span,.psb.icon .psb-head .t,.psb.icon .psb-foot .u{display:none}
.psb-foot{padding:10px 12px;border-top:1px solid var(--border-soft);display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted-foreground)}
.psb-foot .u{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.shellrow{display:flex;min-height:720px;border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;background:var(--background)}
.shellrow .page{flex:1;min-width:0;max-width:none;margin:0}
.vrow{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:4px 14px;align-items:start;padding:16px 0;border-bottom:1px solid var(--border-soft)}
.vrow:last-child{border-bottom:none;padding-bottom:4px} .vrow:first-child{padding-top:4px}
.vrow .vic{width:40px;height:40px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;color:var(--foreground)}
.vrow.off .vic{color:var(--muted-foreground)}
.vrow .vt{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-weight:500;font-size:14.5px}
.vrow .vd{font-size:13px;color:var(--muted-foreground);margin-top:1px;max-width:64ch}
.vrow .vm{margin-top:10px;display:flex;flex-direction:column;gap:8px}
.vrow .ctl{display:flex;align-items:center;gap:10px;padding-top:8px}
.bar{height:8px;border-radius:999px;background:var(--secondary);border:1px solid var(--border-soft);overflow:hidden;max-width:420px}
.bar i{display:block;height:100%;border-radius:999px;background:var(--axi-violet)}
.bar.warn i{background:var(--axi-warning)} .bar.full i{background:var(--axi-destructive)}
.vrow .vwide{grid-column:1 / -1;display:flex;flex-direction:column;gap:8px;margin-top:6px}
.keyrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.keyrow .input{flex:1;min-width:260px}
</style>"""


def sidebar(active: str, icon_mode: bool = False) -> str:
    groups = ""
    for title, items in SECTIONS:
        links = ""
        for label, icon in items:
            cur = ' aria-current="page"' if label == active else ""
            cnt = '<span class="cnt">3</span>' if label == "Analytics" and not icon_mode else ""
            links += f'<a href="#"{cur} title="{label}">{ic(icon, size=16)}<span>{label}</span>{cnt}</a>'
        lbl = f'<div class="psb-label">{title}</div>' if title else ""
        groups += f'<div class="psb-group" role="group" aria-label="{title or "Inicio"}">{lbl}{links}</div>'
    return f"""<aside class="psb {"icon" if icon_mode else ""}" aria-label="Navegación de plataforma">
      <div class="psb-head"><div class="psb-mark"></div><div class="t"><span>Axi Connect</span><small>Plataforma</small></div></div>
      <nav class="psb-body">{groups}</nav>
      <div class="psb-foot">{ic("user-round", size=16)}<span class="u">ops@megaguay.com.co</span>{ic("log-out", size=15)}</div>
    </aside>"""


# ------------------------------------------------------------------------------- ficha del tenant
TABS = [("Resumen", "layout-dashboard"), ("Usuarios", "users"), ("Plan & Límites", "gauge"), ("Facturación", "receipt"),
        ("Funciones", "sliders-horizontal"), ("Voz", "audio-lines"), ("Base de datos", "database"), ("Auditoría", "scroll-text")]


def head(name: str, plan: str, nit: str, city: str) -> str:
    return f"""
    {K.crumb("Plataforma", "Tenants", name)}
    <div class="header">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><h1>{name}</h1>{badge("Activo", "ok")}<span class="muted small">NIT <span class="mono">{nit}</span> · {city} · CO · Plan {plan}</span></div>
      <div class="right">{btn("", "ellipsis-vertical", "outline icon sm", 'aria-label="Acciones del tenant"')}</div>
    </div>
    {K.nav(TABS, "Voz", "Secciones del tenant", "inline")}"""


def row(icon: str, title: str, desc: str, ctl: str = "", meta: str = "", off: bool = False, wide: str = "") -> str:
    m = f'<div class="vm">{meta}</div>' if meta else ""
    c = f'<div class="ctl">{ctl}</div>' if ctl else ""
    w = f'<div class="vwide">{wide}</div>' if wide else ""  # ocupa las tres columnas: para controles que necesitan todo el ancho
    return f"""<div class="vrow {"off" if off else ""}"><div class="vic">{ic(icon, size=18)}</div>
      <div><div class="vt">{title}</div><div class="vd">{desc}</div>{m}</div>{c}{w}</div>"""


def es(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def usage_bar(used: int, limit: int, until: str) -> str:
    pct = round(used * 100 / limit)
    cls = "full" if pct >= 100 else "warn" if pct >= 80 else ""
    return (
        f'<div class="bar {cls}" role="progressbar" aria-label="Caracteres de voz del ciclo" aria-valuenow="{pct}" '
        f'aria-valuemin="0" aria-valuemax="100"><i style="width:{min(pct, 100)}%"></i></div>'
        f'<div class="small muted tnum">{es(used)} / {es(limit)} caracteres · {pct} % · ciclo hasta el {until} · ≈ 280 por nota</div>'
    )


def voice_card_on() -> str:
    body = (
        row("mic", f'Notas de voz {badge("Activa", "ok")}',
            "Los agentes con voz configurada responden con audio <b>solo cuando el cliente les habla con audio</b> (espejo). El cambio aplica desde el siguiente mensaje.",
            ctl=K.switch(True, label="Notas de voz de la empresa"))
        + row("gauge", "Consumo del ciclo",
              "Lo que ya gastó este tenant en caracteres de voz; el límite lo fija su plan (pestaña Plan & Límites).",
              meta=usage_bar(178_400, 300_000, "30 sep"))
        + row("layers", f'Plan {badge("Enterprise", "violet")}',
              "Contexto: a quién le estás gestionando la voz. El plan no bloquea nada aquí — la llave la decide axi.",
              ctl=btn("Ver plan", "arrow-up-right", "ghost sm"))
        + row("key-round", f'Llave propia de ElevenLabs {badge("Configurada · elevenlabs", "ok")}',
              "Escríbela una vez: no se vuelve a mostrar. Mientras haya llave, la voz de este tenant se sintetiza con su cuenta, no con la de axi.",
              wide=f"""<div class="keyrow">{K.input("", "Pega la llave nueva para reemplazarla", icon="key-round", fid="byok")}{btn("Guardar", "check", "sm")}{btn("Quitar llave", "trash-2", "outline sm destructive")}</div>
              <div class="small muted">{ic("shield-check", size=13)} Cifrada con envelope AES-256-GCM. Guardada por <b>ops@megaguay.com.co</b> el 12 sep 2026 · queda en Auditoría.</div>""")
    )
    return card(body)


def voice_card_off() -> str:
    body = (
        row("mic-off", f'Notas de voz {badge("Desactivada", "off")}',
            "Este tenant atiende solo por texto. Al encenderla, sus agentes que ya tengan voz elegida responderán con audio cuando el cliente les hable con audio.",
            ctl=K.switch(False, label="Notas de voz de la empresa"), off=True)
        + row("gauge", "Consumo del ciclo", "Sin consumo en este ciclo · el plan Esencial no trae límite propio de voz: si se enciende, gasta contra el límite general.",
              meta='<div class="bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Caracteres de voz del ciclo"><i style="width:0"></i></div>', off=True)
        + row("layers", f'Plan {badge("Esencial", "outline")}',
              "Contexto: a quién le estás gestionando la voz. El plan no bloquea nada aquí — la llave la decide axi.",
              ctl=btn("Ver plan", "arrow-up-right", "ghost sm"))
        + row("key-round", f'Llave propia de ElevenLabs {badge("Usa la cuenta de axi", "outline")}',
              "Sin llave, la voz de este tenant se sintetiza con la cuenta de axi y se cobra por caracteres. Pégala aquí si el tenant contrató directo con ElevenLabs.",
              wide=f"""<div class="keyrow">{K.input("", "Pega la llave de ElevenLabs del tenant", icon="key-round", fid="byok-off")}{btn("Guardar", "check", "sm")}</div>
              <div class="small muted">{ic("shield-check", size=13)} Se cifra al guardar y no se vuelve a mostrar · queda en Auditoría con tu usuario.</div>""")
    )
    return card(body)


def card(body: str, extra: str = "") -> str:
    return f"""<section class="card" style="position:relative" aria-labelledby="voz-t">
      <div class="card-head"><div><h2 id="voz-t">{ic("audio-lines", size=17)} Voz</h2><p class="lead">Quién decide si este tenant habla y con qué cuenta. El tenant ya no gestiona esto: elige la voz de cada agente en su estudio y aquí se enciende la capacidad y se guarda su llave.</p></div>
        <div class="right">{badge("Solo super_admin", "outline", icon="shield")}</div></div>
      {body}
      <div class="card-foot"><span>{ic("info", size=14)} Cada cambio queda en Auditoría con tu usuario: encender/apagar, guardar o quitar la llave.</span><a href="#">Ver en Auditoría</a></div>
      {extra}
    </section>"""


def shell(active: str, page: str, icon_mode: bool = False) -> str:
    return f'<div class="shellrow">{sidebar(active, icon_mode)}<div class="page">{page}</div></div>'


# ------------------------------------------------------------------------------------- vistas
def view_nav() -> str:
    stats = "".join(
        f'<section class="card"><div class="muted small" style="text-transform:uppercase;letter-spacing:.04em">{l}</div><div class="tnum" style="font-size:26px;font-weight:600;margin-top:2px">{v}</div><div class="small muted">{h}</div></section>'
        for l, v, h in [("Tenants activos", "47", "3 en trial"), ("Conversaciones hoy", "1.284", "+12 % vs. ayer"), ("Alertas", "3", "2 canales, 1 agente")]
    )
    page = f"""{K.crumb("Plataforma", "Dashboard")}<div class="header"><div><h1>Dashboard</h1><p class="lead">Lo que pasa hoy en la plataforma.</p></div></div><div class="grid3">{stats}</div>
      {K.notice("info", "<b>Sidebar por secciones.</b> Seis grupos con título, en el orden que decidiste; dentro de cada uno, los ítems de menor a mayor longitud (la misma regla del tenant). Los comentarios que hoy justifican el orden pasan a ser los títulos.", cls="inline")}"""
    two = f"""<div style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start">
      {SIDEBAR_CSS}{shell("Dashboard", page)}
      <div class="shellrow" style="min-height:720px;width:340px"><div style="display:flex;width:100%">{sidebar("Tenants", icon_mode=True)}<div class="page" style="padding:20px 16px"><p class="small muted">Modo icono: las secciones se separan con una línea fina y el título viaja al <i>tooltip</i>. Nada de texto cortado.</p></div></div></div>
    </div>"""
    return f'<div class="page" style="max-width:1400px">{two}</div>'


def view_on() -> str:
    return f'<div class="page" style="max-width:1400px">{shell("Tenants", head("Savage", "Enterprise", "901.456.789-0", "Bogotá") + voice_card_on())}</div>'


def view_off() -> str:
    return f'<div class="page" style="max-width:1400px">{shell("Tenants", head("Aromas del Valle", "Esencial", "900.112.233-4", "Cali") + voice_card_off())}</div>'


def view_remove() -> str:
    dlg = f"""<div class="overlay"><div class="modal" role="dialog" aria-labelledby="dlg-t">
      <div><h2 id="dlg-t">Quitar la llave de ElevenLabs de Savage</h2><p>Desde el siguiente mensaje su voz se sintetiza con la cuenta de axi y se cobra por caracteres de su plan. Las voces clonadas con su cuenta dejan de estar disponibles para sus agentes. Queda en Auditoría con tu usuario.</p></div>
      <div class="field"><label for="typed">Escribe <b>Savage</b> para confirmar</label>{K.input("Sav", "", fid="typed")}</div>
      <div class="modal-foot">{btn("Cancelar", "", "outline")}{btn("Quitar llave", "trash-2", "destructive", "disabled")}</div>
    </div></div>"""
    return f'<div class="page" style="max-width:1400px">{shell("Tenants", head("Savage", "Enterprise", "901.456.789-0", "Bogotá") + card(voice_card_on_body(), dlg))}</div>'


def voice_card_on_body() -> str:
    # el cuerpo de la tarjeta «activa», reutilizado bajo el diálogo
    start = voice_card_on()
    return start[start.index('<div class="vrow'):start.rindex('<div class="card-foot">')]


def view_studio() -> str:
    wa = "https://wa.me/573224970950"
    notice = K.notice(
        "warn",
        f'<b>Las notas de voz están apagadas para tu empresa.</b> Las activa el equipo de axi: <a href="{wa}" style="color:var(--foreground);font-weight:500;text-underline-offset:3px">escríbenos por WhatsApp</a> y, cuando estén encendidas, vuelve aquí para elegir cómo suena este agente.',
        cls="inline",
    )
    picker = f"""<section class="card" style="max-width:420px">
      <div class="card-head"><div><h2>{ic("audio-lines", size=17)} Voz</h2><p class="lead">Cómo suena este agente cuando responde con audio.</p></div></div>
      {notice}
      <fieldset disabled style="border:0;padding:0;margin:12px 0 0;opacity:.55;display:flex;flex-direction:column;gap:10px">
        {K.field("Voz", K.select("Elige una voz", icon="audio-lines", fid="voice"), fid="voice")}
        <div style="display:flex;gap:8px;align-items:center">{btn("Escuchar muestra", "play", "outline sm", "disabled")}<span class="small muted">Ajustar voz ▸</span></div>
      </fieldset>
    </section>"""
    before = f"""<section class="card" style="max-width:420px;opacity:.7"><div class="card-head"><div><h2 class="muted">{ic("history", size=16)} Hoy (se retira)</h2></div></div>
      {K.notice("warn", "<b>Las notas de voz están apagadas para tu empresa.</b> Enciéndelas en <u>Configuración → Voz</u> y vuelve aquí para elegir cómo suena este agente.", cls="inline")}
      <p class="small muted" style="margin-top:10px">Enlaza a <span class="mono">/settings/voice</span>, que deja de existir: mentiría.</p></section>"""
    return f"""<div class="page"><div class="header"><div>{K.crumb("Agentes IA", "Valentina")}<h1 style="margin-top:6px">Estudio · bloque de voz con la empresa apagada</h1><p class="lead">El estudio dice la verdad: quien enciende la voz es axi, no una pantalla del tenant.</p></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,420px));gap:16px;align-items:start">{picker}{before}</div></div>"""


VIEWS = [
    ("nav", "1 · Sidebar por secciones", view_nav(),
     "Seis secciones en orden fijo (Dashboard solo · Operación · Dinero · IA · Control · Configuración); dentro de cada una, de menor a mayor longitud, con test de invariante. Título en `SidebarGroupLabel`; en modo icono se oculta y queda una línea separadora. La insignia de alertas sigue en Analytics."),
    ("voz-on", "2 · Tenant · Voz activa", view_on(),
     "Pestaña «Voz» nueva en la ficha (hermana de Funciones). Lista etiqueta → valor, un solo indicador por fila: interruptor de empresa, consumo del ciclo (el GET de voz lo devuelve: limits de platform no trae `used`), plan como contexto, llave write-only a todo el ancho con Guardar/Quitar (cambio pedido por el dueño). Solo super_admin; todo auditado."),
    ("voz-off", "3 · Tenant · Voz apagada, sin llave", view_off(),
     "Decisión del dueño (V5): desde platform la llave se pega SIEMPRE, sin exigir plan — quien la pega es axi. El plan aparece solo como contexto y no bloquea el input. El consumo dice que no hay límite propio."),
    ("quitar", "4 · Quitar la llave (confirmación escrita)", view_remove(),
     "`ConfirmTyped` del kit de platform: escribir el nombre del tenant; el botón se enciende solo con el texto exacto. El texto dice qué pasa mañana con su voz (cuenta de axi, cobro por caracteres, voces clonadas fuera)."),
    ("estudio", "5 · Estudio · voz de empresa apagada", view_studio(),
     "El texto del `VoicePicker` deja de enviar a /settings/voice (que muere) y enlaza al WhatsApp de soporte que ya usa la app (wa.me/573224970950). Mismo texto en analytics/VoiceCard. A la derecha, el texto actual que se retira."),
]

if __name__ == "__main__":
    K.build_html("Voz por tenant y sidebar de platform", "Mockup F0 · no es producto", "Estudio de agentes · tanda 2 «Gobierno de la voz»", VIEWS)
