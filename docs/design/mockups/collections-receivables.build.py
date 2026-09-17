#!/usr/bin/env python3
"""Mockup «La cartera» (cobros_frontend_plan.md §4, F4) — rediseño premium.

La idea sigue siendo **dos ejes, no uno**: cuánta prisa corre el dinero y qué pasó con el
servicio. Lo que cambia es quién los lleva. Antes iban en la fila —un color aquí, un icono
allá— y había que descodificarlos uno a uno. Ahora los lleva la ESTRUCTURA: la lista se parte
en secciones ordenadas por urgencia, y la primera dice «ya viajaron y deben». El operador no
interpreta la fila: lee el titular de la sección y baja.

Eso permitió quitar casi todo lo demás. Fuera la tabla (era una rejilla de datos en un producto
que en F3 ya hablaba en listas agrupadas: mismo producto, dos idiomas). Fuera los tres botones
por fila —dieciocho dianas de 32 px en la columna que se escanea— por una sola. Fuera el medidor
de cada fila, que nadie compara. Fuera la leyenda de colores, porque la frase de arriba ya dice
las cifras. Fuera el fondo rosado de las urgentes, que era la cuarta manera de decir lo mismo.

Queda un idioma único, el de F3: una superficie por grupo, separadores hacia dentro, la cifra en
la tipografía de titulares y aire alrededor. El color aparece en tres sitios y en ninguno más:
el icono de la sección, la fecha vencida y la barra de proporción.

Uso:  python3 collections-receivables.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("collections-receivables")
ic, btn, badge = K.ic, K.btn, K.badge

EXTRA_CSS = """
/* ── Página ──────────────────────────────────────────────────────────────
   Más estrecha y con más aire que una tabla: es una lista de trabajo, y una
   lista se lee en columna, no a lo ancho de la pantalla. */
.wrap{max-width:1040px;margin:0 auto;padding:40px 40px 80px;display:flex;flex-direction:column;gap:30px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px}
.topbar .ttl{font-size:19px;font-weight:600;letter-spacing:-.015em}
.topbar .acts{display:flex;gap:8px;align-items:center}

/* ── El titular: una cifra, una barra fina y una frase ───────────────────
   Sin tira de estadísticas y sin leyenda. La frase nombra los importes, así
   que la barra solo tiene que dar la proporción de un vistazo. */
.hero .lede{font-size:13px;color:var(--muted-foreground);letter-spacing:.01em}
.hero .amount{font-family:var(--font-heading);font-size:56px;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums;margin-top:6px}
.hero .bar{height:4px;border-radius:999px;margin-top:18px;max-width:560px}
.hero .say{font-size:13.5px;color:var(--muted-foreground);margin-top:12px;max-width:62ch;line-height:1.55}
.hero .say b{color:var(--foreground);font-weight:500;font-variant-numeric:tabular-nums}

/* ── Controles: callados, y uno menos que antes ─────────────────────────── */
.controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.search{display:flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:999px;background:var(--secondary);color:var(--muted-foreground);font-size:13px;min-width:230px}
.seg.inline .cnt{background:transparent;padding:0 0 0 2px}

/* ── Secciones: aquí viven los dos ejes ──────────────────────────────────
   El icono dice qué pasó con el servicio y de qué color corre la prisa. Una
   sola marca para las dos dimensiones, fuera del grupo y no dentro de cada
   fila, que es lo que deja la fila en paz. */
.sec{display:flex;align-items:center;gap:9px;padding:0 4px 10px;font-size:13px;color:var(--muted-foreground)}
.sec .t{font-weight:500;color:var(--foreground)}
.sec .n{margin-left:auto;font-variant-numeric:tabular-nums}
.sec.gone .ic{color:var(--axi-destructive)}
.sec.late .ic{color:var(--axi-warning)}
.sec.soon .ic{color:var(--axi-info)}
.sec.fine .ic{color:var(--axi-success)}
.block{display:flex;flex-direction:column}
.block + .block{margin-top:26px}

/* ── Lista agrupada: el idioma de F3, una superficie y separadores dentro ── */
.glist{border:1px solid var(--border);border-radius:18px;background:var(--background);overflow:hidden}
.grow{display:grid;grid-template-columns:minmax(0,1fr) auto 18px;gap:16px;align-items:center;
      padding:16px 20px;min-height:72px;position:relative;text-align:left;width:100%}
