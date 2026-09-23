#!/usr/bin/env python3
"""Mockup «Documentos en el pedido» (cobros_frontend_plan.md §`documents`, F8) — versión premium.

La idea que ordena estas pantallas: **un documento emitido es un hecho con número, y se ve como
papel**. No es un adjunto ni un botón de «descargar PDF»: es un papel que salió con consecutivo,
con fecha y con los datos que el negocio sabía ese día. De ahí:

1. **El papelito.** Cada fila lleva una miniatura blanca de hoja —blanca también en oscuro, como la
   hoja de F7— con la línea de acento del tipo. Es el elemento memorable; lo demás es tipografía.
2. **Una fila, una acción.** «Ver» abre el PDF (URL firmada fresca). Lo demás vive en «…»: regenerar,
   copiar el número, y (F9) enviar. Ni un botón deshabilitado en pantalla.
3. **«Emitir» es un popover que dice lo que va a salir**: el tipo, para qué sirve, y el número que
   tomará. Lo que ya existe se dice con su número —el contrato es uno por reserva—, no se duplica.
4. **El momento completo está dibujado**: emitir → generando (la hoja se rellena) → listo (aviso
   discreto con «Ver») → enviar (F9). La experiencia es esa transición, no la lista.
5. **Los estados se leen sin color de fondo.** Generando = barra fina que avanza bajo la fila;
   fallido = una frase con el motivo y «Reintentar» (mismo número); desactualizado = el hecho en
   ámbar y la acción honesta para ese tipo; reemplazado = atenuado pero archivado.
6. **El papel también vive con la persona**: card «Pedidos y documentos» del 360, misma lista.
7. **Quien no puede emitir, ve.** Sin `documents:manage` la sección existe igual, sin «Emitir».

Uso:  python3 order-rail-documents.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("order-rail-documents")
ic, btn, badge = K.ic, K.btn, K.badge

EXTRA_CSS = """
/* ── Página del pedido: contenido + rail (idioma de F3) ─────────────────── */
.split{display:grid;grid-template-columns:minmax(0,1fr) 420px;min-height:100%}
.content{padding:28px 34px 40px;display:flex;flex-direction:column;gap:24px}
.page-head h1{font-size:26px;letter-spacing:-.02em;font-family:var(--font-body);font-weight:600}
.page-head .sub{font-size:13.5px;color:var(--muted-foreground);margin-top:3px}
.section-title{font-size:15px;font-weight:600;letter-spacing:-.01em}
.section-sub{font-size:13px;color:var(--muted-foreground);margin-top:2px;max-width:60ch;line-height:1.55}
.sheet{width:420px;border-left:1px solid var(--border);background:var(--background);display:flex;flex-direction:column;min-height:100%;position:relative}
.sheet-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:22px 26px 0}
.sheet-top .id{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground);letter-spacing:.01em}
.sheet-top .who{font-size:17px;font-weight:600;letter-spacing:-.012em;margin-top:2px}
.sheet-top .where{font-size:12.5px;color:var(--muted-foreground);margin-top:2px}
.sheet-body{padding:0 26px 26px;display:flex;flex-direction:column;gap:24px}
.headline{padding-top:20px}
.headline .lede{font-size:13px;color:var(--muted-foreground)}
.headline .amount{font-family:var(--font-heading);font-size:40px;line-height:1.05;letter-spacing:-.025em;font-variant-numeric:tabular-nums;margin-top:4px}
.headline .of{font-size:13px;color:var(--muted-foreground);margin-top:6px;font-variant-numeric:tabular-nums}
.headline .of b{color:var(--foreground);font-weight:500}
.meter{height:6px;border-radius:999px;margin-top:14px;overflow:hidden;background:linear-gradient(90deg,var(--axi-brand) 0 30%,var(--background) 30% 30.5%,var(--secondary) 30.5% 100%)}

/* ── Sección: título en mayúsculas pequeñas como el rail real ──────────── */
.rsec{display:flex;flex-direction:column;gap:10px}
.rsec-h{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px}
.rsec-h h3{font-family:var(--font-body);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600}
.rsec-h .btn.xs{height:28px;padding:0 11px;font-size:12.5px;border-radius:999px}
.rsec-h .btn.xs.outline{border-color:var(--border)}

