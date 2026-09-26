#!/usr/bin/env python3
"""Mockup «Promesas de pago, calendario y notas» (cobros_frontend_plan.md §4, F4b).

F4 dejó la Cartera y el plan de pagos; el servidor sabe registrar una promesa
(`POST /collections/plans/:id/promises`), reprogramar las cuotas pendientes
(`PUT …/schedule`) y guardar una nota del plan (`PATCH …`), y el barrido marca
la promesa rota si el día llega sin pago. Nada de eso tiene pantalla: la Cartera
enseña «prometió el 22» y no deja anotarlo. Este lienzo lo cierra sin cambiar
el vocabulario de F4:

1. **Una promesa es una frase con fecha, no un formulario.** El diálogo pregunta
   lo mínimo —cuándo, cuánto (opcional), una nota— con la fecha en chips que se
   entienden («mañana», «en 3 días», «el lunes 22») y dice ANTES de anotarla qué
   pasará: los recordatorios se pausan hasta ese día y, si no llega el pago, se
   rompe sola y vuelven.
2. **Tres estados, tres frases.** Viva (info, apretón de manos), cumplida (verde,
   en el historial: «pagó el 21, un día antes») y rota (ámbar: «no cumplió; los
   recordatorios volvieron el 23»). Nunca un badge de color: la frase lo dice.
3. **Desde donde se cobra.** En el pedido, el botón que F4 ya dibujó; en la
   Cartera, la fila conserva su única diana visible («Escribir») y gana «…» con
   lo que no cabe en una diana: anotar promesa, reprogramar, abrir el pedido —el
   mismo patrón de la fila de documentos de F8.
4. **La nota del plan** es una línea bajo el calendario, para el equipo, nunca
   para el cliente. Se edita en un diálogo de una sola pregunta.
5. **Reprogramar** viene de F4 tal cual, como pieza separada que el dueño decide:
   solo lo pendiente, la suma cuadra mientras se escribe.

Uso:  python3 collections-promises.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import importlib.util, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from _axi_mockup_kit import Kit  # noqa: E402

_spec = importlib.util.spec_from_file_location("f4", HERE / "collections-receivables.build.py")
F4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(F4)

K = Kit("collections-promises")
ic, btn, badge = K.ic, K.btn, K.badge
meter, plan_rows, hero = F4.meter, F4.plan_rows, F4.hero

EXTRA_CSS = F4.EXTRA_CSS + """
/* ── Fila de la Cartera: una diana visible y «…» (patrón de la fila de F8) ── */
.grow.acts{grid-template-columns:minmax(0,1fr) auto auto auto;gap:14px;cursor:default}
.grow .sub .pl{display:inline-flex;align-items:center;gap:5px}
.grow .sub .pl .ic{color:var(--axi-info)} .grow .sub .pl.broken .ic{color:var(--axi-warning)}
.grow .sub .pl b{color:var(--foreground);font-weight:500}
.grow .xs{height:30px;padding:0 12px;font-size:13px;border-radius:999px}
.grow .more{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;color:var(--muted-foreground);position:relative}
.menu{position:absolute;right:16px;top:58px;width:250px;border-radius:16px;border:1px solid var(--border);background:var(--background);box-shadow:var(--shadow-overlay);padding:6px;z-index:8;text-align:left}
.menu .mi{display:grid;grid-template-columns:18px minmax(0,1fr);gap:12px;align-items:start;padding:10px 12px;border-radius:11px}
.menu .mi:hover{background:var(--accent)}
.menu .mi .ic{color:var(--muted-foreground);margin-top:1px}
.menu .mi .t{font-size:14px;font-weight:500;display:block}
.menu .mi .d{font-size:12px;color:var(--muted-foreground);display:block;margin-top:1px}
.menu .sep{height:1px;background:var(--border-soft);margin:4px 8px}