.grow + .grow::before{content:"";position:absolute;left:20px;right:0;top:0;height:1px;background:var(--border-soft)}
.grow:hover{background:color-mix(in srgb, var(--foreground) 3%, transparent)}
.grow .nm{font-size:15.5px;font-weight:500;letter-spacing:-.005em}
.grow .sub{font-size:13px;color:var(--muted-foreground);margin-top:3px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.grow .sub .id{font-family:var(--font-mono);font-size:11.5px}
.grow .right{text-align:right}
.grow .amt{font-size:16.5px;font-weight:600;letter-spacing:-.015em;font-variant-numeric:tabular-nums}
.grow .due{font-size:12.5px;color:var(--muted-foreground);margin-top:3px;font-variant-numeric:tabular-nums}
.grow .due.late{color:var(--axi-destructive)}
.grow .chev{color:var(--muted-foreground);opacity:.5}
.foot-note{font-size:12.5px;color:var(--muted-foreground);padding:12px 4px 0;max-width:72ch;line-height:1.55}
.foot-note b{color:var(--foreground);font-weight:500}

/* ── Rail del pedido (idioma de F3, sin cambios de vocabulario) ─────────── */
.split{display:grid;grid-template-columns:minmax(0,1fr) 400px;min-height:100%}
.content{padding:40px 40px 48px;display:flex;flex-direction:column;gap:28px}
.sheet{width:400px;border-left:1px solid var(--border);background:var(--background);display:flex;flex-direction:column;min-height:100%}
.sheet-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:22px 26px 0}
.sheet-top .id{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground)}
.sheet-top .who2{font-size:16px;font-weight:600;letter-spacing:-.01em;margin-top:2px}
.sheet-top .where{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.sheet-body{padding:0 26px 26px;display:flex;flex-direction:column;gap:24px}
.headline{padding-top:20px}
.headline .lede{font-size:13px;color:var(--muted-foreground)}
.headline .amount{font-family:var(--font-heading);font-size:40px;line-height:1.05;letter-spacing:-.025em;font-variant-numeric:tabular-nums;margin-top:4px}
.headline .of{font-size:13px;color:var(--muted-foreground);margin-top:7px;font-variant-numeric:tabular-nums}
.headline .of b{color:var(--foreground);font-weight:500}
.meter{height:6px;border-radius:999px;margin-top:16px;overflow:hidden}
.due-card{display:flex;align-items:center;gap:13px;padding:15px 17px;border-radius:15px;background:var(--secondary)}
.due-card.alarm{background:color-mix(in srgb, var(--axi-destructive) 7%, var(--background))}
.due-card .ic{color:var(--muted-foreground)} .due-card.alarm .ic{color:var(--axi-destructive)}
.due-card .t{font-size:14px;font-weight:500}
.due-card .m{font-size:12.5px;color:var(--muted-foreground);margin-top:2px}

.group{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--background)}
.group .head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:12.5px;color:var(--muted-foreground);padding:13px 17px 1px}
.group .head a{font-weight:500;color:var(--foreground);text-decoration:none}
.row{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 17px;position:relative}
.row + .row::before{content:"";position:absolute;left:53px;right:0;top:0;height:1px;background:var(--border-soft)}
.row .dot{width:7px;height:7px;border-radius:50%;justify-self:center}
.row .dot.ok{background:var(--axi-success)}
.row .dot.next{background:var(--axi-brand)}
.row .dot.late{background:var(--axi-destructive)}
.row .dot.off{background:var(--border)}
.row .t{font-size:14px;font-weight:500}
.row .m{font-size:12.5px;color:var(--muted-foreground);margin-top:2px}
.row .v{font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;text-align:right}
.row .v small{display:block;font-size:11.5px;font-weight:400;color:var(--muted-foreground);margin-top:2px}
.row .v small.late{color:var(--axi-destructive)}
.actions{display:flex;flex-direction:column;gap:9px}
.btn.block{width:100%;height:46px;border-radius:15px;font-size:14.5px}
.origin{font-size:12px;color:var(--muted-foreground);line-height:1.55}
.origin b{color:var(--foreground);font-weight:500;font-variant-numeric:tabular-nums}
.promise{display:flex;align-items:flex-start;gap:11px;padding:14px 16px;border-radius:15px;background:var(--secondary);font-size:13px;line-height:1.5}
.promise .ic{color:var(--axi-info);margin-top:1px}
.promise b{font-weight:500}

/* ── Diálogos ────────────────────────────────────────────────────────────
   Más aire y el radio de las hojas de iOS; el importe es el elemento grande
   del diálogo, como el saldo lo es del pedido. */
.modal.wide{max-width:520px;padding:26px;gap:20px;border-radius:24px}
.modal.wide h2{font-size:20px;letter-spacing:-.015em;font-family:var(--font-body);font-weight:600}
.modal .sub{font-size:13px;color:var(--muted-foreground);margin-top:3px}
.amount-field{display:flex;flex-direction:column;gap:10px}
.amount-field label{font-size:13px;font-weight:500}
.amount-input{display:flex;align-items:baseline;gap:9px;border:1px solid var(--input);border-radius:15px;padding:15px 17px;background:var(--background)}
.amount-input .cur{font-size:16px;color:var(--muted-foreground)}
.amount-input input{border:0;background:transparent;outline:none;width:100%;font-family:inherit;color:inherit;font-size:28px;font-weight:600;letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.amount-input.err{border-color:var(--axi-destructive)}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{border:1px solid var(--border);border-radius:999px;padding:6px 13px;font-size:12.5px;background:var(--background)}
.chip.on{background:var(--accent);border-color:transparent;font-weight:500}
.after{border-radius:15px;background:var(--secondary);padding:15px 17px}
.after .cap{font-size:12.5px;color:var(--muted-foreground)}
.after .line{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:9px;font-size:14px}
.after .line .v{font-weight:600;font-variant-numeric:tabular-nums}
.after .line.muted .v{font-weight:500;color:var(--muted-foreground)}
.after .state{display:flex;align-items:flex-start;gap:9px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-soft);font-size:13px;line-height:1.5}
.after .state .ic{margin-top:1px;color:var(--muted-foreground)}

