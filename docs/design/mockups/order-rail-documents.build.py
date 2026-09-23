#!/usr/bin/env python3
"""Mockup «Documentos en el pedido» (cobros_frontend_plan.md §`documents`, F8).

La idea que ordena estas pantallas: **un documento emitido es un hecho con número**. No es un
adjunto ni un botón de «descargar PDF»: es un papel que salió con consecutivo, con fecha y con
los datos que el negocio sabía ese día, y así se lee — como un asiento. De ahí:

1. **La fila es el asiento.** Tipo (icono), número en mono, cuándo salió, estado con punto —el
   idioma de F3/F4—, y las acciones al final. Nada de miniaturas: el PDF se abre, no se previsualiza.
2. **«Emitir» es la única acción coral** de la sección y ofrece SOLO lo que se emite a mano en F8:
   Contrato · Estado de cuenta · Cuenta de cobro. El recibo no está: llega solo, con cada pago (F9).
3. **Lo que ya existe se dice, no se duplica.** Un contrato es uno por reserva (idempotencia): el
   menú lo muestra emitido con su número y manda a la fila. Estado de cuenta y cuenta de cobro sí
   se emiten de nuevo (foto del momento, numeradas por pedido).
4. **«Desactualizado» es un dato, no una alarma.** Si el pedido cambió después del papel, la fila lo
   dice en gris; la acción honesta depende del tipo: emitir uno nuevo (estado de cuenta, cuenta de
   cobro) o regenerar el contrato — con los MISMOS datos congelados, y la fila lo dice.
5. **Generar es transitorio y fallar es reintentable.** El punto azul late mientras el worker pinta;
   un fallo dice el motivo y ofrece «Reintentar» (mismo número). Tres fallos → «Regenerar».
6. **El papel también vive en la ficha del contacto**: una card «Pedidos y documentos» con los pedidos
   con saldo y sus papeles, sin duplicar componentes (el mismo `DocumentsList`).
7. **Quien no puede emitir, ve.** Sin `documents:manage` la sección existe igual, sin «Emitir» ni
   «Regenerar»; «Ver» siempre.

Uso:  python3 order-rail-documents.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("order-rail-documents")
ic, btn, badge = K.ic, K.btn, K.badge

EXTRA_CSS = """
/* ── Página del pedido: contenido + rail (idioma de F3) ─────────────────── */
.split{display:grid;grid-template-columns:minmax(0,1fr) 400px;min-height:100%}
.content{padding:26px 30px 40px;display:flex;flex-direction:column;gap:22px}
.page-head h1{font-size:25px;letter-spacing:-.02em;font-family:var(--font-body);font-weight:600}
.page-head .sub{font-size:13.5px;color:var(--muted-foreground);margin-top:3px}
.section-title{font-size:15px;font-weight:600;letter-spacing:-.01em}
.section-sub{font-size:13px;color:var(--muted-foreground);margin-top:2px;max-width:60ch}
.sheet{width:400px;border-left:1px solid var(--border);background:var(--background);display:flex;flex-direction:column;min-height:100%;position:relative}
.sheet-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 24px 0}
.sheet-top .id{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground);letter-spacing:.01em}
.sheet-top .who{font-size:16px;font-weight:600;letter-spacing:-.01em;margin-top:2px}
.sheet-top .where{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.sheet-body{padding:0 24px 24px;display:flex;flex-direction:column;gap:22px}
.headline{padding-top:18px}
.headline .lede{font-size:13px;color:var(--muted-foreground)}
.headline .amount{font-family:var(--font-heading);font-size:40px;line-height:1.05;letter-spacing:-.025em;font-variant-numeric:tabular-nums;margin-top:4px}
.headline .of{font-size:13px;color:var(--muted-foreground);margin-top:6px;font-variant-numeric:tabular-nums}
.headline .of b{color:var(--foreground);font-weight:500}
.meter{height:6px;border-radius:999px;margin-top:14px;overflow:hidden;background:linear-gradient(90deg,var(--axi-brand) 0 30%,var(--background) 30% 30.5%,var(--secondary) 30.5% 100%)}

/* ── Lista agrupada (una superficie, separadores hacia dentro) ─────────── */
.group{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--background)}
.ghead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px 4px}
.ghead .t{font-size:12.5px;color:var(--muted-foreground)}
.ghead .btn.xs{height:26px;padding:0 9px;font-size:12px;border-radius:9px}
.row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 16px;position:relative}
.row + .row::before{content:"";position:absolute;left:56px;right:0;top:0;height:1px;background:var(--border-soft)}
.row .dot{width:8px;height:8px;border-radius:50%;justify-self:center}
.row .dot.ok{background:var(--axi-success)} .row .dot.wait{background:var(--axi-warning)} .row .dot.off{background:var(--border)}
.row .t{font-size:14px;font-weight:500}
.row .m{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.row .v{font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;text-align:right}
.row .v small{display:block;font-size:11.5px;font-weight:400;color:var(--muted-foreground);margin-top:1px}

/* ── Documentos: la fila es el asiento ─────────────────────────────────── */
.doc{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 16px;position:relative}
.doc + .doc::before{content:"";position:absolute;left:62px;right:0;top:0;height:1px;background:var(--border-soft)}
.doc .ty{width:34px;height:34px;border-radius:10px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground)}
.doc .num{font-family:var(--font-mono);font-size:12.5px;font-weight:500;letter-spacing:.01em;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.doc .num .kind{font-family:var(--font-body);font-size:13.5px;font-weight:500;letter-spacing:0}
.doc .m{font-size:12.5px;color:var(--muted-foreground);margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.doc .m .st{display:inline-flex;align-items:center;gap:5px}
.doc .m .st i{width:7px;height:7px;border-radius:50%;background:var(--muted-foreground);opacity:.5;display:inline-block}
.doc .m .st.ok i{background:var(--axi-success);opacity:1}
.doc .m .st.busy i{background:var(--axi-info);opacity:1;animation:pulse 1.4s ease-in-out infinite}
.doc .m .st.bad i{background:var(--axi-destructive);opacity:1}
.doc .m .st.old i{background:var(--axi-warning);opacity:1}
.doc .m .sep{opacity:.5}
.doc .acts{display:flex;gap:2px}
.doc .acts .btn.xs{height:28px;padding:0 9px;font-size:12.5px;color:var(--muted-foreground);border-radius:9px}
.doc .acts .btn.xs.primary{color:var(--foreground);font-weight:500}
.doc .acts .btn.icon.xs{width:28px;padding:0}
.doc.busy .ty{color:var(--axi-info)}
.doc.bad .ty{background:color-mix(in srgb, var(--axi-destructive) 12%, var(--background));color:var(--axi-destructive)}
.doc.dim{opacity:.62}
.doc .why{grid-column:2 / -1;font-size:12.5px;color:var(--muted-foreground);line-height:1.5;margin-top:-4px;padding-bottom:2px}
.doc .why b{color:var(--foreground);font-weight:500}
.gfoot{padding:10px 16px 12px;font-size:12px;color:var(--muted-foreground);line-height:1.5;border-top:1px solid var(--border-soft)}
.gfoot b{color:var(--foreground);font-weight:500}
.gvoid{display:flex;align-items:center;gap:12px;padding:14px 16px 16px}
.gvoid .vic{width:38px;height:38px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground);flex:none}
.gvoid .t{font-size:13.5px;font-weight:500}
.gvoid .s{font-size:12.5px;color:var(--muted-foreground);margin-top:1px;line-height:1.45}

/* ── El menú «Emitir»: solo lo que se emite a mano ─────────────────────── */
.menu{position:absolute;right:24px;width:300px;border:1px solid var(--border);border-radius:14px;background:var(--background);box-shadow:var(--shadow-overlay);padding:6px;z-index:6}
.menu .mh{font-size:11.5px;color:var(--muted-foreground);padding:8px 10px 4px;font-weight:500;letter-spacing:.02em}
.mi{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 10px;border-radius:10px}
.mi:hover{background:var(--secondary)}
.mi .ty{width:30px;height:30px;border-radius:9px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground)}
.mi .t{font-size:13.5px;font-weight:500}
.mi .d{font-size:12px;color:var(--muted-foreground);line-height:1.4;margin-top:1px}
.mi .d .mono{font-size:11.5px}
.mi.done .ty{color:var(--axi-success)}
.mi .go{font-size:12px;color:var(--muted-foreground);white-space:nowrap}
.menu .msep{height:1px;background:var(--border-soft);margin:6px 4px}
.menu .mnote{font-size:11.5px;color:var(--muted-foreground);padding:6px 10px 8px;line-height:1.45}

