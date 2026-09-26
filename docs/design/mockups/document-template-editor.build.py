#!/usr/bin/env python3
"""Mockup «Documentos · plantillas por bloques» (cobros_frontend_plan.md §`documents`, F7).

La idea que ordena estas pantallas: **el papel manda**. El dueño no está rellenando un
formulario de ajustes; está decidiendo cómo se ve el contrato que un cliente va a firmar. Así
que la hoja A4 es el elemento memorable de la pantalla —siempre visible, siempre la MISMA
cadena que va a producir el PDF— y el editor es su margen: una lista de bloques que se leen
como el índice del documento, no como campos.

De ahí salen las cuatro decisiones del diseño:

1. **Los bloques son el índice del papel.** Cada fila de la izquierda es un bloque en el orden
   en que se imprime, con una línea de lo que dice; se sube, se baja, se quita, se añade desde
   una paleta que solo ofrece lo que ESE tipo de documento admite. Sin arrastrar y soltar.
2. **Lo que depende de los datos se dice, no se esconde.** «Filas desde los datos» y «solo si
   hay plan de pagos» van escritos en la fila del bloque: el dueño entiende por qué la tabla
   de cuotas no aparece en un contrato de pago único sin que nadie se lo explique.
3. **Una variable que no existe frena la hoja.** El texto la marca en rojo, el aviso dice a qué
   documento pertenece esa variable, y la vista previa se congela hasta corregirla — antes que
   el 422 del servidor, y con las mismas palabras.
4. **El papel es blanco también en modo oscuro.** La hoja no cambia con el tema: es papel.
5. **Vive en Mi empresa, no en Pagos.** Los documentos son el papel de la EMPRESA y los consume
   cualquier proceso (pedidos, CRM, agenda): su configuración va junto a la identidad del negocio.
   El slice `documents` del cliente es autónomo y sus componentes se montan desde donde haga falta.
6. **La previa dice que es muestra.** Se parece al PDF de verdad, así que el papel lleva una marca «MUESTRA»
   (opción del render, no de los datos) y la paginación no se inventa: la calcula Chromium al generar.
7. **La hoja nunca desaparece.** Una variable desconocida o la red caída ponen una barra sobre el papel,
   no un velo: el dueño necesita ver el documento mientras lo arregla.

Uso:  python3 document-template-editor.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("document-template-editor")
ic, btn, badge = K.ic, K.btn, K.badge

EXTRA_CSS = """
/* ── Página (mismo molde que F4/F5: una columna de trabajo, con aire) ─────── */
.wrap{max-width:1360px;margin:0 auto;padding:40px 40px 80px;display:flex;flex-direction:column;gap:26px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px}
.topbar .ttl{font-size:19px;font-weight:600;letter-spacing:-.015em}
.topbar .acts{display:flex;gap:8px;align-items:center}
.two{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:34px;align-items:start}
.set-title{font-size:13px;color:var(--muted-foreground);padding:0 4px 9px;font-weight:500;display:flex;align-items:center;gap:8px}
.set-title .n{margin-left:auto;font-variant-numeric:tabular-nums}
.set-note{font-size:12.5px;color:var(--muted-foreground);padding:10px 4px 0;line-height:1.55;max-width:60ch}
.set-note b{color:var(--foreground);font-weight:500}

/* ── Los tipos: pastillas que cambian el panel, no la URL ─────────────────── */
.kinds{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.kinds .seg button{background:transparent;border:0;font:inherit;cursor:pointer}
.kinds .src{font-size:12.5px;color:var(--muted-foreground);display:flex;align-items:center;gap:8px}

/* ── Los bloques: el índice del papel ──────────────────────────────────────── */
.blocks{border:1px solid var(--border);border-radius:18px;background:var(--background);overflow:hidden}
.blk{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:12px;align-items:start;padding:13px 14px 13px 12px;position:relative}
.blk + .blk::before{content:"";position:absolute;left:58px;right:0;top:0;height:1px;background:var(--border-soft)}
.blk .ty{width:34px;height:34px;border-radius:10px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground)}
.blk .nm{font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.blk .pv{font-size:12.5px;color:var(--muted-foreground);margin-top:2px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px}
.blk .pv .v{background:color-mix(in srgb, var(--axi-violet) 14%, transparent);border-radius:4px;padding:0 4px;font-family:var(--font-mono);font-size:11.5px;color:var(--foreground)}
.blk .tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.tag{height:22px;padding:0 8px;border-radius:999px;font-size:11.5px;display:inline-flex;align-items:center;gap:5px;background:var(--secondary);color:var(--muted-foreground)}
.tag.data{background:color-mix(in srgb, var(--axi-info) 12%, var(--background));color:var(--axi-info)}
.tag.when{background:color-mix(in srgb, var(--axi-amber) 16%, var(--background));color:var(--axi-warning)}
.tag.req{background:transparent;border:1px dashed var(--border)}
.blk .acts{display:flex;gap:2px;opacity:.85}
.blk .acts .btn.icon.xs{width:28px;height:28px;padding:0;color:var(--muted-foreground)}
.blk.open{background:color-mix(in srgb, var(--secondary) 55%, var(--background))}
.blk.open .nm{color:var(--foreground)}
.blk.bad .ty{background:color-mix(in srgb, var(--axi-destructive) 12%, var(--background));color:var(--axi-destructive)}
.add-row{display:flex;justify-content:center;padding:12px}
.add-row .btn{border-style:dashed}

/* ── Editor de un bloque, desplegado bajo su fila ──────────────────────────── */
.bedit{grid-column:1 / -1;display:flex;flex-direction:column;gap:12px;padding:6px 2px 4px 46px}
.clause{border:1px solid var(--border);border-radius:14px;background:var(--background);overflow:hidden}
.clause .ch{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--border-soft);font-size:13px}
.clause .ch .num{width:22px;height:22px;border-radius:7px;background:var(--secondary);display:grid;place-items:center;font-size:11.5px;font-weight:600;color:var(--axi-brand)}
.clause .ch .t{font-weight:500;flex:1}
.clause .cb{padding:11px 13px;font-size:13px;line-height:1.65}
.clause .cb .v{background:color-mix(in srgb, var(--axi-violet) 14%, transparent);border-radius:4px;padding:0 4px;font-family:var(--font-mono);font-size:11.5px}
.clause .cb .v.bad{background:color-mix(in srgb, var(--axi-destructive) 14%, transparent);color:var(--axi-destructive);text-decoration:underline wavy}
.varbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 0 0}
.varbar .lbl{font-size:12px;color:var(--muted-foreground);margin-right:2px}
.vchip{height:25px;padding:0 9px;border-radius:7px;background:var(--background);border:1px solid var(--border);display:inline-flex;align-items:center;font-size:11.5px;font-family:var(--font-mono);color:var(--muted-foreground)}
.count{font-size:11.5px;color:var(--muted-foreground);margin-left:auto;font-variant-numeric:tabular-nums}