/* Editor de cuotas: la suma cuadra mientras se escribe. */
.sched{display:flex;flex-direction:column}
.sline{display:grid;grid-template-columns:18px minmax(0,1fr) 130px 28px;gap:12px;align-items:center;padding:11px 0;position:relative}
.sline + .sline::before{content:"";position:absolute;left:30px;right:0;top:0;height:1px;background:var(--border-soft)}
.sline .seq{font-size:12px;color:var(--muted-foreground);text-align:center;font-variant-numeric:tabular-nums}
.sline .din{display:flex;align-items:center;gap:9px;font-size:13.5px;min-width:0}
.sline .din .d{border:1px solid var(--input);border-radius:10px;padding:6px 11px;font-variant-numeric:tabular-nums}
.sline .din .kind{font-size:12px;color:var(--muted-foreground)}
.sline .amt2{border:1px solid var(--input);border-radius:10px;padding:6px 11px;font-size:13.5px;font-weight:500;text-align:right;font-variant-numeric:tabular-nums}
.sline .x{color:var(--muted-foreground);display:grid;place-items:center}
.check{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 16px;border-radius:14px;background:var(--secondary);font-size:13.5px}
.check.bad{background:color-mix(in srgb, var(--axi-destructive) 7%, var(--background))}
.check .v{font-weight:600;font-variant-numeric:tabular-nums}
.check.bad .v{color:var(--axi-destructive)}

/* ── Política: filas de ajustes, no rejilla de formulario ────────────────
   Etiqueta a la izquierda, valor a la derecha, y la explicación DEBAJO del
   grupo — el idioma de los ajustes de iOS. Una rejilla de dos columnas con
   sus «hint» se lee como panel de administración. */
.policy{display:grid;grid-template-columns:minmax(0,1fr) 352px;gap:36px;align-items:start}
.set-title{font-size:13px;color:var(--muted-foreground);padding:0 4px 9px;font-weight:500}
.set{border:1px solid var(--border);border-radius:16px;background:var(--background);overflow:hidden}
.set-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px 17px;position:relative;min-height:56px}
.set-row + .set-row::before{content:"";position:absolute;left:17px;right:0;top:0;height:1px;background:var(--border-soft)}
.set-row .k{font-size:14px}
.set-row .v{font-size:14px;color:var(--muted-foreground);display:flex;align-items:center;gap:7px;font-variant-numeric:tabular-nums}
.set-row .v b{color:var(--foreground);font-weight:500}
.set-note{font-size:12.5px;color:var(--muted-foreground);padding:10px 4px 0;line-height:1.55;max-width:62ch}
.set-block + .set-block{margin-top:28px}

.preview{border:1px solid var(--border);border-radius:20px;padding:22px 24px;background:var(--background)}
.preview .cap{font-size:12.5px;color:var(--muted-foreground)}
.preview .ttl{font-size:15.5px;font-weight:600;letter-spacing:-.01em;margin-top:3px}
.tl{display:flex;flex-direction:column;margin-top:18px}
.tl .i{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:14px;align-items:start;padding:11px 0;position:relative}
.tl .i::after{content:"";position:absolute;left:5px;top:26px;bottom:-11px;width:1px;background:var(--border)}
.tl .i:last-child::after{display:none}
.tl .b{width:9px;height:9px;border-radius:50%;background:var(--border);margin-top:5px;justify-self:center;z-index:1}
.tl .i.first .b{background:var(--axi-brand)}
.tl .i.last .b{background:var(--foreground)}
.tl .t{font-size:13.5px;font-weight:500}
.tl .m{font-size:12px;color:var(--muted-foreground);margin-top:2px}
.tl .v{font-size:13.5px;font-weight:500;font-variant-numeric:tabular-nums}

/* ── Panel del inbox ─────────────────────────────────────────────────── */
.inbox{display:grid;grid-template-columns:minmax(0,1fr) 372px;min-height:100%}
.chat{padding:34px 36px;display:flex;flex-direction:column;gap:12px;background:color-mix(in srgb, var(--foreground) 3%, var(--background))}
.msg{max-width:70%;padding:12px 15px;border-radius:18px;font-size:13.5px;line-height:1.5}
.msg.in{align-self:flex-start;background:var(--background);border-radius:18px 18px 18px 5px;box-shadow:var(--shadow-float)}
.msg.out{align-self:flex-end;background:var(--accent);border-radius:18px 18px 5px 18px}
.msg time{display:block;font-size:10.5px;color:var(--muted-foreground);margin-top:6px}
.panel{border-left:1px solid var(--border);background:var(--background);padding:22px 24px;display:flex;flex-direction:column;gap:22px}
.panel h3{font-family:var(--font-body);font-size:13px;color:var(--muted-foreground);font-weight:500;letter-spacing:0;padding:0 2px 9px}

