#!/usr/bin/env python3
"""Mockup «Galería del catálogo»: una sola galería por producto, la principal del producto y la de cada
variante elegidas desde ahí, subida reducida en el navegador y sin ningún campo «Imagen (URL)».

Plan: feat/catalog-images-gallery. Es un mockup para aprobar, no es producto.

Uso:
  python3 build.py                     → catalog-gallery.html (vistas + tema + anillo)
  (los artboards .dc.html y canvas.json salen siempre en ./project/)

Se apoya en el kit común (../_axi_mockup_kit.py): tokens literales de globals.css, iconos lucide,
fuentes del build de Next y el exportador de artboards.
"""
from __future__ import annotations

import json
import os
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import _axi_mockup_kit as kit  # noqa: E402

# El kit escribe junto a sí mismo; este mockup vive en su carpeta.
kit.S = HERE
os.environ.setdefault("AXI_MOCKUP_ARTBOARDS_DIR", str(HERE))

K = kit.Kit("catalog-gallery")
ic, btn = K.ic, K.btn

# ============================================================================ CSS propio
K.extra_css = r"""
:root{ --ring-main:var(--foreground); }
html.ring-coral, .ring-coral{ --ring-main:var(--axi-brand); }
.shell{min-height:100%}
.pg.wide{max-width:1440px}
.pg{max-width:1120px;margin:0 auto;padding:20px 24px 96px;display:flex;flex-direction:column;gap:24px}
@container (max-width: 699px){ .pg{padding:16px 16px 96px;gap:20px} }
.back{display:inline-flex;gap:6px;align-items:center;font-size:14px;font-weight:500;color:var(--muted-foreground);text-decoration:none;width:fit-content;min-height:24px}
.c3{border:1px solid var(--border);background:var(--background);border-radius:24px;padding:20px;min-width:0}
.c3 + .c3{margin-top:0}
.col{display:flex;flex-direction:column;gap:16px;min-width:0}
.sec-h{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center;min-height:36px}
.sec-h h2{font-family:var(--font-body);font-size:15px;font-weight:600;letter-spacing:0}
.sec-h h2 .n{font-weight:400;color:var(--muted-foreground)}
.sub{font-size:12px;color:var(--muted-foreground);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.btn.r{border-radius:999px}
.btn.del{background:var(--background);color:var(--axi-destructive);border-color:color-mix(in srgb, var(--axi-destructive) 40%, transparent)}
.spill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:var(--secondary);font-size:12px;font-weight:500;white-space:nowrap}
.spill .dot{width:6px;height:6px;border-radius:50%;background:var(--muted-foreground)}
.spill.ok .dot{background:var(--axi-success)} .spill.warn .dot{background:var(--axi-warning)}
.fgrid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start}
.fgrid > *{min-width:0}
@container (max-width: 899px){ .fgrid{grid-template-columns:minmax(0,1fr)} .fgrid .right{order:-1} }
.kick{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground);font-weight:500}

/* cabecera de la ficha */
.hd{display:flex;gap:20px;align-items:center}
.hd .thumb{width:112px;height:112px;border-radius:22px;flex:none}
.hd .meta{display:flex;flex-direction:column;gap:8px;min-width:0;flex:1}
.hd h1{font-size:36px;line-height:1.08}
.hd .line{display:flex;flex-wrap:wrap;gap:4px 8px;font-size:14px;color:var(--muted-foreground)}
.hd .line b{color:var(--foreground);font-weight:600;font-variant-numeric:tabular-nums}
.hd .acts{display:flex;gap:8px;flex:none}
@container (max-width: 699px){
  .hd{flex-direction:column;align-items:flex-start;gap:14px}
  .hd .thumb{width:80px;height:80px;border-radius:20px}
  .hd h1{font-size:28px}
}

/* miniatura genérica */
.thumb{position:relative;overflow:hidden;background:var(--secondary);border-radius:12px;flex:none;display:grid;place-items:center;color:var(--muted-foreground)}
.thumb > svg.img{position:absolute;inset:0;width:100%;height:100%}
.thumb.inh > svg.img{opacity:.42;filter:saturate(.6)}
.thumb.none{border:1.5px dashed color-mix(in srgb, var(--foreground) 18%, transparent);background:transparent}

/* isla de la ficha (contexto, no cambia en este plan) */
.isl{border-radius:24px;padding:20px;border:1px solid var(--border);display:flex;flex-direction:column;gap:6px;
  background:radial-gradient(circle 16rem at 92% 0%, color-mix(in srgb, var(--axi-brand) 12%, transparent), transparent 70%), color-mix(in srgb, var(--foreground) 2.5%, var(--background));}
.isl h2{font-size:22px;line-height:1.15}
.isl .it{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--border-soft)}
.isl .it .d{width:8px;height:8px;border-radius:50%;background:var(--axi-warning);flex:none;margin:0 4px}
.isl .it b{display:block;font-weight:600;font-size:14px} .isl .it span{font-size:12px;color:var(--muted-foreground)}
.isl .ok{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--muted-foreground)} .isl .ok .ic{color:var(--axi-success)}

/* filtros de la galería */
.chips{display:flex;flex-wrap:wrap;gap:6px}
@container (max-width: 520px){ .chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -20px;padding:0 20px} .chips::-webkit-scrollbar{display:none} }
.chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--border);background:var(--background);font-size:12.5px;font-weight:500;white-space:nowrap;color:var(--foreground)}
.chip .c{font-size:11px;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
.chip[aria-pressed="true"]{background:var(--foreground);border-color:var(--foreground);color:var(--background)}
.chip[aria-pressed="true"] .swt{box-shadow:0 0 0 1.5px color-mix(in srgb, var(--background) 70%, transparent)}
.chip[aria-pressed="true"] .c{color:color-mix(in srgb, var(--background) 70%, transparent)}
.swt{display:inline-block;width:10px;height:10px;border-radius:50%;flex:none;box-shadow:0 0 0 1px color-mix(in srgb, var(--foreground) 35%, transparent)}
.swt.k{background:#1E1E21} .swt.w{background:#F7F6F2}

/* bandas y rejilla */
.band{display:flex;flex-direction:column;gap:8px}
.band-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:13px}
.band-h b{font-weight:500} .band-h .cnt{font-size:12px;color:var(--muted-foreground);font-variant-numeric:tabular-nums;white-space:nowrap}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
@container (min-width: 700px){ .gal.lg{grid-template-columns:repeat(auto-fill,minmax(104px,1fr))} }
.legend{font-size:12px;color:var(--muted-foreground);line-height:1.5;display:flex;gap:8px;align-items:flex-start}
.legend .ic{margin-top:2px}

/* foto */
.pho{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;border:1px solid var(--border);background:var(--secondary);max-width:100%}
.pho > svg.img{position:absolute;inset:0;width:100%;height:100%;display:block}
.pho.main{overflow:visible;border-color:transparent}
.pho.main > svg.img{border-radius:12px}
.pho.main::after{content:"";position:absolute;inset:-3px;border-radius:15px;border:2px solid var(--ring-main);pointer-events:none}
.pho .badge-main{position:absolute;left:6px;bottom:6px;display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 8px;border-radius:999px;background:color-mix(in srgb, var(--background) 92%, transparent);color:var(--foreground);font-size:10.5px;font-weight:600;box-shadow:0 1px 2px rgb(0 0 0/.12)}
.pho .marks{position:absolute;left:6px;top:6px;display:flex;flex-wrap:wrap;gap:3px;max-width:calc(100% - 40px)}
.vm{display:inline-flex;align-items:center;gap:4px;height:18px;padding:0 6px;border-radius:999px;background:color-mix(in srgb, var(--background) 92%, transparent);color:var(--foreground);font-size:10px;font-weight:600;letter-spacing:.02em;box-shadow:0 1px 2px rgb(0 0 0/.12);white-space:nowrap}
.vm .swt{width:8px;height:8px}
.pho .more{position:absolute;right:5px;top:5px;width:26px;height:26px;border-radius:999px;background:color-mix(in srgb, var(--background) 92%, transparent);color:var(--foreground);display:grid;place-items:center;box-shadow:0 1px 2px rgb(0 0 0/.12)}
.pho .more[aria-expanded="true"]{background:var(--foreground);color:var(--background)}
.pho.add{border:1.5px dashed color-mix(in srgb, var(--foreground) 18%, transparent);background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--muted-foreground);font-size:11px;text-align:center;line-height:1.25;padding:6px}
.pho.add b{color:var(--foreground);font-weight:500}
.pho.add.off{opacity:.5}
.pho.drag{transform:rotate(-3deg) scale(1.04);box-shadow:var(--shadow-overlay);z-index:3}
.pho.slot{border:1.5px dashed var(--ring-main);background:color-mix(in srgb, var(--foreground) 4%, transparent)}
.pho .grip{position:absolute;right:5px;bottom:5px;width:22px;height:22px;border-radius:999px;display:grid;place-items:center;background:color-mix(in srgb, var(--background) 92%, transparent);color:var(--muted-foreground)}

/* estados de subida dentro de la foto */
.pho .veil{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:5px;padding:7px;background:linear-gradient(to top, rgb(0 0 0/.62), rgb(0 0 0/.08) 70%);color:#fff;font-size:10.5px;line-height:1.25}
.pho .veil b{font-weight:600;font-variant-numeric:tabular-nums}
.pho .veil.center{justify-content:center;align-items:center;text-align:center;background:rgb(0 0 0/.42)}
.pho.dim > svg.img{opacity:.55}
.bar{height:4px;border-radius:9px;background:rgb(255 255 255/.35);overflow:hidden}
.bar i{display:block;height:100%;border-radius:inherit;background:#fff}
.pho.fail{background:color-mix(in srgb, var(--axi-destructive) 8%, var(--background));border-color:color-mix(in srgb, var(--axi-destructive) 30%, transparent);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;padding:6px;font-size:10.5px;line-height:1.25;color:var(--axi-destructive)}
.pho.fail .retry{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:999px;color:var(--foreground);font-weight:500;font-size:11px;background:var(--background);border:1px solid var(--border)}
.pho.pend{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--muted-foreground);font-size:10.5px;text-align:center;padding:6px;line-height:1.25}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){ .spin{animation:none} }

/* menú, popover y hoja (flotantes: glass, DS §5.2) */
.anchor{position:relative}
.menu,.pop{position:absolute;z-index:20;border-radius:16px;border:1px solid color-mix(in srgb, var(--border) 80%, transparent);
  background:color-mix(in srgb, var(--background) 96%, transparent);-webkit-backdrop-filter:saturate(160%) blur(16px);backdrop-filter:saturate(160%) blur(16px);box-shadow:var(--shadow-overlay)}
.menu{width:236px;padding:6px;display:flex;flex-direction:column}
.mi{display:flex;align-items:center;gap:10px;height:36px;padding:0 10px;border-radius:10px;font-size:13.5px;color:var(--foreground);text-align:left;width:100%}
.mi .ic{color:var(--muted-foreground)} .mi .end{margin-left:auto;color:var(--muted-foreground)}
.mi.hl{background:var(--secondary)}
.mi.danger,.mi.danger .ic{color:var(--axi-destructive)}
.mi[aria-disabled="true"]{opacity:.45}
.msep{height:1px;background:var(--border-soft);margin:5px 4px}
.pop{width:372px;display:flex;flex-direction:column}
.pop-h{padding:14px 16px 10px;display:flex;gap:12px;align-items:flex-start}
.pop-h h3{font-family:var(--font-body);font-size:14.5px;font-weight:600;letter-spacing:0}
.pop-h p{font-size:12px;color:var(--muted-foreground);margin-top:1px}
.pop-h .thumb{width:44px;height:44px;border-radius:10px}
.pop-q{display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 8px}
.pop-q .chip{height:26px;font-size:12px;padding:0 10px}
.pop-b{padding:0 8px;display:flex;flex-direction:column;max-height:none}
.vr{display:grid;grid-template-columns:20px 36px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 8px;border-radius:12px}
.vr + .vr{border-top:1px solid var(--border-soft);border-radius:0}
.vr .thumb{width:36px;height:36px;border-radius:9px}
.vr b{font-weight:500;font-size:13.5px;display:block;white-space:nowrap}
.vr .s{font-size:11.5px;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.vr .s.chg{color:var(--foreground);font-weight:500}
.lnk{display:inline-flex;align-items:center;gap:4px;min-height:24px;font-size:12px;font-weight:500;color:var(--foreground);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--border);white-space:nowrap}
.cb{width:18px;height:18px;border-radius:5px;border:1.5px solid color-mix(in srgb, var(--foreground) 30%, transparent);display:grid;place-items:center;color:transparent;flex:none}
.cb.on{background:var(--foreground);border-color:var(--foreground);color:var(--background)}
.pop-f{display:flex;align-items:center;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid var(--border-soft);margin-top:6px}
.pop-f .why{margin-right:auto;font-size:12px;color:var(--muted-foreground)}
.grab{display:none}
.scrim{display:none}
/* en el celular el menú y el popover son una hoja abajo */
@container (max-width: 699px){
  .anchor{position:static}
  .menu.desk{display:none}
  .pop{position:fixed;left:0!important;right:0!important;bottom:0;top:auto!important;width:auto!important;border-radius:20px 20px 0 0;max-height:86%;overflow:auto;padding-bottom:calc(8px + env(safe-area-inset-bottom, 0px))}
  .grab{display:block;width:36px;height:5px;border-radius:9px;background:color-mix(in srgb, var(--foreground) 22%, transparent);margin:8px auto 0}
  .scrim{display:block;position:fixed;inset:0;background:var(--scrim);z-index:19}
  .pop-f{position:sticky;bottom:0;background:inherit}
  .pop-f .btn{flex:1}
  .pop-f .why{display:none}
}

/* elegir la principal de una variante */
.pick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 16px 4px}
.pick .pho{border-radius:10px}
.pick .pho.main::after{border-radius:13px}
.pick .opt{display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--muted-foreground);line-height:1.25;min-width:0}
.pick .opt span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pick .opt.sel span{color:var(--foreground);font-weight:500}
.pick-h{padding:10px 16px 6px;font-size:12px;color:var(--muted-foreground);display:flex;justify-content:space-between;gap:8px}
.pick-h b{color:var(--foreground);font-weight:500}

/* tabla de variantes */
.vt{width:100%;border-collapse:collapse;font-size:13.5px}
.vt th{font-size:12px;font-weight:500;color:var(--muted-foreground);text-align:left;padding:10px 10px;border-bottom:1px solid var(--border-soft);white-space:nowrap}
.vt td{padding:9px 10px;border-bottom:1px solid var(--border-soft);vertical-align:middle}
.vt tr:last-child td{border-bottom:none}
.vt .pt{display:flex;align-items:center;gap:10px;min-width:0}
.vt .thumbbtn{position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:2px}
.vt .thumbbtn .thumb{width:44px;height:44px;border-radius:10px}
.vt .thumbbtn.on .thumb{outline:2px solid var(--ring-main);outline-offset:2px}
.vt .nm b{display:block;font-weight:500;white-space:nowrap} .vt .nm span{display:block;font-size:12px;color:var(--muted-foreground);white-space:nowrap}
.vt .nm .inh{font-size:11.5px}
.vt .mono{font-size:11.5px;color:var(--muted-foreground)}
.st{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.st i{width:7px;height:7px;border-radius:50%;background:var(--axi-success)} .st i.no{background:var(--axi-destructive)}
.tscroll{overflow-x:auto;margin:0 -8px;padding:0 8px}
@container (max-width: 699px){ .vt .hide-s{display:none} }

/* subida */
.drop{display:flex;flex-wrap:wrap;align-items:center;gap:12px 14px;padding:16px;border-radius:16px;border:1.5px dashed color-mix(in srgb, var(--foreground) 20%, transparent)}
.drop .di{width:40px;height:40px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;flex:none}
.drop b{font-weight:500;display:block} .drop span{font-size:12px;color:var(--muted-foreground)}
.drop .btn{margin-left:auto}
.drop.over{border-color:var(--foreground);background:color-mix(in srgb, var(--foreground) 4%, transparent)}
.drop > div{flex:1 1 180px}
.m-only{display:none!important}
@container (max-width: 520px){ .drop .btn{margin-left:0;width:100%} .d-only{display:none!important} .m-only{display:inline!important} }
.qline{display:flex;align-items:center;gap:10px;font-size:12.5px;flex-wrap:wrap}
.qline .qbar{flex:1;min-width:120px;height:6px;border-radius:9px;background:var(--secondary);overflow:hidden}
.qline .qbar i{display:block;height:100%;background:var(--foreground);border-radius:inherit}
.qline b{font-weight:500;font-variant-numeric:tabular-nums}

/* tablero de estados */
.board{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,400px),448px));justify-content:start;gap:20px;align-items:start}
.board > figure{margin:0;display:flex;flex-direction:column;gap:8px;min-width:0}
.board figcaption{font-size:12px;color:var(--muted-foreground);line-height:1.45}
.board figcaption b{display:block;color:var(--foreground);font-weight:500;font-size:13px}
.lock{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--muted-foreground)}

/* formulario de alta (FormStep «card», DS §9.7) */
.fsg{display:grid;grid-template-columns:minmax(0,1fr) 20rem;gap:20px;align-items:start}
.fsg > *{min-width:0}
@container (max-width: 1099px){ .fsg{grid-template-columns:minmax(0,1fr)} }
.steps{display:flex;flex-direction:column;gap:12px}
.fs{border:1px solid var(--border);border-radius:24px;background:var(--background)}
.fs-h{display:flex;align-items:center;gap:14px;padding:16px 20px;width:100%;text-align:left}
.mark{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:600;flex:none;background:var(--secondary);color:var(--foreground)}
.mark.done{background:var(--foreground);color:var(--background)}
.fs-h .tx{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.fs-h .tx b{font-size:15px;font-weight:600}
.fs-h .tx span{font-size:12px;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fs-h > .ic{color:var(--muted-foreground)}
.fs-p{padding:0 20px 20px 68px;display:flex;flex-direction:column;gap:14px}
@container (max-width: 699px){ .fs-p{padding:0 16px 16px} .fs-h{padding:14px 16px} }
.before{border:1px solid var(--border);border-radius:24px;padding:20px}
.before h2{font-family:var(--font-body);font-size:14px;font-weight:600;letter-spacing:0}
.before ul{list-style:none;margin:8px 0 0;padding:0}
.before li{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--border-soft);font-size:13px}
.before li:first-child{border-top:none}
.before li .ic{color:var(--axi-success);margin-top:2px}
.before li .bd{width:6px;height:6px;border-radius:50%;margin:7px 4px 0;flex:none;background:var(--axi-warning)}
.before li .bd.n{background:color-mix(in srgb, var(--muted-foreground) 50%, transparent)}
.before li.note{color:var(--muted-foreground)}
.inkbar{position:sticky;bottom:12px;z-index:10;display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 10px 10px 20px;border-radius:999px;background:#0B0B0E;color:#F4F4F5;box-shadow:0 0 0 1px rgb(255 255 255/.08), 0 18px 40px -20px rgb(0 0 0/.5)}
.inkbar p{flex:1;min-width:0;font-size:13.5px;color:rgb(244 244 245/.72)}
.inkbar p b{color:#F4F4F5;font-weight:500}
.inkbar .btn.ghost{color:#F4F4F5}
.inkbar .btn.ghost:hover{background:rgb(255 255 255/.08)}
.inkbar .btn.brand{background:#e65759;color:#fff}
@container (max-width: 699px){ .inkbar{border-radius:24px;padding:12px} .inkbar p{flex-basis:100%} .inkbar .btn{flex:1} }

/* listado */
.lh{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px}
.lh h1{font-size:30px}
.lh p{color:var(--muted-foreground);font-size:13.5px;margin-top:2px}
.tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tools .input{width:280px;max-width:100%;border-radius:12px}
.pt-wrap{border:1px solid var(--border);border-radius:24px;overflow:hidden;container-type:inline-size}
.pt-scroll{overflow-x:auto}
.ptab{width:100%;border-collapse:collapse;font-size:13.5px}
.ptab th{height:44px;padding:0 12px;font-size:12px;font-weight:500;color:var(--muted-foreground);text-align:left;border-bottom:1px solid var(--border-soft);white-space:nowrap}
.ptab td{padding:12px;border-bottom:1px solid var(--border-soft);vertical-align:middle}
.ptab tr:last-child td{border-bottom:none}
.ptab th:first-child,.ptab td:first-child{padding-left:20px}
.ptab .pn{display:flex;align-items:center;gap:12px;min-width:0}
.ptab .pn .thumb{width:44px;height:44px;border-radius:12px}
.ptab .pn .tx{display:block;min-width:0}
.ptab .pn .tx b{display:block;font-weight:600;color:var(--foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ptab .pn .tx > span{display:block;font-size:12px;color:var(--muted-foreground);white-space:nowrap}
.ptab .num{text-align:right;font-variant-numeric:tabular-nums;font-weight:500;white-space:nowrap}
.ptab .cam{display:inline-flex;gap:6px;align-items:center;font-variant-numeric:tabular-nums}
.ptab .cam.zero{color:var(--muted-foreground)}
.ptab .up{display:inline-flex;align-items:center;font-size:12px;font-weight:500;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--border);min-height:24px}
@container (max-width: 760px){ .ptab .c-cat,.ptab .c-ph{display:none} }
@container (max-width: 560px){ .ptab .c-pr,.ptab .c-st,.ptab .c-es{display:none} .ptab .pn .m{display:flex!important} }
.ptab .pn .tx > .m{display:none;gap:8px;font-size:12px;color:var(--foreground)}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;list-style:none;margin:0;padding:0}
@container (max-width: 1099px){ .cards{grid-template-columns:repeat(3,minmax(0,1fr))} }
@container (max-width: 860px){ .cards{grid-template-columns:repeat(2,minmax(0,1fr))} }
@container (max-width: 520px){ .cards{grid-template-columns:minmax(0,1fr)} }
.pc{border:1px solid var(--border);border-radius:22px;overflow:hidden;display:flex;flex-direction:column;min-width:0;background:var(--background)}
.pc .im{position:relative;aspect-ratio:4/3;background:var(--secondary)}
.pc .im > svg.img{position:absolute;inset:0;width:100%;height:100%}
.pc .im .nophoto{position:absolute;inset:10px;border-radius:16px;border:1.5px dashed color-mix(in srgb, var(--foreground) 15%, transparent);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:12px;color:var(--muted-foreground);background:var(--background)}
.pc .im .nophoto b{color:var(--foreground);font-weight:500}
.cchip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:color-mix(in srgb, var(--background) 86%, transparent);font-size:11.5px;font-weight:500;white-space:nowrap;box-shadow:0 0 0 1px var(--border)}
.pc .im .tl{position:absolute;left:10px;top:10px;display:flex;gap:6px}
.pc .im .br{position:absolute;right:10px;bottom:10px}
.pc .im .tr{position:absolute;right:8px;top:8px;width:32px;height:32px;border-radius:999px;display:grid;place-items:center;background:color-mix(in srgb, var(--background) 86%, transparent)}
.pc .bd{display:flex;flex-direction:column;gap:3px;padding:12px 16px 14px;min-width:0}
.pc .bd b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .bd .s{font-size:12px;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .bd .p{margin-top:6px;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}

.toast2{position:absolute;right:24px;bottom:24px;z-index:25;display:flex;align-items:center;gap:12px;padding:10px 10px 10px 16px;border-radius:999px;background:var(--foreground);color:var(--background);font-size:13px;box-shadow:var(--shadow-overlay)}
.toast2 .ic{color:var(--axi-success)}
.toast2 .btn{height:30px;border-radius:999px;background:color-mix(in srgb, var(--background) 14%, transparent);color:var(--background);font-size:12.5px;padding:0 12px}
@container (max-width: 699px){ .toast2{left:16px;right:16px;bottom:16px} }
.toast2 .tt{flex:1;min-width:0}
"""