/* ── Lista agrupada ────────────────────────────────────────────────────── */
.group{border:1px solid var(--border);border-radius:18px;overflow:hidden;background:var(--background)}
.row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 16px;position:relative}
.row + .row::before{content:"";position:absolute;left:56px;right:0;top:0;height:1px;background:var(--border-soft)}
.row .dot{width:8px;height:8px;border-radius:50%;justify-self:center}
.row .dot.ok{background:var(--axi-success)} .row .dot.off{background:var(--border)}
.row .t{font-size:14px;font-weight:500}
.row .m{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.row .v{font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;text-align:right}
.row .v small{display:block;font-size:11.5px;font-weight:400;color:var(--muted-foreground);margin-top:1px}

/* ── El papelito: blanco también en oscuro, con la línea del tipo ──────── */
.paper{width:30px;height:38px;background:#fff;border:1px solid #e4e4e7;border-radius:3px;position:relative;box-shadow:0 1px 2px rgb(0 0 0/.08),0 4px 10px rgb(0 0 0/.08);flex:none;overflow:hidden}
.paper::before{content:"";position:absolute;left:5px;right:5px;top:6px;height:2px;background:var(--pa,#e65759);border-radius:1px}
.paper::after{content:"";position:absolute;left:5px;right:9px;top:12px;height:18px;background:repeating-linear-gradient(#e4e4e7 0 1.5px,transparent 1.5px 4.5px)}
.paper.busy::after{background:repeating-linear-gradient(#f1f1f3 0 1.5px,transparent 1.5px 4.5px)}
.paper.busy .fill{position:absolute;left:5px;right:9px;top:12px;height:0;overflow:hidden;background:repeating-linear-gradient(#e4e4e7 0 1.5px,transparent 1.5px 4.5px);animation:fillpaper 2.4s ease-in-out infinite}
@keyframes fillpaper{0%{height:0}70%{height:18px}100%{height:18px}}
.paper.bad::before{background:var(--axi-destructive)}
.paper.bad .x{position:absolute;right:-1px;bottom:-1px;width:14px;height:14px;border-radius:7px 0 3px 0;background:var(--axi-destructive);color:#fff;display:grid;place-items:center}
.paper.gone{opacity:.55;transform:rotate(-3deg)}
.paper.empty::before,.paper.empty::after{opacity:.35}

/* ── La fila del documento ─────────────────────────────────────────────── */
.doc{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:14px;align-items:center;padding:13px 16px;position:relative}
.doc + .doc::before{content:"";position:absolute;left:60px;right:0;top:0;height:1px;background:var(--border-soft)}
.doc .t{font-size:14.5px;font-weight:500;display:flex;align-items:center;gap:8px;letter-spacing:-.005em}
.doc .t .chk{color:var(--axi-success);display:inline-flex}
.doc .m{font-size:12.5px;color:var(--muted-foreground);margin-top:3px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-variant-numeric:tabular-nums}
.doc .m .num{font-family:var(--font-mono);font-size:12px;letter-spacing:.01em;color:var(--foreground);opacity:.8}
.doc .m .sep{opacity:.45}
.doc .m .st{display:inline-flex;align-items:center;gap:5px;font-weight:500}
.doc .m .st.busy{color:var(--axi-info)} .doc .m .st.bad{color:var(--axi-destructive)} .doc .m .st.old{color:var(--axi-warning)}
.doc .acts{display:flex;gap:2px;align-items:center}
.doc .acts .btn.xs{height:30px;padding:0 11px;font-size:13px;border-radius:999px;color:var(--foreground)}
.doc .acts .btn.icon.xs{width:30px;padding:0;color:var(--muted-foreground)}
.doc .acts .btn.xs.outline{border-color:var(--border)}
.doc.dim .t,.doc.dim .m{opacity:.6}
.doc .why{grid-column:2 / -1;display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--muted-foreground);line-height:1.5;margin-top:2px}
.doc .why .ic{flex:none;margin-top:2px}
.doc .why.old .ic{color:var(--axi-warning)} .doc .why.bad .ic{color:var(--axi-destructive)}
.doc .why b{color:var(--foreground);font-weight:500}
.doc .why .btn.xs{height:26px;padding:0 9px;font-size:12px;border-radius:999px;margin-left:auto;flex:none}
.doc .prog{grid-column:1 / -1;height:2px;border-radius:2px;background:var(--secondary);overflow:hidden;margin:2px 0 -4px}
.doc .prog i{display:block;height:100%;width:40%;background:var(--axi-info);border-radius:2px;animation:slide 1.6s ease-in-out infinite}
@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(260%)}}
.gfoot{padding:11px 16px 13px;font-size:12px;color:var(--muted-foreground);line-height:1.5;border-top:1px solid var(--border-soft)}
.gfoot b{color:var(--foreground);font-weight:500}
.gvoid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:center;padding:18px 18px 20px}
.gvoid .stack{position:relative;width:44px;height:52px}
.gvoid .stack .paper{position:absolute;left:0;top:6px}
.gvoid .stack .paper:nth-child(2){left:8px;top:0;transform:rotate(4deg)}
.gvoid .t{font-size:14.5px;font-weight:500;letter-spacing:-.005em}
.gvoid .s{font-size:12.5px;color:var(--muted-foreground);margin-top:3px;line-height:1.5}
.gvoid .s b{color:var(--foreground);font-weight:500}

/* ── Menú «…» de la fila y popover «Emitir» ────────────────────────────── */
.pop{position:absolute;border:1px solid var(--border);border-radius:18px;background:color-mix(in srgb, var(--background) 92%, transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:var(--shadow-overlay);padding:8px;z-index:6}
.pop .ph{font-size:11.5px;color:var(--muted-foreground);padding:8px 12px 6px;font-weight:500;letter-spacing:.02em}
.mi{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;width:100%;text-align:left}
.mi:hover{background:var(--secondary)}
.mi .t{font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px}
.mi .d{font-size:12.5px;color:var(--muted-foreground);line-height:1.45;margin-top:1px}
.mi .num{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground);white-space:nowrap;display:flex;align-items:center;gap:6px}
.mi .num .ic{opacity:.6}
.mi.done .t .chk{color:var(--axi-success);display:inline-flex}
.mi.done .num{color:var(--foreground)}
.pop .msep{height:1px;background:var(--border-soft);margin:6px 8px}
.pop .mnote{font-size:12px;color:var(--muted-foreground);padding:6px 12px 8px;line-height:1.5}
.pop .mnote b{color:var(--foreground);font-weight:500}
.kmenu{width:236px;padding:6px}
.kmenu .mi{grid-template-columns:18px minmax(0,1fr);padding:9px 12px}
.kmenu .mi .ic{color:var(--muted-foreground)}
.kmenu .mi.off{opacity:.5}
.kmenu .mi .d{font-size:11.5px}

/* ── Aviso discreto (glass) ────────────────────────────────────────────── */
.toast{width:360px;grid-template-columns:30px 1fr auto;align-items:center;border-radius:18px}
.toast .paper{width:24px;height:30px}
.toast b{font-size:13.5px} .toast small{display:block;margin-top:1px}
.toast .btn.xs{height:28px;border-radius:999px;padding:0 11px;font-size:12.5px}
.toast.warn .ic{color:var(--axi-warning)}

/* ── El momento: tres recortes del rail, uno al lado del otro ──────────── */
.flow{display:grid;grid-template-columns:repeat(3,420px);gap:56px;padding:40px 60px;justify-content:center;align-items:start}
.flow .step{display:flex;flex-direction:column;gap:14px}
.flow .cap{display:flex;gap:12px;align-items:flex-start}
.flow .cap .n{width:26px;height:26px;border-radius:50%;background:var(--accent);display:grid;place-items:center;font-size:12.5px;font-weight:600;flex:none}
.flow .cap .t{font-size:15px;font-weight:600;letter-spacing:-.01em}
.flow .cap .s{font-size:13px;color:var(--muted-foreground);margin-top:2px;line-height:1.55}
.flow .crop{border:1px solid var(--border);border-radius:22px;background:var(--background);padding:22px 22px 26px;display:flex;flex-direction:column;gap:20px;position:relative;box-shadow:var(--shadow-float)}
.flow .crop .headline{padding-top:0}
.flow .crop .headline .amount{font-size:32px}
.flow .arrow{position:absolute;right:-44px;top:50%;transform:translateY(-50%);color:var(--muted-foreground)}
.flow .toast{position:static;width:auto;margin-top:2px}
.flow-note{font-size:13px;color:var(--muted-foreground);text-align:center;padding:0 60px 40px;max-width:900px;margin:0 auto;line-height:1.6}
.flow-note b{color:var(--foreground);font-weight:500}

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

/* ── Ficha del contacto (360) ──────────────────────────────────────────── */
.wrap{max-width:1200px;margin:0 auto;padding:28px 32px 72px;display:flex;flex-direction:column;gap:18px}
.crumbs{font-size:13px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center}
.crumbs b{color:var(--foreground);font-weight:500}
.c360{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.c360 .col{display:flex;flex-direction:column;gap:16px}
.card{border:1px solid var(--border);border-radius:18px;background:var(--background);padding:22px 24px}
.card h3{font-family:var(--font-body);font-size:16px;font-weight:600;letter-spacing:-.01em;display:flex;align-items:center;gap:8px}
.card h3 .n{font-size:14px;font-weight:400;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
.card .chead{display:flex;align-items:center;justify-content:space-between;gap:10px}
.who{display:flex;align-items:center;gap:14px}
.who .av{width:52px;height:52px;border-radius:50%;background:var(--accent);display:grid;place-items:center;font-weight:600;color:var(--foreground)}
.who .nm{font-size:20px;font-weight:600;letter-spacing:-.015em}
.who .sub{font-size:13px;color:var(--muted-foreground);margin-top:2px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.fl{display:grid;grid-template-columns:130px minmax(0,1fr);gap:8px 12px;font-size:13.5px;margin-top:16px}
.fl dt{color:var(--muted-foreground)} .fl dd{margin:0;font-weight:500}
.ord{padding:14px 0;position:relative}
.ord + .ord::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:var(--border-soft)}
.ord .oh{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
.ord .oh .t{font-size:14.5px;font-weight:500;display:flex;gap:8px;align-items:center;flex-wrap:wrap;letter-spacing:-.005em}
.ord .oh .t .id{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground);font-weight:400}
.ord .oh .s{font-size:12.5px;color:var(--muted-foreground);margin-top:2px;font-variant-numeric:tabular-nums}
.ord .oh .s b{color:var(--foreground);font-weight:500}
.ord .mini{height:4px;border-radius:999px;margin-top:10px;background:linear-gradient(90deg,var(--axi-brand) 0 var(--p,30%),var(--secondary) var(--p,30%) 100%)}
.ord .mini.full{background:var(--axi-success)}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.chip{display:inline-flex;align-items:center;gap:9px;height:40px;padding:0 12px 0 8px;border:1px solid var(--border);border-radius:12px;background:var(--background);font-size:13px;font-weight:500;text-decoration:none}
.chip:hover{background:var(--secondary)}
.chip .paper{width:20px;height:26px;border-radius:2px}
.chip .paper::before{top:4px;left:3px;right:3px} .chip .paper::after{top:8px;left:3px;right:6px;height:12px}
.chip .num{font-family:var(--font-mono);font-size:11.5px;color:var(--muted-foreground);font-weight:400}
.chip.ghost{border-style:dashed;color:var(--muted-foreground);font-weight:400}
.deal{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;position:relative}
.deal .t{font-size:14px;font-weight:500} .deal .s{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.deal .v{font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:8px}

/* ── Ajustes: «Siguiente número» ───────────────────────────────────────── */
.setwrap{max-width:1360px;margin:0 auto;padding:40px 40px 80px;display:flex;flex-direction:column;gap:26px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px}
.topbar .ttl{font-size:19px;font-weight:600;letter-spacing:-.015em}
.two{display:grid;grid-template-columns:minmax(0,600px) minmax(0,1fr);gap:34px;align-items:start}
.set-title{font-size:13px;color:var(--muted-foreground);padding:0 4px 9px;font-weight:500;display:flex;align-items:center;gap:8px}
.set-title .n{margin-left:auto;font-variant-numeric:tabular-nums}
.set-note{font-size:12.5px;color:var(--muted-foreground);padding:10px 4px 0;line-height:1.55;max-width:64ch}
.set-note b{color:var(--foreground);font-weight:500}
.set{border:1px solid var(--border);border-radius:18px;background:var(--background);overflow:hidden}
.nh{display:grid;grid-template-columns:minmax(0,1fr) 84px 130px 170px;gap:12px;padding:12px 18px 6px;font-size:11.5px;color:var(--muted-foreground);letter-spacing:.02em}
.nh span:not(:first-child){text-align:right}
.pfx{display:grid;grid-template-columns:minmax(0,1fr) 84px 130px 170px;gap:12px;align-items:center;padding:11px 18px;position:relative;font-size:14px}
.pfx + .pfx::before{content:"";position:absolute;left:18px;right:0;top:0;height:1px;background:var(--border-soft)}
.pfx .k{display:flex;align-items:center;gap:12px}
.pfx .k .paper{width:22px;height:28px;border-radius:2px} .pfx .k .paper::before{top:4px;left:3px;right:3px} .pfx .k .paper::after{top:8px;left:3px;right:6px;height:13px}
.pfx .input{height:34px;font-family:var(--font-mono);font-size:12.5px}
.pfx .input.pre{text-transform:uppercase}
.pfx .input.num{text-align:right;justify-content:flex-end}
.pfx .input.readonly{background:var(--secondary);color:var(--muted-foreground);border-color:transparent}
.pfx .ex{font-family:var(--font-mono);font-size:12.5px;color:var(--muted-foreground);text-align:right}
.pfx .ex b{color:var(--foreground);font-weight:500}
.pfx .lock{display:inline-flex;justify-self:end;align-items:center;gap:6px;font-size:12px;color:var(--muted-foreground);white-space:nowrap;height:26px;padding:0 10px;border-radius:999px;background:var(--secondary)}
.pfx.off{opacity:.55}
.savebar{display:flex;justify-content:flex-end;gap:8px;padding-top:6px}
.side-note{border:1px solid var(--border);border-radius:18px;padding:20px 22px;font-size:13.5px;line-height:1.6;color:var(--muted-foreground);position:sticky;top:24px}
.side-note h4{font-family:var(--font-body);font-size:14px;font-weight:600;letter-spacing:0;color:var(--foreground);margin-bottom:6px;display:flex;gap:8px;align-items:center}
.side-note b{color:var(--foreground);font-weight:500}
.side-note .ex{font-family:var(--font-mono);font-size:12.5px;background:var(--secondary);border-radius:6px;padding:1px 6px;color:var(--foreground)}

/* ── Móvil: el rail es un sheet, «Emitir» es una hoja de acciones ──────── */
.mobile{width:390px;min-height:844px;margin:0 auto;background:var(--background);display:flex;flex-direction:column;position:relative;border:1px solid var(--border);border-radius:34px;overflow:hidden}
.mobile .m-top{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 10px}
.mobile .m-top .id{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground)}
.mobile .m-top .who{font-size:17px;font-weight:600;letter-spacing:-.012em;margin-top:2px}
.mobile .m-body{padding:0 16px 24px;display:flex;flex-direction:column;gap:18px}
.mobile .headline .amount{font-size:34px}
.mobile .doc{padding:12px 14px;grid-template-columns:30px minmax(0,1fr) auto}
.mobile .doc + .doc::before{left:58px}
.mobile .doc .acts .btn.xs{padding:0 9px}
.mobile .btn.block{width:100%;height:46px;border-radius:14px;font-size:14.5px}
.grab{width:36px;height:4px;border-radius:999px;background:var(--border);margin:10px auto 0}
.asheet{position:absolute;left:0;right:0;bottom:0;background:color-mix(in srgb, var(--background) 94%, transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:1px solid var(--border);border-radius:28px 28px 0 0;padding:10px 12px 22px;box-shadow:var(--shadow-overlay);z-index:6}
.asheet .ph{font-size:12px;color:var(--muted-foreground);text-align:center;padding:8px 0 10px;font-weight:500}
.asheet .mi{padding:12px 12px}
.asheet .cancel{margin-top:8px;width:100%;height:46px;border-radius:14px}
.scrim{position:absolute;inset:0;background:var(--scrim);z-index:5}
"""

TOTAL = "$ 21.703.150"
SALDO = "$ 15.192.205"
ABONO = "$ 6.510.945"

ACCENT = {"Contrato": "#e65759", "Cuenta de cobro": "#7c3aed", "Estado de cuenta": "#2563eb", "Recibo": "#16a34a",
          "Cotización": "#f0a431", "Propuesta": "#0891b2", "Factura / documento comercial": "#71717a"}


def paper(kind: str, mode: str = "") -> str:
    inner = '<span class="fill"></span>' if mode == "busy" else (f'<span class="x">{ic("x", size=9)}</span>' if mode == "bad" else "")
    return f'<span class="paper {mode}" style="--pa:{ACCENT.get(kind, "#e65759")}" aria-hidden="true">{inner}</span>'


def act(label: str, icon: str = "", cls: str = "ghost", aria: str = "") -> str:
    attrs = f'aria-label="{aria}"' if aria else ""
    return btn(label, icon, f"{cls} xs" + (" icon" if not label else ""), attrs)


VER = act("Ver", "", "outline")
MORE = act("", "ellipsis", aria="Más acciones")


def doc(kind: str, num: str, when: str, state: str = "ok", extra: str = "", acts: str = "",
        cls: str = "", why: str = "", why_icon: str = "", why_act: str = "") -> str:
    chk = f'<span class="chk">{ic("circle-check", size=14)}</span>' if state == "ok" else ""
    st = {
        "ok": "", "busy": '<span class="st busy">Generando…</span>',
        "bad": '<span class="st bad">No se pudo generar</span>',
        "old": '<span class="st old">Desactualizado</span>',
        "gone": '<span class="st">Reemplazado</span>',
    }[state]
    parts = [f'<span class="num">{num}</span>', f'<span class="sep">·</span>{when}']
    if extra:
        parts.append(f'<span class="sep">·</span>{extra}')
    if st:
        parts.append(f'<span class="sep">·</span>{st}')
    w = f'<div class="why {state}">{ic(why_icon or "info", size=14)}<span>{why}</span>{why_act}</div>' if why else ""
    prog = '<div class="prog"><i></i></div>' if state == "busy" else ""
    return f"""<div class="doc {cls}">
      {paper(kind, "busy" if state == "busy" else "bad" if state == "bad" else "gone" if state == "gone" else "")}
      <div><p class="t">{kind}{chk}</p><p class="m">{"".join(parts)}</p></div>
      <div class="acts">{acts}</div>
      {w}{prog}
    </div>"""


def docs_section(variant: str = "full", can_manage: bool = True, menu_open: bool = False, kebab_open: bool = False) -> str:
    emitir = btn("Emitir", "plus", "outline xs", f'aria-haspopup="menu" aria-expanded="{str(menu_open).lower()}"') if can_manage else ""
    head = f'<div class="rsec-h"><h3>Documentos</h3>{emitir}</div>'
    both = VER + (MORE if can_manage else "")
    rows, foot = "", ""
    if variant == "full":
        rows = "".join([
            doc("Contrato", "CTR-2026-0120", "16 sep", "ok", "2 págs.", both),
            doc("Cuenta de cobro", "CC-2026-0001", "17 sep", "ok", "", both),
            doc("Estado de cuenta", "EDC-2026-0003", "hoy, 9:12", "busy", "", ""),
        ])
        foot = '<p class="gfoot">Cada papel sale con los datos del pedido <b>de ese día</b>. Si el pedido cambia después, aquí se dice.</p>'
    elif variant == "states":
        rows = "".join([
            doc("Estado de cuenta", "EDC-2026-0003", "hoy, 9:12", "busy", "", ""),
            doc("Cuenta de cobro", "CC-2026-0002", "hoy, 9:10", "bad", "", "",
                why="El generador no respondió a tiempo. Reintentar vuelve a producir <b>el mismo número</b>; tras tres intentos, la salida es regenerar.",
                why_icon="triangle-alert", why_act=act("Reintentar", "rotate-ccw", "outline") if can_manage else ""),
            doc("Contrato", "CTR-2026-0120", "16 sep", "old", "2 págs.", both,
                why="La salida cambió al <b>21 de marzo</b> el 19 sep, después de este contrato. Regenerar repite el papel con los mismos datos: el contrato es <b>uno por reserva</b>.",
                why_icon="history"),
            doc("Contrato", "CTR-2026-0118", "16 sep", "gone", "", VER, cls="dim",
                why="Reemplazado por CTR-2026-0120. Sigue archivado: pudo haberse enviado.", why_icon="archive"),
        ])
    elif variant == "empty":
        rows = f"""<div class="gvoid"><span class="stack">{paper("Cuenta de cobro", "empty")}{paper("Contrato", "empty")}</span>
          <div><p class="t">Todavía no hay papeles de esta reserva</p>
          <p class="s">Emite el <b>contrato</b> cuando quieras. El <b>recibo</b> llegará solo con cada pago verificado.</p></div></div>"""
    elif variant == "readonly":
        rows = "".join([
            doc("Contrato", "CTR-2026-0120", "16 sep", "ok", "2 págs.", VER),
            doc("Cuenta de cobro", "CC-2026-0001", "17 sep", "ok", "", VER),
        ])
        foot = '<p class="gfoot">Puedes abrir y enviar los papeles. Emitir uno nuevo es de <b>supervisión</b>: gasta un consecutivo.</p>'
    kebab = kebab_menu() if kebab_open else ""
    return f'<section class="rsec" aria-label="Documentos" style="position:relative">{head}<div class="group">{rows}{foot}</div>{kebab}</section>'


def kebab_menu() -> str:
    return f"""<div class="pop kmenu" role="menu" aria-label="Acciones del contrato" style="right:0;top:104px">
      <button class="mi" role="menuitem">{ic("rotate-ccw", size=15)}<span><span class="t">Regenerar</span><span class="d">Mismos datos, número nuevo</span></span></button>
      <button class="mi" role="menuitem">{ic("copy", size=15)}<span><span class="t">Copiar número</span><span class="d">CTR-2026-0120</span></span></button>
      <div class="msep"></div>
      <button class="mi off" role="menuitem">{ic("send", size=15)}<span><span class="t">Enviar a Laura</span><span class="d">Llega con la fase de envíos</span></span></button>
    </div>"""


def emit_menu(top: str = "396px", right: str = "26px") -> str:
    return f"""<div class="pop" role="menu" aria-label="Emitir documento" style="top:{top};right:{right};width:340px">
      <p class="ph">Emitir para la reserva JX-0042</p>
      <button class="mi done" role="menuitem">{paper("Contrato")}
        <span><span class="t">Contrato<span class="chk">{ic("circle-check", size=14)}</span></span><span class="d">Ya emitido · uno por reserva</span></span><span class="num">CTR-2026-0120</span></button>
      <button class="mi" role="menuitem">{paper("Estado de cuenta")}
        <span><span class="t">Estado de cuenta</span><span class="d">Total, cobrado, cuotas y saldo a hoy</span></span><span class="num">{ic("arrow-right", size=13)}EDC-2026-0004</span></button>
      <button class="mi" role="menuitem">{paper("Cuenta de cobro")}
        <span><span class="t">Cuenta de cobro</span><span class="d">Por el saldo de {SALDO}</span></span><span class="num">{ic("arrow-right", size=13)}CC-2026-0002</span></button>
      <div class="msep"></div>
      <p class="mnote">El <b>recibo</b> no se emite a mano: sale solo con cada pago verificado. El PDF tarda unos segundos; la fila avisa cuando está.</p>
    </div>"""


def payments_group() -> str:
    return f"""<section class="rsec" aria-label="Pagos">
      <div class="rsec-h"><h3>Pagos</h3>{btn("Registrar pago", "receipt", "ghost xs")}</div>
      <div class="group">
        <div class="row"><span class="dot ok"></span><div><p class="t">Bancolombia</p><p class="m">16 sep · verificado por Isabel</p></div><p class="v">{ABONO}</p></div>
      </div>
    </section>"""


def headline() -> str:
    return f"""<div class="headline">
      <p class="lede">Falta por cobrar</p>
      <p class="amount">{SALDO}</p>
      <p class="of">de {TOTAL} · <b>30 %</b> cobrado</p>
      <div class="meter" role="img" aria-label="Cobrado el 30 por ciento"></div>
    </div>"""


def sheet(variant: str = "full", can_manage: bool = True, menu_open: bool = False, kebab_open: bool = False, toast: str = "") -> str:
    menu = emit_menu() if menu_open else ""
    return f"""<aside class="sheet" aria-label="Pedido JX-0042">
      <div class="sheet-top">
        <div><p class="id">JX-0042</p><p class="who">Laura Gómez</p><p class="where">Expedición Cocuy · 2 cupos · sale el 14 mar</p></div>
        {badge("Abonado", "warn")}
      </div>
      <div class="sheet-body">
        {headline()}
        {payments_group()}
        {docs_section(variant, can_manage, menu_open, kebab_open)}
        <p class="origin">Cotizado en <b>US$ 7.000</b>. El total quedó fijo el 16 de septiembre a <b>3.100,45</b> por dólar.</p>
      </div>
      {menu}{toast}
    </aside>"""


def activity() -> str:
    rows = [
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
      <p class="section-sub">Los papeles no escriben en el timeline del pedido: viven en su sección, con su número. Aquí sigue el dinero.</p>
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


def order_page(variant: str = "full", can_manage: bool = True, menu_open: bool = False, kebab_open: bool = False, toast: str = "") -> str:
    return f"""<div class="split" style="position:relative;min-height:1000px">
      <div class="content">
        <div class="page-head"><h1>Pedido JX-0042</h1><p class="sub">Laura Gómez · llegó por WhatsApp el 16 de septiembre</p></div>
        {items()}
        {activity()}
      </div>
      {sheet(variant, can_manage, menu_open, kebab_open, toast)}
    </div>"""


def ready_toast(pos: str = "position:absolute;left:26px;right:26px;bottom:22px;width:auto") -> str:
    return f"""<div class="toast ok" role="status" style="{pos}">{paper("Contrato")}
      <div><b>Contrato CTR-2026-0120 listo</b><small>2 páginas · con los datos de hoy</small></div>{act("Ver", "", "outline")}</div>"""


def failed_toast() -> str:
    return f"""<div class="toast warn" role="status" style="position:absolute;left:26px;right:26px;bottom:22px;width:auto;grid-template-columns:20px 1fr">{ic("triangle-alert", size=16)}
      <div><b>No se pudo generar cuenta de cobro CC-2026-0002</b><small>Reintenta desde el pedido; el número se conserva.</small></div></div>"""


# ----------------------------------------------------------------------------- el momento
def flow() -> str:
    def crop(body: str, arrow: bool = True) -> str:
        a = f'<span class="arrow">{ic("arrow-right", size=22)}</span>' if arrow else ""
        return f'<div class="crop">{body}{a}</div>'

    step1 = crop(headline() + docs_section("empty", True, False).replace('style="position:relative"', 'style="position:relative"') +
                 emit_menu("112px", "22px").replace('style="top:112px;right:22px;width:340px"', 'style="position:static;width:auto;margin-top:-6px"'))
    step2 = crop(headline() + f"""<section class="rsec" aria-label="Documentos"><div class="rsec-h"><h3>Documentos</h3>{btn("Emitir", "plus", "outline xs")}</div>
      <div class="group">{doc("Contrato", "CTR-2026-0120", "ahora", "busy", "", "")}</div></section>
      <p class="origin">El número ya es suyo: se asignó al emitir, antes de que exista el PDF. Si algo falla, el papel conserva su consecutivo.</p>""")
    step3 = crop(headline() + f"""<section class="rsec" aria-label="Documentos"><div class="rsec-h"><h3>Documentos</h3>{btn("Emitir", "plus", "outline xs")}</div>
      <div class="group">{doc("Contrato", "CTR-2026-0120", "ahora", "ok", "2 págs.", VER + MORE)}</div></section>
      {ready_toast("position:static")}""", arrow=False)
    return f"""<div class="flow">
      <div class="step"><div class="cap"><span class="n">1</span><div><p class="t">Emitir</p><p class="s">El popover dice qué va a salir y con qué número. Un clic; no hay formulario.</p></div></div>{step1}</div>
      <div class="step"><div class="cap"><span class="n">2</span><div><p class="t">Generando</p><p class="s">La fila aparece al instante con su número; el papelito se rellena mientras el servidor pinta el PDF (segundos).</p></div></div>{step2}</div>
      <div class="step"><div class="cap"><span class="n">3</span><div><p class="t">Listo</p><p class="s">La fila cambia sola —sin recargar— y un aviso discreto ofrece «Ver». Enviárselo a Laura llega con la fase de envíos.</p></div></div>{step3}</div>
    </div>
    <p class="flow-note">Lo que <b>no</b> pasa: no hay pantalla de generación, ni barra modal, ni «descargando…». El PDF se abre con una URL firmada de cinco minutos, fresca en cada clic, así que un enlace copiado no sirve mañana.</p>"""


# ----------------------------------------------------------------------------- 360
def contact_360() -> str:
    def chip(kind: str, num: str) -> str:
        return f'<a class="chip" href="#">{paper(kind)}<span>{kind}<span class="num"> {num}</span></span></a>'

    def order_block(oid: str, name: str, saldo: str, total: str, when: str, chips: str, chipb: str, pct: str, full: bool = False) -> str:
        return f"""<div class="ord">
          <div class="oh"><div><p class="t"><span class="id">{oid}</span>{name}{chipb}</p><p class="s">{saldo} · {when}</p></div>{act("Abrir pedido", "external-link")}</div>
          <div class="mini{' full' if full else ''}" style="--p:{pct}"></div>
          <div class="chips">{chips}</div>
        </div>"""
    d1 = chip("Contrato", "CTR-2026-0120") + chip("Cuenta de cobro", "CC-2026-0001")
    d2 = f'<span class="chip ghost">{ic("file-text", size=15)}Sin papeles · se emiten desde el pedido</span>'
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
              {order_block("JX-0042", "Expedición Cocuy", f"Falta <b>{SALDO}</b> de {TOTAL}", TOTAL, "sale el 14 mar", d1, badge("Abonado", "warn"), "30%")}
              {order_block("JX-0031", "Expedición Egipto", "<b>Pagado</b> · $ 14.200.000", "$ 14.200.000", "viajó el 2 may", d2, badge("Pagado", "ok"), "100%", full=True)}
            </div>
            <p class="gfoot" style="border-top:0;padding:14px 0 0">Es la <b>misma lista</b> que ve el pedido, filtrada por persona: un papel se archiva a su nombre y sobrevive al pedido.</p>
          </section>
        </div>
      </div>
    </div>"""


# ----------------------------------------------------------------------------- ajustes
def settings_next() -> str:
    def row(kind: str, pre: str, ph: str, nxt: str, started: str, ex: str, off: bool = False) -> str:
        k = f'<span class="k">{paper(kind)}<span>{kind}{"<div class=\"small muted\">Todavía no se emite: sin conexión fiscal</div>" if off else ""}</span></span>'
        if off:
            return f'<div class="pfx off">{k}{K.input("", ph, "pre")}<span class="ex">—</span><span class="ex">—</span></div>'
        if started:
            return f'<div class="pfx">{k}{K.input(pre, ph, "pre")}{K.input(nxt, "", "num readonly")}<span class="lock">{ic("lock", size=12)}{started}</span></div>'
        return f'<div class="pfx">{k}{K.input(pre, ph, "pre")}{K.input(nxt, "1", "num")}<span class="ex">{ex}</span></div>'
    rows = "".join([
        row("Contrato", "CTR", "CTR", "121", "ya salió el primero", ""),
        row("Cotización", "", "COT", "1", "", "COT-2026-<b>0001</b>"),
        row("Propuesta", "", "PRO", "1", "", "PRO-2026-<b>0001</b>"),
        row("Recibo", "REC", "REC", "113", "ya salió el primero", ""),
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
          Un contrato con el número de otro no se arregla después. Por eso el estado de cuenta puede empezar hoy en <span class="ex">EDC-2026-0040</span>,
          pero el contrato —que ya salió como <span class="ex">CTR-2026-0120</span>— seguirá en <span class="ex">0121</span> aunque cambies el prefijo.
          <br><br>Si algo ya empezó, no se guarda nada a medias: el servidor lo rechaza entero y la pantalla lo dice en la fila.
        </aside>
      </div>
    </div>"""


# ----------------------------------------------------------------------------- móvil
def mobile() -> str:
    sheet_items = f"""<div class="asheet" role="menu" aria-label="Emitir documento">
      <p class="ph">Emitir para la reserva JX-0042</p>
      <button class="mi done" role="menuitem">{paper("Contrato")}<span><span class="t">Contrato<span class="chk">{ic("circle-check", size=14)}</span></span><span class="d">Ya emitido · uno por reserva</span></span><span class="num">CTR-2026-0120</span></button>
      <button class="mi" role="menuitem">{paper("Estado de cuenta")}<span><span class="t">Estado de cuenta</span><span class="d">Total, cobrado, cuotas y saldo a hoy</span></span><span class="num">{ic("arrow-right", size=13)}EDC-0004</span></button>
      <button class="mi" role="menuitem">{paper("Cuenta de cobro")}<span><span class="t">Cuenta de cobro</span><span class="d">Por el saldo de {SALDO}</span></span><span class="num">{ic("arrow-right", size=13)}CC-0002</span></button>
      {btn("Cancelar", "", "outline cancel")}
    </div>"""
    return f"""<div class="mobile">
      <div class="grab"></div>
      <div class="m-top"><div><p class="id">JX-0042</p><p class="who">Laura Gómez</p></div>{btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</div>
      <div class="m-body">
        {headline()}
        {docs_section("full", True, True)}
        {btn("Registrar pago", "receipt", "outline block")}
      </div>
      <div class="scrim"></div>
      {sheet_items}
    </div>"""


VIEWS = [
    ("pedido", "1 · En el pedido", order_page("full"),
     "El rail gana la sección Documentos después de Pagos. Cada fila lleva un papelito blanco con la línea de su tipo (blanco también en oscuro, como la hoja de F7), el nombre del papel, y debajo su número en mono, cuándo salió y cuántas páginas. Una fila, una acción: «Ver» abre el PDF con URL firmada fresca; lo demás vive en «…»."),
    ("momento", "2 · El momento", flow(),
     "La experiencia es la transición, no la lista: emitir desde el popover (que dice qué saldrá y con qué número) → la fila aparece al instante con su consecutivo mientras el papelito se rellena → cambia a lista sola, sin recargar, con un aviso discreto que ofrece «Ver». Sin pantalla de generación ni modal."),
    ("emitir", "3 · Emitir y «…»", order_page("full", menu_open=True, kebab_open=False),
     "El popover ofrece SOLO lo que se emite a mano en F8. El contrato ya existe y lo dice con su número —uno por reserva—: la idempotencia del servidor, contada antes del clic. Estado de cuenta y cuenta de cobro anuncian el número que tomarán."),
    ("acciones", "3b · Menú de la fila", order_page("full", kebab_open=True),
     "Todo lo que no es «Ver» cabe en «…»: regenerar (mismos datos, número nuevo), copiar el número y —cuando llegue F9— enviar. Lo que aún no existe se muestra atenuado con su razón, no desaparece."),
    ("estados", "4 · Estados", order_page("states", toast=failed_toast()),
     "Generando: barra fina que avanza bajo la fila y el papelito rellenándose. Fallido: el papelito marcado, una frase con el motivo y «Reintentar» (mismo número; tres rondas → regenerar). Desactualizado: el hecho en ámbar —qué cambió y cuándo— y la acción honesta para ese tipo. Reemplazado: atenuado, pero archivado."),
    ("vacio", "5 · Sin papeles", order_page("empty"),
     "El vacío es una invitación: dos papelitos en blanco, qué se puede emitir ya y qué llegará solo (el recibo, con cada pago)."),
    ("solo-ver", "6 · Solo ver", order_page("readonly", can_manage=False),
     "Sin `documents:manage` (el operador) la sección existe igual: abre y envía, pero no emite ni regenera — el pie dice por qué. Nada se pinta deshabilitado: lo que no se puede, no está."),
    ("oscuro", "7 · Oscuro", order_page("full", menu_open=True),
     "Mismos tokens; el papel sigue blanco y los estados son color de texto, nunca fondo de fila."),
    ("contacto", "8 · Ficha del contacto", contact_360(),
     "La card «Pedidos y documentos» del 360: cada pedido con su barra de cobro y sus papeles como fichas con el papelito. Es la misma lista de documentos filtrada por persona: un papel se archiva a su nombre y sobrevive al pedido."),
    ("numeracion", "9 · Siguiente número", settings_next(),
     "Mi empresa › Documentos gana la columna «Siguiente nº»: editable solo con el contador virgen; en cuanto salió el primero de un tipo, se bloquea y lo dice en su fila. El servidor rechaza entero y no guarda nada a medias."),
    ("movil", "10 · Móvil", mobile(),
     "En el móvil el rail es un sheet y «Emitir» es una hoja de acciones desde abajo, con las mismas tres opciones y el contrato ya emitido dicho igual."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("Documentos en el pedido", "Mockup F0 · no es producto", "Cobros · F8 «Render PDF, emisión manual y archivo»", VIEWS)
    K.export_artboards([
        {"file": "rail-documentos.dc.html", "title": "En el pedido · el papel es un hecho con número", "body": order_page("full"), "w": 1440, "h": 1000},
        {"file": "momento.dc.html", "title": "El momento · emitir → generando → listo", "body": flow(), "w": 1560, "h": 760},
        {"file": "rail-emitir.dc.html", "title": "Emitir · el popover dice qué saldrá y con qué número", "body": order_page("full", menu_open=True), "w": 1440, "h": 1000},
        {"file": "rail-acciones.dc.html", "title": "Menú de la fila · regenerar, copiar, enviar (F9)", "body": order_page("full", kebab_open=True), "w": 1440, "h": 1000},
        {"file": "rail-estados.dc.html", "title": "Estados · generando, fallido, desactualizado, reemplazado", "body": order_page("states", toast=failed_toast()), "w": 1440, "h": 1120},
        {"file": "rail-vacio.dc.html", "title": "Sin papeles · una invitación", "body": order_page("empty"), "w": 1440, "h": 1000},
        {"file": "rail-solo-ver.dc.html", "title": "Solo ver · sin documents:manage", "body": order_page("readonly", can_manage=False), "w": 1440, "h": 1000},
        {"file": "rail-oscuro.dc.html", "title": "Oscuro · el papel sigue blanco", "body": order_page("full", menu_open=True), "w": 1440, "h": 1000, "dark": True},
        {"file": "contacto-360.dc.html", "title": "Ficha del contacto · Pedidos y documentos", "body": contact_360(), "w": 1440, "h": 900},
        {"file": "ajustes-siguiente-numero.dc.html", "title": "Mi empresa › Documentos · Siguiente número", "body": settings_next(), "w": 1440, "h": 820},
        {"file": "movil.dc.html", "title": "Móvil · hoja de acciones", "body": mobile(), "w": 460, "h": 900},
    ])