/* ── Vacío ───────────────────────────────────────────────────────────── */
.void{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:64px 20px}
.void .vic{width:52px;height:52px;border-radius:16px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground);margin-bottom:6px}
.void h3{font-size:17px;font-family:var(--font-body);font-weight:600;letter-spacing:-.01em}
.void p{color:var(--muted-foreground);font-size:13.5px;max-width:44ch;line-height:1.6}
.stack-28{display:flex;flex-direction:column;gap:28px}
.section-title{font-size:15px;font-weight:600;letter-spacing:-.01em}
.section-sub{font-size:13px;color:var(--muted-foreground);margin-top:3px;max-width:62ch}
"""

TOTAL_DUE = "$ 46.927.205"


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


# ── Datos: la cartera de JuanitoXpeditions un martes cualquiera ────────────
SECTIONS = [
    dict(
        key="gone", icon="plane", title="Ya viajaron y deben", tone="gone",
        rows=[
            dict(name="Camilo Ortiz", sub="JX-0033 · Sierra Nevada · viajó el 1 de agosto",
                 amt="$ 8.100.000", due="Venció hace 47 días", late=True),
            dict(name="Andrés Mejía", sub="JX-0038 · Nevado del Ruiz · viajó el 2 de septiembre",
                 amt="$ 4.200.000", due="Venció hace 15 días", late=True),
        ],
    ),
    dict(
        key="late", icon="circle-alert", title="En mora", tone="late",
        rows=[
            dict(name="Diana Salazar", sub="JX-0047 · Cocuy · sale el 14 de marzo",
                 amt="$ 3.480.000", due="Prometió pagar el 22", late=False),
        ],
    ),
    dict(
        key="soon", icon="calendar-clock", title="Por vencer", tone="soon",
        rows=[
            dict(name="Marcela Ruiz", sub="JX-0051 · Sierra Nevada · cuota 1 de 3",
                 amt="$ 9.640.000", due="Vence en 3 días", late=False),
        ],
    ),
    dict(
        key="fine", icon="check", title="Al día", tone="fine",
        rows=[
            dict(name="Laura Gómez", sub="JX-0042 · Cocuy · cuota 2 de 3",
                 amt="$ 15.192.205", due="Vence el 14 de enero", late=False),
            dict(name="Tomás Villa", sub="JX-0055 · Cocuy · cuota 2 de 3",
                 amt="$ 6.315.000", due="Vence el 3 de octubre", late=False),
        ],
    ),
]


def debtor_row(row: dict) -> str:
    due_cls = "due late" if row["late"] else "due"
    return f"""<button type="button" class="grow">
      <span>
        <span class="nm" style="display:block">{row['name']}</span>
        <span class="sub">{row['sub']}</span>
      </span>
      <span class="right">
        <span class="amt" style="display:block">{row['amt']}</span>
        <span class="{due_cls}" style="display:block">{row['due']}</span>
      </span>
      {ic("chevron-right", "chev", 18)}
    </button>"""


def section(sec: dict) -> str:
    rows = "".join(debtor_row(row) for row in sec["rows"])
    return f"""<div class="block">
      <div class="sec {sec['tone']}">{ic(sec['icon'], "", 15)}<span class="t">{sec['title']}</span>
        <span class="n">{len(sec['rows'])}</span></div>
      <div class="glist">{rows}</div>
    </div>"""


def hero(only_gone: bool = False) -> str:
    if only_gone:
        return f"""<div class="hero">
          <p class="lede">Ya viajaron y deben</p>
          <p class="amount">$ 12.300.000</p>
          <div class="bar" role="img" aria-label="Todo vencido"
               style="background:var(--axi-destructive)"></div>
          <p class="say">Dos clientes. El servicio ya se prestó, así que no queda nada que
            retener: es la deuda que envejece más rápido y la única que no se puede recuperar
            cancelando.</p>
        </div>"""
    return f"""<div class="hero">
      <p class="lede">Te deben</p>
      <p class="amount">{TOTAL_DUE}</p>
      <div class="bar" role="img" aria-label="Un tercio de la cartera está vencida"
           style="background:linear-gradient(90deg,
             var(--axi-success) 0% 66.4%,
             var(--axi-warning) 66.4% 82.8%,
             var(--axi-destructive) 82.8% 100%)"></div>
      <p class="say">De seis clientes. <b>$ 15.780.000</b> están vencidos, y <b>$ 12.300.000</b>
        de eso es de gente que ya viajó.</p>
    </div>"""


def receivables(view: str = "todo") -> str:
    tabs = [("Todo", "todo", 6), ("Ya viajaron", "viajaron", 2), ("En mora", "mora", 3)]
    seg = "".join(
        f'<button aria-checked="{str(k == view).lower()}">{t}<span class="cnt">{n}</span></button>'
        for t, k, n in tabs
    )
    blocks = SECTIONS if view == "todo" else [s for s in SECTIONS if s["key"] == "gone"]
    return f"""<div class="wrap">
      <div class="topbar">
        <p class="ttl">Cartera</p>
        <div class="acts">
          {btn("Exportar", "download", "ghost sm")}
          {btn("Enviar recordatorios", "send", "sm")}
        </div>
      </div>
      {hero(view != "todo")}
      <div class="controls">
        <nav class="seg inline sm" aria-label="Filtro de cartera">{seg}</nav>
        <div class="search">{ic("search", size=15)}Buscar cliente o pedido</div>
      </div>
      <div>{"".join(section(s) for s in blocks)}</div>
      <p class="foot-note">El orden no es alfabético ni por importe: es <b>a quién escribir
        primero</b>. Y el saldo sale del pedido, no de una copia — si mañana cambia su total, la
        cartera ya lo sabe.</p>
    </div>"""


# ── El pedido: plan de pagos en el rail ────────────────────────────────────
def plan_rows(gone: bool) -> str:
    if gone:
        return """<div class="row"><span class="dot ok"></span>
            <div><p class="t">Anticipo · 30 %</p><p class="m">Pagado el 2 de junio</p></div>
            <p class="v">$ 3.255.000</p></div>
          <div class="row"><span class="dot ok"></span>
            <div><p class="t">Cuota 2 de 3</p><p class="m">Pagada el 2 de julio</p></div>
            <p class="v">$ 3.395.000</p></div>
          <div class="row"><span class="dot late"></span>
            <div><p class="t">Saldo final</p><p class="m">Vencía el 2 de septiembre</p></div>
            <p class="v">$ 4.200.000<small class="late">15 días de mora</small></p></div>"""
    return """<div class="row"><span class="dot ok"></span>
        <div><p class="t">Anticipo · 30 %</p><p class="m">Pagado el 16 de septiembre</p></div>
        <p class="v">$ 6.510.945</p></div>
      <div class="row"><span class="dot next"></span>
        <div><p class="t">Cuota 2 de 3</p><p class="m">Vence el 14 de enero</p></div>
        <p class="v">$ 7.596.102<small>en 119 días</small></p></div>
      <div class="row"><span class="dot off"></span>
        <div><p class="t">Saldo final</p><p class="m">60 días antes de la salida</p></div>
        <p class="v">$ 7.596.103</p></div>"""


def order_sheet(state: str = "plan") -> str:
    gone = state == "gone"
    who = "Andrés Mejía" if gone else "Laura Gómez"
    oid = "JX-0038" if gone else "JX-0042"
    where = "Nevado del Ruiz · 1 cupo" if gone else "Expedición Cocuy · 2 cupos"
    amount = "$ 4.200.000" if gone else "$ 15.192.205"
    of = "de $ 10.850.000 · <b>61 %</b> cobrado" if gone else "de $ 21.703.150 · <b>30 %</b> cobrado"
    segs = [(61, True), (39, False)] if gone else [(30, True), (70, False)]
    due_block = (
        f"""<div class="due-card alarm">{ic("plane", size=18)}<div>
            <p class="t">Viajó el 2 de septiembre y debe desde entonces</p>
            <p class="m">15 días de mora · el servicio ya se prestó</p></div></div>"""
        if gone
        else f"""<div class="due-card">{ic("calendar-clock", size=18)}<div>
            <p class="t">Próxima cuota en 119 días</p>
            <p class="m">$ 7.596.102 · 14 de enero</p></div></div>"""
    )
    promise = (
        f"""<div class="promise">{ic("handshake", size=16)}<div><b>Prometió pagar el 22 de
          septiembre.</b> Los recordatorios quedan en pausa hasta ese día.</div></div>"""
        if state == "promise"
        else ""
    )
    second = (
        btn("Enviar recordatorio", "send", "outline block")
        if gone
        else btn("Anotar promesa de pago", "handshake", "outline block")
    )
    return f"""<aside class="sheet" aria-label="Pedido {oid}">
      <div class="sheet-top">
        <div><p class="id">{oid}</p><p class="who2">{who}</p><p class="where">{where}</p></div>
        {badge("Entregado", "off") if gone else badge("Abonado", "warn")}
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
          {plan_rows(gone)}
        </div>
        <div class="actions">
          {btn("Registrar abono", "", "block")}
          {second}
          <p class="origin">El plan se creó al confirmar, con la política del negocio:
            <b>30 %</b> de anticipo, <b>3</b> cuotas y el saldo <b>60 días</b> antes de salir.</p>
        </div>
      </div>
    </aside>"""


def order_page(state: str = "plan", overlay: str = "") -> str:
    return f"""<div class="split">
      <div class="content">
        <p class="ttl" style="font-size:19px;font-weight:600;letter-spacing:-.015em">Pedidos</p>
        <div class="block">
          <div class="sec fine">{ic("check", "", 15)}<span class="t">Movimientos del plan</span></div>
          <div class="glist">
            <div class="grow"><span><span class="nm" style="display:block">Abono aplicado a la cuota 1</span>
              <span class="sub">16 de septiembre · verificado por Isabel</span></span>
              <span class="right"><span class="amt" style="display:block">$ 6.510.945</span>
              <span class="due" style="display:block">Cuota 1 de 3</span></span><span></span></div>
            <div class="grow"><span><span class="nm" style="display:block">Plan de pagos creado</span>
              <span class="sub">16 de septiembre · 30 % de anticipo y 3 cuotas</span></span>
              <span class="right"><span class="amt" style="display:block">$ 21.703.150</span>
              <span class="due" style="display:block">Total del pedido</span></span><span></span></div>
          </div>
          <p class="foot-note">Las cuotas dicen <b>cuándo</b> tocaba cada parte. Lo cobrado sale
            del pedido, que es la única fuente: no hay dos verdades que reconciliar.</p>
        </div>
      </div>
      {order_sheet(state)}
      {overlay}
    </div>"""


# ── Diálogos ───────────────────────────────────────────────────────────────
def register_payment() -> str:
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
      <div class="set">
        <div class="set-row"><span class="k">Medio de pago</span>
          <span class="v"><b>Bancolombia</b>{ic("chevron-right", size=15)}</span></div>
        <div class="set-row"><span class="k">Referencia</span>
          <span class="v"><b>TRF-99231</b></span></div>
      </div>
      <div class="after">
        <p class="cap">Después de registrarlo</p>
        <div class="line"><span>Se aplica a</span><span class="v">Cuota 2 de 3</span></div>
        <div class="line muted"><span>Queda por cobrar</span><span class="v">$ 7.596.103</span></div>
        <div class="line muted"><span>Próxima cuota</span><span class="v">Saldo final · 13 ene</span></div>
        <p class="state">{ic("info", size=16)}<span>Las cuotas se cubren <b>en orden</b>: lo que
          entra paga primero la más antigua sin pagar. Y el abono queda <b>reportado</b>: el saldo
          del cliente no se mueve hasta que alguien confirme que el dinero llegó.</span></p>
      </div>
      <div class="modal-foot">{btn("Volver", "", "ghost")}{btn("Registrar $ 7.596.102")}</div>
    </div></div>"""