/* ── La promesa en el rail: una frase con icono, tres estados ─────────── */
.promise{align-items:flex-start}
.promise .ic{flex:none}
.promise.kept .ic{color:var(--axi-success)}
.promise.broken .ic{color:var(--axi-warning)}
.promise .body{display:flex;flex-direction:column;gap:6px;min-width:0}
.promise .note{color:var(--muted-foreground)}
.promise .note b{color:var(--foreground)}
.promise .acts{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap}
.promise .acts .btn{height:30px;padding:0 12px;font-size:12.5px;border-radius:999px}
.hist{display:flex;flex-direction:column;border-top:1px solid var(--border-soft)}
.hist .h{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 17px;font-size:12.5px;color:var(--muted-foreground)}
.hist .h + .h::before{content:"";position:absolute;left:53px;right:0;top:0;height:1px;background:var(--border-soft)}
.hist .h .ic{justify-self:center}
.hist .h.kept .ic{color:var(--axi-success)} .hist .h.broken .ic{color:var(--axi-warning)} .hist .h.live .ic{color:var(--axi-info)}
.hist .h b{color:var(--foreground);font-weight:500}
.hist .h time{font-variant-numeric:tabular-nums;white-space:nowrap}
.group .head .links{display:flex;gap:12px}
.note-row{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:12px;align-items:start;padding:12px 17px 14px;border-top:1px solid var(--border-soft);font-size:12.5px;color:var(--muted-foreground);line-height:1.5}
.note-row .ic{color:var(--muted-foreground);margin-top:2px}
.note-row b{color:var(--foreground);font-weight:500}
.note-row a{color:var(--foreground);font-weight:500;text-decoration:none;white-space:nowrap}

/* ── Diálogo de promesa: la fecha en chips que se entienden ──────────── */
.modal.wide .field2{display:flex;flex-direction:column;gap:9px}
.modal.wide .field2 label{font-size:13px;font-weight:500}
.chips.dates .chip{padding:8px 14px;font-size:13px}
.chips.dates .chip small{display:block;font-size:11px;color:var(--muted-foreground);font-weight:400;margin-top:1px}
.chips.dates .chip.on small{color:var(--foreground)}
.amount-input.opt input{font-size:24px}
.amount-input .hint{font-size:12px;color:var(--muted-foreground);white-space:nowrap}
.textarea.big{min-height:76px;align-items:flex-start;padding-top:10px;font-size:14px}
.modal .cnt{font-size:11.5px;color:var(--muted-foreground);text-align:right;font-variant-numeric:tabular-nums}