# ============================================================================ fotos ficticias (SVG inline)
_uid = [0]


def _id() -> str:
    _uid[0] += 1
    return f"g{_uid[0]}"

FRONT = "M31 25 L42 18 Q50 25 58 18 L69 25 L83 37 L75 47 L67 42 L67 84 Q50 87 33 84 L33 42 L25 47 L17 37 Z"
BACK = "M31 25 L42 18 Q50 21 58 18 L69 25 L83 37 L75 47 L67 42 L67 84 Q50 87 33 84 L33 42 L25 47 L17 37 Z"

PH = {
    "nf": {"alt": "Negra, de frente", "bg": ("#ECE6DC", "#D8CDBD"), "fill": "#1E1E21", "kind": "front"},
    "nb": {"alt": "Negra, de espaldas", "bg": ("#E6E8EC", "#CBD1D9"), "fill": "#1E1E21", "kind": "back"},
    "bf": {"alt": "Blanca, de frente", "bg": ("#C7D2DC", "#A9B7C5"), "fill": "#F7F6F2", "kind": "front"},
    "bb": {"alt": "Blanca, de espaldas", "bg": ("#DAD0C3", "#C2B4A2"), "fill": "#F7F6F2", "kind": "back"},
    "par": {"alt": "Las dos, dobladas", "bg": ("#E9E3D8", "#D3C8B6"), "kind": "pair"},
    "tela": {"alt": "Detalle de la tela", "kind": "fabric"},
    "eti": {"alt": "Etiqueta del cuello", "kind": "label"},
    "ln": {"alt": "Negra talla L, con medidas", "bg": ("#E3E7E2", "#C6CEC4"), "fill": "#1E1E21", "kind": "measure"},
    # fotos recién elegidas (subida / alta)
    "u1": {"alt": "IMG_4021", "bg": ("#E8E1D5", "#CFC2AE"), "fill": "#2A3A55", "kind": "front"},
    "u2": {"alt": "IMG_4022", "bg": ("#DCE3E8", "#BAC7D0"), "fill": "#2A3A55", "kind": "back"},
    "u3": {"alt": "IMG_4023", "bg": ("#E9E3D8", "#D3C8B6"), "fill": "#2A3A55", "kind": "folded"},
    "u4": {"alt": "IMG_4024", "kind": "fabric", "tone": "#2A3A55"},
    "u5": {"alt": "IMG_4025", "bg": ("#E6E1EA", "#CEC5D6"), "fill": "#2A3A55", "kind": "front"},
    # otros productos del listado
    "gorra": {"alt": "Gorra", "bg": ("#E4E7EC", "#C9CFD8"), "kind": "cap", "fill": "#6B4F3A"},
    "medias": {"alt": "Medias", "bg": ("#EDE6DA", "#D7CBB8"), "kind": "socks", "fill": "#3D5A45"},
    "buzo": {"alt": "Buzo", "bg": ("#DDE2DA", "#BFC9BA"), "fill": "#8A8F96", "kind": "hoodie"},
}