def reschedule(bad: bool = False) -> str:
    lines = [
        ("2", "14 ene 2027", "Cuota", "7.596.102"),
        ("3", "13 ene 2027", "Saldo final", "5.000.000" if bad else "7.596.103"),
    ]
    rendered = "".join(
        f"""<div class="sline"><span class="seq">{seq}</span>
          <span class="din"><span class="d">{date}</span><span class="kind">{kind}</span></span>
          <span class="amt2">$ {amount}</span>
          <span class="x">{ic("x", size=15)}</span></div>"""
        for seq, date, kind, amount in lines
    )
    check = (
        """<div class="check bad"><span>Suman $ 12.596.102 y el saldo es $ 15.192.205</span>
          <span class="v">Faltan $ 2.596.103</span></div>"""
        if bad
        else """<div class="check"><span>Las cuotas pendientes cuadran con el saldo</span>
          <span class="v">$ 15.192.205</span></div>"""
    )
    tail = (
        f"""<p class="set-note">No se puede guardar hasta que cuadren. Es la misma regla del
          servidor, dicha aquí antes de perder el trabajo.</p>"""
        if bad
        else f"""<p class="set-note">El saldo final se mueve con la salida: si la expedición
          cambia de fecha, esta cuota se recalcula sola a 60 días antes.</p>"""
    )
    save = (
        btn("Guardar cuotas", "", "", 'aria-disabled="true"') if bad else btn("Guardar cuotas")
    )
    return f"""<div class="overlay"><div class="modal wide" style="max-width:560px">
      <div><h2>Reprogramar cuotas</h2><p class="sub">Solo lo pendiente. Lo ya pagado no se toca.</p></div>
      <div>
        <div class="sec soon">{ic("calendar-clock", "", 15)}<span class="t">Pendientes</span>
          <span class="n"><a href="#" style="text-decoration:none;font-weight:500;color:var(--foreground)">Añadir</a></span></div>
        <div class="sched">{rendered}</div>
      </div>
      {check}
      {tail}
      <div class="modal-foot">{btn("Volver", "", "ghost")}{save}</div>
    </div></div>"""


