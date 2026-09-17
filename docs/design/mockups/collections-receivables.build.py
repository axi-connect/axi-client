#!/usr/bin/env python3
"""Mockup «La cartera» (cobros_frontend_plan.md §4, F4).

La idea que ordena todo el diseño: **dos ejes, no uno**.

El color dice cuánto corre prisa el dinero (al día → vence pronto → en mora, y cuánta).
El icono dice qué pasó con el servicio (aún no sale / ya viajó). Son preguntas distintas y
mezclarlas en una sola escala de gravedad es lo que convierte una cartera en una lista de
colores que nadie sabe leer. Es, además, la misma separación que D14 introdujo en el modelo:
`status` cuenta el servicio y `payment_state` cuenta el cobro.

De ahí sale lo demás: la página no abre como una hoja de cálculo sino con la respuesta —cuánto
te deben y cuánto de eso ya viajó—, y la lista está ordenada por a quién escribir primero.

Uso:  python3 collections-receivables.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("collections-receivables")
ic, btn, badge = K.ic, K.btn, K.badge

EXTRA_CSS = """
/* ── Cabecera de la cartera: la respuesta antes que la tabla ───────────── */
.wrap{max-width:1180px;margin:0 auto;padding:26px 30px 48px;display:flex;flex-direction:column;gap:22px}
.head-row{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap}
.h1{font-size:25px;font-weight:600;letter-spacing:-.02em;font-family:var(--font-body)}
.h1-sub{font-size:13.5px;color:var(--muted-foreground);margin-top:3px}

.answer{display:flex;flex-wrap:wrap;align-items:flex-end;gap:32px 44px}
.answer .big .lede{font-size:13px;color:var(--muted-foreground)}
.answer .big .amount{font-family:var(--font-heading);font-size:44px;line-height:1.02;letter-spacing:-.025em;font-variant-numeric:tabular-nums;margin-top:4px}
.answer .side{display:flex;gap:36px;flex-wrap:wrap;padding-bottom:5px}
.answer .side .k{font-size:12.5px;color:var(--muted-foreground);display:flex;align-items:center;gap:6px}
.answer .side .v{font-size:19px;font-weight:600;letter-spacing:-.015em;font-variant-numeric:tabular-nums;margin-top:3px}
.answer .side .n{font-size:12px;color:var(--muted-foreground);margin-top:2px}
.answer .side .late .v{color:var(--axi-destructive)}

/* La franja de antigüedad: una sola barra, no cinco tarjetas. */
.aging{display:flex;flex-direction:column;gap:8px}
.aging .bar{height:8px;border-radius:999px;overflow:hidden}
.aging .legend{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:12px;color:var(--muted-foreground)}
.aging .legend span{display:inline-flex;align-items:center;gap:7px}
.aging .legend i{width:8px;height:8px;border-radius:50%;font-style:normal}
.aging .legend b{color:var(--foreground);font-weight:500;font-variant-numeric:tabular-nums}

/* ── Barra de trabajo ─────────────────────────────────────────────────── */
.toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
.search{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;border:1px solid var(--input);border-radius:999px;color:var(--muted-foreground);font-size:13px;min-width:220px}

/* ── Lista de deudores ───────────────────────────────────────────────────
   Tabla, porque se escanea de arriba abajo comparando importes; pero con
   celdas compuestas: nueve columnas sueltas eran un muro. */
.list{border:1px solid var(--border);border-radius:18px;overflow:hidden;background:var(--background)}
.list table{width:100%;border-collapse:collapse}
.list th{font-size:11.5px;font-weight:500;color:var(--muted-foreground);letter-spacing:.04em;text-transform:uppercase;padding:11px 18px;text-align:left;white-space:nowrap;border-bottom:1px solid var(--border-soft)}
.list th.r,.list td.r{text-align:right}
.list td{padding:15px 18px;border-bottom:1px solid var(--border-soft);vertical-align:middle}
.list tbody tr:last-child td{border-bottom:none}
.list tbody tr.urgent td{background:color-mix(in srgb, var(--axi-destructive) 4%, transparent)}

.who{display:flex;align-items:center;gap:12px;min-width:0}
.av{width:34px;height:34px;border-radius:50%;background:var(--secondary);display:grid;place-items:center;font-size:12.5px;font-weight:600;color:var(--muted-foreground);flex:none}
.who .n{font-size:14px;font-weight:500;letter-spacing:-.005em}
.who .m{font-size:12.5px;color:var(--muted-foreground);margin-top:1px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.who .m .id{font-family:var(--font-mono);font-size:11.5px}

/* El eje del SERVICIO: un icono, nunca un color de gravedad. */
.trip{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted-foreground)}
.trip.gone{color:var(--foreground);font-weight:500}
.trip .ic{color:var(--muted-foreground)}
.trip.gone .ic{color:var(--foreground)}

.owe{font-size:15.5px;font-weight:600;letter-spacing:-.015em;font-variant-numeric:tabular-nums}
.owe small{display:block;font-size:11.5px;font-weight:400;color:var(--muted-foreground);margin-top:2px}
.mini{height:4px;border-radius:999px;width:96px;margin-top:7px;margin-left:auto}

/* El eje del DINERO: aquí sí manda el color. */
.when{font-size:13.5px;font-variant-numeric:tabular-nums}
.when .t{font-weight:500}
.when .m{font-size:12px;color:var(--muted-foreground);margin-top:1px}
.when.late .t{color:var(--axi-destructive)}
.rowacts{display:flex;gap:6px;justify-content:flex-end}
.rowacts .btn{color:var(--muted-foreground)}