def photo(pid: str) -> str:
    p = PH[pid]
    g = _id()
    k = p["kind"]
    if k in ("fabric",):
        tone = p.get("tone", "#26262A")
        pat = _id()
        return (
            f'<svg class="img" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="{p["alt"]}">'
            f'<defs><pattern id="{pat}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">'
            f'<rect width="6" height="6" fill="{tone}"/><path d="M0 3 H6" stroke="#ffffff" stroke-opacity=".09" stroke-width="2"/></pattern>'
            f'<radialGradient id="{g}" cx="35%" cy="25%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>'
            f'<rect width="100" height="100" fill="url(#{pat})"/><rect width="100" height="100" fill="url(#{g})"/>'
            f'<path d="M-5 70 Q30 55 55 72 T110 66" stroke="#000" stroke-opacity=".25" stroke-width="7" fill="none"/></svg>'
        )
    if k == "label":
        return (
            f'<svg class="img" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="{p["alt"]}">'
            f'<defs><linearGradient id="{g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2B2B30"/><stop offset="1" stop-color="#151518"/></linearGradient></defs>'
            f'<rect width="100" height="100" fill="url(#{g})"/><path d="M8 18 Q50 46 92 18" stroke="#3A3A40" stroke-width="10" fill="none"/>'
            f'<rect x="33" y="40" width="34" height="26" rx="2" fill="#F4F1EA"/>'
            f'<text x="50" y="51" text-anchor="middle" font-family="Poppins, sans-serif" font-size="5.2" font-weight="600" fill="#1E1E21">100% ALGODÓN</text>'
            f'<text x="50" y="61" text-anchor="middle" font-family="Poppins, sans-serif" font-size="7" font-weight="700" fill="#1E1E21">M</text></svg>'
        )
    c1, c2 = p["bg"]
    fill = p.get("fill", "#1E1E21")
    stroke = "#00000022" if fill.lower() in ("#f7f6f2",) else "#ffffff18"
    shadow = '<ellipse cx="50" cy="88" rx="26" ry="3.5" fill="#000" fill-opacity=".12"/>'
    if k in ("front", "back", "measure"):
        d = FRONT if k != "back" else BACK
        body = f'{shadow}<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width=".8" stroke-linejoin="round"/>'
        if k == "front" or k == "measure":
            body += f'<path d="M42 18 Q50 25 58 18" stroke="{stroke}" stroke-width="1.6" fill="none"/>'
        if k == "measure":
            body += (
                '<path d="M33 54 H67" stroke="#fff" stroke-width=".9" stroke-dasharray="2 1.6"/>'
                '<path d="M33 52 V56 M67 52 V56" stroke="#fff" stroke-width=".9"/>'
                '<text x="50" y="51" text-anchor="middle" font-family="Poppins, sans-serif" font-size="5.5" font-weight="600" fill="#fff">54 cm</text>'
                '<rect x="74" y="72" width="14" height="10" rx="2" fill="#fff"/><text x="81" y="79.5" text-anchor="middle" font-family="Poppins, sans-serif" font-size="6.5" font-weight="700" fill="#1E1E21">L</text>'
            )
    elif k == "folded":
        body = f'{shadow}<rect x="24" y="34" width="52" height="46" rx="5" fill="{fill}"/><path d="M38 34 Q50 46 62 34" fill="none" stroke="{stroke}" stroke-width="2"/><path d="M24 50 H76" stroke="#000" stroke-opacity=".12"/>'
    elif k == "pair":
        body = (
            f'{shadow}<rect x="16" y="30" width="46" height="40" rx="5" fill="#1E1E21"/><path d="M28 30 Q39 41 50 30" fill="none" stroke="#ffffff22" stroke-width="2"/>'
            f'<rect x="38" y="42" width="46" height="40" rx="5" fill="#F7F6F2" stroke="#00000018"/><path d="M50 42 Q61 53 72 42" fill="none" stroke="#00000022" stroke-width="2"/>'
        )
    elif k == "cap":
        body = f'{shadow}<path d="M26 66 Q26 34 50 32 Q74 34 74 66 Z" fill="{fill}"/><path d="M60 64 Q82 62 88 70 Q72 74 56 70 Z" fill="{fill}" opacity=".85"/><circle cx="50" cy="32" r="2.5" fill="{fill}"/>'
    elif k == "socks":
        body = f'{shadow}<path d="M34 18 H48 V60 Q48 74 36 78 Q24 80 22 72 Q22 66 30 62 L34 58 Z" fill="{fill}"/><path d="M54 22 H68 V64 Q68 78 56 82 Q44 84 42 76 Q42 70 50 66 L54 62 Z" fill="{fill}" opacity=".8"/>'
    else:  # hoodie
        body = f'{shadow}<path d="M30 28 Q50 12 70 28 L84 42 L76 52 L68 46 L68 84 Q50 87 32 84 L32 46 L24 52 L16 42 Z" fill="{fill}"/><path d="M40 26 Q50 40 60 26" fill="#00000022"/><rect x="40" y="62" width="20" height="10" rx="2" fill="#00000018"/>'
    return (
        f'<svg class="img" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="{p["alt"]}">'
        f'<defs><linearGradient id="{g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>'
        f'<rect width="100" height="100" fill="url(#{g})"/>{body}</svg>'
    )


