#!/usr/bin/env python3
"""Mockup «Hub Pagos» (cobros_frontend_plan.md §4; F2 = Medios + Moneda y TRM).

Ventas › Pagos con pestañas Medios · Plan de pagos · Moneda y TRM · Documentos, filtradas por
función. Aquí se diseñan Medios (PaymentMethodsTab, movida desde Mi empresa) y Moneda y TRM (tarjeta
de TRM + ajustes `settings.fx`); Plan de pagos y Documentos llegan con los mockups de F4 y F7.
Estados: sin serie, tasa manual vigente, fuente sin actualizar, Savage (sin función) y 403 por URL
directa; móvil.

Uso:  python3 payments-hub.build.py
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("payments-hub")
ic, btn, badge = K.ic, K.btn, K.badge

HUB_TABS = [("Medios", "wallet"), ("Plan de pagos", "calendar-clock"), ("Moneda y TRM", "arrow-right-left"), ("Documentos", "file-text")]


def head(active: str, tabs=HUB_TABS, name: str = "JuanitoXpeditions") -> str:
    return f"""
    {K.crumb("Ventas", "Pagos")}
    <div class="header">
      <div><h1>Pagos</h1><p class="lead">Cómo te pagan tus clientes: medios, plan de pagos, moneda y documentos.</p></div>
    </div>
    {K.nav(tabs, active, "Secciones de pagos")}"""


# ----------------------------------------------------------------------------- Medios
def pm(icon: str, label: str, kind: str, detail: str, ai: bool = True, instr: str = "") -> str:
    vis = badge("Visible para la IA", "ai", icon="sparkles") if ai else badge("Solo operadores")
    ins = f'<p class="pd small" style="margin-top:6px">{instr}</p>' if instr else ""
    return f"""<article class="pm" aria-label="{label}">
      <div class="pic">{ic(icon, size=19)}</div>
      <div><div class="pt">{label}<small>{kind}</small>{vis}</div><p class="pd tnum">{detail}</p>{ins}</div>
      <div class="acts">{btn("", "pencil", "ghost icon sm", 'aria-label="Editar"')}{btn("", "trash-2", "ghost icon sm", 'aria-label="Eliminar"')}</div>
    </article>"""


def view_medios() -> str:
    return f"""<div class="page">{head("Medios")}
    <section class="card">
      <div class="card-head"><div><h2>Medios de pago</h2><p class="lead">Los que la IA ofrece al cliente cuando va a pagar. El comprobante debe indicar el monto.</p></div><div class="right">{btn("Añadir medio", "plus", "sm")}</div></div>
      <div class="stack" style="gap:10px">
        {pm("landmark", "Bancolombia ahorros", "Bancolombia", "···· 4521 · Titular: JuanitoXpeditions SAS", instr="Envía el comprobante por este chat con el número de pedido.")}
        {pm("smartphone", "Nequi", "Nequi", "300 ··· 4567 · Titular: Juan Pérez")}
        {pm("banknote", "Efectivo en oficina", "Efectivo", "Sin número de cuenta", ai=False)}
      </div>
    </section>
    </div>"""


# ----------------------------------------------------------------------------- Moneda y TRM
def fx_card(mode: str = "ok") -> str:
    """mode: ok | stale | manual | empty."""
    if mode == "empty":
        return f"""<section class="card">
          <div class="card-head"><div><h2>{ic("arrow-right-left", size=17)} TRM de hoy</h2><p class="lead">Dólar → peso, fuente oficial (Superfinanciera).</p></div></div>
          {K.notice("info", "<b>Aún no hay TRM publicada.</b> La serie se carga sola a las 18:30 (hora Bogotá). Mientras tanto puedes fijar una tasa manual con vigencia.", acts=btn("Fijar tasa manual", "pencil", "outline sm"))}
        </section>"""
    official = "3.100,45"
    when = badge("Vigente 16 sep 2026", "ok") if mode != "stale" else badge("Sin actualizar desde 13 sep", "warn")
    src = badge("Superfinanciera", "outline")
    eff_rows = {
        "ok": f'<div class="fx-row"><span class="k">Tu ajuste</span><span class="v">+2,00 %</span></div><div class="fx-row"><span class="k">Tu tasa efectiva</span><span class="v">$ 3.162,46</span></div>',
        "stale": f'<div class="fx-row"><span class="k">Tu ajuste</span><span class="v">+2,00 %</span></div><div class="fx-row"><span class="k">Tu tasa efectiva</span><span class="v">$ 3.162,46</span></div>',
        "manual": f'<div class="fx-row"><span class="k">Tu tasa manual</span><span class="v">$ 3.200,00 {badge("hasta 31 dic 2026", "warn")}</span></div><div class="fx-row"><span class="k">Tu tasa efectiva</span><span class="v">$ 3.200,00</span></div>',
    }[mode]
    note = ""
    if mode == "stale":
        note = K.notice("warn", "La fuente oficial no publicó los últimos días; se usa la última TRM conocida. Si necesitas otra, fija una tasa manual.", cls="inline")
    if mode == "manual":
        note = K.notice("info", "Mientras la manual esté vigente, manda sobre la oficial y el ajuste. Al vencer vuelve la TRM del día.", cls="inline")
    return f"""<section class="card">
      <div class="card-head"><div><h2>{ic("arrow-right-left", size=17)} TRM de hoy</h2><p class="lead">Dólar → peso, fuente oficial (Superfinanciera).</p></div><div class="right">{btn("", "refresh-cw", "ghost icon sm", 'aria-label="Actualizar"')}</div></div>
      <div class="fx-big">$ {official}</div>
      <div class="fx-sub">{src}{when}<span>actualizada ayer 18:31</span></div>
      <div style="margin-top:14px">{eff_rows}</div>
      <div class="fx-eq">Un paquete de <b>US$ 3.500</b> se cotiza hoy en <b>≈ $ {"11.200.000" if mode == "manual" else "11.068.610"}</b></div>
      {f'<div style="margin-top:12px">{note}</div>' if note else ""}
    </section>"""


def fx_form(manual: bool = False) -> str:
    man_on = manual
    manual_fields = f"""
      <div class="field"><label for="mrate">Tasa manual</label>{K.input("3.200,00" if manual else "", placeholder="p. ej. 3.150,00", cls="adorn", icon="badge-dollar-sign", fid="mrate")}</div>
      <div class="field"><label for="muntil">Vigente hasta</label>{K.input("31/12/2026" if manual else "", placeholder="dd/mm/aaaa", cls="adorn", icon="calendar", fid="muntil")}</div>
    """ if man_on else ""
    return f"""<section class="card">
      <div class="card-head"><div><h2>Ajustes de moneda</h2><p class="lead">Tu catálogo está en <b>USD</b>; tus clientes pagan en <b>COP</b>. Aquí decides con qué tasa cotizas.</p></div></div>
      <div class="form">
        {K.field("Moneda en la que cobras", K.select("COP · Peso colombiano", fid="settle"), hint="Se fija al confirmar el pedido: el total queda en pesos a la tasa de ese momento.", fid="settle")}
        {K.field("Ajuste sobre la TRM", K.input("2,00 %", cls="adorn", icon="percent", fid="spread"), hint="Hasta 20 %. Cubre la comisión de cambio; se suma a la oficial.", fid="spread")}
        <div class="field full" style="flex-direction:row;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px solid var(--border-soft)">
          <div><span class="lbl">Usar una tasa manual</span><p class="hint">Cuando la oficial no te sirve (fuente caída, acuerdo especial). Vence sola.</p></div>{K.switch(man_on, label="Usar una tasa manual")}
        </div>
        {manual_fields}
        <div class="field full" style="flex-direction:row;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px solid var(--border-soft)">
          <div><span class="lbl">Mostrar el precio en pesos al cotizar</span><p class="hint">El agente dice «≈ $ 11.068.610 a la TRM de hoy» junto al precio en dólares. Indicativo hasta confirmar.</p></div>{K.switch(True, label="Mostrar el precio en pesos al cotizar")}
        </div>
        <div class="form-actions">{btn("Guardar cambios")}</div>
      </div>
    </section>"""


def how_it_works() -> str:
    return f"""<section class="card">
      <h2>Cómo se aplica</h2>
      <div class="grid3" style="margin-top:12px">
        <div class="notice" style="grid-template-columns:20px 1fr">{ic("tag", size=18)}<div><b>Catálogo en USD.</b> Los precios de tus salidas no cambian.</div></div>
        <div class="notice" style="grid-template-columns:20px 1fr">{ic("message-circle", size=18)}<div><b>Cotización indicativa.</b> El agente muestra el equivalente en pesos a la tasa del día.</div></div>
        <div class="notice" style="grid-template-columns:20px 1fr">{ic("lock", size=18)}<div><b>Se congela al confirmar.</b> El total del pedido queda en pesos con la tasa de ese momento.</div></div>
      </div>
    </section>"""


def view_moneda(mode: str = "ok") -> str:
    return f"""<div class="page">{head("Moneda y TRM")}
      <div class="grid2">{fx_card(mode)}{fx_form(manual=(mode == "manual"))}</div>
      {how_it_works()}
    </div>"""


def view_estados() -> str:
    return f"""<div class="page">{head("Moneda y TRM")}
      <p class="muted small">1 · Sin serie todavía (tenant recién encendido antes de las 18:30)</p>
      <div class="grid2">{fx_card("empty")}{fx_form()}</div>
      <p class="muted small">2 · Tasa manual vigente: manda sobre la oficial</p>
      <div class="grid2">{fx_card("manual")}{fx_form(manual=True)}</div>
      <p class="muted small">3 · Fuente sin actualizar: se usa la última conocida y se avisa</p>
      <div class="grid2">{fx_card("stale")}{fx_form()}</div>
    </div>"""


def view_savage() -> str:
    only = [("Medios", "wallet")]
    forbidden = f"""<section class="card"><div class="empty">
      <div class="eic">{ic("lock", size=22)}</div>
      <h3>Esta función está apagada</h3>
      <p>«Precios en otra moneda» no está activa para tu negocio. Si vendes en otra moneda, enciéndela en Mi empresa › Funciones.</p>
      <div class="acts">{btn("Ir a Funciones", "sliders-horizontal", "outline sm")}{btn("Volver a Pagos", "", "ghost sm")}</div>
      <p class="muted small mono">403 features/feature_disabled · fx_quotes</p>
    </div></section>"""
    return f"""<div class="page">{head("Medios", only, "Savage")}
      <section class="card">
        <div class="card-head"><div><h2>Medios de pago</h2><p class="lead">Los que la IA ofrece al cliente cuando va a pagar.</p></div><div class="right">{btn("Añadir medio", "plus", "sm")}</div></div>
        <div class="stack" style="gap:10px">{pm("smartphone", "Nequi Savage", "Nequi", "310 ··· 8890 · Titular: Savage SAS")}{pm("link", "Link de pago Wompi", "Link de pago", "Sin número de cuenta")}</div>
      </section>
      <p class="muted small">URL directa a /settings/payments/moneda con la función apagada:</p>
      {forbidden}
    </div>"""


def view_mobile() -> str:
    return f"""<div class="page" style="padding:12px 16px 40px">
      {K.crumb("Ventas", "Pagos")}
      <div class="header"><div><h1 style="font-size:22px">Pagos</h1></div></div>
      {K.nav(HUB_TABS, "Moneda y TRM", "Secciones de pagos", "sm")}
      {fx_card("ok")}{fx_form()}
    </div>"""


VIEWS = [
    ("medios", "1 · Medios", view_medios(), "Ventas › Pagos: el hub con cuatro pestañas (NavTabs por sub-ruta) filtradas por función; «Medios» es la PaymentMethodsTab actual, movida desde Mi empresa (redirect 308 desde /settings/company/pagos)."),
    ("moneda", "2 · Moneda y TRM", view_moneda(), "Izquierda: la TRM oficial del día con fuente, vigencia y tu tasa efectiva, más un ejemplo con un paquete real. Derecha: ajustes de `settings.fx` (moneda en la que cobras, ajuste %, tasa manual con vigencia, mostrar precio en pesos). Abajo, cómo se aplica en tres pasos."),
    ("estados", "3 · Estados", view_estados(), "Sin serie (antes del primer fetch de las 18:30), tasa manual vigente (manda) y fuente sin actualizar (se usa la última conocida y se avisa en ámbar)."),
    ("savage", "4 · Savage y 403", view_savage(), "Un negocio sin funciones de cobro ve el hub con una sola pestaña. Si entra por URL directa a una pestaña apagada, el backend responde 403 features/feature_disabled y la vista lo explica con salida a Funciones."),
    ("movil", "5 · Móvil", view_mobile(), "A 390 px: pastilla sm con scroll interno, las dos tarjetas apiladas."),
]

if __name__ == "__main__":
    K.build_html("Hub Pagos: medios, moneda y TRM", "Mockup F0 · no es producto", "Cobros · F2 «Hub Pagos · Moneda y TRM»", VIEWS)
    K.export_artboards([
        {"file": "payments-medios.dc.html", "title": "Pagos · Medios", "body": view_medios(), "w": 1280, "h": 680},
        {"file": "payments-moneda.dc.html", "title": "Pagos · Moneda y TRM", "body": view_moneda(), "w": 1280, "h": 1080},
        {"file": "payments-moneda-dark.dc.html", "title": "Pagos · Moneda y TRM · oscuro", "body": view_moneda(), "w": 1280, "h": 1080, "dark": True},
        {"file": "payments-moneda-states.dc.html", "title": "Pagos · Moneda · estados", "body": view_estados(), "w": 1280, "h": 2400},
        {"file": "payments-savage.dc.html", "title": "Pagos · Savage y 403", "body": view_savage(), "w": 1280, "h": 960},
        {"file": "payments-moneda-mobile.dc.html", "title": "Pagos · Moneda · móvil", "body": view_mobile(), "w": 390, "h": 1500},
    ])