/* ── Rail del pedido: el plan de pagos ───────────────────────────────── */
.split{display:grid;grid-template-columns:minmax(0,1fr) 400px;min-height:100%}
.content{padding:26px 30px 40px;display:flex;flex-direction:column;gap:22px}
.sheet{width:400px;border-left:1px solid var(--border);background:var(--background);display:flex;flex-direction:column;min-height:100%}
.sheet-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 24px 0}
.sheet-top .id{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground)}
.sheet-top .who2{font-size:16px;font-weight:600;letter-spacing:-.01em;margin-top:2px}
.sheet-top .where{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.sheet-body{padding:0 24px 24px;display:flex;flex-direction:column;gap:22px}
.headline{padding-top:18px}
.headline .lede{font-size:13px;color:var(--muted-foreground)}
.headline .amount{font-family:var(--font-heading);font-size:40px;line-height:1.05;letter-spacing:-.025em;font-variant-numeric:tabular-nums;margin-top:4px}
.headline .of{font-size:13px;color:var(--muted-foreground);margin-top:6px;font-variant-numeric:tabular-nums}
.headline .of b{color:var(--foreground);font-weight:500}
.meter{height:6px;border-radius:999px;margin-top:14px;overflow:hidden}
.due{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:var(--secondary)}
.due.alarm{background:color-mix(in srgb, var(--axi-destructive) 8%, var(--background));border:1px solid color-mix(in srgb, var(--axi-destructive) 22%, transparent)}
.due .ic{color:var(--muted-foreground)} .due.alarm .ic{color:var(--axi-destructive)}
.due .t{font-size:14px;font-weight:500}
.due .m{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}

/* Lista agrupada de cuotas (idioma iOS del mockup de F3). */
.group{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--background)}
.group .head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:12.5px;color:var(--muted-foreground);padding:12px 16px 0}
.group .head a{font-weight:500;color:var(--foreground);text-decoration:none}
.row{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 16px;position:relative}
.row + .row::before{content:"";position:absolute;left:54px;right:0;top:0;height:1px;background:var(--border-soft)}
.row .dot{width:8px;height:8px;border-radius:50%;justify-self:center}
.row .dot.ok{background:var(--axi-success)}
.row .dot.next{background:var(--axi-brand)}
.row .dot.late{background:var(--axi-destructive)}
.row .dot.off{background:var(--border)}
.row .t{font-size:14px;font-weight:500}
.row .m{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.row .v{font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;text-align:right}
.row .v small{display:block;font-size:11.5px;font-weight:400;color:var(--muted-foreground);margin-top:1px}
.row .v small.late{color:var(--axi-destructive)}
.actions{display:flex;flex-direction:column;gap:8px}
.btn.block{width:100%;height:44px;border-radius:14px;font-size:14.5px}
.origin{font-size:12px;color:var(--muted-foreground);line-height:1.5}
.origin b{color:var(--foreground);font-weight:500;font-variant-numeric:tabular-nums}
.promise{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:color-mix(in srgb, var(--axi-info) 8%, var(--background));border:1px solid color-mix(in srgb, var(--axi-info) 20%, transparent);font-size:13px}
.promise .ic{color:var(--axi-info)}
.promise b{font-weight:500}

/* ── Diálogos ────────────────────────────────────────────────────────── */
.modal.wide{max-width:520px;padding:24px;gap:18px}
.modal.wide h2{font-size:20px;letter-spacing:-.015em;font-family:var(--font-body);font-weight:600}
.modal .sub{font-size:13px;color:var(--muted-foreground);margin-top:2px}
.amount-field{display:flex;flex-direction:column;gap:8px}
.amount-field label{font-size:13px;font-weight:500}
.amount-input{display:flex;align-items:baseline;gap:8px;border:1px solid var(--input);border-radius:14px;padding:14px 16px;background:var(--background)}
.amount-input .cur{font-size:16px;color:var(--muted-foreground)}
.amount-input input{border:0;background:transparent;outline:none;width:100%;font-family:inherit;color:inherit;font-size:26px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.amount-input.err{border-color:var(--axi-destructive)}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{border:1px solid var(--border);border-radius:999px;padding:5px 12px;font-size:12.5px;background:var(--background)}
.chip.on{background:var(--accent);border-color:transparent;font-weight:500}
.after{border-radius:14px;background:var(--secondary);padding:14px 16px}
.after .cap{font-size:12.5px;color:var(--muted-foreground)}
.after .line{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:8px;font-size:14px}
.after .line .v{font-weight:600;font-variant-numeric:tabular-nums}
.after .line.muted .v{font-weight:500;color:var(--muted-foreground)}
.after .state{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-soft);font-size:13px}

/* Editor de cuotas: la suma tiene que cuadrar y se ve mientras se edita. */
.sched{display:flex;flex-direction:column;gap:2px}
.sline{display:grid;grid-template-columns:20px minmax(0,1fr) 128px 32px;gap:10px;align-items:center;padding:9px 0;position:relative}
.sline + .sline::before{content:"";position:absolute;left:30px;right:0;top:0;height:1px;background:var(--border-soft)}
.sline .seq{font-size:12px;color:var(--muted-foreground);text-align:center;font-variant-numeric:tabular-nums}
.sline .din{display:flex;align-items:center;gap:8px;font-size:13.5px}
.sline .din .d{border:1px solid var(--input);border-radius:9px;padding:5px 10px;font-variant-numeric:tabular-nums}
.sline .din .kind{font-size:12px;color:var(--muted-foreground)}
.sline .amt{border:1px solid var(--input);border-radius:9px;padding:5px 10px;font-size:13.5px;font-weight:500;text-align:right;font-variant-numeric:tabular-nums}
.sline .x{color:var(--muted-foreground);display:grid;place-items:center}
.balance-check{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:var(--secondary);font-size:13.5px}
.balance-check.bad{background:color-mix(in srgb, var(--axi-destructive) 8%, var(--background));border:1px solid color-mix(in srgb, var(--axi-destructive) 22%, transparent)}
.balance-check .v{font-weight:600;font-variant-numeric:tabular-nums}
.balance-check.bad .v{color:var(--axi-destructive)}

/* ── Política: el calendario que produce, no solo los números ────────── */
.policy-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:26px;align-items:start}
.preview{border:1px solid var(--border);border-radius:18px;padding:18px 20px;background:var(--background)}
.preview .cap{font-size:12.5px;color:var(--muted-foreground)}
.preview .ttl{font-size:15px;font-weight:600;letter-spacing:-.01em;margin-top:2px}
.tl{display:flex;flex-direction:column;margin-top:14px}
.tl .i{display:grid;grid-template-columns:14px minmax(0,1fr) auto;gap:12px;align-items:start;padding:10px 0;position:relative}
.tl .i::after{content:"";position:absolute;left:6px;top:24px;bottom:-10px;width:1px;background:var(--border)}
.tl .i:last-child::after{display:none}
.tl .b{width:9px;height:9px;border-radius:50%;background:var(--border);margin-top:5px;justify-self:center;z-index:1}
.tl .i.first .b{background:var(--axi-brand)}
.tl .i.last .b{background:var(--foreground)}
.tl .t{font-size:13.5px;font-weight:500}
.tl .m{font-size:12px;color:var(--muted-foreground);margin-top:1px}
.tl .v{font-size:13.5px;font-weight:500;font-variant-numeric:tabular-nums}
.stack-24{display:flex;flex-direction:column;gap:24px}
.section-title{font-size:15px;font-weight:600;letter-spacing:-.01em}
.section-sub{font-size:13px;color:var(--muted-foreground);margin-top:2px;max-width:62ch}