/* ── Contenido del pedido (F3, resumido) ───────────────────────────────── */
.acts-list{display:flex;flex-direction:column}
.act{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:12px;align-items:start;padding:11px 0;position:relative}
.act + .act::before{content:"";position:absolute;left:29px;right:0;top:0;height:1px;background:var(--border-soft)}
.act .ic{margin-top:2px;color:var(--muted-foreground)}
.act .t{font-size:14px}
.act .m{font-size:12.5px;color:var(--muted-foreground);margin-top:2px;font-variant-numeric:tabular-nums}
.act time{font-size:12px;color:var(--muted-foreground);white-space:nowrap;padding-top:2px}
.origin{font-size:12px;color:var(--muted-foreground);line-height:1.5}
.origin b{color:var(--foreground);font-weight:500;font-variant-numeric:tabular-nums}

/* ── La campanita (fallo) ──────────────────────────────────────────────── */
.toast.warn .ic{color:var(--axi-warning)}

/* ── Ficha del contacto (360) ──────────────────────────────────────────── */
.wrap{max-width:1200px;margin:0 auto;padding:28px 32px 72px;display:flex;flex-direction:column;gap:18px}
.crumbs{font-size:13px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center}
.crumbs b{color:var(--foreground);font-weight:500}
.c360{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.c360 .col{display:flex;flex-direction:column;gap:16px}
.card{border:1px solid var(--border);border-radius:16px;background:var(--background);padding:20px 24px}
.card h3{font-family:var(--font-body);font-size:16px;font-weight:600;letter-spacing:-.01em;display:flex;align-items:center;gap:8px}
.card h3 .n{font-size:14px;font-weight:400;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
.card .chead{display:flex;align-items:center;justify-content:space-between;gap:10px}
.who{display:flex;align-items:center;gap:14px}
.who .av{width:52px;height:52px;border-radius:50%;background:var(--accent);display:grid;place-items:center;font-weight:600;color:var(--foreground)}
.who .nm{font-size:20px;font-weight:600;letter-spacing:-.015em}
.who .sub{font-size:13px;color:var(--muted-foreground);margin-top:2px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.fl{display:grid;grid-template-columns:130px minmax(0,1fr);gap:8px 12px;font-size:13.5px;margin-top:16px}
.fl dt{color:var(--muted-foreground)} .fl dd{margin:0;font-weight:500}
.ord{padding:12px 0;position:relative}
.ord + .ord::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:var(--border-soft)}
.ord .oh{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
.ord .oh .t{font-size:14px;font-weight:500;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ord .oh .t .id{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground);font-weight:400}
.ord .oh .s{font-size:12.5px;color:var(--muted-foreground);margin-top:1px;font-variant-numeric:tabular-nums}
.ord .oh .s b{color:var(--foreground);font-weight:500}
.ord .docs{margin:10px 0 0;border:1px solid var(--border);border-radius:12px;overflow:hidden}
.ord .docs .doc{padding:9px 12px;grid-template-columns:28px minmax(0,1fr) auto}
.ord .docs .doc + .doc::before{left:52px}
.ord .docs .doc .ty{width:28px;height:28px;border-radius:8px}
.deal{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;position:relative}
.deal + .deal::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:var(--border-soft)}
.deal .t{font-size:14px;font-weight:500} .deal .s{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.deal .v{font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:8px}

/* ── Ajustes: «Siguiente número» ───────────────────────────────────────── */
.setwrap{max-width:1360px;margin:0 auto;padding:40px 40px 80px;display:flex;flex-direction:column;gap:26px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px}
.topbar .ttl{font-size:19px;font-weight:600;letter-spacing:-.015em}
.two{display:grid;grid-template-columns:minmax(0,560px) minmax(0,1fr);gap:34px;align-items:start}
.set-title{font-size:13px;color:var(--muted-foreground);padding:0 4px 9px;font-weight:500;display:flex;align-items:center;gap:8px}
.set-title .n{margin-left:auto;font-variant-numeric:tabular-nums}
.set-note{font-size:12.5px;color:var(--muted-foreground);padding:10px 4px 0;line-height:1.55;max-width:64ch}
.set-note b{color:var(--foreground);font-weight:500}
.set{border:1px solid var(--border);border-radius:16px;background:var(--background);overflow:hidden}
.nh{display:grid;grid-template-columns:minmax(0,1fr) 84px 130px 150px;gap:12px;padding:10px 17px 6px;font-size:11.5px;color:var(--muted-foreground);letter-spacing:.02em}
.nh span:not(:first-child){text-align:right}
.pfx{display:grid;grid-template-columns:minmax(0,1fr) 84px 130px 150px;gap:12px;align-items:center;padding:10px 17px;position:relative;font-size:14px}
.pfx + .pfx::before{content:"";position:absolute;left:17px;right:0;top:0;height:1px;background:var(--border-soft)}
.pfx .input{height:34px;font-family:var(--font-mono);font-size:12.5px}
.pfx .input.pre{text-transform:uppercase}
.pfx .input.num{text-align:right;justify-content:flex-end}
.pfx .input.readonly{background:var(--secondary);color:var(--muted-foreground);border-color:transparent}
.pfx .ex{font-family:var(--font-mono);font-size:12.5px;color:var(--muted-foreground);text-align:right}
.pfx .ex b{color:var(--foreground);font-weight:500}
.pfx .lock{display:flex;justify-content:flex-end;align-items:center;gap:6px;font-size:12px;color:var(--muted-foreground);white-space:nowrap}
.pfx.off{opacity:.55}
.savebar{display:flex;justify-content:flex-end;gap:8px;padding-top:6px}
.side-note{border:1px solid var(--border);border-radius:16px;padding:18px 20px;font-size:13.5px;line-height:1.6;color:var(--muted-foreground);position:sticky;top:24px}
.side-note h4{font-family:var(--font-body);font-size:14px;font-weight:600;letter-spacing:0;color:var(--foreground);margin-bottom:6px;display:flex;gap:8px;align-items:center}
.side-note b{color:var(--foreground);font-weight:500}
.side-note .ex{font-family:var(--font-mono);font-size:12.5px;background:var(--secondary);border-radius:6px;padding:1px 6px;color:var(--foreground)}

/* ── Móvil: el rail es un sheet ────────────────────────────────────────── */
.mobile{width:390px;min-height:844px;margin:0 auto;background:var(--background);display:flex;flex-direction:column;position:relative;border:1px solid var(--border);border-radius:32px;overflow:hidden}
.mobile .m-top{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 10px}
.mobile .m-top .id{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground)}
.mobile .m-top .who{font-size:16px;font-weight:600;letter-spacing:-.01em;margin-top:2px}
.mobile .m-body{padding:0 16px 24px;display:flex;flex-direction:column;gap:16px}
.mobile .headline .amount{font-size:34px}
.mobile .doc{padding:12px 14px;grid-template-columns:30px minmax(0,1fr) auto}
.mobile .doc + .doc::before{left:58px}
.mobile .doc .ty{width:30px;height:30px}
.mobile .doc .acts .btn.xs{padding:0 7px}
.mobile .btn.block{width:100%;height:44px;border-radius:14px;font-size:14.5px}
.grab{width:36px;height:4px;border-radius:999px;background:var(--border);margin:10px auto 0}
.stack-24{display:flex;flex-direction:column;gap:24px}
"""

TOTAL = "$ 21.703.150"
SALDO = "$ 15.192.205"
ABONO = "$ 6.510.945"

DOC_ICON = {"Contrato": "file-signature", "Cuenta de cobro": "file-badge", "Estado de cuenta": "list-ordered",
            "Recibo": "receipt"}


def act(label: str, icon: str = "", primary: bool = False, aria: str = "") -> str:
    cls = "ghost xs" + (" primary" if primary else "") + (" icon" if not label else "")
    attrs = f'aria-label="{aria}"' if aria else ""
    return btn(label, icon, cls, attrs)


def doc(kind: str, num: str, when: str, state: str = "ok", extra: str = "", acts: str = "",
        cls: str = "", why: str = "") -> str:
    st = {
        "ok": '<span class="st ok"><i></i>Listo</span>',
        "busy": '<span class="st busy"><i></i>Generando…</span>',
        "bad": '<span class="st bad"><i></i>No se pudo generar</span>',
        "old": '<span class="st old"><i></i>Desactualizado</span>',
        "gone": '<span class="st"><i></i>Reemplazado</span>',
    }[state]
    x = f'<span class="sep">·</span>{extra}' if extra else ""
    w = f'<p class="why">{why}</p>' if why else ""
    return f"""<div class="doc {cls}">
      <span class="ty">{ic(DOC_ICON[kind], size=17)}</span>
      <div><p class="num"><span class="kind">{kind}</span>{num}</p><p class="m">{st}<span class="sep">·</span>{when}{x}</p></div>
      <div class="acts">{acts}</div>
      {w}
    </div>"""


VER = act("Ver", "external-link", primary=True)
REGEN = act("", "rotate-ccw", aria="Regenerar")


def docs_group(variant: str = "full", can_manage: bool = True, menu_open: bool = False) -> str:
    emitir = btn("Emitir", "plus", "outline xs", 'aria-haspopup="menu" aria-expanded="%s"' % str(menu_open).lower()) if can_manage else ""
    head = f'<div class="ghead"><span class="t">Documentos</span>{emitir}</div>'
    rows, foot = "", ""
    if variant == "full":
        rows = "".join([
            doc("Contrato", "CTR-2026-0120", "16 sep", "ok", "2 págs.", VER + (REGEN if can_manage else "")),
            doc("Cuenta de cobro", "CC-2026-0001", "17 sep", "ok", "", VER + (REGEN if can_manage else "")),
            doc("Estado de cuenta", "EDC-2026-0003", "hoy, 9:12", "busy", "", act("", "loader-circle", aria="Generando") if False else ""),
        ])
        foot = f'<p class="gfoot">Cada papel sale con los datos del pedido <b>de ese día</b>. Si el pedido cambia, aquí se dice.</p>'
    elif variant == "states":
        rows = "".join([
            doc("Estado de cuenta", "EDC-2026-0003", "hoy, 9:12", "busy", "", ""),
            doc("Cuenta de cobro", "CC-2026-0002", "hoy, 9:10", "bad", "", act("Reintentar", "rotate-ccw", primary=True) if can_manage else "",
                cls="bad", why="Chromium no respondió a tiempo (<b>render_timeout</b>). Reintentar vuelve a generar el <b>mismo número</b>; tras tres intentos, la opción es regenerar."),
            doc("Contrato", "CTR-2026-0120", "16 sep", "old", "2 págs.", VER + (REGEN if can_manage else ""),
                why="La fecha de salida cambió el 19 sep, después de este contrato. Regenerar repite el papel con <b>los mismos datos</b>; el contrato es uno por reserva."),
            doc("Contrato", "CTR-2026-0118", "16 sep", "gone", "", VER, cls="dim",
                why="Reemplazado por CTR-2026-0120. Sigue archivado: pudo haberse enviado."),
        ])
    elif variant == "empty":
        rows = f"""<div class="gvoid"><span class="vic">{ic("file-text", size=18)}</span>
          <div><p class="t">Todavía no hay papeles de esta reserva</p>
          <p class="s">El contrato se emite cuando quieras; el recibo llegará solo con cada pago.</p></div></div>"""
    elif variant == "readonly":
        rows = "".join([
            doc("Contrato", "CTR-2026-0120", "16 sep", "ok", "2 págs.", VER),
            doc("Cuenta de cobro", "CC-2026-0001", "17 sep", "ok", "", VER),
        ])
        foot = f'<p class="gfoot">Puedes abrir y enviar los papeles. Emitir uno nuevo es de <b>supervisión</b>: gasta un consecutivo.</p>'
    return f'<div class="group" style="position:relative">{head}{rows}{foot}</div>'


def emit_menu(top: str = "396px") -> str:
    return f"""<div class="menu" role="menu" aria-label="Emitir documento" style="top:{top}">
      <p class="mh">Emitir para JX-0042</p>
      <button class="mi done" role="menuitem"><span class="ty">{ic("file-signature", size=15)}</span>
        <span><span class="t">Contrato</span><span class="d">Ya emitido · <span class="mono">CTR-2026-0120</span> · uno por reserva</span></span><span class="go">Ver en la lista</span></button>
      <button class="mi" role="menuitem"><span class="ty">{ic("list-ordered", size=15)}</span>
        <span><span class="t">Estado de cuenta</span><span class="d">Foto de hoy: total, cobrado, cuotas y saldo</span></span><span class="go">EDC-2026-0004</span></button>
      <button class="mi" role="menuitem"><span class="ty">{ic("file-badge", size=15)}</span>
        <span><span class="t">Cuenta de cobro</span><span class="d">Por el saldo de {SALDO} · la 2.ª de este pedido</span></span><span class="go">CC-2026-0002</span></button>
      <div class="msep"></div>
      <p class="mnote">El <b>recibo</b> no se emite a mano: sale solo con cada pago verificado (F9). El PDF tarda unos segundos; la fila avisa cuando está.</p>
    </div>"""


def payments_group() -> str:
    return f"""<div class="group">
      <div class="ghead"><span class="t">Pagos</span>{btn("Registrar pago", "receipt", "ghost xs")}</div>
      <div class="row"><span class="dot ok"></span><div><p class="t">Bancolombia</p><p class="m">16 sep · verificado por Isabel</p></div><p class="v">{ABONO}</p></div>
    </div>"""


def headline() -> str:
    return f"""<div class="headline">
      <p class="lede">Falta por cobrar</p>
      <p class="amount">{SALDO}</p>
      <p class="of">de {TOTAL} · <b>30 %</b> cobrado</p>
      <div class="meter" role="img" aria-label="Cobrado el 30 por ciento"></div>
    </div>"""


def sheet(variant: str = "full", can_manage: bool = True, menu_open: bool = False) -> str:
    menu = emit_menu() if menu_open else ""
    return f"""<aside class="sheet" aria-label="Pedido JX-0042">
      <div class="sheet-top">
        <div><p class="id">JX-0042</p><p class="who">Laura Gómez</p><p class="where">Expedición Cocuy · 2 cupos · sale el 14 mar</p></div>
        {badge("Abonado", "warn")}
      </div>
      <div class="sheet-body">
        {headline()}
        {payments_group()}
        {docs_group(variant, can_manage, menu_open)}
        <p class="origin">Cotizado en <b>US$ 7.000</b>. El total quedó fijo el 16 de septiembre a <b>3.100,45</b> por dólar.</p>
      </div>
      {menu}
    </aside>"""


def activity(extra_rows: list | None = None) -> str:
    rows = (extra_rows or []) + [
        ("circle-check", "Pago verificado", f"{ABONO} · quedaron {SALDO}", "16 sep, 10:24"),
        ("lock", "Total fijado en pesos", "US$ 7.000 a 3.100,45 (Superfinanciera)", "16 sep, 10:24"),
        ("circle-check", "Pedido confirmado", "2 cupos reservados para el 14 de marzo", "16 sep, 10:18"),
    ]
    evs = "".join(
        f'<div class="act">{ic(i, size=16)}<div><p class="t">{t}</p><p class="m">{m}</p></div><time>{w}</time></div>'
        for i, t, m, w in rows
    )
    return f"""<section>
      <p class="section-title">Actividad</p>
      <p class="section-sub">Los papeles NO escriben en el timeline del pedido en F8: viven en su sección. Aquí sigue el dinero.</p>
      <div class="acts-list" style="margin-top:12px">{evs}</div>
    </section>"""


def items() -> str:
    return f"""<section>
      <p class="section-title">Expedición Cocuy · salida del 14 de marzo</p>
      <div class="group" style="margin-top:12px">
        <div class="row"><span class="dot off"></span><div><p class="t">2 cupos · Cocuy, 5 días</p><p class="m">US$ 3.500 por persona</p></div><p class="v">{TOTAL}<small>US$ 7.000</small></p></div>
        <div class="row"><span class="dot off"></span><div><p class="t">Total del pedido</p><p class="m">Sin descuentos ni envío</p></div><p class="v">{TOTAL}</p></div>
      </div>
    </section>"""


def order_page(variant: str = "full", can_manage: bool = True, menu_open: bool = False, toast: str = "") -> str:
    return f"""<div class="split" style="position:relative;min-height:1000px">
      <div class="content">
        <div class="page-head"><h1>Pedido JX-0042</h1><p class="sub">Laura Gómez · llegó por WhatsApp el 16 de septiembre</p></div>
        {items()}
        {activity()}
      </div>
      {sheet(variant, can_manage, menu_open)}
      {toast}
    </div>"""


def failed_toast() -> str:
    return f"""<div class="toast warn" role="status" style="bottom:auto;top:24px">{ic("triangle-alert", size=16)}
      <div><b>No se pudo generar cuenta de cobro CC-2026-0002</b><small>El PDF no salió. Reintenta o regenera el documento desde el pedido.</small></div></div>"""


# ----------------------------------------------------------------------------- 360
def contact_360() -> str:
    def order_block(oid: str, name: str, saldo: str, total: str, when: str, docs_html: str, chip: str) -> str:
        return f"""<div class="ord">
          <div class="oh"><div><p class="t"><span class="id">{oid}</span>{name}{chip}</p><p class="s">Falta <b>{saldo}</b> de {total} · {when}</p></div>{act("Abrir", "external-link")}</div>
          <div class="docs">{docs_html}</div>
        </div>"""
    d1 = "".join([
        doc("Contrato", "CTR-2026-0120", "16 sep", "ok", "", VER),
        doc("Cuenta de cobro", "CC-2026-0001", "17 sep", "ok", "", VER),
    ])
    d2 = f"""<div class="gvoid" style="padding:10px 12px"><span class="vic" style="width:30px;height:30px;border-radius:9px">{ic("file-text", size=15)}</span>
      <div><p class="t" style="font-size:13px">Sin papeles todavía</p><p class="s">Se emiten desde el pedido.</p></div></div>"""
    return f"""<div class="wrap">
      <p class="crumbs">CRM <span>›</span> Contactos <span>›</span> <b>Laura Gómez</b></p>
      <div class="c360">
        <div class="col">
          <section class="card">
            <div class="who"><span class="av">LG</span><div><p class="nm">Laura Gómez</p><div class="sub">{badge("Cliente", "ok")}<span>Bogotá · llegó por WhatsApp</span></div></div></div>
            <dl class="fl"><dt>Teléfono</dt><dd>+57 310 555 0199</dd><dt>Correo</dt><dd>laura.martinez@example.com</dd><dt>Documento</dt><dd class="muted" style="font-weight:400">Sin dato · el contrato lo omite</dd><dt>Última conversación</dt><dd>hace 2 días</dd></dl>
          </section>
          <section class="card">
            <div class="chead"><h3>Oportunidades <span class="n">(1)</span></h3>{btn("Nueva", "plus", "outline sm")}</div>
            <div class="deal" style="margin-top:8px"><div><p class="t">Expedición Cocuy · marzo</p><p class="s">Reservado · cierra 14 mar</p></div><p class="v">{TOTAL}{badge("Ganada", "ok")}</p></div>
          </section>
        </div>
        <div class="col">
          <section class="card">
            <div class="chead"><h3>Pedidos y documentos <span class="n">(2)</span></h3><span class="small muted">Con saldo primero</span></div>
            <div style="margin-top:6px">
              {order_block("JX-0042", "Expedición Cocuy", SALDO, TOTAL, "sale el 14 mar", d1, badge("Abonado", "warn"))}
              {order_block("JX-0031", "Expedición Egipto", "$ 0", "$ 14.200.000", "viajó el 2 may", d2, badge("Pagado", "ok"))}
            </div>
            <p class="gfoot" style="border-top:0;padding:14px 0 0">Es la <b>misma lista</b> que ve el pedido, filtrada por contacto: un papel se archiva a nombre de la persona y sobrevive al pedido.</p>
          </section>
        </div>
      </div>
    </div>"""


# ----------------------------------------------------------------------------- ajustes
def settings_next() -> str:
    def row(kind: str, pre: str, ph: str, nxt: str, started: str, ex: str, off: bool = False) -> str:
        if off:
            return f'<div class="pfx off"><span>{kind}<div class="small muted">Todavía no se emite: sin conexión fiscal</div></span>{K.input("", ph, "pre")}<span class="ex">—</span><span class="ex">—</span></div>'
        if started:
            return (f'<div class="pfx"><span>{kind}</span>{K.input(pre, ph, "pre")}'
                    f'{K.input(nxt, "", "num readonly")}<span class="lock">{ic("lock", size=13)}{started}</span></div>')
        return (f'<div class="pfx"><span>{kind}</span>{K.input(pre, ph, "pre")}'
                f'{K.input(nxt, "1", "num")}<span class="ex">{ex}</span></div>')
    rows = "".join([
        row("Contrato", "CTR", "CTR", "121", "ya salió el primero", ""),
        row("Cotización", "", "COT", "1", "", "COT-2026-<b>0001</b>"),
        row("Propuesta", "", "PRO", "1", "", "PRO-2026-<b>0001</b>"),
        row("Recibo de pago", "REC", "REC", "113", "ya salió el primero", ""),
        row("Estado de cuenta", "", "EDC", "40", "", "EDC-2026-<b>0040</b>"),
        row("Cuenta de cobro", "CC", "CC", "3", "ya salió el primero", ""),
        row("Factura / documento comercial", "", "FAC", "", "", "", off=True),
    ])
    tabs = K.nav([("General", "building-2"), ("Sucursales", "map-pin"), ("Funciones", "toggle-right"), ("Documentos", "file-text")],
                 "Documentos", "Ajustes de la empresa")
    return f"""<div class="setwrap">
      <div class="topbar"><p class="ttl">Mi empresa</p><span class="small muted">JuanitoXpeditions · agencia de expediciones</span></div>
      {tabs}
      <div class="two">
        <div>
          <p class="set-title">{ic("hash", size=14)}Numeración<span class="n">por tipo, sin reinicio anual</span></p>
          <div class="set">
            <div class="nh"><span>Tipo</span><span>Prefijo</span><span>Siguiente nº</span><span>Saldrá como</span></div>
            {rows}
          </div>
          <p class="set-note">Si ya llevabas una numeración en papel, escribe aquí <b>el siguiente número</b> que toca y Axi continúa desde ahí.
            Solo se puede fijar <b>antes</b> de emitir el primero de cada tipo: después, el consecutivo ya es un hecho y se bloquea.</p>
          <div class="savebar">{btn("Descartar", "", "ghost")}{btn("Guardar ajustes", "")}</div>
        </div>
        <aside class="side-note">
          <h4>{ic("info", size=15)}Por qué se bloquea</h4>
          Un contrato con el número de otro no se arregla después. Por eso el estado de cuenta puede empezar en <span class="ex">EDC-2026-0040</span> hoy,
          pero el contrato —que ya salió como <span class="ex">CTR-2026-0120</span>— seguirá en <span class="ex">0121</span> aunque cambies el prefijo.
          <br><br>El servidor responde <b>409</b> si algo ya empezó, y no guarda nada a medias.
        </aside>
      </div>
    </div>"""


# ----------------------------------------------------------------------------- móvil
def mobile(menu_open: bool = False) -> str:
    return f"""<div class="mobile">
      <div class="grab"></div>
      <div class="m-top"><div><p class="id">JX-0042</p><p class="who">Laura Gómez</p></div>{btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</div>
      <div class="m-body">
        {headline()}
        {docs_group("full", True, menu_open)}
        {btn("Registrar pago", "receipt", "outline block")}
      </div>
      {emit_menu("330px") if menu_open else ""}
    </div>"""


VIEWS = [
    ("pedido", "1 · En el pedido", order_page("full"),
     "El rail del pedido gana la sección Documentos, después de Pagos. Cada fila es un asiento: tipo, número en mono, cuándo salió y estado con punto; «Ver» abre el PDF con una URL firmada fresca. «Emitir» es la única acción coral de la sección."),
    ("emitir", "2 · Emitir", order_page("full", menu_open=True),
     "El menú ofrece SOLO lo que se emite a mano en F8. El contrato ya existe y lo dice con su número (uno por reserva): la idempotencia del servidor, contada antes del clic. Estado de cuenta y cuenta de cobro anuncian el número que saldrá."),
    ("estados", "3 · Estados", order_page("states", toast=failed_toast()),
     "Generando late en azul; el fallo dice el motivo y ofrece Reintentar con el MISMO número (tres fallos → regenerar); «Desactualizado» es un dato en ámbar, no una alarma, y la acción honesta depende del tipo: el contrato se regenera con los mismos datos congelados. El reemplazado queda atenuado pero archivado."),
    ("vacio", "4 · Sin papeles", order_page("empty"),
     "El vacío no es un error: es una invitación. Dice qué se puede emitir ya y qué llegará solo (el recibo, con cada pago)."),
    ("solo-ver", "5 · Solo ver", order_page("readonly", can_manage=False),
     "Sin `documents:manage` (el operador) la sección existe igual: puede abrir y enviar los papeles, pero no emitir ni regenerar — el pie explica por qué. Nada se pinta deshabilitado: lo que no se puede, no está."),
    ("oscuro", "6 · Oscuro", order_page("full"),
     "Mismos tokens; los puntos de estado son el color, nunca el fondo de la fila."),
    ("contacto", "7 · Ficha del contacto", contact_360(),
     "La card «Pedidos y documentos» del 360 monta la MISMA lista de documentos filtrada por contacto, agrupada por pedido y con el saldo delante. Un papel se archiva a nombre de la persona y sobrevive al pedido."),
    ("numeracion", "8 · Siguiente número", settings_next(),
     "Mi empresa › Documentos gana la columna «Siguiente nº»: editable solo con el contador virgen; en cuanto salió el primero de un tipo, se bloquea y lo dice. El servidor responde 409 y no guarda nada a medias."),
    ("movil", "9 · Móvil", mobile(True),
     "En el móvil el rail es un sheet; la sección Documentos y su menú caben en el ancho sin recortar acciones (las de icono llevan aria-label)."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("Documentos en el pedido", "Mockup F0 · no es producto", "Cobros · F8 «Render PDF, emisión manual y archivo»", VIEWS)
    K.export_artboards([
        {"file": "rail-documentos.dc.html", "title": "En el pedido · la fila es el asiento", "body": order_page("full"), "w": 1440, "h": 1000},
        {"file": "rail-emitir.dc.html", "title": "Emitir · solo lo que se emite a mano", "body": order_page("full", menu_open=True), "w": 1440, "h": 1000},
        {"file": "rail-estados.dc.html", "title": "Estados · generando, fallido, desactualizado, reemplazado", "body": order_page("states", toast=failed_toast()), "w": 1440, "h": 1100},
        {"file": "rail-vacio.dc.html", "title": "Sin papeles · una invitación", "body": order_page("empty"), "w": 1440, "h": 1000},
        {"file": "rail-solo-ver.dc.html", "title": "Solo ver · sin documents:manage", "body": order_page("readonly", can_manage=False), "w": 1440, "h": 1000},
        {"file": "rail-oscuro.dc.html", "title": "Oscuro", "body": order_page("full"), "w": 1440, "h": 1000, "dark": True},
        {"file": "contacto-360.dc.html", "title": "Ficha del contacto · Pedidos y documentos", "body": contact_360(), "w": 1440, "h": 900},
        {"file": "ajustes-siguiente-numero.dc.html", "title": "Mi empresa › Documentos · Siguiente número", "body": settings_next(), "w": 1440, "h": 820},
        {"file": "movil.dc.html", "title": "Móvil · el rail como sheet", "body": mobile(True), "w": 460, "h": 900},
    ])