def thumb(pid: str | None, cls: str = "", style: str = "", icon: str = "package") -> str:
    if pid is None:
        return f'<span class="thumb none {cls}" style="{style}">{ic("image-plus", size=18)}</span>'
    return f'<span class="thumb {cls}" style="{style}">{photo(pid)}</span>'


# ============================================================================ datos de ejemplo
PRODUCT = "Camiseta básica algodón"
# (nombre, sku, color, principal propia/elegida o None = la del producto, stock)
VARIANTS = [
    ("S · Negro", "CAM-ALG-NEG-S", "k", None, 14),
    ("M · Negro", "CAM-ALG-NEG-M", "k", None, 22),
    ("L · Negro", "CAM-ALG-NEG-L", "k", "ln", 9),
    ("S · Blanco", "CAM-ALG-BLA-S", "w", "bf", 11),
    ("M · Blanco", "CAM-ALG-BLA-M", "w", "bf", 0),
    ("L · Blanco", "CAM-ALG-BLA-L", "w", "bf", 6),
]
MAIN = "nf"
GENERAL = ["nf", "nb", "bf", "bb", "par", "tela", "eti"]


def vm(color: str, sizes: str) -> str:
    return f'<span class="vm"><i class="swt {color}"></i>{sizes}</span>'


MARKS = {"bf": vm("w", "S M L"), "ln": vm("k", "L")}


def tile(pid: str, main: bool = False, menu_open: bool = False, marks: bool = True, more: bool = True, extra: str = "", cls: str = "") -> str:
    m = f'<span class="marks">{MARKS[pid]}</span>' if marks and pid in MARKS else ""
    b = f'<span class="badge-main">{ic("star", size=10)}Principal</span>' if main else ""
    mo = (
        f'<button class="more" aria-label="Acciones de «{PH[pid]["alt"]}»" aria-haspopup="menu" aria-expanded="{str(menu_open).lower()}">{ic("ellipsis", size=15)}</button>'
        if more else ""
    )
    return f'<div class="pho {"main" if main else ""} {cls}">{photo(pid)}{m}{b}{mo}{extra}</div>'


# ============================================================================ piezas de la ficha
def header(pid: str | None = MAIN, compact: bool = False) -> str:
    th = (
        f'<span class="thumb" style="width:112px;height:112px;border-radius:22px" aria-label="Foto principal">{photo(pid)}</span>'
        if pid else
        f'<span class="thumb none" style="width:112px;height:112px;border-radius:22px;flex-direction:column;gap:4px;display:flex;align-items:center;justify-content:center;font-size:11.5px">{ic("image-plus", size=20)}<a class="lnk" href="#fotos">Subir fotos</a></span>'
    )
    th = th.replace('class="thumb', 'class="thumb hdthumb', 1)
    acts = "" if compact else f'<div class="acts">{btn("Desactivar", "", "outline r")}{btn("Eliminar", "", "del r")}</div>'
    return f"""<header class="hd">{th}
      <div class="meta">
        <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="spill ok"><span class="dot"></span>Activo</span><span class="spill">Producto</span><span class="spill">6 variantes</span></div>
        <h1>{PRODUCT}</h1>
        <p class="line"><b>$ 49.900</b><span>COP</span><span aria-hidden="true">·</span><span>Tienda</span><span aria-hidden="true">·</span><span>Ropa › Camisetas</span></p>
      </div>{acts}</header>"""


def island() -> str:
    return f"""<section class="isl" aria-label="Para que tu agente lo venda">
      <span class="kick">Para que tu agente lo venda</span>
      <h2>Le falta poco</h2>
      <div class="it"><span class="d"></span><div><b>M · Blanco está agotada</b><span>Tu agente la ofrecerá como agotada · Ajustar stock</span></div></div>
      <p class="ok">{ic("check", size=14)}Fotos con principal · Precio · Categoría · 6 variantes</p>
    </section>"""


def filter_chips(active: str = "Todas") -> str:
    items = [("Todas", "8", ""), ("General", "7", "")] + [(v[0], "", v[2]) for v in VARIANTS]
    out = []
    for name, c, color in items:
        sw = f'<i class="swt {color}"></i>' if color else ""
        cc = f'<span class="c">{c}</span>' if c else ""
        out.append(f'<button class="chip" aria-pressed="{str(name == active).lower()}">{sw}{name}{cc}</button>')
    return f'<div class="chips" role="group" aria-label="Filtrar fotos">{"".join(out)}</div>'


def photo_menu(top: str, left: str) -> str:
    return f"""<div class="menu desk" role="menu" aria-label="Acciones de la foto" style="top:{top};left:{left}">
      <button class="mi" role="menuitem">{ic("star", size=15)}Hacer principal</button>
      <button class="mi hl" role="menuitem">{ic("layers", size=15)}Usar en variante…<span class="end">{ic("chevron-right", size=14)}</span></button>
      <button class="mi" role="menuitem">{ic("maximize-2", size=15)}Ver original</button>
      <div class="msep"></div>
      <button class="mi danger" role="menuitem">{ic("trash-2", size=15)}Borrar</button>
    </div>"""