/* ── Panel del inbox ─────────────────────────────────────────────────── */
.inbox{display:grid;grid-template-columns:minmax(0,1fr) 360px;min-height:100%}
.chat{padding:26px 30px;display:flex;flex-direction:column;gap:12px;background:color-mix(in srgb, var(--foreground) 3%, var(--background))}
.msg{max-width:72%;padding:11px 14px;border-radius:16px;font-size:13.5px;line-height:1.5;box-shadow:var(--shadow-float)}
.msg.in{align-self:flex-start;background:var(--background);border-radius:16px 16px 16px 4px}
.msg.out{align-self:flex-end;background:var(--accent);border-radius:16px 16px 4px 16px}
.msg time{display:block;font-size:10.5px;color:var(--muted-foreground);margin-top:6px}
.panel{border-left:1px solid var(--border);background:var(--background);padding:18px 20px;display:flex;flex-direction:column;gap:16px}
.panel h3{font-family:var(--font-body);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600}
"""

# ── Datos: JuanitoXpeditions, cartera de un martes cualquiera ───────────────
TOTAL_DUE = "$ 46.927.205"
LATE_DUE = "$ 15.780.000"
GONE_DUE = "$ 12.300.000"


def mini_meter(percent: int, tone: str = "brand") -> str:
    """Medidor de fila: un elemento con degradado, sin hijos vacíos (lección de F3)."""
    color = {"brand": "var(--axi-brand)", "late": "var(--axi-destructive)"}[tone]
    return (
        f'<div class="mini" role="img" aria-label="Cobrado el {percent} por ciento" '
        f'style="background:linear-gradient(90deg,{color} 0% {percent}%,var(--secondary) {percent}% 100%)"></div>'
    )


def meter(segments, label) -> str:
    total = sum(w for w, _ in segments) or 1
    stops, at = [], 0.0
    for index, (weight, paid) in enumerate(segments):
        start = at
        at += weight / total * 100
        color = "var(--axi-brand)" if paid else "var(--secondary)"
        gap = 0.5 if index > 0 else 0
        stops.append(f"{color} {start + gap:.2f}% {at:.2f}%")
        if gap:
            stops.insert(len(stops) - 1, f"var(--background) {start:.2f}% {start + gap:.2f}%")
    return (
        f'<div class="meter" role="img" aria-label="{label}" '
        f'style="background:linear-gradient(90deg, {", ".join(stops)})"></div>'
    )


def trip(gone: bool, text: str) -> str:
    """El eje del SERVICIO. Icono, nunca color de gravedad: «ya viajó» no es un
    grado de mora, es otra pregunta. Mezclarlos era el error fácil."""
    cls = "trip gone" if gone else "trip"
    return f'<span class="{cls}">{ic("plane" if gone else "calendar", size=13)}{text}</span>'


DEBTORS = [
    dict(ini="CO", name="Camilo Ortiz", order="JX-0033", trip_name="Sierra Nevada · 2 cupos",
         gone=True, trip_text="Viajó el 1 ago", owe="$ 8.100.000", of="de $ 27.000.000", pct=70,
         when="Venció hace 47 días", sub="Cuota 3 de 3 · 1 ago", late=True, urgent=True),
    dict(ini="AM", name="Andrés Mejía", order="JX-0038", trip_name="Nevado del Ruiz · 1 cupo",
         gone=True, trip_text="Viajó el 2 sep", owe="$ 4.200.000", of="de $ 10.850.000", pct=61,
         when="Venció hace 15 días", sub="Saldo final · 2 sep", late=True, urgent=True),
    dict(ini="DS", name="Diana Salazar", order="JX-0047", trip_name="Cocuy · 1 cupo",
         gone=False, trip_text="Sale el 14 mar", owe="$ 3.480.000", of="de $ 10.850.000", pct=68,
         when="Venció hace 6 días", sub="Prometió pagar el 22 sep", late=True, promise=True),
    dict(ini="MR", name="Marcela Ruiz", order="JX-0051", trip_name="Sierra Nevada · 1 cupo",
         gone=False, trip_text="Sale el 8 dic", owe="$ 9.640.000", of="de $ 13.500.000", pct=29,
         when="Vence en 3 días", sub="Cuota 1 de 3 · 20 sep", soon=True),
    dict(ini="LG", name="Laura Gómez", order="JX-0042", trip_name="Cocuy · 2 cupos",
         gone=False, trip_text="Sale el 14 mar", owe="$ 15.192.205", of="de $ 21.703.150", pct=30,
         when="Vence el 14 ene", sub="Cuota 1 de 3", ),
    dict(ini="TV", name="Tomás Villa", order="JX-0055", trip_name="Cocuy · 1 cupo",
         gone=False, trip_text="Sale el 14 mar", owe="$ 6.315.000", of="de $ 10.850.000", pct=42,
         when="Vence el 3 oct", sub="Cuota 2 de 3"),
]


def debtor_row(d: dict, filtered: bool = False) -> str:
    when_cls = "when late" if d.get("late") else "when"
    tone = "late" if d.get("late") else "brand"
    promise = (
        f'<span class="trip">{ic("handshake", size=13)}Promesa 22 sep</span>' if d.get("promise") else ""
    )
    return f"""<tr class="{'urgent' if d.get('urgent') and not filtered else ''}">
      <td>
        <div class="who">
          <span class="av" aria-hidden="true">{d['ini']}</span>
          <div>
            <p class="n">{d['name']}</p>
            <p class="m"><span class="id">{d['order']}</span> · {d['trip_name']}</p>
          </div>
        </div>
      </td>
      <td>{trip(d['gone'], d['trip_text'])}{promise}</td>
      <td class="r">
        <p class="owe">{d['owe']}<small>{d['of']}</small></p>
        {mini_meter(d['pct'], tone)}
      </td>
      <td>
        <div class="{when_cls}"><p class="t">{d['when']}</p><p class="m">{d['sub']}</p></div>
      </td>
      <td class="r">
        <div class="rowacts">
          {btn("", "message-circle", "ghost icon sm", 'aria-label="Escribir a ' + d['name'] + '"')}
          {btn("", "banknote", "ghost icon sm", 'aria-label="Registrar abono"')}
          {btn("", "chevron-right", "ghost icon sm", 'aria-label="Abrir el pedido"')}
        </div>
      </td>
    </tr>"""


def aging_bar() -> str:
    """Una sola barra, no cinco tarjetas: lo que importa es la PROPORCIÓN vencida."""
    parts = [
        ("Al día", "var(--axi-success)", 31_147_205, 66.4),
        ("1–30 días", "var(--axi-warning)", 7_680_000, 16.4),
        ("31–60 días", "var(--axi-destructive)", 8_100_000, 17.2),
    ]
    at, stops, legend = 0.0, [], []
    for label, color, value, pct in parts:
        stops.append(f"{color} {at:.1f}% {at + pct:.1f}%")
        at += pct
        legend.append(
            f'<span><i style="background:{color}"></i>{label} <b>$ {value:,.0f}</b></span>'.replace(",", ".")
        )
    return f"""<div class="aging">
      <div class="bar" role="img" aria-label="Antigüedad de la cartera"
           style="background:linear-gradient(90deg,{", ".join(stops)})"></div>
      <div class="legend">{"".join(legend)}</div>
    </div>"""


def answer_block() -> str:
    return f"""<div class="answer">
      <div class="big">
        <p class="lede">Te deben</p>
        <p class="amount">{TOTAL_DUE}</p>
      </div>
      <div class="side">
        <div class="late">
          <p class="k">{ic("circle-alert", size=13)}En mora</p>
          <p class="v">{LATE_DUE}</p>
          <p class="n">3 clientes</p>
        </div>
        <div>
          <p class="k">{ic("plane", size=13)}Ya viajaron y deben</p>
          <p class="v">{GONE_DUE}</p>
          <p class="n">2 clientes · sin palanca</p>
        </div>
        <div>
          <p class="k">{ic("handshake", size=13)}Prometido</p>
          <p class="v">$ 3.480.000</p>
          <p class="n">1 cliente · esta semana</p>
        </div>
      </div>
    </div>"""


def receivables(filter_key: str = "todo") -> str:
    tabs = [("Todo", "todo"), ("En mora", "mora"), ("Ya viajaron", "viajaron"), ("Vence pronto", "pronto")]
    seg = "".join(
        f'<button aria-checked="{str(k == filter_key).lower()}">{t}'
        f'<span class="cnt">{ {"todo": 6, "mora": 3, "viajaron": 2, "pronto": 1}[k] }</span></button>'
        for t, k in tabs
    )
    rows = DEBTORS
    note = ""
    if filter_key == "viajaron":
        rows = [d for d in DEBTORS if d["gone"]]
        note = K.notice(
            "warn",
            "<b>Ya viajaron y todavía deben.</b> El servicio se prestó, así que no queda nada que retener: "
            "es la deuda que más rápido envejece y la primera que conviene trabajar.",
        )
    elif filter_key == "mora":
        rows = [d for d in DEBTORS if d.get("late")]
    body = "".join(debtor_row(d, filtered=filter_key != "todo") for d in rows)
    return f"""<div class="wrap">
      <div class="head-row">
        <div><h1 class="h1">Cartera</h1><p class="h1-sub">Quién te debe, cuánto y desde cuándo. Ordenada por a quién escribir primero.</p></div>
        <div style="display:flex;gap:8px;align-items:center">
          {btn("Exportar", "download", "outline sm")}
          {btn("Enviar recordatorios", "send", "sm")}
        </div>
      </div>
      {answer_block()}
      {aging_bar()}
      <div class="toolbar">
        <nav class="seg inline sm" aria-label="Filtro de cartera">{seg}</nav>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="search">{ic("search", size=15)}Buscar cliente o pedido</div>
          {K.select("Todas las salidas", "", "map-pin")}
        </div>
      </div>
      {note}
      <div class="list">
        <table>
          <thead><tr>
            <th>Cliente</th><th>Servicio</th><th class="r">Saldo</th><th>Cobro</th><th class="r"><span class="sr">Acciones</span></th>
          </tr></thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      <p class="small muted">El saldo sale del pedido, no de una copia: es <b>total − cobrado</b>, fila a fila. Si mañana cambia el total del pedido, la cartera ya lo sabe.</p>
    </div>"""


# ── Rail del pedido: el plan de pagos ──────────────────────────────────────
def plan_rows(state: str) -> str:
    if state == "gone":
        return """<div class="row"><span class="dot ok"></span>
            <div><p class="t">Anticipo · 30 %</p><p class="m">Pagado el 2 jun</p></div>
            <p class="v">$ 3.255.000</p></div>
          <div class="row"><span class="dot ok"></span>
            <div><p class="t">Cuota 2 de 3</p><p class="m">Pagada el 2 jul</p></div>
            <p class="v">$ 3.395.000</p></div>
          <div class="row"><span class="dot late"></span>
            <div><p class="t">Saldo final</p><p class="m">Vencía el 2 sep, tres días antes de la salida</p></div>
            <p class="v">$ 4.200.000<small class="late">15 días de mora</small></p></div>"""
    return """<div class="row"><span class="dot ok"></span>
        <div><p class="t">Anticipo · 30 %</p><p class="m">Pagado el 16 sep</p></div>
        <p class="v">$ 6.510.945</p></div>
      <div class="row"><span class="dot next"></span>
        <div><p class="t">Cuota 2 de 3</p><p class="m">Vence el 14 ene</p></div>
        <p class="v">$ 7.596.102<small>en 119 días</small></p></div>
      <div class="row"><span class="dot off"></span>
        <div><p class="t">Saldo final</p><p class="m">Vence el 13 ene, 60 días antes de la salida</p></div>
        <p class="v">$ 7.596.103</p></div>"""


def order_sheet(state: str = "plan") -> str:
    gone = state == "gone"
    head_badge = badge("Entregado · debe", "warn") if gone else badge("Abonado", "warn")
    who = "Andrés Mejía" if gone else "Laura Gómez"
    oid = "JX-0038" if gone else "JX-0042"
    where = "Nevado del Ruiz · 1 cupo" if gone else "Expedición Cocuy · 2 cupos"
    amount = "$ 4.200.000" if gone else "$ 15.192.205"
    of = ("de $ 10.850.000 · <b>61 %</b> cobrado" if gone else "de $ 21.703.150 · <b>30 %</b> cobrado")
    segs = [(61, True), (39, False)] if gone else [(30, True), (70, False)]
    due_block = (
        f"""<div class="due alarm">{ic("triangle-alert", size=18)}<div>
            <p class="t">Viajó el 2 de septiembre y debe desde entonces</p>
            <p class="m">15 días de mora · el servicio ya se prestó</p></div></div>"""
        if gone
        else f"""<div class="due">{ic("calendar", size=18)}<div>
            <p class="t">Próxima cuota en 119 días</p>
            <p class="m">$ 7.596.102 · 14 de enero</p></div></div>"""
    )
    promise = (
        f"""<div class="promise">{ic("handshake", size=16)}<div><b>Prometió pagar el 22 de septiembre.</b>
          Los recordatorios quedan en pausa hasta ese día.</div></div>"""
        if state == "promise"
        else ""
    )
    return f"""<aside class="sheet" aria-label="Pedido {oid}">
      <div class="sheet-top">
        <div><p class="id">{oid}</p><p class="who2">{who}</p><p class="where">{where}</p></div>
        {head_badge}
      </div>
      <div class="sheet-body">
        <div class="headline">
          <p class="lede">Falta por cobrar</p>
          <p class="amount">{amount}</p>
          <p class="of">{of}</p>
          {meter(segs, "Progreso del cobro")}
        </div>
        {due_block}
        {promise}
        <div class="group">
          <p class="head">Plan de pagos <a href="#">Reprogramar</a></p>
          {plan_rows("gone" if gone else "plan")}
        </div>
        <div class="actions">
          {btn("Registrar abono", "", "block")}
          {btn("Anotar promesa de pago", "handshake", "outline block") if not gone else btn("Enviar recordatorio", "send", "outline block")}
          <p class="origin">Plan creado al confirmar con la política del tenant: <b>30 %</b> de anticipo, <b>3</b> cuotas y el saldo <b>60 días</b> antes de la salida.</p>
        </div>
      </div>
    </aside>"""


def order_page(state: str = "plan", overlay: str = "") -> str:
    return f"""<div class="split">
      <div class="content">
        <div><h1 class="h1">Pedidos</h1><p class="h1-sub">Expediciones con cobro en curso.</p></div>
        {K.notice("info", "El plan de pagos vive en el pedido y la Cartera lo lee. No hay dos verdades: lo cobrado sale del pedido y las cuotas solo dicen <b>cuándo</b> tocaba cada parte.")}
        <div class="group">
          <p class="head">Movimientos del plan</p>
          <div class="row"><span class="dot ok"></span><div><p class="t">Abono aplicado a la cuota 1</p><p class="m">16 sep · $ 6.510.945 · verificado por Isabel</p></div><p class="v">Cuota 1</p></div>
          <div class="row"><span class="dot ok"></span><div><p class="t">Plan creado</p><p class="m">16 sep · 30 % de anticipo y 3 cuotas</p></div><p class="v">$ 21.703.150</p></div>
        </div>
      </div>
      {order_sheet(state)}
      {overlay}
    </div>"""


# ── Diálogos ───────────────────────────────────────────────────────────────
def register_payment(state: str = "ok") -> str:
    err = state == "mismatch"
    return f"""<div class="overlay"><div class="modal wide">
      <div><h2>Registrar abono</h2><p class="sub">Laura Gómez · JX-0042 · saldo $ 15.192.205</p></div>
      <div class="amount-field">
        <label for="amt">Monto recibido</label>
        <div class="amount-input"><span class="cur">$</span><input id="amt" value="7.596.102" readonly></div>
        <div class="chips">
          <span class="chip on">Cuota 2 · $ 7.596.102</span>
          <span class="chip">Saldo completo · $ 15.192.205</span>
        </div>
      </div>
      <div class="form" style="grid-template-columns:1fr 1fr">
        {K.field("Medio de pago", K.select("Bancolombia", "", "landmark"), fid="medio")}
        {K.field("Referencia", K.input("TRF-99231"), fid="ref")}
      </div>
      <div class="after">
        <p class="cap">Después de registrarlo</p>
        <div class="line"><span>Se aplica a</span><span class="v">Cuota 2 de 3</span></div>
        <div class="line muted"><span>Queda por cobrar</span><span class="v">$ 7.596.103</span></div>
        <div class="line muted"><span>Próxima cuota</span><span class="v">Saldo final · 13 ene</span></div>
        <p class="state">{ic("info", size=16)}<span>Las cuotas se cubren <b>en orden</b>: lo que entra paga primero la más antigua sin pagar.</span></p>
      </div>
      {K.notice("warn", "Este abono queda <b>reportado</b>, no verificado. El saldo del cliente no se mueve hasta que alguien confirme que el dinero llegó.") if not err else ""}
      <div class="modal-foot">{btn("Volver", "", "outline")}{btn("Registrar $ 7.596.102")}</div>
    </div></div>"""


def reschedule(state: str = "ok") -> str:
    bad = state == "bad"
    lines = [
        ("2", "14 ene 2027", "Cuota", "7.596.102"),
        ("3", "13 ene 2027", "Saldo final", "7.596.103" if not bad else "5.000.000"),
    ]
    rendered = "".join(
        f"""<div class="sline"><span class="seq">{seq}</span>
          <span class="din"><span class="d">{date}</span><span class="kind">{kind}</span></span>
          <span class="amt">$ {amount}</span>
          <span class="x">{ic("x", size=15)}</span></div>"""
        for seq, date, kind, amount in lines
    )
    check = (
        f"""<div class="balance-check bad"><span>Las cuotas suman $ 12.596.102 y el saldo es $ 15.192.205</span>
          <span class="v">Faltan $ 2.596.103</span></div>"""
        if bad
        else f"""<div class="balance-check"><span>Las cuotas pendientes cuadran con el saldo</span>
          <span class="v">$ 15.192.205</span></div>"""
    )
    return f"""<div class="overlay"><div class="modal wide" style="max-width:560px">
      <div><h2>Reprogramar cuotas</h2><p class="sub">Solo lo que está por cobrar. Lo ya pagado no se toca.</p></div>
      <div class="group" style="border:none">
        <p class="head">Pendientes <a href="#">Añadir cuota</a></p>
        <div class="sched" style="padding:0 16px 8px">{rendered}</div>
      </div>
      {check}
      {K.notice("info", "El saldo final se mueve con la salida: si la expedición cambia de fecha, esta cuota se recalcula sola a <b>60 días antes</b>.") if not bad else K.notice("err", "No se puede guardar hasta que las cuotas sumen el saldo. Es la misma regla del servidor, dicha aquí antes de perder el trabajo.")}
      <div class="modal-foot">{btn("Volver", "", "outline")}{btn("Guardar cuotas", "", "" if not bad else "", 'aria-disabled="true"' if bad else "")}</div>
    </div></div>"""


def promise_dialog() -> str:
    return f"""<div class="overlay"><div class="modal wide">
      <div><h2>Anotar promesa de pago</h2><p class="sub">Diana Salazar · JX-0047 · debe $ 3.480.000 desde hace 6 días</p></div>
      <div class="form" style="grid-template-columns:1fr 1fr">
        {K.field("Prometió pagar el", K.input("22 de septiembre", "", "", "calendar"), fid="fecha")}
        {K.field("Monto prometido", K.input("3.480.000", "", "", "banknote"), hint="Puede ser parcial.", fid="monto")}
        {K.field("Nota", K.input("Dijo que cobra el 20 y paga ese mismo día.", ""), full=True, fid="nota")}
      </div>
      <div class="after">
        <p class="cap">Mientras la promesa esté viva</p>
        <div class="line"><span>Recordatorios automáticos</span><span class="v">En pausa hasta el 22</span></div>
        <div class="line muted"><span>En la Cartera</span><span class="v">Aparece como prometido</span></div>
        <p class="state">{ic("triangle-alert", size=16)}<span>Si el 22 no llega el pago, la promesa se marca <b>rota</b> y los recordatorios vuelven solos.</span></p>
      </div>
      <div class="modal-foot">{btn("Volver", "", "outline")}{btn("Anotar promesa")}</div>
    </div></div>"""


# ── Política del plan de pagos ─────────────────────────────────────────────
def policy() -> str:
    steps = [
        ("first", "Anticipo · 30 %", "Al confirmar, hoy", "$ 3.255.000"),
        ("", "Cuota 2", "16 de octubre", "$ 3.797.500"),
        ("", "Cuota 3", "16 de noviembre", "$ 3.797.500"),
        ("last", "Saldo final", "13 de enero · 60 días antes de salir", "$ 0"),
    ]
    tl = "".join(
        f'<div class="i {cls}"><span class="b"></span><div><p class="t">{t}</p><p class="m">{m}</p></div><span class="v">{v}</span></div>'
        for cls, t, m, v in steps
    )
    return f"""<div class="wrap">
      <div><h1 class="h1">Pagos</h1><p class="h1-sub">Cómo cobra tu negocio.</p></div>
      {K.nav([("Medios", "credit-card"), ("Plan de pagos", "calendar-clock"), ("Moneda y TRM", "banknote"), ("Documentos", "file-text")], "Plan de pagos", "Ajustes de pagos")}
      <div class="policy-grid">
        <div class="stack-24">
          <section>
            <p class="section-title">Cómo se reparte el pago</p>
            <p class="section-sub">Se aplica a cada pedido al confirmarlo. Lo que ya tiene plan no cambia.</p>
            <div class="form" style="margin-top:14px">
              {K.field("Anticipo para reservar", K.input("30", "", "", "percent"), hint="Un abono menor igual reserva: lo decide quien verifica.", fid="ant")}
              {K.field("Número de cuotas", K.select("3 cuotas mensuales"), fid="cuotas")}
              {K.field("El saldo se paga", K.input("60", "", "", "calendar-clock"), hint="Días antes de la salida.", fid="saldo")}
              {K.field("Sin fecha de salida", K.select("30 días desde la confirmación"), hint="Para pedidos que no son expediciones.", fid="fallback")}
            </div>
          </section>
          <section>
            <p class="section-title">Cuándo avisar</p>
            <p class="section-sub">Antes de cada cuota y después, si no llega.</p>
            <div class="form" style="margin-top:14px">
              {K.field("Antes de vencer", K.input("7, 3 y 0 días"), fid="antes")}
              {K.field("Después de vencer", K.input("1, 3 y 7 días"), fid="despues")}
            </div>
          </section>
        </div>
        <div class="preview">
          <p class="cap">Con esta política, una expedición de</p>
          <p class="ttl">US$ 3.500 que sale el 14 de marzo</p>
          <div class="tl">{tl}</div>
          <p class="small muted" style="margin-top:12px">Los números salen de la política, no de un ejemplo escrito a mano: cambia el anticipo y este calendario cambia contigo.</p>
        </div>
      </div>
    </div>"""


# ── En la conversación ─────────────────────────────────────────────────────
def inbox() -> str:
    return f"""<div class="inbox">
      <div class="chat">
        <div class="msg in">Hola, ya hice la transferencia de la cuota 🙏<time>Hoy, 9:12</time></div>
        <div class="msg in">Les mando el soporte<time>Hoy, 9:12</time></div>
        <div class="msg out">¡Gracias Marcela! Lo verificamos y te confirmamos hoy mismo.<time>Hoy, 9:14</time></div>
      </div>
      <aside class="panel" aria-label="Pedidos y cobros">
        <div>
          <h3>Pedidos y cobros</h3>
          <div class="group" style="margin-top:8px">
            <div class="row"><span class="dot next"></span>
              <div><p class="t">JX-0051 · Sierra Nevada</p><p class="m">Abonado · sale el 8 dic</p></div>
              <p class="v">$ 9.640.000<small>por cobrar</small></p></div>
          </div>
        </div>
        <div>
          <h3>Próxima cuota</h3>
          <div class="due" style="margin-top:8px">{ic("calendar-clock", size=18)}<div>
            <p class="t">Vence en 3 días</p><p class="m">Cuota 1 de 3 · $ 3.213.333 · 20 sep</p></div></div>
        </div>
        <div class="actions">
          {btn("Verificar el pago reportado", "", "block")}
          {btn("Ver el pedido", "external-link", "outline block")}
        </div>
        <p class="origin">El agente ya registró el comprobante: el saldo no se mueve hasta que alguien confirme que el dinero llegó.</p>
      </aside>
    </div>"""


def disabled() -> str:
    return f"""<div class="wrap">
      <div><h1 class="h1">Pedidos</h1><p class="h1-sub">Savage Wear · tienda de ropa</p></div>
      <div class="list" style="padding:0">
        <div class="empty">
          <span class="eic">{ic("wallet", size=22)}</span>
          <h3>Aquí no hay cartera</h3>
          <p>Este negocio cobra de una, así que no tiene planes de pago ni cuotas que perseguir. La sección no aparece en el menú y la pantalla no existe.</p>
        </div>
      </div>
      {K.notice("info", "Lo mismo del lado del servidor: pedir la cartera sin la función responde <b>403</b>. No es una pantalla escondida, es una capacidad que este negocio no tiene.")}
      <p class="small muted">Se activa en <b>Mi empresa › Funciones</b>. Las agencias de viaje la traen encendida de fábrica; una tienda de ropa, no.</p>
    </div>"""


VIEWS = [
    ("cartera", "1 · Cartera", receivables("todo"),
     "Abre con la respuesta, no con la tabla: cuánto te deben, cuánto está en mora y cuánto ya viajó. Dos ejes separados a propósito — el COLOR dice cuánto corre prisa el dinero, el ICONO dice qué pasó con el servicio. Mezclarlos en una sola escala de gravedad es lo que vuelve ilegible una cartera."),
    ("viajaron", "2 · Ya viajaron", receivables("viajaron"),
     "El caso que abre la decisión de entregar con saldo: el servicio ya se prestó y no queda nada que retener. Es la deuda que más rápido envejece, y por eso tiene su propio filtro y encabeza la lista."),
    ("plan", "3 · Plan de pagos", order_page("plan"),
     "En el pedido, el plan es una lista agrupada con un punto por cuota: pagada, la siguiente, y las que aún no tocan. El pie dice de dónde salió el calendario, que es la pregunta que sigue a «¿por qué tres cuotas?»."),
    ("abono", "4 · Registrar abono", order_page("plan", register_payment()),
     "El monto es obligatorio y viene propuesto con la cuota que toca. Debajo se ve a qué cuota se aplicará y qué queda después, porque el reparto es en orden y eso no se adivina."),
    ("reprogramar", "5 · Reprogramar", order_page("plan", reschedule("ok")),
     "Solo se editan las cuotas pendientes. La suma tiene que cuadrar con el saldo y se comprueba mientras se escribe, no al guardar."),
    ("descuadre", "6 · No cuadra", order_page("plan", reschedule("bad")),
     "La misma regla del servidor, dicha aquí antes de perder el trabajo: si las cuotas no suman el saldo, se dice cuánto falta y el botón no se puede pulsar."),
    ("promesa", "7 · Promesa de pago", order_page("plan", promise_dialog()),
     "Una promesa pausa los recordatorios hasta su fecha, y el diálogo lo dice antes de anotarla. Si el día llega sin pago, la promesa se rompe sola y los avisos vuelven."),
    ("entregado", "8 · Entregado y debiendo", order_page("gone"),
     "El pedido que la decisión del dueño hizo posible: entregado, y aún debiendo. El estado del servicio y el del cobro se cuentan por separado, y la alarma no es el color del badge sino la frase: viajó el 2 de septiembre y debe desde entonces."),
    ("politica", "9 · La política", policy(),
     "Los porcentajes son abstractos, así que al lado va el calendario que producen para una expedición real. Cambiar el anticipo mueve la línea de tiempo: se decide viendo el resultado, no imaginándolo."),
    ("conversacion", "10 · En la conversación", inbox(),
     "Donde de verdad ocurre el cobro. El cliente dice «ya pagué» y el operador tiene el saldo, la cuota y el botón de verificar sin salir del chat."),
    ("sin-funcion", "11 · Sin la función", disabled(),
     "Savage Wear cobra de una: no ve Cartera en el menú, la pantalla no existe y el servidor responde 403. La cartera es una capacidad que se enciende, no una sección que se esconde."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("La cartera: cuotas y cobranza", "Mockup F0 · no es producto", "Cobros · F4 «Plan de pagos y Cartera»", VIEWS)
    K.export_artboards([
        {"file": "collections-receivables.dc.html", "title": "Cartera · quién te debe", "body": receivables("todo"), "w": 1440, "h": 980},
        {"file": "collections-receivables-dark.dc.html", "title": "Cartera · oscuro", "body": receivables("todo"), "w": 1440, "h": 980, "dark": True},
        {"file": "collections-gone.dc.html", "title": "Cartera · ya viajaron y deben", "body": receivables("viajaron"), "w": 1440, "h": 860},
        {"file": "collections-plan.dc.html", "title": "Pedido · plan de pagos", "body": order_page("plan"), "w": 1440, "h": 980},
        {"file": "collections-register.dc.html", "title": "Registrar abono", "body": order_page("plan", register_payment()), "w": 1440, "h": 980},
        {"file": "collections-reschedule.dc.html", "title": "Reprogramar cuotas", "body": order_page("plan", reschedule("ok")), "w": 1440, "h": 980},
        {"file": "collections-mismatch.dc.html", "title": "Reprogramar · no cuadra", "body": order_page("plan", reschedule("bad")), "w": 1440, "h": 980},
        {"file": "collections-promise.dc.html", "title": "Promesa de pago", "body": order_page("plan", promise_dialog()), "w": 1440, "h": 980},
        {"file": "collections-delivered.dc.html", "title": "Entregado y debiendo", "body": order_page("gone"), "w": 1440, "h": 980},
        {"file": "collections-policy.dc.html", "title": "Política · el calendario que produce", "body": policy(), "w": 1440, "h": 900},
        {"file": "collections-inbox.dc.html", "title": "En la conversación", "body": inbox(), "w": 1440, "h": 720},
        {"file": "collections-disabled.dc.html", "title": "Sin la función", "body": disabled(), "w": 1440, "h": 620},
    ])
