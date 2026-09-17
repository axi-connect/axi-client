#!/usr/bin/env python3
"""Mockup «Fecha de salida» (F2.a): el atributo de tipo `date` en el editor de producto/variante y
la fecha del servicio en el rail del pedido, con el 422 de fechas mixtas.

Uso:  python3 catalog-service-date.build.py
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("catalog-service-date")
ic, btn, badge = K.ic, K.btn, K.badge


def attributes_section() -> str:
    return f"""<section class="card">
      <div class="card-head"><div><h2>Atributos de «Expedición»</h2><p class="lead">Definen las variantes: cada salida es una variante con su fecha y sus cupos.</p></div></div>
      <div class="form">
        {K.field("Destino", K.input("Sierra Nevada del Cocuy", fid="dest"), fid="dest")}
        {K.field("Duración", K.input("5", cls="adorn", icon="clock", fid="dur"), hint="Días.", fid="dur")}
        {K.field("Fecha de salida", K.input("14/03/2027", cls="adorn", icon="calendar", fid="date"), hint="Tipo <b>fecha</b>: define la fecha del servicio de esta variante; el pedido la hereda y de ahí sale el vencimiento del saldo.", fid="date")}
        {K.field("Nivel", K.select("Intermedio", fid="lvl"), fid="lvl")}
        <div class="form-actions">{btn("Guardar variante")}</div>
      </div>
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Variantes</h2><p class="lead">Una por salida. Los cupos son catálogo local.</p></div><div class="right">{btn("Nueva salida", "plus", "outline sm")}</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Salida</th><th>Fecha del servicio</th><th>Precio</th><th>Cupos</th><th></th></tr></thead>
        <tbody>
          <tr><td><span class="t">Cocuy · marzo</span><span class="d mono">JXP-COCUY-0314</span></td><td>{badge("14 mar 2027", "info", icon="calendar")}</td><td class="tnum">US$ 3.500</td><td class="tnum">6 / 12</td><td>{btn("", "pencil", "ghost icon sm", 'aria-label="Editar"')}</td></tr>
          <tr><td><span class="t">Cocuy · marzo (2.ª)</span><span class="d mono">JXP-COCUY-0321</span></td><td>{badge("21 mar 2027", "info", icon="calendar")}</td><td class="tnum">US$ 3.500</td><td class="tnum">12 / 12</td><td>{btn("", "pencil", "ghost icon sm", 'aria-label="Editar"')}</td></tr>
          <tr><td><span class="t">Salkantay · julio</span><span class="d mono">JXP-SALK-0710</span></td><td>{badge("10 jul 2027", "info", icon="calendar")}</td><td class="tnum">US$ 2.900</td><td class="tnum">0 / 10</td><td>{btn("", "pencil", "ghost icon sm", 'aria-label="Editar"')}</td></tr>
        </tbody></table></div>
    </section>"""


def order_rail(mixed: bool = False) -> str:
    err = K.notice("err", "<b>Fechas de servicio distintas.</b> Los ítems de este pedido corresponden a salidas diferentes (14 mar y 21 mar). Abre otro pedido para la segunda salida. <span class='mono muted'>422 orders/mixed_service_dates</span>") if mixed else ""
    return f"""<aside class="rail" aria-label="Pedido JX-0042">
      <div class="rail-head"><div><b>Pedido JX-0042</b><div class="muted small">Laura Gómez · WhatsApp</div></div>{badge("Confirmado", "ok")}</div>
      <div class="rail-body">
        {err}
        <div class="rsec"><h3>Servicio</h3>
          <div class="rline"><span class="k">Fecha del servicio</span><span class="v">{ic("calendar", size=14)} sáb 14 mar 2027 {btn("Cambiar", "", "ghost xs")}</span></div>
          <div class="rline"><span class="k">Faltan</span><span class="v tnum">179 días</span></div>
        </div>
        <div class="rsec"><h3>Ítems</h3>
          <div class="rline"><span class="k">Cocuy · marzo × 2</span><span class="v tnum">US$ 7.000</span></div>
        </div>
        <div class="rsec"><h3>Total</h3>
          <div class="rline"><span class="k">Total</span><span class="v tnum">US$ 7.000</span></div>
          <div class="rline"><span class="k">≈ en pesos</span><span class="v tnum muted">$ 21.703.150 <span class="small">(TRM 3.100,45 hoy)</span></span></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">{btn("Registrar pago", "banknote", "sm")}{btn("Ver en el catálogo", "external-link", "outline sm")}</div>
      </div>
    </aside>"""


def view_main(mixed: bool = False) -> str:
    return f"""<div style="display:grid;grid-template-columns:minmax(0,1fr) 380px;min-height:920px">
      <div class="page" style="max-width:none">
        {K.crumb("Ventas", "Catálogo", "Expedición Cocuy")}
        <div class="header"><div><h1>Expedición Cocuy</h1><p class="lead">Producto tipo «Expedición» · 3 variantes</p></div><div class="right">{badge("Catálogo local", "outline")}{btn("Guardar", "", "sm")}</div></div>
        {attributes_section()}
      </div>
      {order_rail(mixed)}
    </div>"""


VIEWS = [
    ("variante", "1 · Fecha en la variante", view_main(), "El tipo de atributo `date` en el editor (input de fecha nativo con icono) alimenta la fecha del servicio de la variante; la tabla de variantes la muestra como badge. A la derecha, el rail del pedido: «Fecha del servicio» heredada, días que faltan y el equivalente indicativo en pesos."),
    ("mixtas", "2 · Fechas mixtas (422)", view_main(mixed=True), "Si el pedido mezcla salidas distintas, el backend responde 422 orders/mixed_service_dates y el rail lo explica: abrir otro pedido para la segunda salida. El agente hace lo mismo por chat."),
]

if __name__ == "__main__":
    K.build_html("Fecha de salida en catálogo y pedido", "Mockup F0 · no es producto", "Cobros · F2 «Fecha del servicio»", VIEWS)
    K.export_artboards([
        {"file": "catalog-service-date.dc.html", "title": "Catálogo · fecha de salida + rail del pedido", "body": view_main(), "w": 1280, "h": 940},
        {"file": "catalog-service-date-mixed.dc.html", "title": "Pedido · fechas mixtas (422)", "body": view_main(mixed=True), "w": 1280, "h": 940},
    ])