def photos_card(menu: bool = False, pop: str = "", locked: bool = False, active: str = "Todas") -> str:
    general = "".join(
        tile(p, main=(p == MAIN), menu_open=(menu and p == "bf"), more=not locked) for p in GENERAL
    )
    add = (
        "" if locked else
        f'<button class="pho add" aria-label="Subir fotos">{ic("image-plus", size=20)}<b>Subir fotos</b>quedan 3</button>'
    )
    lock = (
        f'<p class="lock">{ic("lock", size=12)}Las manda Shopify: se suben y ordenan en tu tienda</p>' if locked else ""
    )
    menu_html = photo_menu("58px", "calc(74% - 14px)") if menu else ""
    vband = f"""<div class="band">
          <div class="band-h"><b>De una variante</b><span class="cnt">L · Negro · 1 de 5</span></div>
          <div class="gal">{tile("ln", more=not locked)}</div>
        </div>"""
    return f"""<section class="c3" id="fotos" aria-label="Fotos del producto">
      <div class="sec-h" style="margin-bottom:12px"><div style="display:flex;flex-direction:column;gap:2px"><h2>Fotos</h2>{lock}</div>
        {'' if locked else btn("Subir", "upload", "outline sm r")}</div>
      <div style="display:flex;flex-direction:column;gap:14px">
        {filter_chips(active)}
        <div class="anchor">
          <div class="band">
            <div class="band-h"><b>General</b><span class="cnt">7 de 10</span></div>
            <div class="gal">{general}{add}</div>
          </div>
          {menu_html}{pop}
        </div>
        {vband}
        <p class="legend">{ic("info", size=13)}<span>{vm("w", "S M L")} dice qué variantes la usan como principal. Las demás usan la del producto. Arrastra para ordenar: tu agente las envía en este orden, la principal primero.</span></p>
      </div>
    </section>"""


def variants_card(open_picker: str = "", override: dict | None = None) -> str:
    rows = []
    for name, sku, color, own, stock in VARIANTS:
        own = (override or {}).get(name, own)
        inh = own is None
        pid = MAIN if inh else own
        sub = '<span class="inh">la del producto</span>' if inh else ('<span class="inh">foto propia</span>' if own == "ln" else f'<span class="inh">«{PH[own]["alt"]}»</span>')
        on = "on" if (open_picker and name == open_picker) else ""
        st = f'<span class="st"><i></i>{stock}</span>' if stock else '<span class="st"><i class="no"></i>agotada</span>'
        rows.append(f"""<tr>
          <td><span class="pt"><button class="thumbbtn {on}" aria-label="Elegir la foto principal de {name}">{thumb(pid, "inh" if inh else "")}</button>
            <span class="nm"><b><i class="swt {color}" style="margin-right:6px;vertical-align:-1px"></i>{name}</b>{sub}</span></span></td>
          <td class="hide-s"><span class="mono">{sku}</span></td>
          <td class="tnum hide-s" style="white-space:nowrap">$ 49.900</td>
          <td>{st}</td>
          <td class="hide-s" style="text-align:right">{btn("", "pencil", "ghost icon sm", 'aria-label="Editar variante"')}</td>
        </tr>""")
    return f"""<section class="c3" id="variantes" aria-label="Variantes y stock">
      <div class="sec-h" style="margin-bottom:8px"><h2>Variantes y stock <span class="n">(6)</span></h2>{btn("Añadir variante", "plus", "outline sm r")}</div>
      <div class="anchor"><div class="tscroll"><table class="vt">
        <thead><tr><th>Variante</th><th class="hide-s">SKU</th><th class="hide-s">Precio</th><th>Stock</th><th class="hide-s"><span class="sr">Acciones</span></th></tr></thead>
        <tbody>{"".join(rows)}</tbody></table></div>{open_picker and variant_picker(open_picker) or ""}</div>
    </section>"""


def info_card() -> str:
    return f"""<section class="c3" aria-label="Información">
      <div class="sec-h" style="margin-bottom:10px"><h2>Información</h2>{btn("Editar", "pencil", "ghost sm r")}</div>
      <dl class="kv" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <div><dt>Descripción</dt><dd style="font-weight:400">Camiseta de algodón peinado 180 g, cuello redondo y corte recto.</dd></div>
        <div><dt>Categoría</dt><dd>Ropa › Camisetas</dd></div>
      </dl>
    </section>"""


def ficha(right_extra: str = "", photos: str | None = None, variants: str | None = None, hd: str | None = None) -> str:
    return f"""<div class="pg">
      <a class="back" href="#">{ic("arrow-left", size=16)}Productos</a>
      {hd if hd is not None else header()}
      <div class="fgrid">
        <div class="col left">{info_card()}{variants if variants is not None else variants_card()}</div>
        <div class="col right">{island()}{photos if photos is not None else photos_card()}{right_extra}</div>
      </div>
    </div>"""


# ============================================================================ 2 · usar en variante
def use_in_variant_pop(top: str = "58px", left: str = "auto") -> str:
    rows = []
    for name, sku, color, own, stock in VARIANTS:
        checked = own == "bf"
        if own == "bf":
            s = '<span class="s">Ahora: esta foto</span>'
            act = ""
        elif own == "ln":
            s = '<span class="s">Ahora: su foto propia</span>'
            act = '<a class="lnk" href="#">Usar la del producto</a>'
        else:
            s = '<span class="s">Ahora: la del producto</span>'
            act = ""
        if name == "M · Negro":
            checked = True
            s = '<span class="s chg">Pasará a usar esta foto</span>'
        cb = f'<span class="cb {"on" if checked else ""}" role="checkbox" aria-checked="{str(checked).lower()}" aria-label="{name}">{ic("check", size=12)}</span>'
        pid = MAIN if own is None else own
        rows.append(f'<div class="vr">{cb}{thumb(pid, "inh" if own is None else "")}<span style="min-width:0"><b><i class="swt {color}" style="margin-right:6px;vertical-align:-1px"></i>{name}</b>{s}</span>{act}</div>')
    return f"""<div class="scrim" aria-hidden="true"></div>
    <div class="pop" role="dialog" aria-label="Usar en variante" style="top:{top};left:{left};right:-12px">
      <span class="grab" aria-hidden="true"></span>
      <div class="pop-h">{thumb("bf")}<div style="min-width:0"><h3>Usar como principal de…</h3><p>«Blanca, de frente» · foto general</p></div></div>
      <div class="pop-q"><span class="small muted" style="align-self:center">Marcar:</span><button class="chip"><i class="swt k"></i>Todo Negro</button><button class="chip"><i class="swt w"></i>Todo Blanco</button></div>
      <div class="pop-b">{"".join(rows)}</div>
      <div class="pop-f"><span class="why">1 cambio</span>{btn("Cancelar", "", "ghost sm r")}{btn("Guardar", "", "sm r")}</div>
    </div>"""


# ============================================================================ 3 · elegir la principal de una variante
def variant_picker(name: str) -> str:
    opts = [f'<div class="opt sel"><div class="pho main" style="opacity:.55">{photo(MAIN)}</div><span>La del producto</span></div>']
    for p in GENERAL[1:6]:
        opts.append(f'<div class="opt"><div class="pho">{photo(p)}</div><span>{PH[p]["alt"]}</span></div>')
    return f"""<div class="scrim" aria-hidden="true"></div>
    <div class="pop" role="dialog" aria-label="Foto principal de {name}" style="top:118px;left:64px;width:400px">
      <span class="grab" aria-hidden="true"></span>
      <div class="pop-h"><div style="min-width:0;flex:1"><h3>Foto principal de {name}</h3><p>Hoy usa la del producto. Elige una de la galería o sube una solo para esta variante.</p></div></div>
      <div class="pick-h"><b>General</b><span class="tnum">7 de 10</span></div>
      <div class="pick">{"".join(opts)}</div>
      <div class="pick-h" style="padding-top:12px"><b>De {name}</b><span class="tnum">0 de 5</span></div>
      <div style="display:flex;gap:12px;align-items:center;padding:0 16px"><button class="pho add" style="width:72px;flex:none;padding:4px" aria-label="Subir foto para {name}">{ic("camera", size=18)}</button><p class="small muted">Aún sin fotos propias. La que subas aquí queda solo para {name} y como su principal.</p></div>
      <div class="pop-f"><a class="lnk" href="#" style="margin-right:auto">Ver toda la galería</a>{btn("Subir foto para esta variante", "upload", "outline sm r")}</div>
    </div>"""


# ============================================================================ 4 · subida
def upload_tiles() -> str:
    done = f'<div class="pho">{photo("u1")}<span class="marks"><span class="vm">{ic("check", size=10)}Lista</span></span><div class="veil"><span><s>8,2 MB</s><br><b>→ 640 KB</b></span></div></div>'
    up = f'<div class="pho dim">{photo("u2")}<div class="veil"><b>62 %</b><div class="bar"><i style="width:62%"></i></div><span>→ 590 KB</span></div></div>'
    up2 = f'<div class="pho dim">{photo("u3")}<div class="veil"><b>18 %</b><div class="bar"><i style="width:18%"></i></div><span>→ 610 KB</span></div></div>'
    red = f'<div class="pho dim">{photo("u4")}<div class="veil center">{ic("loader-circle", "spin", size=18)}<span>Reduciendo…</span></div></div>'
    fail = f'<div class="pho fail" title="Se cortó la conexión">{ic("circle-alert", size=18)}<span>No se subió</span><button class="retry">{ic("rotate-cw", size=11)}Reintentar</button></div>'
    queue = f'<div class="pho dim">{photo("u5")}<div class="veil center"><span>En cola</span></div></div>'
    return done + up + up2 + red + fail + queue


