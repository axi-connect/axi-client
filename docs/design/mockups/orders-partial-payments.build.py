#!/usr/bin/env python3
"""Mockup «El abono» (cobros_frontend_plan.md §4, F3) — rediseño premium.

Qué cambia frente a la primera versión: la jerarquía. El operador abre un pedido para responder
UNA pregunta —cuánto falta por cobrar y para cuándo—, así que esa es la cifra grande y el resto
baja de peso. Listas agrupadas (una superficie, separadores hacia dentro) en vez de una tarjeta
por dato; medidor por segmentos, uno por pago verificado; el diálogo enseña el resultado antes
de confirmar y el botón nombra el importe.

Uso:  python3 orders-partial-payments.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("orders-partial-payments")
ic, btn, badge = K.ic, K.btn, K.badge

EXTRA_CSS = """
/* ── Superficie del pedido ───────────────────────────────────────────────
   Nada de una tarjeta por dato: una sola columna, secciones separadas por
   aire y una hairline. El borde solo existe donde separa dos cosas. */
.sheet{width:400px;border-left:1px solid var(--border);background:var(--background);display:flex;flex-direction:column;min-height:100%}
.sheet-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 24px 0}
.sheet-top .id{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground);letter-spacing:.01em}
.sheet-top .who{font-size:16px;font-weight:600;letter-spacing:-.01em;margin-top:2px}
.sheet-top .where{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.sheet-body{padding:0 24px 24px;display:flex;flex-direction:column;gap:22px}

/* ── La respuesta: cuánto falta ─────────────────────────────────────── */
.headline{padding-top:18px}
.headline .lede{font-size:13px;color:var(--muted-foreground)}
.headline .amount{font-family:var(--font-heading);font-size:40px;line-height:1.05;letter-spacing:-.025em;font-variant-numeric:tabular-nums;margin-top:4px}
.headline .amount.settled{color:var(--axi-success)}
.headline .of{font-size:13px;color:var(--muted-foreground);margin-top:6px;font-variant-numeric:tabular-nums}
.headline .of b{color:var(--foreground);font-weight:500}

/* Medidor: un segmento por pago verificado; lo pendiente queda hueco. */
.meter{height:6px;border-radius:999px;margin-top:14px;overflow:hidden}

/* ── Vencimiento: lo que hace urgente el saldo ───────────────────────── */
.due{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:var(--secondary)}
.due .ic{color:var(--muted-foreground)}
.due .t{font-size:14px;font-weight:500}
.due .m{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}

/* ── Lista agrupada (idioma iOS): una superficie, separadores hacia dentro ── */
.group{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--background)}
.group .head{font-size:12.5px;color:var(--muted-foreground);padding:12px 16px 0}
.row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 16px;position:relative}
.row + .row::before{content:"";position:absolute;left:56px;right:0;top:0;height:1px;background:var(--border-soft)}
.row .dot{width:8px;height:8px;border-radius:50%;justify-self:center}
.row .dot.ok{background:var(--axi-success)} .row .dot.wait{background:var(--axi-warning)} .row .dot.off{background:var(--border)}
.row .t{font-size:14px;font-weight:500}
.row .m{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.row .v{font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;text-align:right}
.row .v small{display:block;font-size:11.5px;font-weight:400;color:var(--muted-foreground);margin-top:1px}

/* ── Acción y procedencia ────────────────────────────────────────────── */
.actions{display:flex;flex-direction:column;gap:8px}
.btn.block{width:100%;height:44px;border-radius:14px;font-size:14.5px}
.origin{font-size:12px;color:var(--muted-foreground);line-height:1.5}
.origin b{color:var(--foreground);font-weight:500;font-variant-numeric:tabular-nums}

/* ── Actividad: una columna con guía, no un timeline decorado ────────── */
.acts{display:flex;flex-direction:column}
.act{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:12px;align-items:start;padding:11px 0;position:relative}
.act + .act::before{content:"";position:absolute;left:29px;right:0;top:0;height:1px;background:var(--border-soft)}
.act .ic{margin-top:2px;color:var(--muted-foreground)}
.act .t{font-size:14px}
.act .m{font-size:12.5px;color:var(--muted-foreground);margin-top:2px;font-variant-numeric:tabular-nums}
.act time{font-size:12px;color:var(--muted-foreground);white-space:nowrap;padding-top:2px}

/* ── Diálogo ─────────────────────────────────────────────────────────── */
.modal.review{max-width:440px;padding:24px;gap:18px}
.modal.review h2{font-size:20px;letter-spacing:-.015em;font-family:var(--font-body);font-weight:600}
.modal.review .sub{font-size:13px;color:var(--muted-foreground);margin-top:2px}
.amount-field{display:flex;flex-direction:column;gap:8px}
.amount-field label{font-size:13px;font-weight:500}
.amount-input{display:flex;align-items:baseline;gap:8px;border:1px solid var(--input);border-radius:14px;padding:14px 16px;background:var(--background)}
.amount-input .cur{font-size:16px;color:var(--muted-foreground)}
.amount-input input{border:0;background:transparent;outline:none;width:100%;font-family:inherit;color:inherit;font-size:26px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.amount-input input::placeholder{color:color-mix(in srgb, var(--foreground) 32%, transparent)}
.amount-input.err{border-color:var(--axi-destructive)}
.amount-field .aid{font-size:12.5px;color:var(--muted-foreground)}
.amount-field .aid b{color:var(--foreground);font-weight:500;font-variant-numeric:tabular-nums}
.amount-field .bad{font-size:12.5px;color:var(--axi-destructive)}
.chips{display:flex;gap:8px;margin-top:2px}
.chip{border:1px solid var(--border);border-radius:999px;padding:5px 12px;font-size:12.5px;background:var(--background)}
.chip.on{background:var(--accent);border-color:transparent;font-weight:500}

/* El resultado ANTES de confirmar: es lo que convierte el formulario en decisión. */
.after{border-radius:14px;background:var(--secondary);padding:14px 16px}
.after .cap{font-size:12.5px;color:var(--muted-foreground)}
.after .line{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:8px;font-size:14px}
.after .line .v{font-weight:600;font-variant-numeric:tabular-nums}
.after .line.muted .v{font-weight:500;color:var(--muted-foreground)}
.after .state{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-soft);font-size:13px}
.notify{display:flex;align-items:center;justify-content:space-between;gap:12px}
.notify .t{font-size:14px} .notify .m{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}

/* ── Tablero ─────────────────────────────────────────────────────────── */
.board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.board .col h3{font-family:var(--font-body);font-size:13px;font-weight:500;letter-spacing:0;color:var(--muted-foreground);display:flex;justify-content:space-between;align-items:center;padding:0 2px 10px}
.board .col{display:flex;flex-direction:column;gap:10px}
.tile{border:1px solid var(--border);background:var(--background);border-radius:16px;padding:14px 16px}
.tile .id{font-family:var(--font-mono);font-size:11.5px;color:var(--muted-foreground)}
.tile .who{font-size:14px;font-weight:500;margin-top:6px}
.tile .tot{font-size:17px;font-weight:600;letter-spacing:-.015em;font-variant-numeric:tabular-nums;margin-top:8px}
.tile .left{font-size:12.5px;color:var(--muted-foreground);margin-top:2px;font-variant-numeric:tabular-nums}
.tile .left b{color:var(--foreground);font-weight:500}
.tile .foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:11.5px;color:var(--muted-foreground)}

