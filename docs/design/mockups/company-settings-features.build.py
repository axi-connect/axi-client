#!/usr/bin/env python3
"""Mockup «Tipo de negocio + Funciones» (cobros_frontend_plan.md §4, F1).

Vistas: General de Mi empresa con el selector «Tipo de negocio»; pestaña Funciones para
JuanitoXpeditions (hoteles y turismo: sugeridas, activada por el tenant, fijada por Axi); la misma
pestaña para Savage (retail: nada sugerido, dependencia apagada); estados (cargando, 409 fijada,
plan sin Ventas); móvil. Nota: «Medios de pago» deja Mi empresa y pasa al hub Pagos (F2).

Uso:  python3 company-settings-features.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("company-settings-features")
ic, btn, badge = K.ic, K.btn, K.badge

COMPANY_TABS = [("General", "building-2"), ("Sucursales", "map-pin"), ("Funciones", "sliders-horizontal")]


def head(active: str, name: str = "JuanitoXpeditions") -> str:
    return f"""
    {K.crumb("Ajustes", "Mi empresa")}
    <div class="header">
      <div><h1>{name}</h1><p class="lead">Datos, sucursales y funciones de tu empresa.</p></div>
      <div class="right">{badge("Plan Pro", "outline")}{badge("Activa", "ok")}</div>
    </div>
    {K.nav(COMPANY_TABS, active, "Secciones de la empresa")}"""


# ----------------------------------------------------------------------------- General
def view_general() -> str:
    niche = K.select("Hoteles y turismo", icon="tent", fid="niche")
    return f"""<div class="page">{head("General")}
    <section class="card">
      <dl class="kv">
        <div><dt>NIT</dt><dd class="tnum">901.234.567-8</dd></div>
        <div><dt>País</dt><dd>CO</dd></div>
        <div><dt>Moneda</dt><dd>USD</dd></div>
        <div><dt>Creada</dt><dd class="tnum">12/3/2026</dd></div>
      </dl>
    </section>
    <section class="card">
      <h2>Información general</h2><p class="lead" style="margin-bottom:16px">Lo que la IA sabe de tu empresa cuando atiende.</p>
      <div class="form">
        {K.field("Nombre", K.input("JuanitoXpeditions", fid="name"), fid="name")}
        {K.field("Tipo de negocio", niche, hint='Define qué funciones tienen sentido para tu negocio: planes de pago, cobranza, moneda, documentos. Ajusta cuáles usas en <a href="#">Funciones</a>.', fid="niche")}
        {K.field("Industria", K.input("Expediciones y viajes de aventura", fid="industry"), hint="Texto libre: así se describe la empresa en el prompt del agente.", fid="industry")}
        {K.field("Ciudad", K.input("Bogotá", fid="city"), fid="city")}
        {K.field("Dirección", K.input("Cra. 7 # 71-21, of. 502", fid="addr"), fid="addr")}
        {K.field("Zona horaria", K.select("America/Bogota (GMT-5)", fid="tz"), fid="tz")}
        {K.field("Logo (URL)", K.input("https://juanitoxpeditions.co/logo.png", fid="logo"), fid="logo")}
        {K.field("Descripción de la actividad", '<div class="textarea">Organizamos expediciones grupales de alta montaña en Colombia y Perú: cupos limitados por salida, guías certificados y logística incluida.</div>', full=True, fid="desc")}
        <div class="form-actions">{btn("Guardar cambios")}</div>
      </div>
    </section>
    <section class="card">
      <h2>Horario de atención</h2><p class="lead">Horario general de la empresa: fuera de él la IA lo informa al cliente.</p>
      <p class="muted small" style="margin-top:12px">Lun–Vie 8:00–18:00 · Sáb 9:00–13:00 · Dom cerrado</p>
    </section>
    </div>"""


# ----------------------------------------------------------------------------- Funciones
FEATURES = {
    "payment_plans": ("Planes de pago", "Anticipo, cuotas y saldo por pedido; el agente explica cómo se paga.", "calendar-clock"),
    "collections": ("Cobranza", "Cartera, recordatorios de cuotas y promesas de pago.", "hand-coins"),
    "fx_quotes": ("Precios en otra moneda", "Cotiza en pesos a la TRM del día y fija la tasa al confirmar.", "arrow-right-left"),
    "documents": ("Documentos del cliente", "Contratos, recibos, estados de cuenta y cuentas de cobro en PDF.", "file-text"),
}


def frow(code: str, on: bool, source: str, niche_name: str = "", locked: bool = False, dep_off: bool = False, disabled: bool = False) -> str:
    label, desc, icon = FEATURES[code]
    origin = {
        "niche": badge(f"Sugerida por {niche_name}", "violet"),
        "tenant": badge("Activada por ti" if on else "Apagada por ti", "ok" if on else "off"),
        "platform": badge("Fijada por Axi", "warn", icon="lock"),
        "default": badge("Apagada", "off"),
    }[source]
    meta = [origin]
    if code == "collections":
        dep = f'<span class="dep">{ic("triangle-alert" if dep_off else "link", size=13)}{"Necesita Planes de pago" if dep_off else "Usa Planes de pago"}</span>'
        meta.append(dep)
    if locked:
        meta.append('<span>Axi la fijó para este negocio. Escríbenos si la necesitas.</span>')
    ctl_txt = "Fijada" if locked else ("Encendida" if on else "Apagada")
    ctl = f'<div class="ctl">{ic("lock", size=14) if locked else ""}<span>{ctl_txt}</span>{K.switch(on and not dep_off, disabled=locked or disabled or dep_off, label=label)}</div>'
    return f"""<div class="frow {'' if on and not dep_off else 'off'}">
      <div class="fic">{ic(icon, size=18)}</div>
      <div><div class="ft">{label}</div><p class="fd">{desc}</p><div class="fm">{"".join(meta)}</div></div>
      {ctl}
    </div>"""


def features_card(rows: str, lead: str, foot: str = "") -> str:
    foot = foot or f'<span>{ic("info", size=14)} Todas requieren la capacidad <b>Ventas</b> de tu plan.</span><a href="#">Ver mi plan</a>'
    return f"""<section class="card" aria-labelledby="ft-title">
      <div class="card-head"><div><h2 id="ft-title">{ic("sliders-horizontal", size=17)} Funciones</h2><p class="lead">{lead}</p></div></div>
      <div>{rows}</div>
      <div class="card-foot">{foot}</div>
    </section>"""


JXP_LEAD = "Lo que tu negocio tiene encendido. <b>Hoteles y turismo</b> sugiere unas; tú decides cuáles usas. Las marcadas con candado las fijó Axi."


def view_features_jxp() -> str:
    rows = (
        frow("payment_plans", True, "niche", "Hoteles y turismo")
        + frow("collections", True, "niche", "Hoteles y turismo")
        + frow("fx_quotes", True, "tenant")
        + frow("documents", False, "platform", locked=True)
    )
    return f'<div class="page">{head("Funciones")}{features_card(rows, JXP_LEAD)}</div>'


def view_features_savage() -> str:
    rows = (
        frow("payment_plans", False, "default")
        + frow("collections", False, "default", dep_off=True)
        + frow("fx_quotes", False, "default")
        + frow("documents", False, "default")
    )
    lead = "Lo que tu negocio tiene encendido. <b>Retail y moda</b> no sugiere funciones de cobro; enciende las que necesites."
    return f'<div class="page">{head("Funciones", "Savage")}{features_card(rows, lead)}</div>'


def view_states() -> str:
    sk = f"""<section class="card" role="status" aria-label="Cargando funciones">
      <div class="card-head"><div>{K.skeleton("140px", "20px")}{K.skeleton("420px", "13px", "margin-top:8px")}</div></div>
      {"".join(f'<div class="frow"><div class="sk" style="width:40px;height:40px;border-radius:12px"></div><div>{K.skeleton("180px", "15px")}{K.skeleton("380px", "12px", "margin-top:8px")}{K.skeleton("150px", "20px", "margin-top:10px;border-radius:999px")}</div><div class="sk" style="width:32px;height:18px;border-radius:999px;margin-top:10px"></div></div>' for _ in range(3))}
    </section>"""
    locked = f"""<div style="position:relative">{features_card(frow("documents", False, "platform", locked=True), JXP_LEAD)}
      <div class="toast err" role="alert">{ic("circle-alert", size=18)}<div><b>Axi fijó esta función</b><small>No se puede cambiar desde aquí (409 features/locked_by_platform). Escríbenos si la necesitas.</small></div></div>
    </div>"""
    nosales = f"""<section class="card">
      <div class="card-head"><div><h2>{ic("sliders-horizontal", size=17)} Funciones</h2><p class="lead">{JXP_LEAD}</p></div></div>
      {K.notice("warn", "<b>Tu plan no incluye Ventas.</b> Las funciones de cobro dependen de esa capacidad: puedes verlas, pero no encenderlas.", acts=btn("Ver planes", "", "outline sm") + btn("Hablar con Axi", "message-circle", "ghost sm"))}
      <div style="opacity:.6;margin-top:8px">{frow("payment_plans", False, "niche", "Hoteles y turismo", disabled=True)}{frow("fx_quotes", False, "niche", "Hoteles y turismo", disabled=True)}</div>
    </section>"""
    return f"""<div class="page">{head("Funciones")}
      <p class="muted small">1 · Cargando (skeleton con la forma de las filas; nunca pintar-y-quitar)</p>{sk}
      <p class="muted small">2 · Intento de cambiar una fijada por Axi: el interruptor está deshabilitado y, si llega el 409, aviso flotante</p>{locked}
      <p class="muted small">3 · Plan sin la capacidad Ventas (403 entitlements): se explica, no se rompe</p>{nosales}
    </div>"""


def view_mobile() -> str:
    rows = frow("payment_plans", True, "niche", "Hoteles y turismo") + frow("collections", True, "niche", "Hoteles y turismo") + frow("fx_quotes", True, "tenant") + frow("documents", False, "platform", locked=True)
    return f"""<div class="page" style="padding:12px 16px 40px">
      {K.crumb("Mi empresa")}
      <div class="header"><div><h1 style="font-size:22px">JuanitoXpeditions</h1></div></div>
      {K.nav(COMPANY_TABS, "Funciones", "Secciones de la empresa", "sm")}
      {features_card(rows, JXP_LEAD)}
    </div>"""


VIEWS = [
    ("general", "1 · General", view_general(), "Mi empresa › General gana «Tipo de negocio» (el nicho del onboarding, ahora editable). Es un Select con los nueve nichos; su ayuda enlaza a Funciones. «Medios de pago» ya no es pestaña de Mi empresa: se mueve al hub Pagos (Ventas)."),
    ("funciones", "2 · Funciones (JXP)", view_features_jxp(), "Pestaña Funciones para una agencia (hoteles y turismo): cuatro filas con nombre, descripción, origen como badge secondary + punto (violeta = sugerida por el nicho, verde = activada por ti, ámbar + candado = fijada por Axi) e interruptor coral. La fijada por Axi tiene el interruptor deshabilitado y explica qué hacer."),
    ("savage", "3 · Funciones (Savage)", view_features_savage(), "El mismo panel para una tienda de ropa: nada sugerido, todo apagado. Cobranza no se puede encender sin Planes de pago (dependencia de un nivel, fail-closed) y lo dice en su fila."),
    ("estados", "4 · Estados", view_states(), "Cargando, 409 «fijada por Axi» y plan sin Ventas (403 de capacidad). Destructivo/error en rojo, nunca coral."),
    ("movil", "5 · Móvil", view_mobile(), "A 390 px: la pastilla en tamaño sm, las filas pierden el icono y el interruptor sigue a la derecha."),
]

if __name__ == "__main__":
    K.build_html("Tipo de negocio y funciones", "Mockup F0 · no es producto", "Cobros · F1 «Tipo de negocio y funciones por tenant»", VIEWS)
    K.export_artboards([
        {"file": "company-general.dc.html", "title": "Mi empresa · General · Tipo de negocio", "body": view_general(), "w": 1280, "h": 1180},
        {"file": "company-features-jxp.dc.html", "title": "Funciones · JuanitoXpeditions", "body": view_features_jxp(), "w": 1280, "h": 820},
        {"file": "company-features-jxp-dark.dc.html", "title": "Funciones · JuanitoXpeditions · oscuro", "body": view_features_jxp(), "w": 1280, "h": 820, "dark": True},
        {"file": "company-features-savage.dc.html", "title": "Funciones · Savage (retail)", "body": view_features_savage(), "w": 1280, "h": 820},
        {"file": "company-features-states.dc.html", "title": "Funciones · estados", "body": view_states(), "w": 1280, "h": 1560},
        {"file": "company-features-mobile.dc.html", "title": "Funciones · móvil", "body": view_mobile(), "w": 390, "h": 1180},
    ])