def upload_card() -> str:
    base = "".join(tile(p, main=(p == MAIN), more=True) for p in GENERAL[:4])
    return f"""<section class="c3" aria-label="Fotos del producto, subiendo">
      <div class="sec-h" style="margin-bottom:12px"><h2>Fotos</h2><span class="sub tnum">10 de 10 al terminar</span></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="qline">{ic("upload", size=14)}<b>Subiendo 6 fotos</b><span class="muted">· 1 lista · de a 3</span><span class="qbar"><i style="width:34%"></i></span></div>
        <div class="gal">{base}{upload_tiles()}</div>
        {K.notice("err", "<b>IMG_4025.HEIC no se subió:</b> se cortó la conexión. Las demás siguen. Toca «Reintentar» en esa foto.")}
        <p class="legend">{ic("minimize-2", size=13)}<span>Las reducimos en tu navegador antes de subirlas: un celular saca fotos de 8 MB y tu cliente las recibe de ~600 KB, igual de nítidas en el chat.</span></p>
      </div>
    </section>"""


def drop_card(over: bool = False) -> str:
    tiles = "".join(tile(p, main=(p == MAIN)) for p in GENERAL[:3])
    return f"""<section class="c3" aria-label="Fotos, soltar para subir">
      <div class="sec-h" style="margin-bottom:12px"><h2>Fotos</h2><span class="sub tnum">3 de 10</span></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="drop {"over" if over else ""}">
          <span class="di">{ic("image-plus", size=18)}</span>
          <div style="min-width:0"><b class="d-only">{"Suelta para subir 4 fotos" if over else "Arrastra fotos aquí"}</b><b class="m-only">Fotos del producto</b><span>JPG, PNG, WebP o HEIC · caben 7 más</span></div>
          {btn('<span class="d-only">Elegir fotos</span><span class="m-only">Tomar o elegir fotos</span>', "camera", "outline sm r")}
        </div>
        <div class="gal">{tiles}</div>
      </div>
    </section>"""


def full_card() -> str:
    tiles = "".join(tile(p, main=(p == MAIN)) for p in (GENERAL + ["u1", "u2", "u3"]))
    return f"""<section class="c3" aria-label="Fotos, tope alcanzado">
      <div class="sec-h" style="margin-bottom:12px"><h2>Fotos</h2><span class="sub tnum">10 de 10</span></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="gal">{tiles}<div class="pho add off" aria-disabled="true">{ic("ban", size=18)}<b>Galería llena</b></div></div>
        {K.notice("info", "<b>Llegaste a 10 fotos generales.</b> Borra una para subir otra, o súbela a una variante: cada una admite 5 propias.", icon="info")}
        {K.notice("warn", "<b>Elegiste 5 fotos y caben 3.</b> Subimos las 3 primeras. Quedaron fuera IMG_4030.jpg e IMG_4031.jpg.")}
      </div>
    </section>"""


def view_upload() -> str:
    return f"""<div class="pg wide">
      <a class="back" href="#">{ic("arrow-left", size=16)}{PRODUCT}</a>
      <div class="board">
        <figure>{drop_card(over=True)}<figcaption><b>Soltar para subir</b>Toda la tarjeta recibe el arrastre. En el celular el botón dice «Tomar o elegir fotos» y abre la cámara o la fototeca.</figcaption></figure>
        <figure>{upload_card()}<figcaption><b>Subiendo, de a 3</b>Cada foto lleva su progreso. Antes de subir se reduce y lo dice: «8,2 MB → 640 KB». Si una falla, solo esa se reintenta.</figcaption></figure>
        <figure>{full_card()}<figcaption><b>Tope alcanzado</b>10 generales y 5 por variante. Si eligen más de las que caben, se suben las primeras y se nombran las que quedaron fuera.</figcaption></figure>
      </div>
    </div>"""


# ============================================================================ 5 · crear producto
def step(n: str, title: str, summary: str, done: bool = True, open_: bool = False, body: str = "") -> str:
    mark = f'<span class="mark done">{ic("check", size=15)}</span>' if done else f'<span class="mark {"done" if done else ""}">{n}</span>'
    chev = ic("chevron-up" if open_ else "chevron-down", size=18)
    panel = f'<div class="fs-p">{body}</div>' if open_ else ""
    return f'<section class="fs" aria-label="{title}"><button class="fs-h" aria-expanded="{str(open_).lower()}">{mark}<span class="tx"><b>{title}</b><span>{summary}</span></span>{chev}</button>{panel}</section>'


def create_photos_body() -> str:
    tiles = [
        f'<div class="pho main">{photo("nf")}<span class="badge-main">{ic("star", size=10)}Principal</span><button class="more" aria-label="Acciones">{ic("ellipsis", size=15)}</button></div>',
        f'<div class="pho">{photo("nb")}<button class="more" aria-label="Acciones">{ic("ellipsis", size=15)}</button></div>',
        f'<div class="pho">{photo("bf")}<button class="more" aria-label="Acciones">{ic("ellipsis", size=15)}</button></div>',
        f'<div class="pho dim">{photo("par")}<div class="veil center">{ic("loader-circle", "spin", size=18)}<span>Reduciendo…</span></div></div>',
        f'<button class="pho add" aria-label="Agregar fotos">{ic("image-plus", size=20)}<b class="d-only">Agregar o arrastrar</b><b class="m-only">Tomar o elegir</b>quedan 6</button>',
    ]
    return f"""<div class="gal lg">{"".join(tiles)}</div>
      <p class="legend">{ic("info", size=13)}<span>Hasta 10. La principal es la que tu agente envía primero: cámbiala desde el menú de cada foto. Se suben al crear el producto; las de cada variante se eligen después en la ficha.</span></p>"""


def view_create() -> str:
    steps = [
        step("1", "Qué vas a ofrecer", "Producto"),
        step("2", "Datos básicos", f"{PRODUCT} · con descripción"),
        step("3", "Fotos", "4 fotos · principal: «Negra, de frente»", done=True, open_=True, body=create_photos_body()),
        step("4", "Clasificación", "Tienda · Ropa › Camisetas · tipo Camiseta"),
        step("5", "Precio", "$ 49.900 COP"),
        step("6", "Variantes", "Falta: define al menos un SKU", done=False),
    ]
    before = f"""<aside class="before" aria-label="Antes de crear"><h2>Antes de crear</h2><ul>
        <li>{ic("check", size=14)}<span>Nombre y descripción</span></li>
        <li>{ic("check", size=14)}<span>4 fotos, con «Negra, de frente» como principal</span></li>
        <li>{ic("check", size=14)}<span>Precio $ 49.900 COP</span></li>
        <li><span class="bd"></span><span><span class="sr">Falta: </span>Las variantes: añade al menos un SKU</span></li>
        <li class="note"><span class="bd n"></span><span>Las fotos se suben al crear. Puedes seguir en la ficha mientras terminan.</span></li>
        <li class="note"><span class="bd n"></span><span>Sin fotos tu agente no podrá mostrar este producto.</span></li>
      </ul></aside>"""
    return f"""<div class="pg">
      <a class="back" href="#">{ic("arrow-left", size=16)}Productos</a>
      <div class="lh"><div><h1>Nuevo producto</h1><p>Se crea con todo lo de abajo; los atributos y las fotos de cada variante se completan en la ficha.</p></div></div>
      <div class="fsg"><div class="steps">{"".join(steps)}</div>{before}</div>
      <footer class="inkbar"><p><b>Casi listo.</b> Falta definir las variantes.</p>{btn("Cancelar", "", "ghost r")}{btn("Crear producto", "", "brand r")}</footer>
    </div>"""


# ============================================================================ 6 · listado
ROWS = [
    ("nf", PRODUCT, "Ropa › Camisetas · 6 variantes", "$ 49.900", ("ok", "62 en stock"), 8, True),
    ("buzo", "Buzo con capota", "Ropa › Buzos · 3 variantes", "$ 119.900", ("warn", "2 por agotarse"), 4, True),
    (None, "Gorra lisa", "Accesorios · 2 variantes", "$ 39.900", ("ok", "18 en stock"), 0, True),
    ("medias", "Medias tobilleras ×3", "Accesorios", "$ 24.900", ("ok", "40 en stock"), 3, False),
]


def view_table() -> str:
    trs = []
    for pid, name, meta, price, (tone, stock), n, active in ROWS:
        th = thumb(pid) if pid else f'<span class="thumb none" title="Sin fotos: tu agente no podrá mostrar este producto">{ic("image-plus", size=16)}</span>'
        cam = (
            f'<span class="cam">{ic("camera", size=14)}{n}</span>' if n else
            f'<span class="cam zero">{ic("camera", size=14)}0</span> <a class="up" href="#">Subir fotos</a>'
        )
        dot = "var(--axi-success)" if tone == "ok" else "var(--axi-warning)"
        pill = '<span class="spill ok"><span class="dot"></span>Activo</span>' if active else '<span class="spill"><span class="dot"></span>Inactivo</span>'
        trs.append(f"""<tr>
          <td><div class="pn">{th}<span class="tx"><a href="#" style="text-decoration:none"><b>{name}</b></a><span>{meta}</span>
            <span class="m"><b style="display:inline;font-weight:500" class="tnum">{price}</b>{'' if n else '<a class="up" href="#">Subir fotos</a>'}</span></span></div></td>
          <td class="c-cat">{meta.split(" · ")[0]}</td>
          <td class="num c-pr">{price}</td>
          <td class="c-st"><span class="st"><i style="background:{dot}"></i>{stock}</span></td>
          <td class="c-ph">{cam}</td>
          <td class="c-es">{pill}</td>
          <td style="width:48px">{btn("", "ellipsis", "ghost icon sm", 'aria-label="Acciones"')}</td>
        </tr>""")
    return f"""<div class="pg">
      <div class="lh"><div><h1>Productos</h1><p>4 productos · la miniatura es la foto principal de cada uno</p></div>
        <div class="tools">{K.input("", "Buscar productos", icon="search", cls="adorn", fid="q")}<nav class="seg inline sm" aria-label="Vista"><button aria-checked="true">{ic("rows-3", size=14)}Tabla</button><button aria-checked="false">{ic("layout-grid", size=14)}Tarjetas</button></nav>{btn("Nuevo producto", "plus", "r")}</div></div>
      <div class="pt-wrap"><div class="pt-scroll"><table class="ptab">
        <thead><tr><th>Producto</th><th class="c-cat">Categoría</th><th class="c-pr" style="text-align:right">Precio</th><th class="c-st">Stock</th><th class="c-ph">Fotos</th><th class="c-es">Estado</th><th><span class="sr">Acciones</span></th></tr></thead>
        <tbody>{"".join(trs)}</tbody></table></div></div>
    </div>"""


