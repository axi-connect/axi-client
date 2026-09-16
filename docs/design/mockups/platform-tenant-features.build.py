#!/usr/bin/env python3
"""Mockup «Funciones del tenant» en la consola de plataforma (cobros_frontend_plan.md §4, F1).

Vistas: pestaña Funciones del detalle de tenant (efectiva, origen, control Heredar / Forzar ON /
Forzar OFF, motivo); tema oscuro; diálogo de forzar con motivo (auditado).

Uso:  python3 platform-tenant-features.build.py
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("platform-tenant-features")
ic, btn, badge = K.ic, K.btn, K.badge

TABS = [("Resumen", "layout-dashboard"), ("Usuarios", "users"), ("Plan & Límites", "gauge"), ("Facturación", "receipt"), ("Base de datos", "database"), ("Auditoría", "scroll-text"), ("Funciones", "sliders-horizontal")]


def head() -> str:
    return f"""
    {K.crumb("Plataforma", "Tenants", "JuanitoXpeditions")}
    <div class="header">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><h1>JuanitoXpeditions</h1>{badge("Activo", "ok")}<span class="muted small">NIT <span class="mono">901234567-8</span> · Plan Pro · Bogotá</span></div>
      <div class="right">{btn("", "ellipsis-vertical", "outline icon sm", 'aria-label="Acciones del tenant"')}</div>
    </div>
    {K.nav(TABS, "Funciones", "Secciones del tenant", "inline")}"""


def seg3(active: str, disabled: bool = False) -> str:
    opts = [("Heredar", "corner-down-right"), ("Forzar ON", "toggle-right"), ("Forzar OFF", "toggle-left")]
    b = "".join(
        f'<button role="radio" aria-checked="{str(t == active).lower()}" {"disabled" if disabled else ""}>{ic(i, size=13)}{t}</button>' for t, i in opts
    )
    return f'<div class="seg sm inline" role="radiogroup" aria-label="Override de plataforma">{b}</div>'


ROWS = [
    ("Planes de pago", "payment_plans", True, badge("Nicho: Hoteles y turismo", "violet"), "Heredar", ""),
    ("Cobranza", "collections", True, badge("Nicho: Hoteles y turismo", "violet"), "Heredar", '<span class="muted small">requiere payment_plans</span>'),
    ("Precios en otra moneda", "fx_quotes", True, badge("Tenant", "ok"), "Heredar", ""),
    ("Documentos del cliente", "documents", False, badge("Plataforma", "warn", icon="lock"), "Forzar OFF", '<span class="small">Piloto de PDF aún no habilitado para este tenant</span><span class="muted small" style="display:block">Cristian · 16 sep 2026 10:42</span>'),
]


def table() -> str:
    body = ""
    for label, code, on, origin, ctl, reason in ROWS:
        eff = badge("Encendida", "ok") if on else badge("Apagada", "off")
        body += f"""<tr>
          <td><span class="t">{label}</span><span class="d mono">{code}</span></td>
          <td>{eff}</td><td>{origin}</td><td>{seg3(ctl)}</td><td>{reason or '<span class="muted">—</span>'}</td>
        </tr>"""
    return f"""<div class="table-wrap"><table>
      <thead><tr><th>Función</th><th>Efectiva</th><th>Origen</th><th>Control de plataforma</th><th>Motivo</th></tr></thead>
      <tbody>{body}</tbody></table></div>"""


def card(extra: str = "") -> str:
    return f"""<section class="card" style="position:relative">
      <div class="card-head"><div><h2>{ic("sliders-horizontal", size=17)} Funciones</h2><p class="lead">Lo efectivo para este tenant y de dónde sale (plataforma › tenant › nicho). <b>Forzar</b> fija la función: el tenant la ve con candado y no puede cambiarla. Cada cambio queda en Auditoría.</p></div>
        <div class="right">{badge("Tipo de negocio: Hoteles y turismo", "outline")}{badge("Capacidad Ventas incluida", "outline")}</div></div>
      {table()}
      <div class="card-foot"><span>{ic("info", size=14)} Heredar borra el override: vuelve a mandar lo que el tenant decida sobre la sugerencia del nicho.</span><a href="#">Ver en Auditoría</a></div>
      {extra}
    </section>"""


def view_main() -> str:
    return f'<div class="page">{head()}{card()}</div>'


def view_dialog() -> str:
    dlg = f"""<div class="overlay"><div class="modal" role="dialog" aria-labelledby="dlg-t">
      <div><h2 id="dlg-t">Forzar OFF «Documentos del cliente»</h2><p>JuanitoXpeditions verá la función bloqueada con candado y no podrá encenderla. Se registra en la auditoría de plataforma.</p></div>
      <div class="field"><label for="reason">Motivo</label><div class="textarea" id="reason">Piloto de PDF aún no habilitado para este tenant</div><p class="hint">Obligatorio. El tenant no lo ve; queda en Auditoría junto a tu usuario.</p></div>
      <div class="modal-foot">{btn("Cancelar", "", "outline")}{btn("Forzar OFF", "lock")}</div>
    </div></div>"""
    return f'<div class="page" style="min-height:820px">{head()}{card(dlg)}</div>'


VIEWS = [
    ("tenant", "1 · Funciones del tenant", view_main(), "Nueva pestaña «Funciones» en el detalle de tenant: qué está efectivo, de dónde sale (nicho, tenant, plataforma) y el control de plataforma como segmentado Heredar / Forzar ON / Forzar OFF, con motivo. Pastilla inline (ya vive en superficie elevada)."),
    ("dialogo", "2 · Forzar con motivo", view_dialog(), "Forzar pide motivo (obligatorio) y avisa del efecto en el tenant; queda auditado (`platform.feature_override_set`). Glass solo en el modal, que es flotante."),
]

if __name__ == "__main__":
    K.build_html("Funciones por tenant (consola)", "Mockup F0 · no es producto", "Cobros · F1 «Overrides de plataforma»", VIEWS)
    K.export_artboards([
        {"file": "platform-tenant-features.dc.html", "title": "Consola · Tenant · Funciones", "body": view_main(), "w": 1280, "h": 760},
        {"file": "platform-tenant-features-dark.dc.html", "title": "Consola · Tenant · Funciones · oscuro", "body": view_main(), "w": 1280, "h": 760, "dark": True},
        {"file": "platform-tenant-features-dialog.dc.html", "title": "Consola · Forzar OFF con motivo", "body": view_dialog(), "w": 1280, "h": 860},
    ])