/* ── Móvil ───────────────────────────────────────────────────────────── */
.mobile{width:390px;min-height:844px;margin:0 auto;background:var(--background);display:flex;flex-direction:column;position:relative;border:1px solid var(--border);border-radius:34px;overflow:hidden}
.mobile .wrap{padding:22px 16px 24px;gap:20px;max-width:none}
.mobile .hero .amount{font-size:40px}
.mobile .grow{padding:14px 16px;min-height:0}
.mobile .grow.acts{grid-template-columns:minmax(0,1fr) auto;gap:10px}
.mobile .grow .right{display:none}
.mobile .grow .amt{font-size:15px}
.grab{width:36px;height:4px;border-radius:999px;background:var(--border);margin:10px auto 0}
.scrim{position:absolute;inset:0;background:var(--scrim);z-index:5}
.mobile .modal.wide{position:absolute;left:0;right:0;bottom:0;max-width:none;border-radius:28px 28px 0 0;padding:14px 16px 22px;z-index:6;backdrop-filter:none;background:var(--background)}
.mobile .modal-foot .btn{flex:1}
"""

# ── Datos: Diana debe una cuota vencida; Andrés ya viajó y debe ────────────
DIANA = dict(name="Diana Salazar", sub="JX-0047 · Cocuy · sale el 14 de marzo", amt="$ 3.480.000",
             due="Venció hace 6 días", late=True)
ANDRES = dict(name="Andrés Mejía", sub="JX-0038 · Nevado del Ruiz · viajó el 2 de septiembre",
              amt="$ 4.200.000", due="Venció hace 15 días", late=True)


def promise_line(state: str) -> str:
    if state == "live":
        return f'<span class="pl">{ic("handshake", size=13)}<b>prometió el 22</b> · avisos en pausa</span>'
    if state == "broken":
        return f'<span class="pl broken">{ic("triangle-alert", size=13)}<b>no cumplió la promesa</b> del 22</span>'
    return ""


def row_menu() -> str:
    return f"""<div class="menu" role="menu">
      <a class="mi" role="menuitem" href="#">{ic("handshake", size=16)}<span><span class="t">Anotar promesa de pago</span>
        <span class="d">Pausa los recordatorios hasta la fecha</span></span></a>
      <a class="mi" role="menuitem" href="#">{ic("calendar-clock", size=16)}<span><span class="t">Reprogramar cuotas</span>
        <span class="d">Solo lo pendiente; la suma tiene que cuadrar</span></span></a>
      <div class="sep"></div>
      <a class="mi" role="menuitem" href="#">{ic("external-link", size=16)}<span><span class="t">Abrir el pedido</span></span></a>
    </div>"""


def debtor_row(row: dict, promise: str = "", menu: bool = False) -> str:
    due_cls = "due late" if row["late"] and not promise else "due"
    due = row["due"] if not promise else ("Prometió pagar el 22" if promise == "live" else row["due"])
    sub = row["sub"] + (f' · {promise_line(promise)}' if promise else "")
    return f"""<div class="grow acts" style="position:relative">
      <span>
        <span class="nm" style="display:block">{row['name']}</span>
        <span class="sub">{sub}</span>
      </span>
      <span class="right">
        <span class="amt" style="display:block">{row['amt']}</span>
        <span class="{due_cls}" style="display:block">{due}</span>
      </span>
      {btn("Escribir", "message-circle", "outline xs")}
      <button type="button" class="more" aria-label="Más acciones · {row['name']}" aria-expanded="{str(menu).lower()}">{ic("ellipsis", size=16)}</button>
      {row_menu() if menu else ""}
    </div>"""


def receivables(menu: bool = False, states: bool = False) -> str:
    seg = "".join(
        f'<button aria-checked="{str(k == "todo").lower()}">{t}<span class="cnt">{n}</span></button>'
        for t, k, n in [("Todo", "todo", 6), ("Ya viajaron", "viajaron", 2), ("En mora", "mora", 3)]
    )
    gone = f"""<div class="block">
      <div class="sec gone">{ic("plane", "", 15)}<span class="t">Ya viajaron y deben</span><span class="n">2</span></div>
      <div class="glist">
        {debtor_row(dict(name="Camilo Ortiz", sub="JX-0033 · Sierra Nevada · viajó el 1 de agosto", amt="$ 8.100.000", due="Venció hace 47 días", late=True))}
        {debtor_row(ANDRES, promise="broken" if states else "")}
      </div>
    </div>"""
    late = f"""<div class="block">
      <div class="sec late">{ic("circle-alert", "", 15)}<span class="t">En mora</span><span class="n">1</span></div>
      <div class="glist" style="overflow:visible">{debtor_row(DIANA, promise="live" if states else "", menu=menu)}</div>
    </div>"""
    rest = "".join(F4.section(s) for s in F4.SECTIONS if s["key"] in ("soon", "fine"))
    foot = ("""<p class="foot-note">La promesa se lee en la fila, como texto: <b>viva</b> con su fecha y los avisos en pausa,
      <b>rota</b> si el día pasó sin pago. Nunca un color de fondo: la sección ya dice la urgencia.</p>"""
            if states else
            """<p class="foot-note">La fila conserva <b>una diana visible</b>, «Escribir». Lo que no cabe en una diana —anotar la
      promesa, mover cuotas, abrir el pedido— va en «…», como en la fila de documentos.</p>""")
    return f"""<div class="wrap">
      <div class="topbar"><p class="ttl">Cartera</p>
        <div class="acts">{btn("Exportar", "download", "ghost sm")}{btn("Enviar recordatorios", "send", "sm")}</div></div>
      {hero()}
      <div class="controls">
        <nav class="seg inline sm" aria-label="Filtro de cartera">{seg}</nav>
        <div class="search">{ic("search", size=15)}Buscar cliente o pedido</div>
      </div>
      <div>{gone}{late}{rest}</div>
      {foot}
    </div>"""


# ── El rail del pedido de Diana: plan, promesa y nota ──────────────────────
def promise_card(state: str) -> str:
    if state == "live":
        return f"""<div class="promise live">{ic("handshake", size=16)}<div class="body">
          <span><b>Prometió pagar $ 3.480.000 el lunes 22 de septiembre.</b> Los recordatorios quedan en pausa hasta ese día.</span>
          <span class="note">{ic("message-square-text", size=12)} <b>Nota:</b> cobra el 20 y paga ese mismo día.</span>
          <span class="acts">{btn("Escribir", "message-circle", "outline")}<span class="small muted" style="align-self:center">Anotada hoy por Isabel</span></span>
        </div></div>"""
    if state == "kept":
        return f"""<div class="promise kept">{ic("circle-check", size=16)}<div class="body">
          <span><b>Cumplió la promesa del 22:</b> pagó $ 3.480.000 el 21 de septiembre, un día antes.</span>
          <span class="note">La cuota vencida quedó saldada y los recordatorios siguen con la siguiente.</span>
        </div></div>"""
    if state == "broken":
        return f"""<div class="promise broken">{ic("triangle-alert", size=16)}<div class="body">
          <span><b>No cumplió la promesa del 22 de septiembre.</b> Los recordatorios volvieron solos el 23.</span>
          <span class="note">Sigue debiendo $ 3.480.000 · 8 días de mora.</span>
          <span class="acts">{btn("Anotar otra promesa", "handshake", "outline")}{btn("Escribir", "message-circle", "outline")}</span>
        </div></div>"""
    return ""


def history(state: str) -> str:
    if state == "kept":
        rows = f"""<div class="h kept" style="position:relative">{ic("circle-check", size=14)}<span><b>Promesa cumplida</b> · pagó el 21, un día antes</span><time>21 sep</time></div>
          <div class="h live" style="position:relative">{ic("handshake", size=14)}<span><b>Promesa anotada</b> para el 22 · por Isabel</span><time>16 sep</time></div>"""
    elif state == "broken":
        rows = f"""<div class="h broken" style="position:relative">{ic("triangle-alert", size=14)}<span><b>Promesa rota</b> · el 22 pasó sin pago; los avisos volvieron</span><time>23 sep</time></div>
          <div class="h live" style="position:relative">{ic("handshake", size=14)}<span><b>Promesa anotada</b> para el 22 · por Isabel</span><time>16 sep</time></div>"""
    else:
        rows = f"""<div class="h live" style="position:relative">{ic("handshake", size=14)}<span><b>Promesa anotada</b> para el 22 · por Isabel</span><time>hoy</time></div>"""
    return f'<div class="hist">{rows}</div>'


def diana_rows(state: str) -> str:
    paid_dot, paid_meta = ("ok", "Pagada el 21 de septiembre") if state == "kept" else ("late", "Venció el 10 de septiembre")
    small = "" if state == "kept" else f'<small class="late">{"14" if state == "broken" else "6"} días de mora</small>'
    return f"""<div class="row"><span class="dot ok"></span>
        <div><p class="t">Anticipo · 30 %</p><p class="m">Pagado el 2 de julio</p></div>
        <p class="v">$ 3.480.000</p></div>
      <div class="row"><span class="dot {paid_dot}"></span>
        <div><p class="t">Cuota 2 de 3</p><p class="m">{paid_meta}</p></div>
        <p class="v">$ 3.480.000{small}</p></div>
      <div class="row"><span class="dot off"></span>
        <div><p class="t">Saldo final</p><p class="m">60 días antes de la salida · 13 de enero</p></div>
        <p class="v">$ 4.640.000</p></div>"""


def sheet(state: str = "due", note: bool = True, mobile: bool = False) -> str:
    balance = "$ 4.640.000" if state == "kept" else "$ 8.120.000"
    of = "de $ 11.600.000 · <b>60 %</b> cobrado" if state == "kept" else "de $ 11.600.000 · <b>30 %</b> cobrado"
    segs = [(60, True), (40, False)] if state == "kept" else [(30, True), (70, False)]
    if state == "kept":
        due_block = f"""<div class="due-card">{ic("calendar-clock", size=18)}<div>
            <p class="t">Próxima cuota: saldo final el 13 de enero</p><p class="m">$ 4.640.000 · 60 días antes de salir</p></div></div>"""
    else:
        days = "14" if state == "broken" else "6"
        due_block = f"""<div class="due-card alarm">{ic("circle-alert", size=18)}<div>
            <p class="t">Cuota 2 vencida hace {days} días</p><p class="m">$ 3.480.000 · vencía el 10 de septiembre</p></div></div>"""
    note_row = (f"""<div class="note-row">{ic("sticky-note", size=14)}<span><b>Nota del plan:</b> cobra el 20; llamar antes de escribir, no le gustan los mensajes.</span><a href="#">Editar</a></div>"""
                if note else
                f"""<div class="note-row">{ic("sticky-note", size=14)}<span>Sin nota. Lo que el equipo debe saber para cobrar este plan; el cliente no la ve.</span><a href="#">Añadir</a></div>""")
    second = btn("Anotar promesa de pago", "handshake", "outline block") if state in ("due",) else btn("Enviar recordatorio", "send", "outline block")
    grab = '<div class="grab"></div>' if mobile else ""
    return f"""<aside class="sheet" aria-label="Pedido JX-0047">{grab}
      <div class="sheet-top">
        <div><p class="id">JX-0047</p><p class="who2">Diana Salazar</p><p class="where">Expedición Cocuy · 1 cupo · sale el 14 de marzo</p></div>
        {badge("Abonado", "warn")}
      </div>
      <div class="sheet-body">
        <div class="headline"><p class="lede">Falta por cobrar</p><p class="amount">{balance}</p><p class="of">{of}</p>{meter(segs, "Progreso del cobro")}</div>
        {due_block}
        {promise_card(state)}
        <div class="group">
          <p class="head">Plan de pagos <span class="links"><a href="#">Reprogramar</a></span></p>
          {diana_rows(state)}
          {history(state) if state != "due" else ""}
          {note_row}
        </div>
        <div class="actions">
          {btn("Registrar abono", "", "block")}
          {second}
          <p class="origin">La promesa y la nota son del <b>equipo</b>: el cliente no las ve. Lo que le llega son los recordatorios, y una promesa viva los pausa.</p>
        </div>
      </div>
    </aside>"""


def movements(state: str) -> str:
    items = []
    if state in ("live", "kept", "broken"):
        items.append(("Promesa de pago anotada", "16 de septiembre · por Isabel · «cobra el 20 y paga ese día»", "$ 3.480.000", "para el 22 de septiembre"))
    if state == "kept":
        items.insert(0, ("Abono aplicado a la cuota 2", "21 de septiembre · verificado por Isabel · cumple la promesa", "$ 3.480.000", "Cuota 2 de 3"))
    if state == "broken":
        items.insert(0, ("Promesa rota", "23 de septiembre · el 22 pasó sin pago · recordatorios reanudados", "$ 3.480.000", "sigue vencida"))
    items.append(("Cuota 2 vencida", "10 de septiembre · empieza la cadencia de mora", "$ 3.480.000", "Cuota 2 de 3"))
    items.append(("Plan de pagos creado", "2 de julio · 30 % de anticipo y 3 cuotas", "$ 11.600.000", "Total del pedido"))
    rows = "".join(
        f"""<div class="grow"><span><span class="nm" style="display:block">{t}</span><span class="sub">{s}</span></span>
          <span class="right"><span class="amt" style="display:block">{a}</span><span class="due" style="display:block">{d}</span></span><span></span></div>"""
        for t, s, a, d in items)
    return f"""<div class="block">
      <div class="sec fine">{ic("check", "", 15)}<span class="t">Movimientos del plan</span></div>
      <div class="glist">{rows}</div>
      <p class="foot-note">Cada promesa deja rastro: cuándo se anotó, quién, y cómo terminó. Los recordatorios que se pausaron y volvieron también están en el historial de avisos.</p>
    </div>"""


def order_page(state: str = "due", overlay: str = "", note: bool = True) -> str:
    return f"""<div class="split" style="position:relative;min-height:1040px">
      <div class="content"><p class="ttl" style="font-size:19px;font-weight:600;letter-spacing:-.015em">Pedidos</p>{movements(state)}</div>
      {sheet(state, note)}
      {overlay}
    </div>"""


# ── Diálogos ───────────────────────────────────────────────────────────────
def promise_dialog(mobile: bool = False) -> str:
    chips = "".join(
        f'<span class="chip {"on" if on else ""}">{t}<small>{d}</small></span>'
        for t, d, on in [("Mañana", "miércoles 17", False), ("En 3 días", "viernes 19", False), ("Lunes 22", "en 6 días", True), ("Otra fecha", "elegir", False)])
    grab = '<div class="grab"></div>' if mobile else ""
    modal = f"""<div class="modal wide" role="dialog" aria-modal="true" aria-labelledby="pd-t">{grab}
      <div><h2 id="pd-t">Anotar promesa de pago</h2>
        <p class="sub">Diana Salazar · JX-0047 · debe $ 3.480.000 desde hace 6 días</p></div>
      <div class="field2"><label>¿Cuándo dijo que paga?</label><div class="chips dates">{chips}</div></div>
      <div class="amount-field"><label for="pamt">Cuánto <span class="muted" style="font-weight:400">· opcional</span></label>
        <div class="amount-input opt"><span class="cur">$</span><input id="pamt" value="3.480.000" readonly><span class="hint">la cuota vencida</span></div>
        <div class="chips"><span class="chip on">Cuota vencida · $ 3.480.000</span><span class="chip">Todo el saldo · $ 8.120.000</span></div></div>
      <div class="field2"><label for="pnote">Nota para el equipo <span class="muted" style="font-weight:400">· opcional</span></label>
        {K.input("Cobra el 20 y paga ese mismo día", "", "textarea big", fid="pnote")}<p class="cnt">32 / 500</p></div>
      <div class="after">
        <p class="cap">Mientras la promesa esté viva</p>
        <div class="line"><span>Recordatorios automáticos</span><span class="v">En pausa hasta el 22</span></div>
        <div class="line muted"><span>En la cartera</span><span class="v">«Prometió pagar el 22»</span></div>
        <p class="state">{ic("triangle-alert", size=16)}<span>Si el 22 pasa sin pago, la promesa se marca <b>rota</b> y los recordatorios vuelven solos. Escribirle a mano sigue permitido siempre.</span></p>
      </div>
      <div class="modal-foot">{btn("Volver", "", "ghost")}{btn("Anotar promesa", "handshake")}</div>
    </div>"""
    # En escritorio el diálogo va centrado dentro del velo (como en F4); en el
    # móvil es una hoja anclada abajo sobre el velo.
    return f'<div class="scrim"></div>{modal}' if mobile else f'<div class="overlay">{modal}</div>'


def note_dialog() -> str:
    return f"""<div class="overlay"><div class="modal wide" role="dialog" aria-modal="true" aria-labelledby="nd-t">
      <div><h2 id="nd-t">Nota del plan</h2><p class="sub">Diana Salazar · JX-0047 · la ve el equipo, no el cliente</p></div>
      {K.input("Cobra el 20; llamar antes de escribir, no le gustan los mensajes.", "", "textarea big", fid="note")}
      <p class="cnt">64 / 1000</p>
      <p class="set-note" style="padding:0">Una sola nota por plan, la última manda. Lo que quieras que el cliente lea va en un recordatorio, no aquí.</p>
      <div class="modal-foot">{btn("Volver", "", "ghost")}{btn("Guardar nota")}</div>
    </div></div>"""


def mobile() -> str:
    return f"""<div class="mobile">
      <div class="wrap">
        <div class="topbar"><p class="ttl">Cartera</p>{btn("", "send", "ghost icon sm", 'aria-label="Enviar recordatorios"')}</div>
        <div class="block">
          <div class="sec late">{ic("circle-alert", "", 15)}<span class="t">En mora</span><span class="n">1</span></div>
          <div class="glist">{debtor_row(DIANA)}</div>
        </div>
      </div>
      {promise_dialog(mobile=True)}
    </div>"""


VIEWS = [
    ("cartera", "1 · Desde la Cartera", receivables(menu=True),
     "La fila de la Cartera conserva su única diana visible, «Escribir», y gana «…» con lo que no cabe en una diana: anotar la promesa, reprogramar las cuotas y abrir el pedido. Es el mismo patrón de la fila de documentos de F8; nada nuevo que aprender."),
    ("promesa", "2 · Anotar promesa", order_page("due", promise_dialog()),
     "Una promesa es una frase con fecha, no un formulario. La fecha va en chips que se entienden («mañana», «en 3 días», «lunes 22»); el monto es opcional y viene con la cuota vencida propuesta; la nota es para el equipo. Y ANTES de anotarla el diálogo dice qué pasará: los recordatorios se pausan hasta ese día y, si no llega el pago, se rompe sola y vuelven."),
    ("viva", "3 · Promesa viva", order_page("live"),
     "En el pedido, la promesa es una tarjeta con apretón de manos, en el mismo tono informativo de F4: cuánto, cuándo, la nota del equipo y quién la anotó. El plan gana el historial de promesas bajo las cuotas y la nota del plan al pie."),
    ("cumplida", "4 · Cumplida", order_page("kept"),
     "Si el pago llega antes del día, la promesa se cumple y lo dice en verde: «pagó el 21, un día antes». La cuota queda saldada, los recordatorios siguen con la siguiente y el historial lo guarda."),
    ("rota", "5 · Rota", order_page("broken"),
     "Si el 22 pasa sin pago, el barrido la marca rota. La tarjeta lo dice en ámbar, con la consecuencia («los recordatorios volvieron solos el 23») y las dos salidas: anotar otra promesa o escribir. Nunca un badge de color: la frase manda."),
    ("estados", "6 · En la Cartera", receivables(states=True),
     "En la lista, la promesa es texto dentro de la fila: viva con su fecha y «avisos en pausa», rota con «no cumplió la promesa del 22». La fecha de la derecha cambia de «venció hace 6 días» a «prometió pagar el 22»: la urgencia la sigue diciendo la sección."),
    ("nota", "7 · Nota del plan", order_page("live", note_dialog()),
     "La nota del plan es una sola pregunta: lo que el equipo debe saber para cobrar, que el cliente no ve. Vive al pie del plan con «Editar»; sin nota, la fila invita a añadirla."),
    ("reprogramar", "8 · Reprogramar (pieza separada)", order_page("due", F4.reschedule()),
     "La segunda pantalla que F4 prometió y no existe: reprogramar el calendario. Viene tal cual del mockup aprobado de F4 —solo lo pendiente, la suma cuadra mientras se escribe— y entra desde el enlace del plan o desde «…» en la Cartera. El dueño decide si va en el mismo tramo."),
    ("descuadre", "9 · No cuadra", order_page("due", F4.reschedule(bad=True)),
     "La misma regla del servidor (409 schedule_mismatch), dicha antes de perder el trabajo: si las cuotas no suman el saldo, se dice cuánto falta y el botón no se puede pulsar."),
    ("oscuro", "10 · Oscuro", order_page("broken"),
     "Mismos tokens; el tono va en el icono y en la frase, nunca en un fondo de color."),
    ("movil", "11 · Móvil", mobile(),
     "En el móvil el diálogo es una hoja desde abajo: los chips de fecha a todo el ancho, el monto opcional y el botón a lo ancho."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("Promesas de pago, calendario y notas", "Mockup F0 · no es producto",
                 "Cobros · F4b «Promesas, reprogramación y notas»", VIEWS)
    K.export_artboards([
        {"file": "Main.dc.html", "title": "Desde la Cartera · «…» en la fila", "body": receivables(menu=True), "w": 1440, "h": 1080},
        {"file": "promesa.dc.html", "title": "Anotar promesa · una frase con fecha", "body": order_page("due", promise_dialog()), "w": 1440, "h": 1040},
        {"file": "viva.dc.html", "title": "Promesa viva · avisos en pausa", "body": order_page("live"), "w": 1440, "h": 1040},
        {"file": "cumplida.dc.html", "title": "Cumplida · pagó un día antes", "body": order_page("kept"), "w": 1440, "h": 1040},
        {"file": "rota.dc.html", "title": "Rota · los avisos volvieron", "body": order_page("broken"), "w": 1440, "h": 1040},
        {"file": "estados.dc.html", "title": "En la Cartera · viva y rota como texto", "body": receivables(states=True), "w": 1440, "h": 1080},
        {"file": "nota.dc.html", "title": "Nota del plan · para el equipo", "body": order_page("live", note_dialog()), "w": 1440, "h": 1040},
        {"file": "reprogramar.dc.html", "title": "Reprogramar (pieza separada) · solo lo pendiente", "body": order_page("due", F4.reschedule()), "w": 1440, "h": 1040},
        {"file": "descuadre.dc.html", "title": "Reprogramar · no cuadra", "body": order_page("due", F4.reschedule(bad=True)), "w": 1440, "h": 1040},
        {"file": "oscuro.dc.html", "title": "Oscuro · el tono en el icono y la frase", "body": order_page("broken"), "w": 1440, "h": 1040, "dark": True},
        {"file": "movil.dc.html", "title": "Móvil · la promesa es una hoja", "body": mobile(), "w": 460, "h": 900},
    ])