def view_cards() -> str:
    lis = []
    for pid, name, meta, price, (tone, stock), n, active in ROWS:
        dot = "var(--axi-success)" if tone == "ok" else "var(--axi-warning)"
        if pid:
            im = f'{photo(pid)}<span class="br"><span class="cchip">{ic("camera", size=12)}{n}</span></span>'
        else:
            im = f'<div class="nophoto">{ic("image-plus", size=22)}<b>Sin fotos</b><a class="lnk" href="#">Subir fotos</a></div>'
        tl = '' if active else '<span class="tl"><span class="cchip"><span class="swt" style="width:6px;height:6px;background:var(--muted-foreground);box-shadow:none"></span>Inactivo</span></span>'
        lis.append(f"""<li class="pc"><div class="im">{im}{tl}<span class="tr">{ic("ellipsis", size=15)}</span></div>
          <div class="bd"><b>{name}</b><span class="s">{meta}</span><span class="p">{price}</span><span class="st small"><i style="background:{dot}"></i>{stock}</span></div></li>""")
    return f"""<div class="pg">
      <div class="lh"><div><h1>Productos</h1><p>4 productos · la imagen es la foto principal de cada uno</p></div>
        <div class="tools">{K.input("", "Buscar productos", icon="search", cls="adorn", fid="q2")}<nav class="seg inline sm" aria-label="Vista"><button aria-checked="false">{ic("rows-3", size=14)}Tabla</button><button aria-checked="true">{ic("layout-grid", size=14)}Tarjetas</button></nav>{btn("Nuevo producto", "plus", "r")}</div></div>
      <ul class="cards">{"".join(lis)}</ul>
    </div>"""


# ============================================================================ 7 · estados
def empty_card() -> str:
    return f"""<section class="c3" aria-label="Fotos vacía">
      <div class="sec-h"><h2>Fotos</h2><span class="sub tnum">0 de 10</span></div>
      <div class="empty" style="padding:24px 8px 8px">
        <span class="eic">{ic("images", size=22)}</span>
        <h3>Aún sin fotos</h3>
        <p>Cuando un cliente pida ver la camiseta, tu agente le envía la principal primero. Sin fotos, solo puede describirla.</p>
        <div class="acts">{btn("Elegir fotos", "image-plus", "r")}</div>
        <p class="small muted">También puedes arrastrarlas aquí · JPG, PNG, WebP o HEIC</p>
      </div>
    </section>"""


def importing_card() -> str:
    pend = f'<div class="pho pend">{ic("loader-circle", "spin", size=18)}<span>Importando…</span></div>'
    fail = f'<div class="pho fail" title="El enlace devolvió 404">{ic("triangle-alert", size=18)}<span>No se pudo importar</span><button class="retry">{ic("rotate-cw", size=11)}Reintentar</button></div>'
    return f"""<section class="c3" aria-label="Fotos importándose">
      <div class="sec-h" style="margin-bottom:12px"><h2>Fotos</h2>{btn("Actualizar", "refresh-cw", "outline sm r")}</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <p class="sub">{ic("file-spreadsheet", size=13)}Del archivo «catalogo-octubre.xlsx» · 2 de 4 listas</p>
        <div class="gal">{tile("nf", main=True)}{tile("nb")}{pend}{fail}</div>
        <p class="legend">{ic("info", size=13)}<span>La primera que llega queda como principal. Puedes cambiarla cuando terminen.</span></p>
      </div>
    </section>"""


def locked_card() -> str:
    tiles = "".join(tile(p, main=(p == MAIN), more=False, marks=(p == "bf")) for p in GENERAL[:5])
    return f"""<section class="c3" aria-label="Fotos de Shopify">
      <div class="sec-h" style="margin-bottom:12px"><div style="display:flex;flex-direction:column;gap:2px"><h2>Fotos</h2>
        <p class="lock">{ic("lock", size=12)}Las manda Shopify: se suben y ordenan en tu tienda</p></div></div>
      <div style="display:flex;flex-direction:column;gap:12px">
        {filter_chips()}
        <div class="gal">{tiles}</div>
        <p class="legend">{ic("store", size=13)}<span>La principal es la primera de Shopify y la de cada variante, la que le asignaste allá. Aquí solo se ven.</span></p>
      </div>
    </section>"""


def delete_main_card() -> str:
    return f"""<div class="c3" style="padding:0;overflow:hidden">
      <div class="modal" style="position:relative;max-width:none;border:0;border-radius:0;box-shadow:none;background:var(--background)">
        <h2>Borrar la principal</h2>
        <p>«Negra, de frente» es la principal del producto. Al borrarla, «Negra, de espaldas» pasa a ser la principal, y S · Negro y M · Negro la usarán.</p>
        <div class="modal-foot">{btn("Cancelar", "", "outline r")}{btn("Borrar", "trash-2", "destructive r")}</div>
      </div></div>"""


def view_states() -> str:
    hd_main = f'<div class="c3">{header(MAIN, compact=True)}</div>'
    hd_none = f'<div class="c3">{header(None, compact=True)}</div>'
    return f"""<div class="pg">
      <a class="back" href="#">{ic("arrow-left", size=16)}{PRODUCT}</a>
      <div class="board" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr))">
        <figure>{empty_card()}<figcaption><b>Galería vacía</b>Dice qué pierde el agente y ofrece la única acción en coral.</figcaption></figure>
        <figure>{importing_card()}<figcaption><b>Importándose</b>Desde el importador o la tienda: cada foto dice si llegó, si sigue en camino o si falló, con su reintento.</figcaption></figure>
        <figure>{locked_card()}<figcaption><b>Bloqueada por Shopify</b>Sin menú, sin subir y sin arrastrar. Los filtros sí funcionan, para ver qué foto lleva cada variante.</figcaption></figure>
        <figure>{delete_main_card()}<figcaption><b>Borrar la principal</b>La confirmación dice qué foto toma su lugar y qué variantes cambian. El botón es rojo, nunca coral.</figcaption></figure>
      </div>
      <div class="board" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));justify-content:stretch">
        <figure>{hd_main}<figcaption><b>Cabecera con la principal</b>La foto de la cabecera es la principal real, la misma del listado y la que el agente envía primero.</figcaption></figure>
        <figure>{hd_none}<figcaption><b>Cabecera sin fotos</b>El hueco ofrece «Subir fotos», que lleva a la galería.</figcaption></figure>
      </div>
    </div>"""


# ============================================================================ vistas
def toast(text: str) -> str:
    return f'<div class="toast2" role="status">{ic("circle-check", size=16)}<span class="tt">{text}</span><button class="btn">Deshacer</button></div>'


def v_main() -> str:
    return ficha(photos=photos_card(menu=True))


def v_use() -> str:
    return ficha(photos=photos_card(pop=use_in_variant_pop()))


def v_variants() -> str:
    return ficha(variants=variants_card(open_picker="M · Negro"))


def photos_card_filtered() -> str:
    t = f'<div class="pho">{photo("nb")}<span class="marks">{vm("k", "M")}</span><span class="badge-main">{ic("star", size=10)}Principal</span><button class="more" aria-label="Acciones">{ic("ellipsis", size=15)}</button></div>'
    add = f'<button class="pho add" aria-label="Subir foto para M · Negro">{ic("camera", size=20)}<b>Subir foto</b>solo M · Negro</button>'
    return f"""<section class="c3" id="fotos" aria-label="Fotos de M · Negro">
      <div class="sec-h" style="margin-bottom:12px"><h2>Fotos</h2>{btn("Subir", "upload", "outline sm r")}</div>
      <div style="display:flex;flex-direction:column;gap:14px">
        {filter_chips("M · Negro")}
        <div class="band"><div class="band-h"><b>Lo que muestra M · Negro</b><span class="cnt">1 general</span></div>
          <div class="gal">{t}</div></div>
        <div class="band"><div class="band-h"><b>De M · Negro</b><span class="cnt">0 de 5</span></div>
          <div class="gal">{add}</div></div>
        <p class="legend">{ic("info", size=13)}<span>Tu agente le envía a quien pregunte por la M negra «Negra, de espaldas» primero y luego las generales. «Todas» vuelve a la galería completa.</span></p>
      </div>
    </section>"""


def v_variants_done() -> str:
    body = ficha(photos=photos_card_filtered(), variants=variants_card(override={"M · Negro": "nb"}))
    return f'<div style="position:relative">{body}{toast("M · Negro usa «Negra, de espaldas»")}</div>'


def v_create() -> str:
    return view_create()