def promise_dialog() -> str:
    return f"""<div class="overlay"><div class="modal wide">
      <div><h2>Anotar promesa de pago</h2>
        <p class="sub">Diana Salazar · debe $ 3.480.000 desde hace 6 días</p></div>
      <div class="set">
        <div class="set-row"><span class="k">Prometió pagar el</span>
          <span class="v"><b>22 de septiembre</b>{ic("chevron-right", size=15)}</span></div>
        <div class="set-row"><span class="k">Monto</span>
          <span class="v"><b>$ 3.480.000</b></span></div>
        <div class="set-row"><span class="k">Nota</span>
          <span class="v"><b>Cobra el 20 y paga ese día</b></span></div>
      </div>
      <div class="after">
        <p class="cap">Mientras la promesa esté viva</p>
        <div class="line"><span>Recordatorios automáticos</span><span class="v">En pausa hasta el 22</span></div>
        <div class="line muted"><span>En la cartera</span><span class="v">Aparece como prometido</span></div>
        <p class="state">{ic("triangle-alert", size=16)}<span>Si el 22 no llega el pago, la
          promesa se marca <b>rota</b> y los recordatorios vuelven solos.</span></p>
      </div>
      <div class="modal-foot">{btn("Volver", "", "ghost")}{btn("Anotar promesa")}</div>
    </div></div>"""