/* ── Paleta: solo lo que este documento admite ────────────────────────────── */
.palette{border:1px solid var(--border);border-radius:16px;background:var(--background);box-shadow:var(--shadow-overlay);padding:8px;width:360px;position:absolute;left:40px;top:64px;z-index:5}
.pal-h{font-size:12px;color:var(--muted-foreground);padding:8px 10px 6px;font-weight:500}
.pal-item{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-items:start;padding:9px 10px;border-radius:10px}
.pal-item:hover{background:var(--secondary)}
.pal-item .ty{width:30px;height:30px;border-radius:9px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground)}
.pal-item .t{font-size:13.5px;font-weight:500}
.pal-item .d{font-size:12px;color:var(--muted-foreground);line-height:1.45;margin-top:1px}
.pal-item.off{opacity:.5}
.pal-item.off .d{font-style:italic}
.pal-anchor{position:relative}

/* ── La hoja: el papel manda, y es blanco también en oscuro ───────────────── */
.sheet-col{display:flex;flex-direction:column;gap:12px;position:sticky;top:24px}
.sheet-bar{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--muted-foreground);padding:0 4px}
.sheet-bar .live{display:inline-flex;align-items:center;gap:6px}
.sheet-bar .live .d{width:7px;height:7px;border-radius:50%;background:var(--axi-success)}
.sheet-bar .zoom{margin-left:auto;display:flex;gap:2px}
.sheet-frame{background:color-mix(in srgb, var(--foreground) 5%, var(--background));border:1px solid var(--border);border-radius:18px;padding:26px;display:flex;justify-content:center;position:relative;overflow:hidden}
.sheet{width:640px;min-height:905px;background:#fff;color:#18181b;box-shadow:0 1px 2px rgb(0 0 0/.08),0 18px 44px rgb(0 0 0/.16);
       padding:44px 42px 54px;font-family:var(--font-body);font-size:9.6px;line-height:1.5;position:relative;--paper-accent:#e65759}
.sheet .dhead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--paper-accent);padding-bottom:9px;margin-bottom:14px}
.sheet .dhead .kind{font-size:9px;color:#52525b}
.sheet .dhead .meta{text-align:right;font-size:8.5px;color:#52525b}
.sheet .dhead .meta b{display:block;font-size:11.5px;color:#18181b;font-family:var(--font-heading);font-weight:700}
.sheet .logo{height:22px;width:82px;border-radius:5px;background:linear-gradient(90deg,#e65759,#f0a431 52%,#7c3aed);opacity:.85;margin-bottom:10px}
.sheet h1{font-family:var(--font-heading);font-size:16.5px;font-weight:700;letter-spacing:-.01em;margin:0 0 9px;color:#18181b;text-wrap:balance}
.sheet p{margin:0 0 7px}
.sheet .parties{display:flex;gap:22px;margin:0 0 12px}
.sheet .party{flex:1}
.sheet .party .label{font-size:7.8px;font-weight:600;letter-spacing:.05em;color:var(--paper-accent);margin-bottom:2px;text-transform:uppercase}
.sheet .party div:nth-child(2){font-weight:600}
.sheet .kv{width:100%;border-collapse:collapse;margin:0 0 10px;font-size:9.3px}
.sheet .kv th{text-align:left;font-weight:600;color:#52525b;padding:2px 10px 2px 0;width:110px;vertical-align:top}
.sheet .kv td{padding:2px 0}
.sheet ol{margin:0 0 10px;padding:0;list-style:none;counter-reset:c}
.sheet ol li{margin:0 0 6px;padding-left:20px;position:relative}
.sheet ol li::before{counter-increment:c;content:counter(c) ".";position:absolute;left:0;top:0;font-weight:600;color:var(--paper-accent)}
.sheet ol li b{display:block;margin-bottom:1px}
.sheet table.grid{width:100%;border-collapse:collapse;margin:0 0 10px;font-size:8.8px}
.sheet table.grid th{text-align:left;font-weight:600;color:#52525b;border-bottom:1.5px solid var(--paper-accent);padding:4px 5px}
.sheet table.grid td{border-bottom:1px solid #e4e4e7;padding:4px 5px;vertical-align:top}
.sheet table.grid .r{text-align:right}
.sheet table.grid tfoot td{border-bottom:0;font-weight:600;padding-top:5px}
.sheet .totals{width:100%;border-collapse:collapse;margin:0 0 12px}
.sheet .totals td{padding:2.5px 0;text-align:right}
.sheet .totals td.l{color:#52525b;padding-right:14px}
.sheet .totals tr.big td{font-weight:700;font-size:11.5px;border-top:1.5px solid var(--paper-accent);padding-top:5px}
.sheet .sigs{display:flex;gap:30px;margin:26px 0 12px}
.sheet .sig{flex:1;border-top:1px solid #18181b;padding-top:4px;font-size:9px}
.sheet .sig .dt{color:#52525b;font-size:8.5px;margin-top:2px}
.sheet .legal{font-size:8.2px;color:#52525b;border:1px solid #e4e4e7;padding:6px 8px;border-radius:4px;margin:8px 0}
.sheet .pfoot{position:absolute;left:42px;right:42px;bottom:22px;font-size:7.8px;color:#71717a;text-align:center;border-top:1px solid #e4e4e7;padding-top:5px}
.sheet .pnum{position:absolute;right:42px;bottom:10px;font-size:7.5px;color:#a1a1aa}
.sheet .wm{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font-family:var(--font-heading);font-weight:700;font-size:64px;letter-spacing:.12em;color:rgba(24,24,27,.07);transform:rotate(-28deg)}
.sheet .mark{outline:2px solid color-mix(in srgb, var(--axi-brand) 70%, transparent);outline-offset:3px;border-radius:2px}
.frozen{position:absolute;left:26px;right:26px;top:26px;display:flex;justify-content:center;pointer-events:none}
.frozen .msg{background:color-mix(in srgb, var(--background) 95%, transparent);border:1px solid var(--border);border-radius:14px;padding:12px 16px;font-size:13px;display:flex;gap:10px;align-items:flex-start;box-shadow:var(--shadow-overlay);max-width:420px;line-height:1.45;backdrop-filter:blur(6px)}
.frozen .msg .ic{color:var(--axi-warning);flex:none}
.sheet.sk{display:flex;flex-direction:column;gap:10px}

/* ── Ajustes del emisor (idioma de filas de F4/F5) ─────────────────────────── */
.set{border:1px solid var(--border);border-radius:16px;background:var(--background);overflow:hidden}
.set-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:16px;align-items:center;padding:13px 17px;position:relative;min-height:54px}
.set-row + .set-row::before{content:"";position:absolute;left:17px;right:0;top:0;height:1px;background:var(--border-soft)}
.set-row .k{font-size:14px}
.set-row .k .kk{font-size:12.5px;color:var(--muted-foreground);margin-top:2px}
.set-row .input{height:36px}
.set-row .input.ph span{color:var(--muted-foreground)}
.pfx{display:grid;grid-template-columns:minmax(0,1fr) 90px 150px;gap:12px;align-items:center;padding:11px 17px;position:relative;font-size:14px}
.pfx + .pfx::before{content:"";position:absolute;left:17px;right:0;top:0;height:1px;background:var(--border-soft)}
.pfx .ex{font-family:var(--font-mono);font-size:12.5px;color:var(--muted-foreground);text-align:right}
.pfx .input{height:34px;font-family:var(--font-mono);text-transform:uppercase}
.pfx.off{opacity:.55}
.savebar{display:flex;justify-content:flex-end;gap:8px;padding-top:6px}

/* ── Diálogos ─────────────────────────────────────────────────────────────── */
.modal.wide{max-width:480px;padding:26px;gap:16px;border-radius:24px}
.modal.wide h2{font-size:20px;letter-spacing:-.015em;font-family:var(--font-body);font-weight:600}
.modal .sub{font-size:13.5px;color:var(--muted-foreground);line-height:1.55}
.modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}

/* ── Vacío y móvil ─────────────────────────────────────────────────────────── */
.void{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:64px 20px;border:1px solid var(--border);border-radius:18px}
.void .vic{width:52px;height:52px;border-radius:16px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground);margin-bottom:6px}
.void h3{font-size:17px;font-family:var(--font-body);font-weight:600;letter-spacing:-.01em}
.void p{color:var(--muted-foreground);font-size:13.5px;max-width:46ch;line-height:1.6}
.void .acts{display:flex;gap:8px;margin-top:6px}
.foot-note{font-size:12.5px;color:var(--muted-foreground);padding:12px 4px 0;max-width:72ch;line-height:1.55}
.foot-note b{color:var(--foreground);font-weight:500}
.phone{width:390px;margin:28px auto;border:1px solid var(--border);border-radius:38px;background:var(--background);padding:14px 10px 20px;box-shadow:var(--shadow-float)}
.phone .ph-top{display:flex;align-items:center;justify-content:space-between;padding:6px 12px 14px}
.phone .ph-top .t{font-size:17px;font-weight:600;letter-spacing:-.015em}
.phone .blocks{border-radius:16px}
.phone .blk{grid-template-columns:30px minmax(0,1fr) auto;padding:12px}
.phone .blk .pv{max-width:190px}
.phone .peek{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border:1px solid var(--border);border-radius:14px;margin:12px 0}
.phone .peek .mini{width:34px;height:46px;background:#fff;border:1px solid #e4e4e7;border-radius:2px;box-shadow:0 2px 6px rgb(0 0 0/.12);position:relative}
.phone .peek .mini::before{content:"";position:absolute;left:5px;right:5px;top:6px;height:2px;background:#e65759}
.phone .peek .mini::after{content:"";position:absolute;left:5px;right:12px;top:12px;height:20px;background:repeating-linear-gradient(#e4e4e7 0 1px,transparent 1px 4px)}
.phone .peek .t{font-size:13.5px;font-weight:500}
.phone .peek .s{font-size:12px;color:var(--muted-foreground)}
"""

# Mi empresa, no Pagos (decisión del dueño, 2026-09-22): los documentos son el papel
# de la EMPRESA —emisor, numeración, plantillas— y los consume cualquier proceso
# (pedidos, CRM, agenda), así que su configuración vive junto a la identidad del
# negocio y no dentro de cobros. La pestaña solo aparece con la función encendida.
TABS = [("General", "building-2"), ("Sucursales", "map-pin"), ("Funciones", "toggle-right"),
        ("Documentos", "file-text")]

KINDS = [("Contrato", "file-signature"), ("Cotización", "file-text"), ("Propuesta", "presentation"),
         ("Recibo", "receipt"), ("Estado de cuenta", "list-ordered"), ("Cuenta de cobro", "file-badge")]


def hub(active: str, body: str, who: str = "JuanitoXpeditions · agencia de expediciones") -> str:
    return f"""<div class="wrap">
      <div class="topbar"><p class="ttl">Mi empresa</p><span class="small muted">{who}</span></div>
      {K.nav(TABS, active, "Ajustes de la empresa")}
      {body}
    </div>"""


def kind_tabs(active: str = "Contrato", source: str = "tenant") -> str:
    tabs = "".join(
        f'<button role="radio" aria-checked="{str(t == active).lower()}">{ic(i, size=15)}{t}</button>' for t, i in KINDS
    )
    if source == "tenant":
        src = f'{badge("Tu versión 3 · editada hace 2 días", "violet")}{btn("Restablecer al modelo de Axi", "rotate-ccw", "ghost xs")}'
    else:
        # Primera vez: no hay nada a lo que «restablecer», así que el botón no existe;
        # en su lugar, la frase que quita el miedo a tocar.
        src = (f'{badge("Modelo de Axi para agencias", "info")}'
               f'<span class="small muted">Edita lo que quieras: al guardar nace tu versión 1 y el modelo de Axi sigue ahí para volver.</span>')
    return f"""<div class="kinds">
      <div class="seg inline sm" role="radiogroup" aria-label="Tipo de documento">{tabs}</div>
      <span class="src">{src}</span>
    </div>"""


def v(name: str, bad: bool = False) -> str:
    return f'<span class="v{" bad" if bad else ""}">{{{{{name}}}}}</span>'


def blk(icon: str, name: str, preview: str = "", tags: str = "", cls: str = "", editor: str = "",
        required: bool = False) -> str:
    req = f'<span class="tag req">{ic("lock", size=11)}obligatorio en un contrato</span>' if required else ""
    remove = "" if required else btn("", "x", "ghost icon xs", 'aria-label="Quitar el bloque ' + name + '"')
    tagline = f'<div class="tags">{tags}{req}</div>' if (tags or req) else ""
    pv = f'<div class="pv">{preview}</div>' if preview else ""
    return f"""<div class="blk {cls}">
      <span class="ty">{ic(icon, size=16)}</span>
      <div><div class="nm">{name}</div>{pv}{tagline}</div>
      <div class="acts">{btn("", "chevron-up", "ghost icon xs", f'aria-label="Subir el bloque {name}"')}{btn("", "chevron-down", "ghost icon xs", f'aria-label="Bajar el bloque {name}"')}{remove}</div>
      {editor}
    </div>"""


T_DATA = f'<span class="tag data">{ic("database", size=11)}filas desde los datos</span>'
T_PLAN = f'<span class="tag when">{ic("git-branch", size=11)}solo si hay plan de pagos</span>'
T_FX = f'<span class="tag when">{ic("git-branch", size=11)}con conversión si la hay</span>'
T_PAGE = f'<span class="tag">{ic("repeat", size=11)}se repite en cada página</span>'
T_FIX = f'<span class="tag">{ic("lock", size=11)}texto fijo del tipo</span>'


def clause_editor(bad: bool = False) -> str:
    c2 = (f'El valor total es de {v("total")} ({v("total_words")}), equivalente a {v("total_in_base")} a la tasa de '
          f'{v("fx_rate")} del {v("fx_date")}. Una vez confirmada la reserva, el valor en pesos queda fijo y no se '
          f'recalcula con la tasa de cambio.')
    c3 = (f'La reserva se confirma con un abono de {v("deposit_amount")}. El saldo se paga en '
          f'{v("installments_count")} cuotas según el plan de pagos de este contrato'
          + (f', antes del {v("numero_pedido", bad=True)}.' if bad else ', y debe estar cubierto antes de la fecha límite indicada.'))
    chips = "".join(f'<span class="vchip">{{{{{n}}}}}</span>' for n in
                    ["contact_name", "reference_number", "service_date", "total", "total_words", "deposit_amount",
                     "installments_count", "balance", "next_due_date"])
    warn = ""
    if bad:
        warn = K.notice("warn",
                        f'<b>{{{{numero_pedido}}}}</b> no existe en un contrato. La variable del número de pedido se llama '
                        f'<b>{{{{reference_number}}}}</b>; la vista previa espera hasta que la corrijas.',
                        acts=btn("Usar reference_number", "wand-sparkles", "outline xs"))
    return f"""<div class="bedit">
      <div class="clause"><div class="ch"><span class="num">1</span><span class="t">Objeto</span>{btn("", "chevron-up", "ghost icon xs", 'aria-label="Subir la cláusula 1"')}{btn("", "chevron-down", "ghost icon xs", 'aria-label="Bajar la cláusula 1"')}{btn("", "x", "ghost icon xs", 'aria-label="Quitar la cláusula 1"')}</div>
        <div class="cb">La agencia organiza y presta los servicios turísticos detallados en este contrato para la salida del {v("service_date")}.</div></div>
      <div class="clause"><div class="ch"><span class="num">2</span><span class="t">Precio</span>{btn("", "chevron-up", "ghost icon xs", 'aria-label="Subir la cláusula 2"')}{btn("", "chevron-down", "ghost icon xs", 'aria-label="Bajar la cláusula 2"')}{btn("", "x", "ghost icon xs", 'aria-label="Quitar la cláusula 2"')}</div>
        <div class="cb">{c2}</div></div>
      <div class="clause"><div class="ch"><span class="num">3</span><span class="t">Forma de pago</span>{btn("", "chevron-up", "ghost icon xs", 'aria-label="Subir la cláusula 3"')}{btn("", "chevron-down", "ghost icon xs", 'aria-label="Bajar la cláusula 3"')}{btn("", "x", "ghost icon xs", 'aria-label="Quitar la cláusula 3"')}</div>
        <div class="cb">{c3}</div></div>
      <div class="clause"><div class="ch"><span class="num">4</span><span class="t">Cambios y cancelaciones</span>{btn("", "chevron-up", "ghost icon xs", 'aria-label="Subir la cláusula 4"')}{btn("", "chevron-down", "ghost icon xs", 'aria-label="Bajar la cláusula 4"')}{btn("", "x", "ghost icon xs", 'aria-label="Quitar la cláusula 4"')}</div>
        <div class="cb">Los cambios de fecha o de viajero y las cancelaciones se rigen por la política publicada por la agencia y aceptada al reservar.</div></div>
      {warn}
      <div class="varbar"><span class="lbl">Variables de un contrato</span>{chips}<span class="count">4 de 20 cláusulas</span></div>
      <div class="add-row" style="padding:2px 0 0;justify-content:flex-start">{btn("Añadir cláusula", "plus", "outline xs")}</div>
    </div>"""


def block_list(mode: str = "full") -> str:
    """mode: full | clauses (cláusulas desplegadas) | bad (variable desconocida)."""
    open_clauses = mode in ("clauses", "bad")
    rows = [
        blk("image", "Logo", "El isotipo del negocio, a la izquierda"),
        blk("heading", "Título", f'Contrato de servicios turísticos {v("document_number")}', required=True),
        blk("users", "Partes", "La agencia · El viajero", required=True),
        blk("text", "Párrafo", f'Entre {v("company_legal_name")} (la agencia) y {v("contact_name")} (el viajero) se celebra…'),
        blk("list", "Datos en pares", f'Reserva · Fecha de salida · Viajeros'),
        blk("list-ordered", "Cláusulas", "4 cláusulas · Objeto, Precio, Forma de pago, Cambios y cancelaciones",
            cls=("open" + (" bad" if mode == "bad" else "")) if open_clauses else "",
            editor=clause_editor(bad=(mode == "bad")) if open_clauses else ""),
        blk("table", "Tabla de ítems", "Descripción · Cant. · Precio unitario · Total", tags=T_DATA),
        blk("sigma", "Totales", "Total · Total en USD · Tasa aplicada", tags=T_FX),
        blk("calendar-clock", "Plan de pagos", "N.º · Concepto · Vence · Valor · Pagado · Estado", tags=T_DATA + T_PLAN),
        blk("text", "Párrafo", f'Para constancia se firma en {v("company_city")} el {v("issued_at")}.'),
        blk("pen-line", "Firmas", "Por la agencia · El viajero · con fecha", required=True),
        blk("panel-bottom", "Pie de página", f'{v("company_name")} · {v("company_address")} {v("company_city")} · {v("company_phone")}', tags=T_PAGE),
    ]
    return f"""<div class="blocks">{"".join(rows)}
      <div class="add-row">{btn("Añadir bloque", "plus", "outline sm")}</div>
    </div>"""


def palette() -> str:
    items = [
        ("text", "Párrafo", "Texto libre con variables. Puede depender de que exista un dato.", False),
        ("list-ordered", "Cláusulas", "Lista numerada de cláusulas escritas por el negocio.", False),
        ("list", "Datos en pares", "Etiqueta y valor, uno por línea (fecha de salida, referencia…).", False),
        ("table", "Tabla de ítems", "Una fila por ítem vendido. Las filas salen de los datos.", False),
        ("sigma", "Totales", "Subtotal y total; con conversión de moneda si el documento la tiene.", False),
        ("calendar-clock", "Plan de pagos", "Una fila por cuota. Solo aparece si el documento tiene plan.", False),
        ("minus", "Línea", "Una línea separadora.", False),
        ("move-vertical", "Espacio", "Espacio en blanco.", False),
        ("receipt", "Resumen del pago", "Solo en un recibo: un contrato no documenta un pago concreto.", True),
        ("scale", "Leyenda legal", "Solo en la cuenta de cobro: es su texto fijo, no se añade.", True),
    ]
    rows = "".join(
        f'<div class="pal-item{" off" if off else ""}"><span class="ty">{ic(i, size=15)}</span><div><div class="t">{t}</div><div class="d">{d}</div></div></div>'
        for i, t, d, off in items)
    return f'<div class="palette"><p class="pal-h">Añadir a este contrato</p>{rows}</div>'


# ── La hoja ────────────────────────────────────────────────────────────────
def sheet(mode: str = "full", mark: str = "") -> str:
    """mode: full | frozen | loading | error ; mark: id del bloque resaltado."""
    if mode == "loading":
        sk = "".join(K.skeleton(w, h, "border-radius:3px;background:#f4f4f5") for w, h in
                     [("30%", "10px"), ("70%", "22px"), ("100%", "44px"), ("100%", "12px"), ("100%", "12px"), ("90%", "12px"),
                      ("100%", "120px"), ("100%", "80px"), ("60%", "12px")])
        return f'<div class="sheet-frame"><div class="sheet sk">{sk}</div></div>'
    m = lambda key: ' mark' if mark == key else ''
    body = f"""<div class="sheet">
      <div class="dhead"><div><div class="logo"></div><div class="kind">Contrato</div></div>
        <div class="meta"><b>CTR-2026-0001</b>22 de septiembre de 2026</div></div>
      <h1 class="{m('title')}">Contrato de servicios turísticos CTR-2026-0001</h1>
      <div class="parties">
        <div class="party"><div class="label">La agencia</div><div>JuanitoXpeditions S.A.S.</div><div>NIT 901.234.567-8</div><div>Calle 93 # 11-27, oficina 402, Bogotá</div><div>+57 300 123 4567 · reservas@juanitoxpeditions.co</div></div>
        <div class="party"><div class="label">El viajero</div><div>Laura Martínez Gómez</div><div>Documento CC 1.020.456.789</div><div>+57 310 555 0199</div><div>laura.martinez@example.com</div></div>
      </div>
      <p>Entre JuanitoXpeditions S.A.S. (la agencia) y Laura Martínez Gómez (el viajero) se celebra el presente contrato para la prestación de los servicios turísticos descritos a continuación.</p>
      <table class="kv"><tr><th>Reserva</th><td>#1042</td></tr><tr><th>Fecha de salida</th><td>14 de marzo de 2027</td></tr><tr><th>Viajeros</th><td>4</td></tr></table>
      <ol class="{m('clauses')}">
        <li><b>Objeto</b>La agencia organiza y presta los servicios turísticos detallados en este contrato para la salida del 14 de marzo de 2027.</li>
        <li><b>Precio</b>El valor total es de $ 29.200.000 (VEINTINUEVE MILLONES DOSCIENTOS MIL PESOS M/CTE), equivalente a US$ 7.300,00 a la tasa de 4.000,00 del 22 de septiembre de 2026. Una vez confirmada la reserva, el valor en pesos queda fijo y no se recalcula con la tasa de cambio.</li>
        <li><b>Forma de pago</b>La reserva se confirma con un abono de $ 8.760.000. El saldo se paga en 4 cuotas según el plan de pagos de este contrato, y debe estar cubierto antes de la fecha límite indicada. El incumplimiento faculta a la agencia para liberar el cupo.</li>
        <li><b>Cambios y cancelaciones</b>Los cambios de fecha o de viajero y las cancelaciones se rigen por la política publicada por la agencia y aceptada al reservar.</li>
      </ol>
      <table class="grid"><thead><tr><th>Descripción</th><th class="r">Cant.</th><th class="r">Precio unitario</th><th class="r">Total</th></tr></thead>
        <tbody><tr><td>Expedición Egipto y Jordania (Salida 14 de marzo de 2027)</td><td class="r">2</td><td class="r">$ 14.000.000</td><td class="r">$ 28.000.000</td></tr>
        <tr><td>Seguro de viaje internacional</td><td class="r">2</td><td class="r">$ 600.000</td><td class="r">$ 1.200.000</td></tr></tbody></table>
      <table class="totals"><tr class="big"><td class="l">Total</td><td>$ 29.200.000</td></tr><tr><td class="l">Total en USD</td><td>US$ 7.300,00</td></tr><tr><td class="l">Tasa aplicada (22 de septiembre de 2026)</td><td>4.000,00 COP/USD</td></tr></table>
      <table class="grid{m('schedule')}"><thead><tr><th>N.º</th><th>Concepto</th><th>Vence</th><th class="r">Valor</th><th class="r">Pagado</th><th>Estado</th></tr></thead>
        <tbody><tr><td>1</td><td>Abono</td><td>22 de septiembre de 2026</td><td class="r">$ 8.760.000</td><td class="r">$ 8.760.000</td><td>Pagada</td></tr>
        <tr><td>2</td><td>Cuota</td><td>22 de octubre de 2026</td><td class="r">$ 6.813.333</td><td class="r">$ 0</td><td>Pendiente</td></tr>
        <tr><td>3</td><td>Cuota</td><td>22 de noviembre de 2026</td><td class="r">$ 6.813.333</td><td class="r">$ 0</td><td>Pendiente</td></tr>
        <tr><td>4</td><td>Saldo</td><td>13 de enero de 2027</td><td class="r">$ 6.813.334</td><td class="r">$ 0</td><td>Pendiente</td></tr></tbody>
        <tfoot><tr><td colspan="5" class="r">Saldo</td><td class="r">$ 20.440.000</td></tr></tfoot></table>
      <p>Para constancia se firma en Bogotá el 22 de septiembre de 2026.</p>
      <div class="sigs"><div class="sig">Por la agencia<div class="dt">Fecha: ____________</div></div><div class="sig">El viajero<div class="dt">Fecha: ____________</div></div></div>
      <div class="pfoot">JuanitoXpeditions · Calle 93 # 11-27, oficina 402 Bogotá · +57 300 123 4567 · reservas@juanitoxpeditions.co</div>
      <div class="pnum">A4 · la paginación se calcula al generar el PDF</div>
      <div class="wm" aria-hidden="true">MUESTRA</div>
    </div>"""
    overlay = ""
    if mode == "frozen":
        overlay = f'<div class="frozen"><div class="msg">{ic("triangle-alert", size=18)}<span>La hoja espera: hay una variable que este documento no tiene. Corrígela y se actualiza sola.</span></div></div>'
    if mode == "error":
        overlay = f'<div class="frozen"><div class="msg">{ic("wifi-off", size=18)}<span>No se pudo actualizar la vista previa. Lo que ves es la última versión buena.<div style="margin-top:8px">{btn("Reintentar", "refresh-cw", "outline xs")}</div></span></div></div>'
    return f'<div class="sheet-frame">{body}{overlay}</div>'


def sheet_col(mode: str = "full", mark: str = "", note: str = "Se actualiza al escribir · con los datos de una reserva de ejemplo") -> str:
    live = {"full": f'<span class="live"><span class="d"></span>Al día</span>',
            "frozen": f'<span class="live"><span class="d" style="background:var(--axi-warning)"></span>En espera</span>',
            "loading": f'<span class="live"><span class="d" style="background:var(--axi-info)"></span>Actualizando…</span>',
            "error": f'<span class="live"><span class="d" style="background:var(--axi-destructive)"></span>Sin conexión</span>'}[mode]
    return f"""<div class="sheet-col">
      <div class="sheet-bar">{live}<span>·</span><span>{note}</span>
        <span class="zoom">{btn("", "zoom-out", "ghost icon xs", 'aria-label="Alejar"')}{btn("", "zoom-in", "ghost icon xs", 'aria-label="Acercar"')}{btn("", "maximize-2", "ghost icon xs", 'aria-label="Ver a tamaño real"')}</span></div>
      {sheet(mode, mark)}
    </div>"""


def editor(mode: str = "full", with_palette: bool = False, sheet_mode: str = "full", mark: str = "", dirty: bool = True, source: str = "tenant") -> str:
    save = btn("Guardar plantilla", "") if dirty else btn("Guardar plantilla", "", "", 'aria-disabled="true" style="opacity:.5"')
    pal = palette() if with_palette else ""
    body = f"""
      {kind_tabs("Contrato", source)}
      <div class="two">
        <div class="pal-anchor">
          <p class="set-title">{ic("layers", size=14)}Los bloques del contrato, en el orden en que se imprimen<span class="n">12</span></p>
          {block_list(mode)}
          {pal}
          <p class="set-note">Lo que lleva <b>«filas desde los datos»</b> se rellena con el pedido al emitir y
            <b>«solo si hay plan de pagos»</b> es lo que ese bloque es. Lo que sí decides tú es <b>cuándo aparece</b> un
            párrafo, unas cláusulas o unos pares: dentro de cada uno, en «Cuándo aparece».</p>
          <div class="savebar">{btn("Descartar cambios", "", "ghost")}{save}</div>
        </div>
        {sheet_col(sheet_mode, mark)}
      </div>"""
    return hub("Documentos", body)


# ── Diálogos ───────────────────────────────────────────────────────────────
def with_modal(base: str, modal: str) -> str:
    return base + f'<div class="overlay">{modal}</div>'


def modal_switch() -> str:
    return f"""<div class="modal wide">
      <div><h2>¿Dejas el contrato sin guardar?</h2>
        <p class="sub">Cambiaste 3 bloques. Si pasas a <b>Recibo</b> ahora, esos cambios se pierden; guardarlos crea la versión 4 del contrato.</p></div>
      <div class="modal-foot">{btn("Seguir editando", "", "ghost")}{btn("Descartar y cambiar", "", "outline")}{btn("Guardar y cambiar", "")}</div>
    </div>"""


def modal_reset() -> str:
    return f"""<div class="modal wide">
      <div><h2>Volver al modelo de Axi para agencias</h2>
        <p class="sub">Tu contrato deja de usarse y vuelve el texto de fábrica. <b>Las tres versiones que escribiste no se borran</b>: los contratos que ya salieron con ellas siguen igual, y si vuelves a editar empiezas en la versión 4.</p></div>
      <div class="modal-foot">{btn("Cancelar", "", "ghost")}{btn("Restablecer", "", "destructive")}</div>
    </div>"""


# ── Emisor y numeración ────────────────────────────────────────────────────
def settings() -> str:
    def row(label: str, hint: str, value: str = "", ph: str = "") -> str:
        return f'<div class="set-row"><span class="k">{label}<div class="kk">{hint}</div></span>{K.input(value, ph)}</div>'

    issuer = "".join([
        row("Razón social", "Si lo dejas vacío sale el nombre del negocio", "JuanitoXpeditions S.A.S."),
        row("Etiqueta del NIT", "«NIT», «RUT», «CIF»…", "NIT"),
        row("Dirección", "Vacío = la de Mi empresa", "", "Calle 93 # 11-27, oficina 402"),
        row("Ciudad", "Vacío = la de Mi empresa", "", "Bogotá"),
        row("Teléfono", "Sale en el pie y en «Partes»", "+57 300 123 4567"),
        row("Correo", "Sale en el pie y en «Partes»", "reservas@juanitoxpeditions.co"),
    ])
    prefixes = "".join([
        f'<div class="pfx"><span>Contrato</span>{K.input("CTR")}<span class="ex">CTR-2026-0057</span></div>',
        f'<div class="pfx"><span>Cotización</span>{K.input("", "COT")}<span class="ex">COT-2026-0001</span></div>',
        f'<div class="pfx"><span>Propuesta</span>{K.input("", "PRO")}<span class="ex">PRO-2026-0001</span></div>',
        f'<div class="pfx"><span>Recibo de pago</span>{K.input("REC")}<span class="ex">REC-2026-0112</span></div>',
        f'<div class="pfx"><span>Estado de cuenta</span>{K.input("", "EDC")}<span class="ex">EDC-2026-0001</span></div>',
        f'<div class="pfx"><span>Cuenta de cobro</span>{K.input("CC")}<span class="ex">CC-2026-0009</span></div>',
        f'<div class="pfx off"><span>Factura / documento comercial<div class="small muted">Todavía no se emite: sin conexión fiscal</div></span>{K.input("", "FAC")}<span class="ex">—</span></div>',
    ])
    body = f"""
      <div class="two">
        <div>
          <p class="set-title">{ic("building-2", size=14)}Quién emite</p>
          <div class="set">{issuer}</div>
          <p class="set-note">Esto es lo que sale como <b>«La agencia»</b> en el papel. Lo que dejes vacío cae a la ficha de Mi empresa;
            el NIT y el isotipo siempre salen de allí.</p>
          <p class="set-title" style="padding-top:26px">{ic("hash", size=14)}Numeración<span class="n">por tipo, sin reinicio anual</span></p>
          <div class="set">{prefixes}</div>
          <p class="set-note">El siguiente número de cada tipo sigue la cuenta que ya llevas: cambiar el prefijo no la reinicia.
            Lo que ya salió conserva su número.</p>
          <div class="savebar">{btn("Descartar", "", "ghost")}{btn("Guardar ajustes", "")}</div>
        </div>
        {sheet_col("full", "", "El emisor se ve aquí antes de guardar")}
      </div>"""
    return hub("Documentos", f'{kind_tabs("Contrato")}{body}')


def disabled() -> str:
    return f"""<div class="wrap">
      <div class="topbar"><p class="ttl">Mi empresa</p><span class="small muted">Savage Wear · tienda de ropa</span></div>
      {K.nav(TABS[:3], "General", "Ajustes de la empresa")}
      <div class="void">
        <span class="vic">{ic("file-x", size=22)}</span>
        <h3>Aquí no hay documentos</h3>
        <p>Esta tienda no emite contratos ni cuentas de cobro: la pestaña Documentos no existe, el servidor responde 403 a
          quien la pida y el agente no sabe que existe. Si algún día los necesita, se enciende aquí mismo, en Funciones.</p>
        <div class="acts">{btn("Ir a Funciones", "toggle-right", "outline sm")}</div>
      </div>
    </div>"""


def mobile() -> str:
    rows = "".join([
        blk("heading", "Título", f'Contrato de servicios turísticos {v("document_number")}', required=True),
        blk("users", "Partes", "La agencia · El viajero", required=True),
        blk("list-ordered", "Cláusulas", "4 cláusulas"),
        blk("table", "Tabla de ítems", "", tags=T_DATA),
        blk("calendar-clock", "Plan de pagos", "", tags=T_PLAN),
    ])
    return f"""<div class="phone">
      <div class="ph-top"><span class="t">Contrato</span>{btn("Guardar", "", "sm")}</div>
      <div class="blocks">{rows}<div class="add-row">{btn("Añadir bloque", "plus", "outline sm")}</div></div>
      <div class="peek"><div style="display:flex;gap:12px;align-items:center"><div class="mini"></div><div><div class="t">La hoja, debajo</div><div class="s">Ajustada al ancho · amplía con el zoom y desplaza</div></div></div>{ic("chevron-down", size=16)}</div>
      <p class="set-note">En el móvil la hoja va debajo de los bloques, <b>ajustada al ancho</b> de la pantalla: nunca se recorta. Con el zoom se amplía y se desplaza para leer el detalle; no hay pantalla aparte en F7.</p>
    </div>"""


VIEWS = [
    ("editor", "1 · El editor", editor("full"),
     "Vive en Mi empresa › Documentos, no en Pagos: es el papel de la empresa y lo consume cualquier proceso. El papel manda: la hoja A4 ocupa la mitad derecha y se actualiza al escribir con los datos de una reserva de ejemplo. A la izquierda, los bloques del contrato en el orden en que se imprimen — se leen como el índice del documento, no como un formulario. Cada bloque dice de qué depende («filas desde los datos», «solo si hay plan de pagos») en su propia fila; los obligatorios llevan candado y no se pueden quitar."),
    ("primera-vez", "1b · La primera vez", editor("full", dirty=False, source="system"),
     "El minuto que decide si el dueño confía en la función: abre Documentos y nunca ha editado nada. Manda el modelo de Axi para su nicho, la hoja ya está completa con datos de ejemplo, y no hay «Restablecer» porque no hay nada a lo que volver. La frase junto a la insignia quita el miedo a tocar: al guardar nace su versión 1 y el modelo sigue ahí."),
    ("oscuro", "2 · Oscuro", editor("full"),
     "El papel es blanco también en modo oscuro: la hoja no cambia con el tema porque es papel, y lo que el dueño está decidiendo es cómo se ve impreso."),
    ("paleta", "3 · Añadir bloque", editor("full", with_palette=True),
     "La paleta solo ofrece lo que un CONTRATO admite. Lo que no cabe se muestra apagado con su razón («solo en un recibo»), en vez de desaparecer: el dueño entiende que el catálogo tiene más y por qué aquí no."),
    ("clausulas", "4 · Cláusulas", editor("clauses", mark="clauses"),
     "Un bloque se edita bajo su propia fila, sin cambiar de pantalla. Las cláusulas se suben, bajan y quitan con botones (sin arrastrar); las variables son piezas moradas y la barra de abajo ofrece SOLO las de un contrato. La hoja resalta el bloque que se está tocando."),
    ("variable", "5 · Variable desconocida", editor("bad", sheet_mode="frozen", mark="clauses"),
     "Una variable que no existe frena la hoja: el texto la marca en rojo, el aviso dice cómo se llama de verdad y ofrece corregirla, y la vista previa se queda en espera con una barra encima — la hoja sigue visible mientras se arregla. Es el mismo 422 del servidor, pero antes y con las mismas palabras."),
    ("cargando", "6 · Actualizando y sin conexión", editor("full", sheet_mode="error"),
     "La hoja nunca desaparece: mientras actualiza se ve la última versión buena, y si falla la red lo dice en una BARRA sobre ella —no un velo— con «Reintentar». La vista previa la produce el servidor con la misma cadena que el PDF, así que lo que se ve es lo que va a salir."),
    ("cambio", "7 · Cambiar de tipo con cambios", with_modal(editor("full"), modal_switch()),
     "Las pastillas de tipo cambian el panel, no la URL. Con cambios sin guardar, cambiar de tipo pregunta y nombra la versión que crearía: cada guardado es una versión nueva, nunca una sobreescritura."),
    ("restablecer", "8 · Restablecer", with_modal(editor("full"), modal_reset()),
     "Restablecer vuelve al modelo de Axi para el nicho, pero lo dice claro: las versiones escritas no se borran, los contratos emitidos con ellas siguen igual, y la próxima edición será la versión 4. Es la única acción destructiva de la pantalla y por eso es la única roja."),
    ("emisor", "9 · Emisor y numeración", settings(),
     "Quién emite y cómo se numera, con la hoja al lado para ver el resultado antes de guardar. Lo vacío cae a la ficha de Mi empresa (el placeholder lo dice); el NIT y el isotipo siempre salen de allí. Los prefijos son por tipo y no reinician la cuenta; la factura aparece apagada porque existe en el catálogo pero no se emite sin conexión fiscal."),
    ("sin-funcion", "10 · Sin la función", disabled(),
     "Savage Wear no emite documentos: la pestaña Documentos no existe en Mi empresa y el agente no sabe que la función existe. Quien entre por URL directa a /settings/company/documentos ve ESTE panel (el 403 del servidor, explicado) con la pestaña ausente del nav, sin redirección. Un rol sin el permiso «Configurar plantillas» ve otro mensaje distinto que lo manda a quien administra los roles."),
    ("movil", "11 · Móvil", mobile(),
     "En el móvil la lista de bloques ocupa el ancho y la hoja va debajo, ajustada al ancho de la pantalla (el zoom por defecto es «lo que cabe», y con el zoom se amplía y desplaza): nunca se recorta. No hay pantalla aparte en F7 — es una decisión declarada, no un hueco."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("Documentos · plantillas por bloques", "Mockup F0 · no es producto",
                 "Cobros · F7 «Esqueleto documents»", VIEWS)
    K.export_artboards([
        {"file": "documents-editor.dc.html", "title": "El editor · el papel manda", "body": editor("full"), "w": 1440, "h": 1400},
        {"file": "documents-first-time.dc.html", "title": "La primera vez · manda el modelo de Axi", "body": editor("full", dirty=False, source="system"), "w": 1440, "h": 1400},
        {"file": "documents-editor-dark.dc.html", "title": "El editor · oscuro (el papel sigue blanco)", "body": editor("full"), "w": 1440, "h": 1280, "dark": True},
        {"file": "documents-palette.dc.html", "title": "Añadir bloque · solo lo que un contrato admite", "body": editor("full", with_palette=True), "w": 1440, "h": 1400},
        {"file": "documents-clauses.dc.html", "title": "Cláusulas · se editan bajo su fila", "body": editor("clauses", mark="clauses"), "w": 1440, "h": 1620},
        {"file": "documents-bad-variable.dc.html", "title": "Variable desconocida · la hoja espera", "body": editor("bad", sheet_mode="frozen", mark="clauses"), "w": 1440, "h": 1680},
        {"file": "documents-offline.dc.html", "title": "Sin conexión · la última versión buena", "body": editor("full", sheet_mode="error"), "w": 1440, "h": 1400},
        {"file": "documents-switch.dc.html", "title": "Cambiar de tipo con cambios", "body": with_modal(editor("full"), modal_switch()), "w": 1440, "h": 1400},
        {"file": "documents-reset.dc.html", "title": "Restablecer · el historial no se borra", "body": with_modal(editor("full"), modal_reset()), "w": 1440, "h": 1400},
        {"file": "documents-issuer.dc.html", "title": "Emisor y numeración", "body": settings(), "w": 1440, "h": 1400},
        {"file": "documents-disabled.dc.html", "title": "Sin la función", "body": disabled(), "w": 1440, "h": 560},
        {"file": "documents-mobile.dc.html", "title": "Móvil · la hoja debajo, ajustada al ancho", "body": mobile(), "w": 460, "h": 760},
    ])