def wrap(body: str, extra_cls: str = "") -> str:
    return f'<div class="shell {extra_cls}">{body}</div>'


VIEWS = [
    ("ficha", "1 · Ficha › Fotos", v_main(),
     "Una sola galería por producto: generales (7 de 10) y, aparte, las de una variante (5 por variante). La principal va primera con su insignia y su anillo; los puntos dicen qué variantes la usan. El menú de cada foto: Hacer principal, Usar en variante…, Ver original y Borrar en rojo. El botón «Anillo» de esta barra compara tinta y coral."),
    ("usar", "2 · Usar en variante…", v_use(),
     "Desde una foto general se eligen las variantes que la usan como principal. Cada fila dice qué usa hoy y qué cambiará; «Marcar: Todo Blanco» resuelve el caso común. En el celular es una hoja abajo."),
    ("variantes", "3 · Variantes", v_variants(),
     "Cada fila lleva la miniatura de su principal. Si hereda, va atenuada y dice «la del producto». Al tocarla se abre el selector de la galería con «Subir foto para esta variante»: lo que se sube ahí queda como su principal."),
    ("filtro", "3b · Filtro por variante", v_variants_done(),
     "Tras elegir, el aviso confirma con Deshacer. El chip de la variante filtra la galería a lo que esa variante muestra."),
    ("subida", "4 · Subida", view_upload(),
     "Soltar, subir de a 3 con progreso y reducción por foto, reintento solo de la que falló, y el tope de la galería."),
    ("crear", "5 · Crear producto", v_create(),
     "El alta gana el paso «Fotos» (sin URL) y se elige la principal antes de crear. «Antes de crear» lo cuenta. La barra de acción sigue en tinta con el único coral."),
    ("tabla", "6 · Listado: tabla", view_table(),
     "La miniatura de cada fila es la principal real. Sin fotos: hueco punteado y «Subir fotos», que lleva a la galería de la ficha."),
    ("tarjetas", "6b · Listado: tarjetas", view_cards(),
     "Las tarjetas muestran la principal a 4:3 y el número de fotos. «Sin fotos» ofrece subirlas."),
    ("estados", "7 · Estados", view_states(),
     "Vacía, importándose, bloqueada por Shopify, borrar la principal y la cabecera de la ficha con y sin principal."),
]

EXTRA_JS = r"""
<script>
(function(){
  var b=document.getElementById('ring'); if(!b) return;
  function paint(){ b.textContent = document.documentElement.classList.contains('ring-coral') ? 'Anillo: coral' : 'Anillo: tinta'; }
  b.addEventListener('click',function(){ document.documentElement.classList.toggle('ring-coral'); paint(); });
  paint();
})();
</script>
"""

# alturas medidas con qa (ver medir-alturas en el informe); se dejan holgadas
H_DESK = {"ficha": 1180, "usar": 1180, "variantes": 1180, "filtro": 1180, "subida": 1040, "crear": 1420, "tabla": 620, "tarjetas": 620, "estados": 1500}
H_MOB = {"ficha": 1960, "usar": 844, "variantes": 844, "filtro": 1960, "subida": 2300, "crear": 1900, "tabla": 720, "tarjetas": 1700, "estados": 3000}
try:
    _m = json.loads((HERE / "alturas.json").read_text())
    H_DESK.update(_m.get("1440", {}))
    H_MOB.update(_m.get("390", {}))
except (OSError, ValueError):
    pass

TITLES = {k: label for k, label, _, _ in VIEWS}
BODY = {k: body for k, _, body, _ in VIEWS}


def boards() -> list[dict]:
    out = []
    plan = [
        # (vista, ancho, oscuro, archivo, título)
        ("ficha", 1440, False, "Ficha.dc.html", "1 · Ficha › Fotos — una galería, la principal y sus variantes"),
        ("ficha", 390, False, "FichaMovil.dc.html", "1 · Ficha › Fotos — celular"),
        ("ficha", 1440, True, "FichaOscuro.dc.html", "1 · Ficha › Fotos — oscuro"),
        ("ficha", 390, True, "FichaMovilOscuro.dc.html", "1 · Ficha › Fotos — celular oscuro"),
        ("usar", 1440, False, "UsarEnVariante.dc.html", "2 · Usar en variante… — popover"),
        ("usar", 390, False, "UsarEnVarianteMovil.dc.html", "2 · Usar en variante… — hoja en el celular"),
        ("usar", 1440, True, "UsarEnVarianteOscuro.dc.html", "2 · Usar en variante… — oscuro"),
        ("variantes", 1440, False, "Variantes.dc.html", "3 · Variantes — miniatura por fila y selector de la galería"),
        ("variantes", 390, False, "VariantesMovil.dc.html", "3 · Variantes — selector en hoja"),
        ("filtro", 1440, False, "FiltroVariante.dc.html", "3b · Tras elegir: aviso con Deshacer y filtro por variante"),
        ("subida", 1440, False, "Subida.dc.html", "4 · Subida — soltar, progreso por foto, reintento, tope"),
        ("subida", 390, False, "SubidaMovil.dc.html", "4 · Subida — celular («Tomar o elegir fotos»)"),
        ("subida", 1440, True, "SubidaOscuro.dc.html", "4 · Subida — oscuro"),
        ("crear", 1440, False, "Crear.dc.html", "5 · Crear producto — paso Fotos sin URL"),
        ("crear", 390, False, "CrearMovil.dc.html", "5 · Crear producto — celular"),
        ("tabla", 1440, False, "ListadoTabla.dc.html", "6 · Listado — tabla con la principal"),
        ("tarjetas", 1440, False, "ListadoTarjetas.dc.html", "6b · Listado — tarjetas con la principal"),
        ("tarjetas", 390, False, "ListadoMovil.dc.html", "6b · Listado — celular"),
        ("tabla", 1440, True, "ListadoOscuro.dc.html", "6 · Listado — oscuro"),
        ("estados", 1440, False, "Estados.dc.html", "7 · Estados — vacía, importándose, Shopify, borrar la principal, cabecera"),
        ("estados", 1440, True, "EstadosOscuro.dc.html", "7 · Estados — oscuro"),
        ("estados", 390, False, "EstadosMovil.dc.html", "7 · Estados — celular"),
        ("ficha", 1440, False, "FichaAnilloCoral.dc.html", "Comparación · la principal con anillo coral"),
    ]
    for key, w, dark, file, title in plan:
        h = (H_DESK if w > 400 else H_MOB)[key]
        body = BODY[key]
        if file == "FichaAnilloCoral.dc.html":
            body = f'<div class="ring-coral">{body}</div>'
        out.append({"file": file, "title": title, "body": body, "w": w, "h": h, "dark": dark, "key": key})
    return out


def canvas(bs: list[dict]) -> dict:
    # filas por tema, como los lienzos premium: x por columna, y acumulado
    rows: list[list[dict]] = []
    cur_key = None
    groups = {"ficha": 0, "usar": 1, "variantes": 2, "filtro": 2, "subida": 3, "crear": 4, "tabla": 5, "tarjetas": 5, "estados": 6}
    by_row: dict[int, list[dict]] = {}
    for b in bs:
        r = groups[b["key"]] if b["file"] != "FichaAnilloCoral.dc.html" else 7
        by_row.setdefault(r, []).append(b)
    names = {0: "La galería en la ficha", 1: "Usar una foto en variantes", 2: "La principal de cada variante", 3: "Subir fotos", 4: "Crear producto", 5: "El listado", 6: "Estados", 7: "Comparación del anillo"}
    y = 0
    boards_out, order, notes = {}, [], {}
    for r in sorted(by_row):
        x = 0
        notes[f"row{r}"] = {"x": 0, "y": y - 300 if y else -300, "text": names[r], "kind": "title1", "maxW": 4000}
        if y == 0:
            notes[f"row{r}"]["y"] = -300
        tallest = 0
        for b in by_row[r]:
            boards_out[b["file"]] = {"x": x, "y": y, "w": b["w"], "h": b["h"], "title": b["title"]}
            order.append(b["file"])
            x += b["w"] + 80
            tallest = max(tallest, b["h"])
        y += tallest + 420
        notes[f"row{r}"]["y"] = boards_out[by_row[r][0]["file"]]["y"] - 300 if r else -300
    return {
        "v": 3,
        "title": "Catálogo · Galería y foto principal",
        "launch": {"view": "canvas"},
        "pages": [],
        "boards": boards_out,
        "order": order,
        "notes": notes,
        "designSystems": [],
    }


if __name__ == "__main__":
    views = [(k, label, wrap(body), note) for k, label, body, note in VIEWS]
    K.build_html("Galería del catálogo", "Mockup · no es producto", f"Catálogo · {PRODUCT}", views)
    out = HERE / "catalog-gallery.html"
    doc = out.read_text()
    doc = doc.replace('<button class="mk-theme" id="theme">Tema</button>', '<button class="mk-theme" id="theme">Tema</button><button class="mk-theme" id="ring">Anillo: tinta</button>')
    doc = doc.replace("</body>", EXTRA_JS + "</body>")
    out.write_text(doc)
    bs = boards()
    K.export_artboards([{k: v for k, v in b.items() if k != "key"} for b in bs])
    proj = pathlib.Path(os.environ["AXI_MOCKUP_ARTBOARDS_DIR"]) / "project"
    (proj / "canvas.json").write_text(json.dumps(canvas(bs), indent=1, ensure_ascii=False))
    print(f"  canvas.json: {len(bs)} artboards")