# ── Política: ajustes, no formulario ───────────────────────────────────────
def policy() -> str:
    steps = [
        ("first", "Anticipo · 30 %", "Al confirmar, hoy", "$ 3.255.000"),
        ("", "Cuota 2", "16 de octubre", "$ 3.797.500"),
        ("", "Cuota 3", "16 de noviembre", "$ 3.797.500"),
        ("last", "Saldo final", "13 de enero · 60 días antes de salir", "$ 0"),
    ]
    tl = "".join(
        f'<div class="i {cls}"><span class="b"></span><div><p class="t">{t}</p>'
        f'<p class="m">{m}</p></div><span class="v">{v}</span></div>'
        for cls, t, m, v in steps
    )
    chev = ic("chevron-right", size=15)
    return f"""<div class="wrap">
      <div class="topbar"><p class="ttl">Pagos</p></div>
      {K.nav([("Medios", "credit-card"), ("Plan de pagos", "calendar-clock"),
              ("Moneda y TRM", "banknote"), ("Documentos", "file-text")],
             "Plan de pagos", "Ajustes de pagos")}
      <div class="policy">
        <div>
          <div class="set-block">
            <p class="set-title">Cómo se reparte el pago</p>
            <div class="set">
              <div class="set-row"><span class="k">Anticipo para reservar</span>
                <span class="v"><b>30 %</b>{chev}</span></div>
              <div class="set-row"><span class="k">Cuotas</span>
                <span class="v"><b>3 mensuales</b>{chev}</span></div>
              <div class="set-row"><span class="k">El saldo se paga</span>
                <span class="v"><b>60 días antes de salir</b>{chev}</span></div>
              <div class="set-row"><span class="k">Si no hay fecha de salida</span>
                <span class="v"><b>30 días desde la confirmación</b>{chev}</span></div>
            </div>
            <p class="set-note">Se aplica a cada pedido al confirmarlo; lo que ya tiene plan no
              cambia. Un abono menor al anticipo igual reserva: eso lo decide quien verifica.</p>
          </div>
          <div class="set-block">
            <p class="set-title">Cuándo avisar</p>
            <div class="set">
              <div class="set-row"><span class="k">Antes de vencer</span>
                <span class="v"><b>7, 3 y 0 días</b>{chev}</span></div>
              <div class="set-row"><span class="k">Después de vencer</span>
                <span class="v"><b>1, 3 y 7 días</b>{chev}</span></div>
              <div class="set-row"><span class="k">Por WhatsApp y correo</span>
                <span class="v">{K.switch(True, label="Avisar por WhatsApp y correo")}</span></div>
            </div>
            <p class="set-note">Fuera de la ventana de 24 horas de WhatsApp el aviso sale como
              plantilla aprobada, si la hay.</p>
          </div>
        </div>
        <div class="preview">
          <p class="cap">Con esta política, una expedición de</p>
          <p class="ttl">US$ 3.500 que sale el 14 de marzo</p>
          <div class="tl">{tl}</div>
          <p class="set-note" style="padding:14px 0 0">Este calendario no es un ejemplo escrito a
            mano: sale de los números de la izquierda. Cambia el anticipo y se mueve contigo.</p>
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
          <div class="glist">
            <div class="grow" style="min-height:64px">
              <span><span class="nm" style="display:block">Sierra Nevada</span>
                <span class="sub"><span class="id">JX-0051</span> · sale el 8 de diciembre</span></span>
              <span class="right"><span class="amt" style="display:block">$ 9.640.000</span>
                <span class="due" style="display:block">por cobrar</span></span>
              {ic("chevron-right", "chev", 18)}
            </div>
          </div>
        </div>
        <div class="due-card">{ic("calendar-clock", size=18)}<div>
          <p class="t">Cuota 1 de 3 vence en 3 días</p>
          <p class="m">$ 3.213.333 · 20 de septiembre</p></div></div>
        <div class="actions">
          {btn("Verificar el pago reportado", "", "block")}
          {btn("Abrir el pedido", "external-link", "outline block")}
        </div>
        <p class="origin">El agente ya registró el comprobante. El saldo no se mueve hasta que
          alguien confirme que el dinero llegó.</p>
      </aside>
    </div>"""


def disabled() -> str:
    return f"""<div class="wrap">
      <div class="topbar"><p class="ttl">Pedidos</p>
        <span class="small muted">Savage Wear · tienda de ropa</span></div>
      <div class="glist">
        <div class="void">
          <span class="vic">{ic("wallet", size=22)}</span>
          <h3>Aquí no hay cartera</h3>
          <p>Este negocio cobra de una, así que no tiene cuotas que perseguir. La sección no
            aparece en el menú, la pantalla no existe y el servidor responde 403 a quien la pida.</p>
        </div>
      </div>
      <p class="foot-note">La cartera es una <b>capacidad que se enciende</b>, no una sección
        escondida. Se activa en Mi empresa › Funciones; las agencias de viaje la traen encendida
        de fábrica y una tienda de ropa, no.</p>
    </div>"""