/* ── Avisos: se ve como lo ve el cliente ─────────────────────────────── */
.phone{border-radius:20px;background:color-mix(in srgb, var(--foreground) 4%, var(--background));padding:18px;display:flex;flex-direction:column;gap:10px}
.bubble{align-self:flex-start;max-width:86%;background:var(--background);border:1px solid var(--border);border-radius:16px 16px 16px 4px;padding:11px 14px;font-size:13.5px;line-height:1.5;box-shadow:var(--shadow-float)}
.bubble time{display:block;font-size:10.5px;color:var(--muted-foreground);margin-top:6px}
.editor{border:1px solid var(--border);border-radius:16px;overflow:hidden}
.editor .body{padding:14px 16px;font-size:13.5px;line-height:1.6;min-height:84px}
.editor .bar{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px;border-top:1px solid var(--border-soft);background:var(--secondary)}
.tok{font-family:var(--font-mono);font-size:11.5px;background:var(--background);border:1px solid var(--border);border-radius:999px;padding:3px 10px}
.ok-i{color:var(--axi-success)} .warn-i{color:var(--axi-warning)}
.stack-24{display:flex;flex-direction:column;gap:24px}
.split{display:grid;grid-template-columns:minmax(0,1fr) 400px;min-height:100%}
.content{padding:26px 30px 40px;display:flex;flex-direction:column;gap:22px}
.page-head h1{font-size:25px;letter-spacing:-.02em;font-family:var(--font-body);font-weight:600}
.page-head .sub{font-size:13.5px;color:var(--muted-foreground);margin-top:3px}
.section-title{font-size:15px;font-weight:600;letter-spacing:-.01em}
.section-sub{font-size:13px;color:var(--muted-foreground);margin-top:2px;max-width:60ch}
"""

TOTAL = "$ 21.703.150"
ABONO = "$ 6.510.945"
SALDO = "$ 15.192.205"


def meter(segments, label):
    """Un segmento por PAGO, de ancho proporcional a su importe; lo que falta, hueco.

    Se dibuja como UN elemento con degradado de tramos duros, sin hijos vacíos: un
    contenedor con elementos sin contenido queda a merced de cómo cada entorno
    pinte una caja vacía, y en el lienzo aparecía como un bloque gris enorme.
    """
    total = sum(weight for weight, _ in segments) or 1
    stops, at = [], 0.0
    for index, (weight, paid) in enumerate(segments):
        start = at
        at += weight / total * 100
        color = "var(--axi-brand)" if paid else "var(--secondary)"
        # Una holgura de medio punto entre tramos los separa sin usar `gap`.
        gap = 0.5 if index > 0 else 0
        stops.append(f"{color} {start + gap:.2f}% {at:.2f}%")
        if gap:
            stops.insert(len(stops) - 1, f"var(--background) {start:.2f}% {start + gap:.2f}%")
    gradient = ", ".join(stops)
    return (
        f'<div class="meter" role="img" aria-label="{label}" '
        f'style="background:linear-gradient(90deg, {gradient})"></div>'
    )


def headline(state: str) -> str:
    if state == "paid":
        return f"""<div class="headline">
          <p class="lede">Cobrado por completo</p>
          <p class="amount settled">{TOTAL}</p>
          <p class="of">Dos abonos · último el 17 de septiembre</p>
          {meter([(30, True), (70, True)], "Cobrado por completo en dos abonos")}
        </div>"""
    return f"""<div class="headline">
      <p class="lede">Falta por cobrar</p>
      <p class="amount">{SALDO}</p>
      <p class="of">de {TOTAL} · <b>30 %</b> cobrado</p>
      {meter([(30, True), (70, False)], "Cobrado el 30 por ciento")}
    </div>"""


def due(state: str) -> str:
    text = "Sale en 179 días" if state != "paid" else "Sale el 14 de marzo"
    sub = "sábado 14 de marzo de 2027" if state != "paid" else "Todo cobrado antes de la salida"
    return f"""<div class="due">{ic("calendar", size=18)}<div><p class="t">{text}</p><p class="m">{sub}</p></div></div>"""


def payments(state: str) -> str:
    second = (
        f"""<div class="row"><span class="dot wait"></span>
          <div><p class="t">Bancolombia</p><p class="m">17 sep · esperando tu revisión</p></div>
          <p class="v">{SALDO}<small>por verificar</small></p></div>"""
        if state == "partial"
        else f"""<div class="row"><span class="dot ok"></span>
          <div><p class="t">Bancolombia</p><p class="m">17 sep · verificado por Isabel</p></div>
          <p class="v">{SALDO}</p></div>"""
    )
    return f"""<div class="group">
      <p class="head">Pagos</p>
      <div class="row"><span class="dot ok"></span>
        <div><p class="t">Bancolombia</p><p class="m">16 sep · verificado por Isabel</p></div>
        <p class="v">{ABONO}</p></div>
      {second}
    </div>"""


def sheet(state: str = "partial") -> str:
    action = (
        btn("Verificar pago", "", "block") if state == "partial" else btn("Ver recibo", "", "outline block")
    )
    return f"""<aside class="sheet" aria-label="Pedido JX-0042">
      <div class="sheet-top">
        <div><p class="id">JX-0042</p><p class="who">Laura Gómez</p><p class="where">Expedición Cocuy · 2 cupos</p></div>
        {badge("Abonado", "warn") if state == "partial" else badge("Pagado", "ok")}
      </div>
      <div class="sheet-body">
        {headline(state)}
        {due(state)}
        {payments(state)}
        <div class="actions">
          {action}
          <p class="origin">Cotizado en <b>US$ 7.000</b>. El total quedó fijo el 16 de septiembre, cuando se confirmó, a <b>3.100,45</b> por dólar.</p>
        </div>
      </div>
    </aside>"""


def activity() -> str:
    rows = [
        ("circle-check", "Pago verificado", f"{ABONO} · quedaron {SALDO}", "16 sep, 10:24"),
        ("lock", "Total fijado en pesos", "US$ 7.000 a 3.100,45 (Superfinanciera)", "16 sep, 10:24"),
        ("message-circle", "Aviso enviado a Laura", "«Recibimos tu abono de $ 6.510.945…»", "16 sep, 10:25"),
        ("receipt", "Pago reportado por el agente", "Con comprobante", "16 sep, 10:20"),
        ("circle-check", "Pedido confirmado", "2 cupos reservados para el 14 de marzo", "16 sep, 10:18"),
    ]
    evs = "".join(
        f'<div class="act">{ic(i, size=16)}<div><p class="t">{t}</p><p class="m">{m}</p></div><time>{w}</time></div>'
        for i, t, m, w in rows
    )
    return f"""<section>
      <p class="section-title">Actividad</p>
      <p class="section-sub">Dos hechos nuevos en el pedido: cuánto se cobró y a qué tasa quedó fijo el total.</p>
      <div class="acts" style="margin-top:12px">{evs}</div>
    </section>"""


def items() -> str:
    return f"""<section>
      <p class="section-title">Expedición Cocuy · salida del 14 de marzo</p>
      <div class="group" style="margin-top:12px">
        <div class="row"><span class="dot off"></span><div><p class="t">2 cupos · Cocuy, 5 días</p><p class="m">US$ 3.500 por persona</p></div><p class="v">{TOTAL}<small>US$ 7.000</small></p></div>
        <div class="row"><span class="dot off"></span><div><p class="t">Total del pedido</p><p class="m">Sin descuentos ni envío</p></div><p class="v">{TOTAL}</p></div>
      </div>
    </section>"""


def order_page(state: str = "partial", dlg: str = "") -> str:
    return f"""<div class="split" style="position:relative;min-height:940px">
      <div class="content">
        <div class="page-head"><h1>Pedido JX-0042</h1><p class="sub">Laura Gómez · llegó por WhatsApp el 16 de septiembre</p></div>
        {items()}
        {activity()}
      </div>
      {sheet(state)}
      {dlg}
    </div>"""


def after_block(mode: str) -> str:
    if mode == "over":
        return f"""<div class="after">
          <p class="cap">Después de verificar</p>
          <div class="line"><span>Pagado</span><span class="v">{TOTAL}</span></div>
          <div class="line muted"><span>Sobra</span><span class="v">$ 3.296.850</span></div>
          <div class="state">{ic("triangle-alert", "warn-i", size=15)} El pedido queda <b style="font-weight:600">Pagado</b> y el excedente a favor de Laura.</div>
        </div>"""
    return f"""<div class="after">
      <p class="cap">Después de verificar</p>
      <div class="line"><span>Pagado</span><span class="v">{ABONO}</span></div>
      <div class="line muted"><span>Falta</span><span class="v">{SALDO}</span></div>
      <div class="state">{ic("circle-check", "ok-i", size=15)} El pedido queda <b style="font-weight:600">Confirmado · Abonado</b>. Se cierra cuando el saldo llegue a cero.</div>
    </div>"""


def review(mode: str = "ok") -> str:
    """mode: ok | missing | over"""
    if mode == "missing":
        field = f"""<div class="amount-input err"><span class="cur">$</span><input id="amt" inputmode="numeric" placeholder="0" value=""></div>
          <p class="bad">Escribe cuánto estás verificando. De esa cifra sale el saldo del cliente.</p>"""
        after = ""
        cta = btn("Verificar pago", "", "block", 'aria-disabled="true"')
    elif mode == "over":
        field = f"""<div class="amount-input err"><span class="cur">$</span><input id="amt" inputmode="numeric" value="25.000.000"></div>
          <p class="bad">Son $ 3.296.850 más que el saldo. Verifícalo solo si Laura pagó de más a propósito.</p>"""
        after = after_block("over")
        cta = btn("Verificar $ 25.000.000", "", "block")
    else:
        field = f"""<div class="amount-input"><span class="cur">$</span><input id="amt" inputmode="numeric" value="6.510.945"></div>
          <div class="chips"><span class="chip on">Anticipo del 30 %</span><span class="chip">Saldo completo</span></div>"""
        after = after_block("ok")
        cta = btn(f"Verificar {ABONO}", "", "block")

    accept = (
        f"""<div class="notify"><div><p class="t">Aceptar el sobrepago</p><p class="m">Sin esto no se puede verificar.</p></div>{K.switch(False, label="Aceptar el sobrepago")}</div>"""
        if mode == "over"
        else ""
    )
    return f"""<div class="overlay"><div class="modal review" role="dialog" aria-labelledby="rv">
      <div>
        <h2 id="rv">Verificar el pago de Laura</h2>
        <p class="sub">Bancolombia · referencia ABONO-1 · comprobante adjunto</p>
      </div>
      <div class="group">
        <div class="row"><span class="dot off"></span><div><p class="t">Total del pedido</p></div><p class="v">{TOTAL}</p></div>
        <div class="row"><span class="dot off"></span><div><p class="t">Cobrado hasta ahora</p></div><p class="v">$ 0</p></div>
      </div>
      <div class="amount-field">
        <label for="amt">Monto verificado</label>
        {field}
      </div>
      {accept}
      {after}
      <div class="notify"><div><p class="t">Avisar a Laura por WhatsApp</p><p class="m">Le llega el abono y el saldo que queda.</p></div>{K.switch(True, label="Avisar por WhatsApp")}</div>
      <div style="display:flex;flex-direction:column;gap:8px">{cta}{btn("Volver", "", "ghost block")}</div>
    </div></div>"""


def tile(num: str, who: str, total: str, left: str = "", pct: int = 0, chip: str = "", when: str = "hace 2 h") -> str:
    progress = (
        f'{meter([(pct, True), (100 - pct, False)], "Progreso del cobro")}'
        f'<p class="left">Falta <b>{left}</b></p>'
        if left
        else ""
    )
    return f"""<article class="tile">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px"><span class="id">{num}</span>{chip}</div>
      <p class="who">{who}</p>
      <p class="tot">{total}</p>
      {progress}
      <div class="foot"><span>{when}</span></div>
    </article>"""


def board() -> str:
    cols = [
        ("Pendientes", 1, [tile("JX-0051", "Andrés Ruiz", "$ 3.200.000", when="hace 20 min")]),
        ("Confirmados", 2, [
            tile("JX-0042", "Laura Gómez", "$ 21.703.150", "$ 15.192.205", 30, badge("Abonado", "warn")),
            tile("JX-0047", "Marta Díaz", "$ 8.400.000", "$ 4.200.000", 50, badge("Abonado", "warn"), "ayer"),
        ]),
        ("Pago reportado", 1, [tile("JX-0049", "Carlos Peña", "$ 1.900.000", chip=badge("Por verificar", "warn"), when="hace 1 h")]),
        ("Pagados", 1, [tile("JX-0038", "Sara Lima", "$ 12.000.000", chip=badge("Pagado", "ok"), when="el martes")]),
    ]
    body = "".join(
        f'<div class="col"><h3>{name}<span>{count}</span></h3>{"".join(cards)}</div>' for name, count, cards in cols
    )
    return f"""<div class="content" style="min-height:100%">
      <div class="page-head"><h1>Pedidos</h1><p class="sub">Un pedido con abono sigue siendo un pedido confirmado: lo que cambia es cuánto falta por cobrar.</p></div>
      <div class="board">{body}</div>
    </div>"""


def notices() -> str:
    return f"""<div class="content">
      <div class="page-head"><h1>Avisos al cliente</h1><p class="sub">Lo que Laura recibe por WhatsApp en cada momento del pedido.</p></div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:26px;align-items:start">
        <div class="stack-24">
          <section>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div><p class="section-title">Abono recibido</p><p class="section-sub">Sale cada vez que verificas un abono, tantas veces como pagos haga el cliente.</p></div>
              {K.switch(True, label="Abono recibido")}
            </div>
            <div class="editor" style="margin-top:12px">
              <div class="body">¡Gracias {{{{contact_name}}}}! Recibimos tu abono de {{{{amount}}}} para el pedido #{{{{order_number}}}}. Saldo pendiente: {{{{balance}}}}.</div>
              <div class="bar">{"".join(f'<span class="tok">{{{{{v}}}}}</span>' for v in ["contact_name", "order_number", "amount", "balance", "total"])}</div>
            </div>
          </section>
          <section>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div><p class="section-title">Pedido pagado</p><p class="section-sub">Solo cuando el saldo llega a cero. Antes salía con el primer pago, aunque quedara casi todo por cobrar.</p></div>
              {K.switch(True, label="Pedido pagado")}
            </div>
            <div class="editor" style="margin-top:12px"><div class="body">¡Gracias {{{{contact_name}}}}! Recibimos y verificamos tu pago del pedido #{{{{order_number}}}} por {{{{total}}}}.</div></div>
          </section>
        </div>
        <div>
          <p class="section-title">Así lo ve Laura</p>
          <div class="phone" style="margin-top:12px">
            <div class="bubble">¡Gracias Laura! Recibimos tu abono de $ 6.510.945 para el pedido #42. Saldo pendiente: $ 15.192.205.<time>16 sep, 10:25</time></div>
            <div class="bubble">¡Gracias Laura! Recibimos tu abono de $ 15.192.205 para el pedido #42. Saldo pendiente: $ 0.<time>17 sep, 9:02</time></div>
          </div>
        </div>
      </div>
    </div>"""


VIEWS = [
    ("pedido", "1 · El pedido", order_page("partial"),
     "La pregunta del operador es cuánto falta y para cuándo, así que esa es la cifra grande; el total baja a línea de apoyo. El medidor lleva un segmento por pago verificado. Debajo, el vencimiento, los pagos como lista agrupada y, al pie, de dónde sale el precio: cotizado en dólares y fijado el día de la confirmación."),
    ("verificar", "2 · Verificar", order_page("partial", review("ok")),
     "Verificar deja de ser un formulario: se escribe el monto y debajo aparece en qué queda el pedido antes de confirmar. Los atajos cubren los dos casos reales, anticipo y saldo completo, y el botón dice el importe que se va a verificar."),
    ("sin-monto", "3 · Sin monto", order_page("partial", review("missing")),
     "Sin monto no se puede verificar, y el mensaje dice por qué importa: de esa cifra sale el saldo del cliente. El botón queda inactivo en lugar de fallar al pulsarlo."),
    ("sobrepago", "4 · Pago de más", order_page("partial", review("over")),
     "Un pago mayor que el saldo no se bloquea: se dice cuánto sobra, qué pasa con el excedente y se pide confirmarlo a propósito."),
    ("tablero", "5 · Tablero", board(),
     "El tablero no gana columna. La tarjeta responde lo mismo que el rail: cuánto falta, con el medidor al lado del total."),
    ("cobrado", "6 · Cobrado", order_page("paid"),
     "Con el saldo en cero la cifra grande pasa a verde y cuenta la historia completa: dos abonos, el último el 17 de septiembre. Es el único momento en que el cliente recibe el aviso de pagado."),
    ("avisos", "7 · Avisos", notices(),
     "La plantilla nueva lleva importe y saldo, y se previsualiza como la burbuja que verá el cliente. El aviso de pagado deja de salir con el primer abono."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("El abono: pagos parciales", "Mockup F0 · no es producto", "Cobros · F3 «Estado de pago y abonos»", VIEWS)
    K.export_artboards([
        {"file": "orders-balance.dc.html", "title": "Pedido · cuánto falta por cobrar", "body": order_page("partial"), "w": 1440, "h": 980},
        {"file": "orders-balance-dark.dc.html", "title": "Pedido · oscuro", "body": order_page("partial"), "w": 1440, "h": 980, "dark": True},
        {"file": "orders-verify.dc.html", "title": "Verificar · con el resultado a la vista", "body": order_page("partial", review("ok")), "w": 1440, "h": 980},
        {"file": "orders-verify-missing.dc.html", "title": "Verificar · sin monto", "body": order_page("partial", review("missing")), "w": 1440, "h": 980},
        {"file": "orders-verify-over.dc.html", "title": "Verificar · pago de más", "body": order_page("partial", review("over")), "w": 1440, "h": 980},
        {"file": "orders-board.dc.html", "title": "Tablero · cuánto falta en la tarjeta", "body": board(), "w": 1440, "h": 720},
        {"file": "orders-settled.dc.html", "title": "Pedido · cobrado por completo", "body": order_page("paid"), "w": 1440, "h": 980},
        {"file": "orders-notices.dc.html", "title": "Avisos · como los ve el cliente", "body": notices(), "w": 1440, "h": 760},
    ])
