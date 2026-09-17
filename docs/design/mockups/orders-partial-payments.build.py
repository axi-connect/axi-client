#!/usr/bin/env python3
"""Mockup «El abono» (cobros_frontend_plan.md §4, F3).

Lo que F3 cambia en la interfaz: el pedido deja de estar pagado o no pagado y pasa a tener
saldo. Vistas: el rail del pedido con total dual, pagado y saldo; el diálogo de verificación
con el monto obligatorio y el aviso de sobrepago; los estados de error (monto faltante, pago
mayor que el saldo); el kanban con el chip de progreso y sin columna nueva; el timeline con los
hechos nuevos; y la plantilla del aviso de abono.

Uso:  python3 orders-partial-payments.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("orders-partial-payments")
ic, btn, badge = K.ic, K.btn, K.badge

EXTRA_CSS = """
/* progreso del cobro: barra fina, nunca una segunda columna del kanban */
.pay-bar{height:4px;border-radius:999px;background:var(--secondary);overflow:hidden;margin-top:8px}
.pay-bar i{display:block;height:100%;border-radius:999px;background:var(--axi-brand)}
.pay-chip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted-foreground);font-variant-numeric:tabular-nums;margin-top:6px}
.pay-chip b{color:var(--foreground);font-weight:500}
.money-dual{display:flex;flex-direction:column;gap:2px}
.money-dual .big{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
.money-dual .approx{font-size:12px;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
.kan{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.kan h3{font-family:var(--font-body);font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;display:flex;justify-content:space-between;align-items:center}
.kan .col{display:flex;flex-direction:column;gap:10px}
.ocard{border:1px solid var(--border);background:var(--background);border-radius:var(--radius-lg);padding:12px 14px;box-shadow:var(--shadow-float)}
.ocard .num{font-family:var(--font-mono);font-size:11.5px;font-weight:600;color:var(--muted-foreground)}
.ocard .who{display:flex;align-items:center;gap:8px;margin-top:8px}
.ocard .who b{font-size:13.5px;font-weight:500}
.ocard .tot{margin-top:8px;font-size:16px;font-weight:600;font-variant-numeric:tabular-nums}
.ocard .foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:11px;color:var(--muted-foreground)}
.tl{display:flex;flex-direction:column;gap:0}
.tl .ev{display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:start;padding:9px 0;border-bottom:1px solid var(--border-soft)}
.tl .ev:last-child{border-bottom:none}
.tl .ev .ic{margin-top:2px}
.tl .ev .t{font-size:13.5px}
.tl .ev .m{font-size:12px;color:var(--muted-foreground);margin-top:1px}
.tl .ev time{font-size:11.5px;color:var(--muted-foreground);white-space:nowrap}
.ok-i{color:var(--axi-success)} .warn-i{color:var(--axi-warning)} .violet-i{color:var(--axi-violet)} .brand-i{color:var(--axi-brand)}
.dlg-line{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--border-soft);font-size:13.5px}
.dlg-line .k{color:var(--muted-foreground)} .dlg-line .v{font-weight:500;font-variant-numeric:tabular-nums}
.tpl{border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;background:var(--background)}
.tpl .vars{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.tpl .var{font-family:var(--font-mono);font-size:11.5px;background:var(--secondary);border-radius:999px;padding:2px 9px}
.preview{margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--accent);font-size:13px;line-height:1.5}
"""


def money(big: str, approx: str = "") -> str:
    ap = f'<span class="approx">{approx}</span>' if approx else ""
    return f'<div class="money-dual"><span class="big">{big}</span>{ap}</div>'


def rail(state: str = "partial") -> str:
    """state: partial | paid | unfrozen"""
    paid, balance, pct = ("$ 6.510.945", "$ 15.192.205", 30) if state == "partial" else ("$ 21.703.150", "$ 0", 100)
    chip = badge("Abonado", "warn") if state == "partial" else badge("Pagado", "ok")
    total = money("US$ 7.000", "≈ $ 21.703.150 · TRM 3.100,45 del 16 sep") if state == "unfrozen" else money(
        "$ 21.703.150", "US$ 7.000 congelado a TRM 3.100,45 del 16 sep"
    )
    action = btn("Registrar abono", "banknote", "sm") if state != "paid" else btn("Ver recibo", "receipt", "outline sm")
    return f"""<aside class="rail" aria-label="Pedido JX-0042">
      <div class="rail-head"><div><b>Pedido JX-0042</b><div class="muted small">Laura Gómez · WhatsApp</div></div>{badge("Confirmado", "ok")}</div>
      <div class="rail-body">
        <div class="rsec"><h3>Cobro</h3>
          <div class="rline"><span class="k">Total</span><span class="v">{total}</span></div>
          <div class="rline"><span class="k">Pagado</span><span class="v">{paid}</span></div>
          <div class="rline"><span class="k">Saldo</span><span class="v">{balance} {chip}</span></div>
          <div class="pay-bar"><i style="width:{pct}%"></i></div>
          <div class="pay-chip"><b>{pct}%</b> cobrado</div>
        </div>
        <div class="rsec"><h3>Servicio</h3>
          <div class="rline"><span class="k">Fecha del servicio</span><span class="v">{ic("calendar", size=14)} sáb 14 mar 2027</span></div>
        </div>
        <div class="rsec"><h3>Pagos</h3>
          <div class="rline"><span class="k">{ic("landmark", size=14)} Bancolombia · 16 sep</span><span class="v">$ 6.510.945 {badge("Verificado", "ok")}</span></div>
          {'<div class="rline"><span class="k">' + ic("landmark", size=14) + ' Bancolombia · 17 sep</span><span class="v">$ 15.192.205 ' + badge("Por verificar", "warn") + '</span></div>' if state == "partial" else ""}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">{action}{btn("Ver comprobante", "paperclip", "outline sm")}</div>
      </div>
    </aside>"""


def timeline() -> str:
    rows = [
        ("circle-check", "ok-i", "Pago verificado por Isabel", "Abono de $ 6.510.945 · saldo $ 15.192.205", "16 sep 10:24"),
        ("arrow-right-left", "violet-i", "Total fijado en pesos", "US$ 7.000 a TRM 3.100,45 (Superfinanciera)", "16 sep 10:24"),
        ("hand-coins", "brand-i", "El pedido pasó a abonado", "Antes: sin pagos", "16 sep 10:24"),
        ("bell-ring", "ok-i", "Cliente avisado por WhatsApp", "«Recibimos tu abono de $ 6.510.945…»", "16 sep 10:25"),
        ("receipt", "warn-i", "Pago reportado por el agente IA", "Comprobante adjunto", "16 sep 10:20"),
    ]
    evs = "".join(
        f'<div class="ev">{ic(i, cls, size=16)}<div><div class="t">{t}</div><div class="m">{m}</div></div><time>{w}</time></div>'
        for i, cls, t, m, w in rows
    )
    return f"""<section class="card">
      <div class="card-head"><div><h2>Actividad</h2><p class="lead">Los dos hechos nuevos: el estado de cobro y la moneda congelada.</p></div></div>
      <div class="tl">{evs}</div>
    </section>"""


def dialog(mode: str = "ok") -> str:
    """mode: ok | missing | over"""
    err = ""
    value = "6.510.945"
    hint = "Sugerido: el saldo del pedido"
    cls = ""
    if mode == "missing":
        value, cls, err = "", "err", '<p class="err-msg">Escribe cuánto se verifica: de este monto salen el saldo y las cuotas.</p>'
        hint = ""
    if mode == "over":
        value, cls = "25.000.000", "err"
        err = '<p class="err-msg">Supera el saldo en $ 3.296.850. Acéptalo solo si el cliente pagó de más a propósito.</p>'
        hint = ""
    accept = """<div class="field full" style="flex-direction:row;align-items:center;justify-content:space-between;gap:16px;padding-top:8px">
        <div><span class="lbl">Aceptar el sobrepago</span><p class="hint">El excedente queda a favor del cliente.</p></div>""" + K.switch(False, label="Aceptar el sobrepago") + "</div>" if mode == "over" else ""
    return f"""<div class="overlay"><div class="modal" role="dialog" aria-labelledby="rev-t">
      <div><h2 id="rev-t">Verificar pago</h2><p>Bancolombia · Ref. ABONO-1 · comprobante adjunto</p></div>
      <div class="dlg-line"><span class="k">Total del pedido</span><span class="v">$ 21.703.150</span></div>
      <div class="dlg-line"><span class="k">Ya pagado</span><span class="v">$ 0</span></div>
      <div class="dlg-line"><span class="k">Saldo</span><span class="v">$ 21.703.150</span></div>
      <div class="form" style="margin-top:12px">
        <div class="field full">
          <label for="rev-amount">Monto verificado</label>
          {K.input(value, placeholder="0", cls="adorn " + cls, icon="banknote", fid="rev-amount")}
          {err or (f'<p class="hint">{hint}</p>' if hint else "")}
        </div>
        {accept}
        <div class="field full"><label for="rev-notes">Nota (opcional)</label><div class="textarea ph" id="rev-notes">Ej. consignación verificada en el banco</div></div>
        <div class="field full" style="flex-direction:row;align-items:center;justify-content:space-between;gap:16px">
          <span class="lbl">Notificar al cliente por WhatsApp</span>{K.switch(True, label="Notificar al cliente")}
        </div>
      </div>
      <div class="notice" style="margin-top:4px">{ic("info", size=18)}<div>Con este abono el pedido queda <b>Confirmado · Abonado</b>. Se cierra cuando el saldo llegue a cero.</div></div>
      <div class="modal-foot">{btn("Volver", "", "outline")}{btn("Verificar pago", "", "" if mode == "ok" else "", 'aria-disabled="true"' if mode == "missing" else "")}</div>
    </div></div>"""


def ocard(num: str, who: str, total: str, paid: str = "", pct: int = 0, chip: str = "") -> str:
    progress = f'<div class="pay-bar"><i style="width:{pct}%"></i></div><div class="pay-chip"><b>{paid}</b> de {total}</div>' if paid else ""
    return f"""<article class="ocard">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px"><span class="num">{num}</span>{chip}</div>
      <div class="who"><span class="av sm">{who[0]}</span><b>{who}</b></div>
      <div class="tot">{total}</div>
      {progress}
      <div class="foot">{badge("Agente IA", "violet")}<span>hace 2 h</span></div>
    </article>"""


def kanban() -> str:
    cols = [
        ("Pendientes", [ocard("JX-0051", "Andrés Ruiz", "$ 3.200.000")]),
        ("Confirmados", [
            ocard("JX-0042", "Laura Gómez", "$ 21.703.150", "$ 6.510.945", 30, badge("Abonado", "warn")),
            ocard("JX-0047", "Marta Díaz", "$ 8.400.000", "$ 4.200.000", 50, badge("Abonado", "warn")),
        ]),
        ("Pago reportado", [ocard("JX-0049", "Carlos Peña", "$ 1.900.000", "", 0, badge("Por verificar", "warn"))]),
        ("Pagados", [ocard("JX-0038", "Sara Lima", "$ 12.000.000", "", 0, badge("Pagado", "ok"))]),
    ]
    body = "".join(
        f'<div class="col"><h3>{name}<span class="muted">{len(cards)}</span></h3>{"".join(cards)}</div>'
        for name, cards in cols
    )
    return f"""<div class="page">
      {K.crumb("Ventas", "Pedidos")}
      <div class="header"><div><h1>Pedidos</h1><p class="lead">El cobro se ve en la tarjeta: sin columna nueva, el estado del pedido no cambia.</p></div></div>
      <div class="kan">{body}</div>
      <div class="notice" style="margin-top:4px">{ic("info", size=18)}<div><b>«Abonado» no es una columna.</b> Un pedido reservado con abono sigue siendo un pedido confirmado; lo que cambia es cuánto lleva cobrado.</div></div>
    </div>"""


def templates() -> str:
    return f"""<div class="page">
      {K.crumb("Ventas", "Pedidos", "Avisos al cliente")}
      <div class="header"><div><h1>Avisos al cliente</h1><p class="lead">Qué se le escribe al cliente en cada momento del pedido.</p></div></div>
      <section class="card">
        <div class="card-head"><div><h2>Abono recibido</h2><p class="lead">Se envía cada vez que verificas un abono. Un pedido con plan de pagos lo recibe varias veces.</p></div>{K.switch(True, label="Abono recibido")}</div>
        <div class="tpl">
          <div class="textarea">¡Gracias {{{{contact_name}}}}! Recibimos tu abono de {{{{amount}}}} para el pedido #{{{{order_number}}}}. Saldo pendiente: {{{{balance}}}}.</div>
          <div class="vars">{"".join(f'<span class="var">{{{{{v}}}}}</span>' for v in ["contact_name", "order_number", "amount", "balance", "total"])}</div>
          <div class="preview">¡Gracias Laura! Recibimos tu abono de $ 6.510.945 para el pedido #42. Saldo pendiente: $ 15.192.205.</div>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Pedido pagado</h2><p class="lead">Solo cuando el saldo llega a cero. Antes salía con el primer pago.</p></div>{K.switch(True, label="Pedido pagado")}</div>
        <div class="tpl"><div class="textarea">¡Gracias {{{{contact_name}}}}! Recibimos y verificamos tu pago del pedido #{{{{order_number}}}} por {{{{total}}}}.</div></div>
      </section>
    </div>"""


def rail_page(state: str = "partial", dlg: str = "") -> str:
    return f"""<div style="display:grid;grid-template-columns:minmax(0,1fr) 380px;min-height:900px;position:relative">
      <div class="page" style="max-width:none">
        {K.crumb("Ventas", "Pedidos", "JX-0042")}
        <div class="header"><div><h1>Pedido JX-0042</h1><p class="lead">Expedición Cocuy · salida 14 mar 2027 · 2 cupos</p></div>
          <div class="right">{badge("Confirmado", "ok")}{badge("Abonado 30%", "warn") if state == "partial" else badge("Pagado", "ok")}</div></div>
        {timeline()}
      </div>
      {rail(state)}
      {dlg}
    </div>"""


VIEWS = [
    ("rail", "1 · Rail con saldo", rail_page("partial"),
     "El pedido deja de estar pagado o no pagado: tiene total, pagado y saldo, con la barra de cobro. El total dual dice en qué moneda se cotizó y a qué tasa quedó congelado. Abajo, el timeline con los dos hechos nuevos: el cambio de estado de cobro y la moneda fijada."),
    ("verificar", "2 · Verificar con monto", rail_page("partial", dialog("ok")),
     "Verificar un pago ahora exige el monto, prellenado con el saldo. El diálogo muestra total, pagado y saldo antes de decidir, y dice en qué queda el pedido: confirmado y abonado, no pagado."),
    ("errores", "3 · Monto y sobrepago", rail_page("partial", dialog("missing")),
     "Sin monto no se puede verificar (400 orders/payment_amount_required): de esa cifra salen el saldo y, en F4, las cuotas. Si el pago supera el saldo, el backend responde 409 y el operador decide si lo acepta."),
    ("sobrepago", "4 · Pago mayor que el saldo", rail_page("partial", dialog("over")),
     "El sobrepago no se bloquea, se hace explícito: cuánto sobra y un interruptor para aceptarlo a propósito."),
    ("kanban", "5 · Kanban", kanban(),
     "El tablero no gana columna: «Abonado» es un chip y una barra dentro de la tarjeta. Un pedido reservado con abono sigue siendo un pedido confirmado."),
    ("pagado", "6 · Saldo cubierto", rail_page("paid"),
     "Cuando el saldo llega a cero el pedido pasa a Pagado y la barra se completa. Es el único momento en que el cliente recibe el aviso de «pagado»."),
    ("avisos", "7 · Avisos", templates(),
     "La plantilla nueva: «abono recibido», con importe y saldo. Antes el primer pago disparaba el aviso de «pagado»; ahora ese queda para el final."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("El abono: pagos parciales", "Mockup F0 · no es producto", "Cobros · F3 «Estado de pago y abonos»", VIEWS)
    K.export_artboards([
        {"file": "orders-rail-balance.dc.html", "title": "Pedido · rail con saldo", "body": rail_page("partial"), "w": 1280, "h": 940},
        {"file": "orders-rail-balance-dark.dc.html", "title": "Pedido · rail con saldo · oscuro", "body": rail_page("partial"), "w": 1280, "h": 940, "dark": True},
        {"file": "orders-verify-amount.dc.html", "title": "Verificar pago · monto obligatorio", "body": rail_page("partial", dialog("ok")), "w": 1280, "h": 940},
        {"file": "orders-verify-errors.dc.html", "title": "Verificar · sin monto", "body": rail_page("partial", dialog("missing")), "w": 1280, "h": 940},
        {"file": "orders-verify-overpay.dc.html", "title": "Verificar · sobrepago", "body": rail_page("partial", dialog("over")), "w": 1280, "h": 940},
        {"file": "orders-kanban-progress.dc.html", "title": "Kanban · chip de cobro", "body": kanban(), "w": 1280, "h": 720},
        {"file": "orders-rail-settled.dc.html", "title": "Pedido · saldo cubierto", "body": rail_page("paid"), "w": 1280, "h": 940},
        {"file": "orders-payment-templates.dc.html", "title": "Avisos · abono recibido", "body": templates(), "w": 1280, "h": 760},
    ])