VIEWS = [
    ("cartera", "1 · Cartera", receivables("todo"),
     "La lista se parte en secciones ordenadas por urgencia, y la primera es «ya viajaron y deben». Los dos ejes —cuánta prisa corre el dinero, qué pasó con el servicio— los lleva la ESTRUCTURA, así que la fila queda en paz: nombre, pedido, importe y fecha. Una cifra arriba, una barra fina y una frase; ni tira de estadísticas ni leyenda de colores, porque la frase ya dice los importes."),
    ("viajaron", "2 · Ya viajaron", receivables("viajaron"),
     "El filtro cambia el titular, no solo la lista: cuando miras solo a los que ya viajaron, la cifra grande es la suya y la frase dice por qué esa deuda es distinta. El servicio ya se prestó, así que no queda nada que retener."),
    ("plan", "3 · Plan de pagos", order_page("plan"),
     "En el pedido, el plan es la misma lista agrupada de F3, con un punto por cuota: pagada, la siguiente, y las que aún no tocan. El pie responde a la pregunta que sigue, que es «¿y por qué tres cuotas?»."),
    ("abono", "4 · Registrar abono", order_page("plan", register_payment()),
     "El importe es el elemento grande del diálogo, como el saldo lo es del pedido. Medio de pago y referencia bajan a filas de ajustes para no competir con él, y debajo se ve a qué cuota irá y qué queda después."),
    ("reprogramar", "5 · Reprogramar", order_page("plan", reschedule()),
     "Solo se editan las cuotas pendientes, y la suma se comprueba mientras se escribe."),
    ("descuadre", "6 · No cuadra", order_page("plan", reschedule(bad=True)),
     "La misma regla del servidor, dicha antes de perder el trabajo: si las cuotas no suman el saldo, se dice cuánto falta y el botón no se puede pulsar."),
    ("promesa", "7 · Promesa de pago", order_page("plan", promise_dialog()),
     "Una promesa pausa los recordatorios hasta su fecha, y el diálogo lo dice antes de anotarla. Si el día llega sin pago, la promesa se rompe sola."),
    ("entregado", "8 · Entregado y debiendo", order_page("gone"),
     "El pedido que la decisión del dueño hizo posible. El estado del servicio y el del cobro se cuentan por separado, y la alarma no es un badge de color: es la frase «viajó el 2 de septiembre y debe desde entonces»."),
    ("politica", "9 · La política", policy(),
     "Filas de ajustes —etiqueta a la izquierda, valor a la derecha, la explicación debajo del grupo— en vez de una rejilla de formulario, que se lee como panel de administración. Al lado, el calendario que esos números producen para una expedición real: se decide viendo el resultado."),
    ("conversacion", "10 · En la conversación", inbox(),
     "Donde de verdad ocurre el cobro. El cliente dice «ya pagué» y el operador tiene el saldo, la cuota y el botón de verificar sin salir del chat."),
    ("sin-funcion", "11 · Sin la función", disabled(),
     "Savage Wear cobra de una: no ve Cartera en el menú, la pantalla no existe y el servidor responde 403."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("La cartera: cuotas y cobranza", "Mockup F0 · no es producto",
                 "Cobros · F4 «Plan de pagos y Cartera»", VIEWS)
    K.export_artboards([
        {"file": "collections-receivables.dc.html", "title": "Cartera · a quién escribir primero", "body": receivables("todo"), "w": 1440, "h": 1080},
        {"file": "collections-receivables-dark.dc.html", "title": "Cartera · oscuro", "body": receivables("todo"), "w": 1440, "h": 1080, "dark": True},
        {"file": "collections-gone.dc.html", "title": "Ya viajaron y deben", "body": receivables("viajaron"), "w": 1440, "h": 720},
        {"file": "collections-plan.dc.html", "title": "Pedido · plan de pagos", "body": order_page("plan"), "w": 1440, "h": 980},
        {"file": "collections-register.dc.html", "title": "Registrar abono", "body": order_page("plan", register_payment()), "w": 1440, "h": 980},
        {"file": "collections-delivered.dc.html", "title": "Entregado y debiendo", "body": order_page("gone"), "w": 1440, "h": 980},
        {"file": "collections-reschedule.dc.html", "title": "Reprogramar cuotas", "body": order_page("plan", reschedule()), "w": 1440, "h": 980},
        {"file": "collections-mismatch.dc.html", "title": "Reprogramar · no cuadra", "body": order_page("plan", reschedule(bad=True)), "w": 1440, "h": 980},
        {"file": "collections-promise.dc.html", "title": "Promesa de pago", "body": order_page("plan", promise_dialog()), "w": 1440, "h": 980},
        {"file": "collections-policy.dc.html", "title": "La política y su calendario", "body": policy(), "w": 1440, "h": 900},
        {"file": "collections-inbox.dc.html", "title": "En la conversación", "body": inbox(), "w": 1440, "h": 760},
        {"file": "collections-disabled.dc.html", "title": "Sin la función", "body": disabled(), "w": 1440, "h": 620},
    ])
