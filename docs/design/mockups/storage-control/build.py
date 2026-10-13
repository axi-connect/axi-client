#!/usr/bin/env python3
"""Mockup «Control de almacenamiento»: cuota por plan/tenant, disco del servidor, consumo por tenant,
depuración y retención (solo platform) y la vista de solo lectura del tenant.

Plan: axi-server/docs/plans/storage_control_plan.md (D1–D9) y axi-client/docs/plans/storage_control_ui.md.
Es un mockup para aprobar, no es producto.

Uso:
  AXI_NEXA_URL=/_blob/<id> python3 build.py   → storage-control.html + project/*.dc.html + project/canvas.json

Se apoya en el kit común (../_axi_mockup_kit.py) y en la receta de la isla de cobros-premium.
"""
from __future__ import annotations

import json
import os
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import _axi_mockup_kit as kit  # noqa: E402

kit.S = HERE
os.environ.setdefault("AXI_MOCKUP_ARTBOARDS_DIR", str(HERE))

K = kit.Kit("storage-control")
ic, btn, badge = K.ic, K.btn, K.badge

ISLAND = (HERE.parent / "cobros-premium" / "island-recipe.css").read_text()

# ============================================================================ CSS propio
K.extra_css = ISLAND + r"""
.pg{max-width:1200px;margin:0 auto;padding:20px 24px 96px;display:flex;flex-direction:column;gap:20px}
@container (max-width: 699px){ .pg{padding:16px 16px 96px;gap:16px} }
.hrow{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px}
.hrow h1{font-size:30px;line-height:1.1}
.hrow .lead{color:var(--muted-foreground);font-size:13.5px;margin-top:4px;max-width:62ch}
.hrow .right{display:flex;gap:8px;flex-wrap:wrap}
.btn.r{border-radius:999px}
.btn.del{background:var(--background);color:var(--axi-destructive);border-color:color-mix(in srgb, var(--axi-destructive) 40%, transparent)}

/* bento */
.bento{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(17rem,20rem);align-items:stretch}
.bento > *{min-width:0}
.bento .isl-slot{grid-column:4;grid-row:1 / span 2}
.leg.cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.leg.cols .r{border-top:0;padding:0;grid-template-columns:10px minmax(0,1fr);align-items:start}
.leg.cols .r .sw2{margin-top:5px}
.leg.cols .r .v{grid-column:2;text-align:left;font-family:var(--font-heading);font-size:20px}
.leg .r > span{min-width:0;overflow-wrap:anywhere}
@container (max-width: 699px){ .leg.cols{grid-template-columns:minmax(0,1fr)} }
.bento .span2{grid-column:span 2}
.bento .span3{grid-column:span 3}
@container (max-width: 1099px){ .bento{grid-template-columns:repeat(2,minmax(0,1fr))} .bento .isl-slot{grid-column:1 / -1;grid-row:auto;order:-1} .bento .span3{grid-column:1 / -1} }
.bento.b3{grid-template-columns:repeat(3,minmax(0,1fr))}
@container (max-width: 1099px){ .bento.b3{grid-template-columns:repeat(2,minmax(0,1fr))} .bento.b3 .span2{grid-column:1 / -1} }
@container (max-width: 699px){ .bento,.bento.b3{grid-template-columns:minmax(0,1fr)} .bento .span2,.bento .span3{grid-column:auto} }
.tile{display:flex;flex-direction:column;gap:12px;border:1px solid var(--border);background:var(--background);border-radius:24px;padding:20px;min-width:0}
.tile > header{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:24px}
.tile > header h2{font-family:var(--font-body);font-size:12px;font-weight:400;color:var(--muted-foreground);letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fig{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px}
.fig b{font-family:var(--font-heading);font-weight:700;font-size:40px;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.fig.md b{font-size:30px}
.fig span{font-size:14px;color:var(--muted-foreground)}
.ln{font-size:13px;color:var(--muted-foreground);line-height:1.45}
.ln b{color:var(--foreground);font-weight:500}
.prov{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted-foreground)}
.pill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:var(--secondary);font-size:12px;font-weight:500;white-space:nowrap}
.pill i{width:6px;height:6px;border-radius:50%;background:var(--muted-foreground)}
.pill.ok i{background:var(--axi-success)} .pill.warn i{background:var(--axi-warning)} .pill.full i{background:var(--axi-destructive)} .pill.info i{background:var(--axi-info)}

/* medidores */
.mtr{position:relative;height:8px;border-radius:999px;background:var(--secondary);overflow:visible}
.mtr > i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--foreground)}
.mtr.warn > i{background:var(--axi-warning)} .mtr.full > i{background:var(--axi-destructive)}
.mtr .mk{position:absolute;top:-3px;bottom:-3px;width:2px;border-radius:2px;background:var(--background);box-shadow:0 0 0 1px var(--border)}
.mtr.thin{height:6px}
.mscale{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted-foreground);font-variant-numeric:tabular-nums}

/* barra apilada por origen (neutros: el color es estado, no categoría) */
.stk{display:flex;height:10px;border-radius:999px;overflow:hidden;background:var(--secondary);gap:2px}
.stk i{display:block;height:100%}
.o1{background:color-mix(in srgb, var(--foreground) 88%, var(--background))}
.o2{background:color-mix(in srgb, var(--foreground) 50%, var(--background))}
.o3{background:color-mix(in srgb, var(--foreground) 24%, var(--background))}
.leg{display:flex;flex-direction:column;gap:2px}
.leg .r{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--border-soft);font-size:13px}
.leg .r:first-child{border-top:0}
.leg .r .sw2{width:10px;height:10px;border-radius:3px}
.leg .r b{font-weight:500} .leg .r small{display:block;color:var(--muted-foreground);font-size:12px}
.leg .r .v{font-variant-numeric:tabular-nums;font-weight:500;text-align:right;white-space:nowrap}
.leg .r .v small{font-weight:400}

/* sparkline */
.spark{width:100%;height:56px;display:block}
.spark .a{fill:color-mix(in srgb, var(--foreground) 6%, transparent)}
.spark .l{fill:none;stroke:var(--foreground);stroke-width:1.6}
.spark .p{fill:none;stroke:var(--muted-foreground);stroke-width:1.4;stroke-dasharray:3 4}

/* isla */
.isl{padding:20px;display:flex;flex-direction:column;gap:6px}
.isl h2{font-size:22px;line-height:1.15;position:relative;z-index:2}
.isl .kick{font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:500;opacity:.7;position:relative;z-index:2}
.isl .it{display:grid;grid-template-columns:10px minmax(0,1fr);gap:10px;padding:12px 0;border-top:1px solid rgba(11,11,14,.08);position:relative;z-index:2}
.isl-dark .it{border-top-color:rgba(255,255,255,.10)}
.isl .it i{width:8px;height:8px;border-radius:50%;margin-top:6px;background:#6B6B73}
.isl .it i.full{background:#DC2626} .isl .it i.warn{background:#D97706}
.isl .it b{display:block;font-weight:600;font-size:14px} .isl .it span{font-size:12.5px;opacity:.75;line-height:1.45;display:block}
.isl .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;position:relative;z-index:2}
.isl .btn-contrast,.isl .btn-glass{height:36px;padding:0 14px;font-size:13px}

/* barra de acción en tinta */
.inkbar{position:relative;z-index:5;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 12px 12px 20px;border-radius:24px;color:#F4F4F5;background:radial-gradient(circle 20rem at 90% 8%,rgba(230,87,89,.35),transparent 70%),#0B0B0E;box-shadow:0 20px 50px -20px rgba(0,0,0,.45)}
.inkbar .t b{display:block;font-size:14px;font-weight:600} .inkbar .t span{font-size:12.5px;opacity:.75}
.inkbar .acts{display:flex;gap:8px;flex-wrap:wrap}
.inkbar .ghost2{display:inline-flex;align-items:center;height:36px;padding:0 14px;border-radius:999px;color:#F4F4F5;font-size:13px;font-weight:500;border:1px solid rgba(255,255,255,.18)}
.inkbar .btn.destructive{border-radius:999px}

/* tabla en tarjeta */
.tcard{border:1px solid var(--border);border-radius:24px;background:var(--background);overflow:hidden;min-width:0}
.tcard .th{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-soft)}
.tcard .th h2{font-family:var(--font-body);font-size:15px;font-weight:600;letter-spacing:0}
.tcard .th .tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tcard .th .input{width:240px}
.tscroll{overflow-x:auto}
.tcard table{min-width:760px}
.tcard th,.tcard td{padding:12px 20px}
.tcard td .mtr{width:120px}
.tcard tr.sel td{background:color-mix(in srgb, var(--foreground) 3%, var(--background))}
.cbx{width:16px;height:16px;border-radius:5px;border:1.5px solid color-mix(in srgb, var(--foreground) 35%, transparent);display:inline-grid;place-items:center;vertical-align:middle}
.cbx.on{background:var(--foreground);border-color:var(--foreground);color:var(--background)}
.fthumb{width:36px;height:36px;border-radius:10px;background:var(--secondary);display:inline-grid;place-items:center;color:var(--muted-foreground);vertical-align:middle;margin-right:10px;flex:none}
.fname{display:flex;align-items:center;min-width:0}
.fname .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
@container (max-width: 699px){ .tcard .th .input{width:100%} }

/* tarjetas de depuración */
.pgrid{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
@container (max-width: 999px){ .pgrid{grid-template-columns:repeat(2,minmax(0,1fr))} }
@container (max-width: 599px){ .pgrid{grid-template-columns:minmax(0,1fr)} }
.pk{display:grid;grid-template-columns:40px minmax(0,1fr);gap:4px 12px;align-items:start;padding:16px;border-radius:20px;border:1px solid var(--border);background:var(--background);text-align:left;width:100%}
.pk .pic{width:40px;height:40px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;grid-row:span 2}
.pk b{font-weight:500;font-size:14px}
.pk span{font-size:12.5px;color:var(--muted-foreground);line-height:1.4}
.pk .rec{grid-column:2;margin-top:6px;font-size:12.5px;font-variant-numeric:tabular-nums}
.pk .rec b{font-size:13px}
.pk[aria-pressed="true"]{border-color:var(--foreground);box-shadow:0 0 0 1px var(--foreground)}

.sect{display:flex;flex-direction:column;gap:12px}
.sect > .sh{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;flex-wrap:wrap}
.sect > .sh h2{font-family:var(--font-body);font-size:17px;font-weight:600;letter-spacing:-.01em}
.sect > .sh p{font-size:13px;color:var(--muted-foreground)}

/* filtros de purga */
.filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 16px}
@container (max-width: 799px){ .filters{grid-template-columns:minmax(0,1fr)} }
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--border);background:var(--background);font-size:13px;font-weight:500;white-space:nowrap}
.chip[aria-pressed="true"]{background:var(--foreground);border-color:var(--foreground);color:var(--background)}
.prev{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:20px;align-items:start}
@container (max-width: 899px){ .prev{grid-template-columns:minmax(0,1fr)} }
.keep{display:flex;flex-direction:column;gap:8px;padding:14px 16px;border-radius:16px;background:var(--secondary);font-size:13px}
.keep .r{display:flex;gap:10px;align-items:flex-start}
.keep .r .ic{margin-top:2px;color:var(--muted-foreground)}
.samp{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.samp div{aspect-ratio:1;border-radius:10px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground)}

/* políticas */
.pol{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:4px 16px;align-items:center;padding:12px 0;border-top:1px solid var(--border-soft);font-size:13.5px}
.pol:first-of-type{border-top:0}
.pol b{font-weight:500} .pol small{display:block;font-size:12px;color:var(--muted-foreground)}
.pol .age{font-variant-numeric:tabular-nums;color:var(--muted-foreground);font-size:13px;white-space:nowrap}

/* sheet lateral */
.scrim{position:absolute;inset:0;background:var(--scrim);z-index:20}
.sheet{position:absolute;top:0;right:0;bottom:0;width:440px;max-width:100%;z-index:21;background:var(--background);border-left:1px solid var(--border);box-shadow:var(--shadow-overlay);display:flex;flex-direction:column}
.sheet .sh-h{padding:20px 24px;border-bottom:1px solid var(--border-soft);display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.sheet .sh-h h2{font-family:var(--font-body);font-size:18px;font-weight:600;letter-spacing:-.01em}
.sheet .sh-b{padding:20px 24px;display:flex;flex-direction:column;gap:18px;flex:1}
.sheet .sh-f{padding:12px 16px}
.seg2{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:var(--secondary)}
.seg2 button{height:56px;border-radius:10px;text-align:left;padding:0 12px;font-size:13px;display:flex;flex-direction:column;justify-content:center}
.seg2 button small{font-size:11.5px;color:var(--muted-foreground)}
.seg2 button[aria-checked="true"]{background:var(--background);box-shadow:var(--shadow-float);font-weight:500}
.gbin{display:flex;align-items:center;gap:8px}
.gbin .input{width:140px;font-variant-numeric:tabular-nums;font-weight:500}
.gbin .pre{display:flex;gap:6px;flex-wrap:wrap}

/* modal de confirmación */
.cmodal{position:relative;width:100%;max-width:520px;border-radius:24px;border:1px solid var(--border);background:var(--background);box-shadow:var(--shadow-overlay);padding:24px;display:flex;flex-direction:column;gap:16px}
.cmodal h2{font-family:var(--font-body);font-size:20px;font-weight:600;letter-spacing:-.01em}
.cmodal p{color:var(--muted-foreground);font-size:13.5px}
.cmodal .facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.cmodal .facts div{padding:12px;border-radius:14px;background:var(--secondary)}
.cmodal .facts b{display:block;font-family:var(--font-heading);font-size:22px;font-variant-numeric:tabular-nums}
.cmodal .facts span{font-size:12px;color:var(--muted-foreground)}
.cmodal .mono-ph{font-family:var(--font-mono);font-size:13px}
.cmodal .foot{display:flex;justify-content:flex-end;gap:8px}

/* avisos en subidas (tenant) */
.composer{border:1px solid var(--border);border-radius:20px;background:var(--background);padding:10px 12px;display:flex;gap:8px;align-items:center}
.composer .tx{flex:1;color:var(--muted-foreground);font-size:14px}
.composer .clip{width:36px;height:36px;border-radius:999px;display:grid;place-items:center;color:var(--muted-foreground);opacity:.45;position:relative}
.tip{position:absolute;bottom:46px;left:-8px;width:260px;padding:10px 12px;border-radius:14px;background:#0B0B0E;color:#F4F4F5;font-size:12.5px;line-height:1.4;box-shadow:var(--shadow-overlay)}
.pillnote{display:inline-flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;border-radius:999px;background:#0B0B0E;color:#F4F4F5;font-size:13px;box-shadow:var(--shadow-overlay);max-width:100%}
.pillnote .ic{color:#FCA5A5}
.pillnote a{color:#F4F4F5;font-weight:500;white-space:nowrap;text-underline-offset:3px}
.bub{max-width:320px;border-radius:18px 18px 18px 6px;background:var(--secondary);padding:10px 12px;display:flex;gap:10px;align-items:center}
.bub .fi{width:40px;height:40px;border-radius:12px;border:1.5px dashed color-mix(in srgb, var(--foreground) 22%, transparent);display:grid;place-items:center;color:var(--muted-foreground);flex:none}
.bub b{display:block;font-size:13px;font-weight:500} .bub span{font-size:12px;color:var(--muted-foreground)}
.bub .tm{font-size:11px;color:var(--muted-foreground);align-self:flex-end;white-space:nowrap}
.board{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))}
.board figure{margin:0;display:flex;flex-direction:column;gap:10px;min-width:0}
.board figcaption{font-size:12.5px;color:var(--muted-foreground);line-height:1.45}
.board figcaption b{display:block;color:var(--foreground);font-weight:500;font-size:13px}
.stage{border:1px solid var(--border);border-radius:24px;padding:20px;background:color-mix(in srgb, var(--foreground) 2%, var(--background));display:flex;flex-direction:column;gap:12px;min-height:160px;justify-content:center}

.banner{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 16px;border-radius:20px;border:1px solid var(--border);background:var(--secondary);font-size:13.5px}
.banner .ic{color:var(--axi-destructive)}
.banner b{font-weight:500}
@container (max-width: 599px){ .banner{grid-template-columns:20px minmax(0,1fr)} .banner .btn{grid-column:2;justify-self:start} }
.crumb b{min-width:0;overflow-wrap:anywhere}
.sk{background:color-mix(in srgb, var(--foreground) 8%, transparent);border-radius:8px}
"""

# ============================================================================ datos
GB = 1024 ** 3


def gb(v: float, dec: int = 1) -> str:
    """Formato es-CO: coma decimal."""
    if v >= 1000:
        return f"{v / 1024:.{dec}f}".replace(".", ",") + " TB"
    if v < 1:
        return f"{round(v * 1024)} MB"
    return f"{v:.{dec}f}".replace(".", ",") + " GB"


def num(n: int) -> str:
    return f"{n:,}".replace(",", ".")


DISK = {"total": 480, "used": 312.4, "free": 167.6}

# (nombre, plan, usado GB, cuota GB, origen cuota, crecimiento 30d GB, estado)
TENANTS = [
    ("Clínica Dermalux", "Crecimiento", 15.0, 15, "plan", 1.8, "full"),
    ("Bici Andes", "Escala", 34.6, 40, "plan", 2.1, "warn"),
    ("Óptica Visión Clara Medellín y Sabaneta", "Esencial", 4.1, 5, "plan", 0.4, "warn"),
    ("Panadería La Espiga", "Crecimiento", 9.2, 25, "override", 0.9, "ok"),
    ("Constructora Horizonte Verde S.A.S.", "Enterprise", 61.3, 150, "plan", 3.4, "ok"),
    ("Tienda Kora", "Esencial", 1.2, 5, "plan", 0.1, "ok"),
    ("Spa Raíz", "Trial", 0.3, 1, "plan", 0.3, "ok"),
]
QUOTA_SUM = 640


def state_pill(state: str) -> str:
    return {
        "full": '<span class="pill full"><i></i>Lleno</span>',
        "warn": '<span class="pill warn"><i></i>Cerca del límite</span>',
        "ok": '<span class="pill ok"><i></i>Con espacio</span>',
        "none": '<span class="pill"><i></i>Sin cuota</span>',
    }[state]


def meter(pct: float, cls: str = "", mark: float | None = 80) -> str:
    st = "full" if pct >= 100 else "warn" if pct >= 80 else ""
    m = f'<span class="mk" style="left:{mark}%"></span>' if mark else ""
    return f'<div class="mtr {st} {cls}" role="progressbar" aria-valuenow="{round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:{min(pct, 100)}%"></i>{m}</div>'


def spark(points: list[float], proj: list[float] | None = None) -> str:
    w, h = 300, 56
    mx = max(points + (proj or [])) * 1.08
    n = len(points) + (len(proj) - 1 if proj else 0)
    xs = [i * w / (n - 1) for i in range(n)]
    pts = " ".join(f"{xs[i]:.1f},{h - points[i] / mx * h:.1f}" for i in range(len(points)))
    area = f"0,{h} " + pts + f" {xs[len(points) - 1]:.1f},{h}"
    p = ""
    if proj:
        off = len(points) - 1
        pp = " ".join(f"{xs[off + i]:.1f},{h - proj[i] / mx * h:.1f}" for i in range(len(proj)))
        p = f'<polyline class="p" points="{pp}"/>'
    return f'<svg class="spark" viewBox="0 0 {w} {h}" preserveAspectRatio="none" aria-hidden="true"><polygon class="a" points="{area}"/><polyline class="l" points="{pts}"/>{p}</svg>'


# ============================================================================ shells
SECTIONS = [
    (None, [("Dashboard", "layout-dashboard")]),
    ("Operación", [("Tenants", "building-2"), ("Llamadas", "phone"), ("Puesta en marcha", "message-circle-heart")]),
    ("Dinero", [("Planes", "layers"), ("Pricing IA", "circle-dollar-sign"), ("Facturación", "receipt")]),
    ("IA", [("Calidad", "flask-conical"), ("Voces IA", "audio-lines")]),
    ("Control", [("Analytics", "activity"), ("Auditoría", "scroll-text"), ("Almacenamiento", "hard-drive")]),
    ("Configuración", [("Proveedores", "plug")]),
]
for _, items in SECTIONS:
    assert [t for t, _ in items] == sorted((t for t, _ in items), key=len), items

K.extra_css += r"""
.prow{display:flex;min-height:100%}
.psb{width:248px;flex:none;display:flex;flex-direction:column;border-right:1px solid var(--border);background:var(--background)}
.psb-head{display:flex;align-items:center;gap:10px;padding:14px}
.psb-mark{width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,var(--axi-brand),var(--axi-violet));flex:none}
.psb-head .t{display:flex;flex-direction:column;line-height:1.15}
.psb-head .t span{font-size:13.5px;font-weight:500}
.psb-head .t small{display:inline-flex;width:fit-content;margin-top:3px;padding:1px 6px;border-radius:999px;border:1px solid color-mix(in srgb,var(--axi-violet) 40%,transparent);background:color-mix(in srgb,var(--axi-violet) 10%,transparent);color:var(--axi-violet);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase}
.psb nav{padding:4px 8px;display:flex;flex-direction:column;gap:6px}
.psb-label{height:26px;display:flex;align-items:center;padding:0 8px;font-size:11px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:var(--muted-foreground)}
.psb a{display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;border-radius:8px;text-decoration:none;font-size:13.5px;white-space:nowrap}
.psb a .ic{color:var(--muted-foreground)}
.psb a[aria-current="page"]{background:var(--accent);font-weight:500}
.psb a[aria-current="page"] .ic{color:var(--axi-brand)}
.prow > main{flex:1;min-width:0;position:relative}
.mtop{display:none}
@container (max-width: 899px){ .psb{display:none} .mtop{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border)} .mtop b{font-weight:500;font-size:14px} }
"""


def platform_shell(active: str, body: str, overlay: str = "") -> str:
    groups = ""
    for title, items in SECTIONS:
        links = "".join(
            f'<a href="#"{" aria-current=page" if lbl == active else ""}>{ic(icon)}<span>{lbl}</span></a>' for lbl, icon in items
        )
        lbl = f'<div class="psb-label">{title}</div>' if title else ""
        groups += f'<div role="group" aria-label="{title or "Inicio"}">{lbl}{links}</div>'
    return f"""<div class="prow">
      <aside class="psb" aria-label="Navegación de plataforma"><div class="psb-head"><div class="psb-mark"></div><div class="t"><span>Axi Connect</span><small>Plataforma</small></div></div><nav>{groups}</nav></aside>
      <main><div class="mtop">{btn("", "menu", "ghost icon sm", 'aria-label="Abrir menú"')}<b>{active}</b></div>{body}{overlay}</main>
    </div>"""


TENANT_TABS = [("Resumen", "layout-dashboard"), ("Usuarios", "users"), ("Plan & Límites", "gauge"), ("Almacenamiento", "hard-drive"),
               ("Facturación", "receipt"), ("Funciones", "sliders-horizontal"), ("Voz", "audio-lines"), ("Auditoría", "scroll-text")]


def tenant_head(name: str = "Clínica Dermalux") -> str:
    return f"""{K.crumb("Plataforma", "Tenants", name)}
      <div class="hrow"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><h1 style="font-family:var(--font-body);font-weight:600;font-size:28px">{name}</h1>{badge("Activo", "ok")}<span class="muted small">Plan Crecimiento · Bogotá</span></div></div>
      {K.nav(TENANT_TABS, "Almacenamiento", "Secciones del tenant", "inline")}"""


# ============================================================================ P1 · Almacenamiento global
def disk_tile(unavailable: bool = False) -> str:
    if unavailable:
        return f"""<section class="tile span2"><header><h2>Disco del servidor · MinIO</h2><span class="pill"><i></i>Sin lectura</span></header>
          <div class="fig"><b>167,6</b><span>GB libres hace 2 h</span></div>
          {meter(65, mark=None)}
          <p class="ln">No pudimos leer el disco desde las 14:05. Mostramos el último valor medido. Las subidas siguen funcionando; si el dato pasa de 30 min, el freno físico se suspende hasta tener lectura.</p>
          <div>{btn("Reintentar lectura", "refresh-cw", "outline sm r")}</div></section>"""
    pct = DISK["used"] / DISK["total"] * 100
    return f"""<section class="tile span2"><header><h2>Disco del servidor · MinIO</h2><span class="pill ok"><i></i>Sano</span></header>
      <div class="fig"><b>167,6</b><span>GB libres de 480 GB</span></div>
      {meter(pct, mark=80)}
      <div class="mscale"><span>Usado 312,4 GB</span><span>Aviso al 80 % · crítico al 90 %</span></div>
      {spark([231, 244, 251, 262, 270, 281, 289, 297, 305, 312.4], [312.4, 330, 352, 376, 402, 430, 456, 480])}
      <p class="ln">Crece <b>≈ 24 GB al mes</b>. A este ritmo el disco se llena en <b>unos 7 meses</b>.</p>
      <span class="prov">{ic("activity", size=12)}Medido hace 3 min en el disco · tendencia según los últimos 90 días</span></section>"""


def assigned_tile() -> str:
    return f"""<section class="tile"><header><h2>Cuotas</h2><span class="pill info"><i></i>×1,3 del disco</span></header>
      <div class="fig md"><b>640</b><span>GB prometidos</span></div>
      <p class="ln">Los tenants tienen derecho a 640 GB y el disco mide 480 GB. Es normal sobrevender: hoy usan <b>126,0 GB</b> entre todos.</p>
      <span class="prov">{ic("layers", size=12)}Suma de cuotas de plan y ampliaciones</span></section>"""


def origin_tile() -> str:
    return f"""<section class="tile span2"><header><h2>Quién llena el disco</h2></header>
      <div class="stk" aria-hidden="true"><i class="o1" style="width:62%"></i><i class="o2" style="width:24%"></i><i class="o3" style="width:14%"></i></div>
      <div class="leg cols">
        <div class="r"><span class="sw2 o1"></span><span><b>Clientes</b><small>Fotos, audios y videos que llegan por chat</small></span><span class="v">193,7 GB</span></div>
        <div class="r"><span class="sw2 o2"></span><span><b>Equipos</b><small>Catálogo, adjuntos, recursos</small></span><span class="v">75,0 GB</span></div>
        <div class="r"><span class="sw2 o3"></span><span><b>Sistema</b><small>Grabaciones, PDF, notas de voz</small></span><span class="v">43,7 GB</span></div>
      </div></section>"""


def tenants_count_tile() -> str:
    return f"""<section class="tile"><header><h2>Tenants al límite</h2></header>
      <div class="fig md"><b>3</b><span>de 48</span></div>
      <p class="ln"><b>1 lleno</b>: sus subidas del equipo están en pausa. 2 pasan del 80 %.</p>
      <span class="prov">{ic("bell", size=12)}Les avisamos al 80 % y al 100 %</span></section>"""


def island_next() -> str:
    return f"""<aside class="isl isl-glass glow-brand isl-slot" aria-label="Lo próximo">
      <span class="kick">Lo próximo</span>
      <h2>Una cuenta llena y dos en camino</h2>
      <div class="it"><i class="full"></i><div><b>Clínica Dermalux · 15 de 15 GB</b><span>Su equipo no puede subir archivos desde ayer. 9,8 GB son videos de chats de más de 6 meses.</span></div></div>
      <div class="it"><i class="warn"></i><div><b>Bici Andes · 87 %</b><span>Al ritmo de 2,1 GB al mes llega al límite en 3 meses.</span></div></div>
      <div class="it"><i class="warn"></i><div><b>Óptica Visión Clara · 82 %</b><span>Sin retención activa.</span></div></div>
      <div class="acts"><a class="btn-contrast" href="#">Ver Clínica Dermalux</a><a class="btn-glass" href="#">Ver los tres</a></div>
    </aside>"""


def tenants_table(rows: list = TENANTS, title: str = "Consumo por tenant") -> str:
    trs = ""
    for name, plan, used, quota, src, grow, st in rows:
        pct = used / quota * 100
        srcl = "Ampliada" if src == "override" else f"Plan {plan}"
        trs += f"""<tr><td><span class="t" style="display:block;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{name}</span><span class="d">{srcl}</span></td>
          <td><div style="display:flex;flex-direction:column;gap:6px">{meter(pct, "thin")}</div></td>
          <td class="num"><b style="font-weight:500">{gb(used)}</b> <span class="muted">de {quota} GB</span></td>
          <td class="num muted">+{gb(grow)}</td>
          <td>{state_pill(st)}</td>
          <td style="width:40px">{btn("", "chevron-right", "ghost icon sm", f'aria-label="Abrir {name}"')}</td></tr>"""
    return f"""<section class="tcard"><div class="th"><h2>{title}</h2><div class="tools">{K.input("", "Buscar tenant", icon="search", cls="adorn")}
        <nav class="seg inline sm" aria-label="Orden"><button aria-checked="true">Más lleno</button><button aria-checked="false">Crece más</button></nav></div></div>
      <div class="tscroll"><table><thead><tr><th>Tenant</th><th>Uso</th><th class="num">Ocupa</th><th class="num">Últimos 30 días</th><th>Estado</th><th></th></tr></thead><tbody>{trs}</tbody></table></div></section>"""


def view_overview(unavailable: bool = False) -> str:
    body = f"""<div class="pg">
      <div class="hrow"><div><h1>Almacenamiento</h1><p class="lead">El disco del servidor y lo que ocupa cada tenant. Las cuotas y la depuración se manejan desde la ficha de cada uno.</p></div></div>
      <div class="bento">{disk_tile(unavailable)}{assigned_tile()}{island_next()}{origin_tile()}{tenants_count_tile()}</div>
      {tenants_table()}
    </div>"""
    return platform_shell("Almacenamiento", body)


# ============================================================================ P2 · Tenant › Almacenamiento
def usage_tile() -> str:
    return f"""<section class="tile span2"><header><h2>Espacio de Clínica Dermalux</h2>{state_pill("full")}</header>
      <div class="fig"><b>15,0</b><span>GB de 15 GB</span></div>
      {meter(100)}
      <div class="mscale"><span>Cuota del plan Crecimiento</span><span>Lleno desde el 7 oct</span></div>
      <p class="ln">Las subidas de su equipo están en pausa. <b>Los mensajes de sus clientes siguen llegando completos</b> y cuentan en el espacio.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">{btn("Cambiar cuota", "pencil", "outline sm r")}{btn("Depurar", "eraser", "outline sm r")}</div></section>"""


def breakdown_tile() -> str:
    rows = [
        ("o1", "Videos de clientes", "412 archivos", "7,9 GB"),
        ("o1", "Fotos y audios de clientes", "6.204 archivos", "3,1 GB"),
        ("o2", "Catálogo", "318 fotos · 3 tamaños c/u", "1,6 GB"),
        ("o2", "Adjuntos y recursos del equipo", "211 archivos", "0,9 GB"),
        ("o3", "Grabaciones de llamadas", "96 llamadas", "1,2 GB"),
        ("o3", "PDF y notas de voz", "1.380 archivos", "0,3 GB"),
    ]
    rr = "".join(f'<div class="r"><span class="sw2 {c}"></span><span><b>{t}</b><small>{s}</small></span><span class="v">{v}</span></div>' for c, t, s, v in rows)
    return f"""<section class="tile span2"><header><h2>En qué se va</h2><span class="prov">Clientes · Equipo · Sistema</span></header>
      <div class="stk" aria-hidden="true"><i class="o1" style="width:73%"></i><i class="o2" style="width:17%"></i><i class="o3" style="width:10%"></i></div>
      <div class="leg">{rr}</div></section>"""


def growth_tile() -> str:
    return f"""<section class="tile"><header><h2>Crecimiento</h2></header>
      <div class="fig md"><b>+1,8</b><span>GB al mes</span></div>
      {spark([6.1, 7.4, 8.9, 10.2, 11.6, 13.2, 15.0])}
      <span class="prov">{ic("activity", size=12)}Según los últimos 6 meses</span></section>"""


def retention_tile(on: bool = False) -> str:
    if on:
        return f"""<section class="tile"><header><h2>Retención automática</h2><span class="pill ok"><i></i>Activa</span></header>
          <p class="ln">Videos de chats de más de <b>6 meses</b> y grabaciones de más de <b>90 días</b> se borran cada noche.</p>
          <span class="prov">{ic("clock", size=12)}Próxima: hoy 03:30 · ≈ 0,4 GB</span></section>"""
    return f"""<section class="tile"><header><h2>Retención automática</h2><span class="pill"><i></i>Apagada</span></header>
      <p class="ln">Nada se borra solo. Con la plantilla recomendada liberaría <b>≈ 10,3 GB</b> esta noche.</p>
      <div>{btn("Configurar", "settings-2", "outline sm r")}</div></section>"""


def tenant_island() -> str:
    return f"""<aside class="isl isl-glass glow-brand" aria-label="Lo próximo">
      <span class="kick">Lo próximo</span>
      <h2>Liberar 9,8 GB o ampliar</h2>
      <div class="it"><i class="full"></i><div><b>318 videos de más de 6 meses</b><span>Los enviaron sus clientes. Borrarlos deja la cuenta en 5,2 GB y reanuda las subidas.</span></div></div>
      <div class="it"><i></i><div><b>O ampliar a 25 GB</b><span>A su ritmo de 1,8 GB al mes, alcanza para unos 5 meses.</span></div></div>
      <div class="acts"><a class="btn-contrast" href="#">Ver vista previa</a><a class="btn-glass" href="#">Ampliar cuota</a></div>
    </aside>"""


def purge_cards(active: str = "") -> str:
    cards = [
        ("media", "message-square", "Media de chats antiguos", "Por tipo y edad. El mensaje queda con «Archivo eliminado».", "hasta 10,6 GB"),
        ("trash", "trash", "Papelera", "Fotos y recursos ya borrados que siguen ocupando.", "0,4 GB"),
        ("big", "file-stack", "Archivos grandes", "Elige uno a uno o en lote, con vista previa.", "Los 200 más pesados"),
        ("calls", "phone", "Grabaciones", "Llamadas grabadas por antigüedad.", "hasta 1,2 GB"),
        ("imports", "file-spreadsheet", "Importaciones", "Archivos de catálogo y contactos ya procesados.", "62 MB"),
        ("pdf", "file-text", "PDF regenerables", "Cotizaciones y borradores. Las facturas emitidas no se tocan.", "48 MB"),
    ]
    out = ""
    for k, icon, t, d, r in cards:
        out += f'<button class="pk" aria-pressed="{str(k == active).lower()}"><span class="pic">{ic(icon, size=18)}</span><b>{t}</b><span>{d}</span><span class="rec">Recuperable: <b>{r}</b></span></button>'
    return f'<div class="pgrid">{out}</div>'


def policies_card() -> str:
    pols = [
        ("Videos que envían los clientes", "Media de chats", "180 días", False),
        ("Resto de media de chats", "Fotos, audios y documentos", "365 días", False),
        ("Grabaciones de llamadas", "Sistema", "90 días", False),
        ("Importaciones procesadas", "Catálogo y contactos", "30 días", False),
    ]
    rows = "".join(
        f'<div class="pol"><span><b>{t}</b><small>{s}</small></span><span class="age">más de {a}</span>{K.switch(on, label=t)}</div>' for t, s, a, on in pols
    )
    return f"""<section class="tile"><header><h2>Retención automática</h2><span class="pill"><i></i>Apagada</span></header>
      <div style="display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap"><p class="ln">Nada se borra solo. Con la plantilla recomendada liberaría <b>≈ 10,3 GB</b> esta noche y luego unos 0,4 GB cada mes.</p>{btn("Usar la recomendada", "wand-sparkles", "outline sm r")}</div>
      <div>{rows}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center"><span class="prov">{ic("clock", size=12)}Se aplica cada noche a las 03:30 · las facturas emitidas y los comprobantes de pago nunca se borran</span>{btn("Agregar regla", "plus", "outline sm r")}</div></section>"""


def runs_card() -> str:
    rows = [
        ("6 oct · 16:20", "Archivos grandes · 14 seleccionados", "2,3 GB", "ops@megaguay.com.co"),
        ("12 sep · 09:02", "Papelera", "0,2 GB", "ops@megaguay.com.co"),
        ("Cada noche", "Retención · importaciones", "≈ 20 MB/noche", "Automática"),
    ]
    trs = "".join(f'<tr><td class="muted" style="white-space:nowrap">{a}</td><td>{b}</td><td class="num">{c}</td><td class="muted">{d}</td></tr>' for a, b, c, d in rows)
    return f"""<section class="tcard"><div class="th"><h2>Historial de depuración</h2></div>
      <div class="tscroll"><table><thead><tr><th>Cuándo</th><th>Qué</th><th class="num">Liberado</th><th>Quién</th></tr></thead><tbody>{trs}</tbody></table></div></section>"""


def view_tenant() -> str:
    body = f"""<div class="pg">{tenant_head()}
      <div class="bento b3">
        {usage_tile()}{growth_tile()}{breakdown_tile()}{tenant_island()}
      </div>
      <div class="sect"><div class="sh"><div><h2>Depurar</h2><p>Lo que se borra aquí se borra ya. Antes verás cuánto liberas y qué se conserva.</p></div></div>{purge_cards()}</div>
      {policies_card()}
      {runs_card()}
    </div>"""
    return platform_shell("Tenants", body)


# ============================================================================ P2b · Vista previa de depuración
def view_purge(confirm: bool = False) -> str:
    samp = "".join(f'<div>{ic(i, size=16)}</div>' for i in ["film", "film", "film", "film", "film", "film"])
    panel = f"""<section class="tile" style="gap:18px">
      <header><h2>Media de chats antiguos</h2>{btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</header>
      <div class="filters">
        <div class="field"><span class="lbl">Tipo</span><div class="chips"><button class="chip" aria-pressed="true">Videos</button><button class="chip" aria-pressed="false">Audios</button><button class="chip" aria-pressed="false">Fotos</button><button class="chip" aria-pressed="false">Documentos</button></div></div>
        <div class="field"><span class="lbl">Más antiguos que</span><div class="chips"><button class="chip" aria-pressed="false">3 meses</button><button class="chip" aria-pressed="true">6 meses</button><button class="chip" aria-pressed="false">1 año</button></div></div>
        <div class="field"><span class="lbl">De</span><div class="chips"><button class="chip" aria-pressed="true">Clientes</button><button class="chip" aria-pressed="false">Equipo</button></div></div>
      </div>
      <div class="prev">
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="fig"><b>9,8</b><span>GB en 318 videos</span></div>
          {meter(100 - 65, mark=None)}
          <p class="ln">Clínica Dermalux pasaría de <b>15,0 GB</b> a <b>5,2 GB</b> y su equipo podría volver a subir archivos.</p>
          <div class="samp" aria-label="Muestra">{samp}</div>
          <span class="prov">{ic("calendar", size=12)}Videos recibidos entre el 3 ene y el 8 abr de 2026</span>
        </div>
        <div class="keep">
          <b style="font-weight:600">Se conservan</b>
          <div class="r">{ic("link", size=15)}<span><b>4 videos</b> que el equipo reenvió a otro chat: se usan en mensajes más recientes.</span></div>
          <div class="r">{ic("receipt", size=15)}<span><b>2 videos</b> adjuntos a un comprobante de pago.</span></div>
          <div class="r">{ic("message-square", size=15)}<span>Los mensajes no se borran: cada video queda como «Archivo eliminado».</span></div>
        </div>
      </div>
    </section>"""
    bar = f"""<div class="inkbar"><div class="t"><b>Eliminar 9,8 GB · 318 videos</b><span>Es inmediato y no se puede deshacer.</span></div>
      <div class="acts"><a class="ghost2" href="#">Cancelar</a>{btn("Eliminar 9,8 GB", "trash-2", "destructive")}</div></div>"""
    body = f"""<div class="pg">{tenant_head()}
      <div class="sect"><div class="sh"><div><h2>Depurar</h2><p>Elige qué borrar. La cifra se recalcula con cada filtro.</p></div></div>{purge_cards("media")}</div>
      {panel}{bar}</div>"""
    overlay = ""
    if confirm:
        overlay = f"""<div class="scrim"></div><div style="position:absolute;inset:0;z-index:22;display:flex;justify-content:center;align-items:flex-start;padding:140px 16px 32px">
        <div class="cmodal" role="dialog" aria-labelledby="cm-t">
          <h2 id="cm-t">Eliminar 9,8 GB de Clínica Dermalux</h2>
          <p>Se borran ya 318 videos que enviaron sus clientes hace más de 6 meses. Los mensajes quedan con «Archivo eliminado». No hay papelera ni forma de recuperarlos.</p>
          <div class="facts"><div><b>318</b><span>videos</span></div><div><b>9,8 GB</b><span>liberados</span></div><div><b>6</b><span>se conservan</span></div></div>
          {K.field('Escribe <span class="mono-ph">ELIMINAR clinica-dermalux</span> para confirmar', K.input("ELIMINAR clinica-dermalux", fid="cf"), full=True, fid="cf")}
          {K.field("Tu contraseña", K.input("••••••••••", fid="pw"), full=True, fid="pw")}
          <div class="foot">{btn("Cancelar", "", "outline r")}{btn("Eliminar 9,8 GB", "trash-2", "destructive r")}</div>
        </div></div>"""
    return platform_shell("Tenants", body, overlay)


# ============================================================================ P2c · Archivos grandes
FILES = [
    ("film", "video-2026-02-14-recepcion.mp4", "Video de cliente", "Chat con Laura M.", "15 feb", 412, True, ""),
    ("film", "procedimiento-antes-despues.mp4", "Video de cliente", "Chat con Andrés P.", "3 mar", 388, True, ""),
    ("phone", "Llamada · Mariana R. · 18 min", "Grabación", "Llamada saliente", "21 ago", 216, True, ""),
    ("film", "WhatsApp Video 2026-01-09.mp4", "Video de cliente", "Chat con Diana C.", "9 ene", 201, False, "Reenviado en 2 mensajes"),
    ("file-text", "Catálogo tratamientos 2026.pdf", "Recurso del equipo", "Acción rápida «Precios»", "2 feb", 34, False, "En una acción rápida activa"),
    ("image", "promo-octubre-hero.jpg", "Foto de catálogo", "Peeling químico · 3 tamaños", "1 oct", 9.6, False, "Principal de un producto"),
]


def view_files() -> str:
    trs = ""
    for icon, name, cat, where, when, mb, sel, ref in FILES:
        size = f"{mb:.0f} MB" if mb >= 10 else f"{mb:.1f} MB".replace(".", ",")
        refcell = f'<span class="prov">{ic("link", size=12)}{ref}</span>' if ref else '<span class="prov">Sin otros usos</span>'
        cb = f'<span class="cbx {"on" if sel else ""}" role="checkbox" aria-checked="{str(sel).lower()}" aria-label="Seleccionar {name}">{ic("check", size=11) if sel else ""}</span>'
        trs += f"""<tr class="{"sel" if sel else ""}"><td style="width:40px">{cb}</td>
          <td><div class="fname"><span class="fthumb">{ic(icon, size=16)}</span><span style="min-width:0"><span class="t" style="display:block;font-weight:500">{name}</span><span class="d">{where}</span></span></div></td>
          <td class="muted">{cat}</td><td class="muted" style="white-space:nowrap">{when}</td><td>{refcell}</td><td class="num"><b style="font-weight:500">{size}</b></td>
          <td style="width:40px">{btn("", "eye", "ghost icon sm", f'aria-label="Ver {name}"')}</td></tr>"""
    table = f"""<section class="tcard"><div class="th"><h2>Archivos grandes</h2><div class="tools">
        <nav class="seg inline sm" aria-label="Tipo"><button aria-checked="true">Todos</button><button aria-checked="false">Videos</button><button aria-checked="false">Grabaciones</button><button aria-checked="false">Documentos</button></nav>
        {K.select("Más de 6 meses")}</div></div>
      <div class="tscroll"><table><thead><tr><th></th><th>Archivo</th><th>Tipo</th><th>Fecha</th><th>Otros usos</th><th class="num">Tamaño</th><th></th></tr></thead><tbody>{trs}</tbody></table></div></section>"""
    bar = f"""<div class="inkbar"><div class="t"><b>3 archivos · 1,0 GB</b><span>Los que tienen otros usos se conservan aunque los marques.</span></div>
      <div class="acts"><a class="ghost2" href="#">Quitar selección</a>{btn("Eliminar 1,0 GB", "trash-2", "destructive")}</div></div>"""
    body = f'<div class="pg">{tenant_head()}{table}{bar}</div>'
    return platform_shell("Tenants", body)


# ============================================================================ P2d · Cambiar cuota (sheet)
def view_quota() -> str:
    sheet = f"""<div class="scrim"></div><aside class="sheet" role="dialog" aria-labelledby="q-t">
      <div class="sh-h"><div><h2 id="q-t">Cuota de Clínica Dermalux</h2><p class="small muted">Hoy usa 15,0 GB de 15 GB</p></div>{btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</div>
      <div class="sh-b">
        <div class="seg2" role="radiogroup" aria-label="Origen de la cuota"><button role="radio" aria-checked="false">La del plan<small>Crecimiento · 15 GB</small></button><button role="radio" aria-checked="true">Ampliada<small>Solo para este tenant</small></button></div>
        <div class="field"><span class="lbl">Espacio</span><div class="gbin">{K.input("25 GB", fid="gbq")}<div class="pre"><button class="chip" aria-pressed="false">+5 GB</button><button class="chip" aria-pressed="true">+10 GB</button><button class="chip" aria-pressed="false">+25 GB</button></div></div>
          <p class="hint">Con 25 GB le quedan <b>10,0 GB</b>: unos 5 meses a su ritmo de 1,8 GB al mes.</p></div>
        <div class="field"><span class="lbl">Margen antes de pausar</span>{K.select("Sin margen")}<p class="hint">Un margen deja subir un poco más allá de la cuota mientras se resuelve.</p></div>
        <div class="field"><span class="lbl">Motivo</span><div class="textarea">Acordado con la dueña el 8 oct: paquete +10 GB en la factura de noviembre.</div><p class="hint">Queda en la auditoría del tenant.</p></div>
        {K.notice("info", "Si luego cambia de plan, la ampliación se mantiene hasta que vuelvas a «La del plan».")}
      </div>
      <div class="sh-f"><div class="inkbar" style="position:static"><div class="t"><b>15 GB → 25 GB</b><span>Las subidas del equipo se reanudan al guardar.</span></div><div class="acts"><a class="ghost2" href="#">Cancelar</a>{btn("Guardar cuota", "", "r")}</div></div></div>
    </aside>"""
    body = f"""<div class="pg">{tenant_head()}<div class="bento b3">{usage_tile()}{growth_tile()}{breakdown_tile()}{retention_tile()}</div></div>"""
    return platform_shell("Tenants", body, sheet)


# ============================================================================ P3 · Plan › cuota
def view_plan() -> str:
    sheet = f"""<div class="scrim"></div><aside class="sheet" role="dialog" aria-labelledby="p-t" style="width:520px">
      <div class="sh-h"><div><h2 id="p-t">Plan Crecimiento</h2><p class="small muted">crecimiento · paquete · 31 tenants</p></div>{btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</div>
      <div class="sh-b">
        {K.field("Nombre", K.input("Crecimiento", fid="pn"), fid="pn")}
        <div class="field"><span class="lbl">Almacenamiento incluido</span><div class="gbin">{K.input("15 GB", fid="ps")}<div class="pre"><button class="chip" aria-pressed="false">5</button><button class="chip" aria-pressed="true">15</button><button class="chip" aria-pressed="false">40</button><button class="chip" aria-pressed="false">Sin límite</button></div></div>
          <p class="hint">Es espacio ocupado, no lo que se sube al mes. Al llenarse, el equipo deja de subir archivos; los mensajes de los clientes siguen llegando.</p></div>
        {K.notice("info", "<b>Aplica de inmediato a los 31 tenants</b> que no tienen una cuota ampliada. 2 de ellos quedarían por encima del 80 %.")}
        <div class="field"><span class="lbl">Límites de consumo</span><div class="input readonly"><span>7 límites · mensajes, IA, voz…</span>{ic("chevron-right", size=15)}</div><p class="hint">El almacenamiento ya no es un límite de consumo: se mide como espacio ocupado.</p></div>
      </div>
      <div class="sh-f"><div class="inkbar" style="position:static"><div class="t"><b>Cambios sin guardar</b><span>Almacenamiento 10 → 15 GB</span></div><div class="acts"><a class="ghost2" href="#">Descartar</a>{btn("Guardar", "", "r")}</div></div></div>
    </aside>"""
    rows = "".join(
        f'<tr><td><span class="t">{n}</span><span class="d">{c}</span></td><td class="num">{s}</td><td class="num muted">{t}</td></tr>'
        for n, c, s, t in [("Trial", "trial", "1 GB", "9"), ("Esencial", "esencial", "5 GB", "64"), ("Crecimiento", "crecimiento", "15 GB", "31"), ("Escala", "escala", "40 GB", "7"), ("Enterprise", "enterprise", "150 GB", "2")]
    )
    body = f"""<div class="pg"><div class="hrow"><div><h1>Planes</h1><p class="lead">Lo que incluye cada plan.</p></div></div>
      <section class="tcard"><div class="tscroll"><table><thead><tr><th>Plan</th><th class="num">Almacenamiento</th><th class="num">Tenants</th></tr></thead><tbody>{rows}</tbody></table></div></section></div>"""
    return platform_shell("Planes", body, sheet)


# ============================================================================ T1 · Tenant › Mi empresa › Almacenamiento
COMPANY_TABS = [("General", "building"), ("Sucursales", "map-pin"), ("Funciones", "sliders-horizontal"), ("Documentos", "file-text"), ("Almacenamiento", "hard-drive")]


DRIVE_CSS = r"""
/* «Tu disco»: dispositivo ilustrado, cada cuadro = 1 GB (glifo, no superficie de datos) */
.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,360px);gap:28px;align-items:center}
@container (max-width: 760px){ .hero{grid-template-columns:minmax(0,1fr)} }
.hero .txt{display:flex;flex-direction:column;gap:12px;min-width:0}
.drive{position:relative;border-radius:26px;padding:16px 16px 14px;border:1px solid var(--border);
  background:linear-gradient(180deg, color-mix(in srgb, var(--foreground) 5%, var(--background)), color-mix(in srgb, var(--foreground) 1.5%, var(--background)));
  box-shadow:inset 0 1px 0 color-mix(in srgb, var(--background) 70%, transparent), 0 1px 2px rgb(0 0 0/.04), 0 22px 40px -26px rgb(0 0 0/.35)}
.drive .dtop{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:500}
.drive .dtop .cap{font-family:var(--font-heading);letter-spacing:-.01em;text-transform:none;font-size:13px;color:var(--foreground)}
.led{display:inline-flex;align-items:center;gap:6px}
.led i{width:7px;height:7px;border-radius:50%;background:var(--axi-success);box-shadow:0 0 0 3px color-mix(in srgb, var(--axi-success) 18%, transparent)}
.led.warn i{background:var(--axi-warning);box-shadow:0 0 0 3px color-mix(in srgb, var(--axi-warning) 20%, transparent)}
.led.full i{background:var(--axi-destructive);box-shadow:0 0 0 3px color-mix(in srgb, var(--axi-destructive) 20%, transparent)}
.cells{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.cell{aspect-ratio:1.55;border-radius:9px;background:var(--g);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--foreground) 6%, transparent)}
.cell.free{background:transparent;box-shadow:none;border:1.5px dashed color-mix(in srgb, var(--foreground) 20%, transparent)}
.drive .dfoot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:11.5px;color:var(--muted-foreground)}
.grille{display:flex;gap:3px}
.grille i{width:14px;height:3px;border-radius:2px;background:color-mix(in srgb, var(--foreground) 14%, transparent)}
.dleg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--muted-foreground);margin-top:10px}
.dleg span{display:inline-flex;align-items:center;gap:6px}
.dleg i{width:9px;height:9px;border-radius:3px}
.dleg i.fr{border:1.5px dashed color-mix(in srgb, var(--foreground) 30%, transparent)}

/* «Tu ritmo»: recorrido + hoy + proyección hasta el tope */
.route{width:100%;height:120px;display:block;overflow:visible}
.route .cap{stroke:color-mix(in srgb, var(--foreground) 30%, transparent);stroke-dasharray:2 4;stroke-width:1.2}
.route .done{fill:none;stroke:var(--foreground);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.route .area{fill:color-mix(in srgb, var(--foreground) 6%, transparent)}
.route .proj{fill:none;stroke:var(--muted-foreground);stroke-width:1.8;stroke-dasharray:4 5;stroke-linecap:round}
.route .now{fill:var(--background);stroke:var(--foreground);stroke-width:2.2}
.route .end{fill:var(--axi-warning)}
.route text{font-family:var(--font-body);font-size:10.5px;fill:var(--muted-foreground)}
.route text.b{fill:var(--foreground);font-weight:500}
"""


def _cell_bg(i: int, segs: list[tuple[str, float]]) -> str:
    """Gradiente horizontal del cuadro i (cubre [i, i+1] GB) según los tramos por origen."""
    cols = {"o1": "color-mix(in srgb, var(--foreground) 88%, var(--background))",
            "o2": "color-mix(in srgb, var(--foreground) 50%, var(--background))",
            "o3": "color-mix(in srgb, var(--foreground) 24%, var(--background))"}
    free = "color-mix(in srgb, var(--foreground) 5%, var(--background))"
    stops, start = [], 0.0
    for cls, size in segs:
        a, b = max(start, i), min(start + size, i + 1)
        if b > a:
            stops.append((cols[cls], (a - i) * 100, (b - i) * 100))
        start += size
    if not stops:
        return ""
    if stops[-1][2] < 100:
        stops.append((free, stops[-1][2], 100))
    return "linear-gradient(90deg," + ",".join(f"{c} {x:.0f}% {y:.0f}%" for c, x, y in stops) + ")"


def drive(total: int, segs: list[tuple[str, float]], state: str, caption: str) -> str:
    cells = ""
    for i in range(total):
        g = _cell_bg(i, segs)
        cells += f'<span class="cell" style="--g:{g}"></span>' if g else '<span class="cell free"></span>'
    led = {"ok": ("", "Con espacio"), "warn": ("warn", "Cerca del límite"), "full": ("full", "Lleno"), "none": ("", "Sin límite")}[state]
    return f"""<figure class="drive" style="margin:0" aria-label="{caption}">
      <div class="dtop"><span class="led {led[0]}" title="{led[1]}"><i></i>Tu disco</span><span class="cap">{caption}</span></div>
      <div class="cells" aria-hidden="true">{cells}</div>
      <div class="dfoot"><span class="grille" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>Cada cuadro es 1 GB</span></div>
    </figure>"""


def route(state: str) -> str:
    # x: 7 meses pasados (may→nov) + proyección; y: GB 0→16
    W, Hh, top = 300, 96, 12
    def X(m): return 8 + m * (W - 16) / 9
    def Y(g): return top + (16 - g) / 16 * Hh
    hist = [7.8, 8.5, 9.4, 10.1, 11.0, 11.8, 12.6] if state != "full" else [10.9, 11.8, 12.6, 13.4, 14.1, 14.7, 15.0]
    pts = " ".join(f"{X(i):.1f},{Y(g):.1f}" for i, g in enumerate(hist))
    area = f"{X(0):.1f},{Y(0):.1f} {pts} {X(6):.1f},{Y(0):.1f}"
    cap_y = Y(15)
    proj = ""
    if state == "warn":
        proj = f'<polyline class="proj" points="{X(6):.1f},{Y(12.6):.1f} {X(9):.1f},{Y(15):.1f}"/><circle class="end" cx="{X(9):.1f}" cy="{Y(15):.1f}" r="4"/><text class="b" x="{X(9) - 2:.1f}" y="{Y(15) - 9:.1f}" text-anchor="end">≈ ene</text>'
    labels = "".join(f'<text x="{X(i):.1f}" y="{top + Hh + 14:.1f}" text-anchor="middle">{m}</text>' for i, m in [(0, "abr"), (3, "jul"), (6, "hoy"), (9, "ene")])
    return f"""<svg class="route" viewBox="0 0 {W} {top + Hh + 18}" aria-hidden="true">
      <line class="cap" x1="0" x2="{W}" y1="{cap_y:.1f}" y2="{cap_y:.1f}"/><text x="0" y="{cap_y - 5:.1f}">15 GB · tu tope</text>
      <polygon class="area" points="{area}"/><polyline class="done" points="{pts}"/>{proj}
      <circle class="now" cx="{X(6):.1f}" cy="{Y(hist[-1]):.1f}" r="5"/>{labels}
    </svg>"""


def view_tenant_self(state: str = "warn") -> str:
    if state == "full":
        pill, used = state_pill("full"), 15.0
        head_fig = '<div class="fig"><b>0</b><span>GB libres de 15 GB</span></div>'
        line = "Tu espacio está lleno. <b>Los mensajes de tus clientes siguen llegando completos</b>; para subir archivos nuevos, pide más espacio."
        banner = f'<div class="banner">{ic("hard-drive", size=18)}<span><b>Tu equipo no puede subir archivos.</b> Fotos de catálogo, adjuntos y recursos esperan a que haya espacio.</span>{btn("Hablar con soporte", "message-circle", "r sm")}</div>'
        segs, total, cap = [("o1", 9.6), ("o2", 3.6), ("o3", 1.8)], 15, "15 GB"
        vals = ("9,6 GB", "3,6 GB", "1,8 GB")
        pace = ("Lleno desde el 7 oct", "Llegaste al tope tras 6 meses creciendo ≈ 0,7 GB al mes. Con más espacio, tu equipo vuelve a subir archivos de inmediato.")
    elif state == "none":
        pill, used = state_pill("none"), 3.4
        head_fig = '<div class="fig"><b>3,4</b><span>GB ocupados</span></div>'
        line = "Tu plan no tiene límite de espacio. Aquí ves en qué se va."
        banner = ""
        segs, total, cap = [("o1", 2.2), ("o2", 0.8), ("o3", 0.4)], 4, "Sin tope"
        vals = ("2,2 GB", "0,8 GB", "0,4 GB")
        pace = None
    else:
        pill, used = state_pill("warn"), 12.6
        head_fig = '<div class="fig"><b>2,4</b><span>GB libres de 15 GB</span></div>'
        line = "Te quedan <b>2,4 GB</b>: unos 3 meses a tu ritmo actual."
        banner = ""
        segs, total, cap = [("o1", 8.1), ("o2", 3.0), ("o3", 1.5)], 15, "15 GB"
        vals = ("8,1 GB", "3,0 GB", "1,5 GB")
        pace = ("Llegas al tope hacia enero", "Creces ≈ 0,8 GB al mes, casi todo en videos que te mandan tus clientes.")
    pct = used / 15 * 100
    m = "" if state == "none" else meter(pct) + f'<div class="mscale"><span>Usas {str(used).replace(".", ",")} GB</span><span>Incluido en tu plan Crecimiento</span></div>'
    hero = f"""<section class="tile span3"><header><h2>Tu espacio</h2>{pill}</header>
      <div class="hero"><div class="txt">{head_fig}{m}<p class="ln">{line}</p>
        <div class="dleg"><span><i class="o1"></i>Clientes {vals[0]}</span><span><i class="o2"></i>Tu equipo {vals[1]}</span><span><i class="o3"></i>Axi {vals[2]}</span>{"" if state != "warn" else '<span><i class="fr"></i>Libre 2,4 GB</span>'}</div>
        <span class="prov">{ic("activity", size=12)}Medido hace 4 min</span></div>
        {drive(total, segs, state if state != "none" else "none", cap)}</div></section>"""
    rows = [
        ("o1", "Lo que te envían tus clientes", "Fotos, audios y videos de los chats", vals[0]),
        ("o2", "Lo que sube tu equipo", "Catálogo, adjuntos y recursos", vals[1]),
        ("o3", "Lo que genera Axi", "Grabaciones, PDF y notas de voz", vals[2]),
    ]
    rr = "".join(f'<div class="r"><span class="sw2 {c}"></span><span><b>{t}</b><small>{s}</small></span><span class="v">{v}</span></div>' for c, t, s, v in rows)
    breakdown = f"""<section class="tile span2"><header><h2>En qué se va</h2></header>
      <div class="leg">{rr}</div>
      <span class="prov">{ic("info", size=12)}Los archivos los gestiona el equipo de Axi Connect.</span></section>"""
    if pace:
        side = f"""<section class="tile"><header><h2>Tu ritmo</h2></header>
          <p style="font-weight:600;font-size:15px">{pace[0]}</p>{route(state)}<p class="ln">{pace[1]}</p>
          <span class="prov">{ic("activity", size=12)}Según tus últimos 6 meses</span></section>"""
    else:
        side = f"""<section class="tile"><header><h2>Qué sigue funcionando</h2></header><p class="ln">Todo. Sin límite de espacio nada se pausa; solo te mostramos en qué se va.</p></section>"""
    cta = "" if state in ("full", "none") else f'<section class="tile span3" style="flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between"><div><p style="font-weight:500">¿Necesitas más espacio?</p><p class="ln">El equipo de Axi Connect amplía tu espacio o te ayuda a liberar el que tienes.</p></div>{btn("Hablar con soporte", "message-circle", "outline sm r")}</section>'
    return f"""<div class="pg" style="max-width:1040px">
      {K.crumb("Configuración", "Mi empresa")}
      <div class="hrow"><div><h1 style="font-family:var(--font-body);font-weight:600;font-size:28px">Mi empresa</h1></div></div>
      {K.nav(COMPANY_TABS, "Almacenamiento", "Secciones de Mi empresa", "inline")}
      {banner}
      <div class="bento b3">{hero}{breakdown}{side}{cta}</div>
    </div>"""


# ============================================================================ T2 · Avisos
def view_notices() -> str:
    return f"""<div class="pg">
      <div class="hrow"><div><h1 style="font-family:var(--font-body);font-weight:600;font-size:28px">Avisos en el día a día</h1><p class="lead">Lo que ve el equipo del tenant cuando el espacio se acaba, y cómo queda un archivo depurado.</p></div></div>
      <div class="board">
        <figure><div class="stage"><div style="position:relative"><div class="composer"><span class="clip" style="opacity:1">{ic("paperclip", size=18)}<span class="tip">Tu espacio está lleno. Pide más espacio a un administrador o a soporte.</span></span><span class="tx">Escribe un mensaje…</span>{btn("", "send-horizontal", "icon r", 'aria-label="Enviar"')}</div></div></div>
          <figcaption><b>Composer lleno</b>El clip se apaga antes de chocar con el error. Escribir sigue igual.</figcaption></figure>
        <figure><div class="stage" style="align-items:center"><div class="pillnote">{ic("hard-drive", size=16)}<span>No subimos «promo-octubre.jpg»: tu espacio está lleno.</span><a href="#">Ver espacio</a></div></div>
          <figcaption><b>Subida rechazada</b>Píldora de tinta (§9.4). Dice qué archivo, por qué y dónde mirar. El enlace solo aparece a owner/admin.</figcaption></figure>
        <figure><div class="stage">{K.notice("warn", "<b>Te queda 2,4 GB de espacio.</b> A tu ritmo alcanza para unos 3 meses.", acts=btn("Ver espacio", "", "outline xs r"))}</div>
          <figcaption><b>Al 80 %</b>Una vez por sesión y solo a owner/admin, en el Panel.</figcaption></figure>
        <figure><div class="stage"><div class="bub"><span class="fi">{ic("film", size=18)}</span><span style="min-width:0"><b>Archivo eliminado</b><span>Video de 32 MB · depurado el 8 oct</span></span><span class="tm">15 feb</span></div></div>
          <figcaption><b>En el chat</b>El mensaje se conserva con su fecha. Sin vista previa ni descarga.</figcaption></figure>
      </div>
    </div>"""


# ============================================================================ Estados (platform)
def view_states() -> str:
    loading = f"""<section class="tile"><header>{K.skeleton("120px", "12px")}</header>{K.skeleton("60%", "36px")}{K.skeleton("100%", "8px")}{K.skeleton("80%", "12px")}</section>"""
    err = f"""<section class="tile"><header><h2>Quién llena el disco</h2></header><p class="ln">No pudimos cargar esta ficha.</p><div>{btn("Reintentar", "refresh-cw", "outline sm r")}</div></section>"""
    empty = f"""<section class="tile"><header><h2>Espacio de Tienda Nueva</h2>{state_pill("ok")}</header><div class="fig"><b>5,0</b><span>GB libres de 5 GB</span></div>{meter(0)}<p class="ln">Aún no hay archivos. Se mide desde el primer mensaje con foto.</p></section>"""
    none = f"""<section class="tile"><header><h2>Espacio de Constructora Horizonte</h2>{state_pill("none")}</header><div class="fig"><b>61,3</b><span>GB ocupados</span></div><p class="ln">Su plan no fija cuota. Nada se pausa; puedes ponerle una ampliada.</p><div>{btn("Poner cuota", "plus", "outline sm r")}</div></section>"""
    body = f"""<div class="pg"><div class="hrow"><div><h1>Estados</h1><p class="lead">Cada ficha carga, falla y se vacía por su cuenta. Un error nunca se pinta como un cero.</p></div></div>
      <div class="bento">{disk_tile(unavailable=True)}<div class="isl-slot" style="display:flex;flex-direction:column;gap:16px">{loading}</div>{err}{empty}{none}</div></div>"""
    return platform_shell("Almacenamiento", body)


# ============================================================================ T2b · aviso al 80 % en una línea (C-10)
K.extra_css += r"""
.nline{display:flex;align-items:center;gap:10px;height:44px;padding:0 6px 0 14px;border-radius:16px;border:1px solid var(--border);background:var(--secondary);font-size:13.5px;min-width:0}
.nline > .ic{color:var(--axi-warning);flex:none}
.nline .msg{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nline .msg b{font-weight:600}
.nline .rit{color:var(--muted-foreground)}
@container (max-width: 639px){ .nline .rit,.nline .opt{display:none} }
.nline .go{flex:none;display:inline-flex;align-items:center;gap:4px;font-weight:500;text-decoration:none;white-space:nowrap;padding:0 8px;height:32px;border-radius:10px}
.nline .go:hover{background:var(--background)}
.nline .x{flex:none;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;color:var(--muted-foreground)}
.panelhead{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.panelhead h1{font-size:40px;line-height:1.05}
.panelhead .k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground);font-weight:500;margin-bottom:6px}
.before{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:12px;align-items:start;padding:12px 16px;border-radius:16px;border:1px solid var(--border);background:var(--secondary);font-size:13.5px}
.before .ic{color:var(--axi-warning);margin-top:2px}
.cmp{display:flex;flex-direction:column;gap:6px}
.cmp > span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:500}
"""


def notice_line() -> str:
    return f"""<div class="nline" role="status">{ic("hard-drive", size=16)}<span class="msg">Te quedan <b>2,4 GB</b><span class="opt"> de espacio</span><span class="rit"> · a tu ritmo, unas 3 semanas</span></span><a class="go" href="#">Ver espacio {ic("arrow-right", size=14)}</a><button class="x" aria-label="Cerrar aviso de espacio">{ic("x", size=16)}</button></div>"""


def view_notice_line() -> str:
    before = f"""<div class="before">{ic("hard-drive", size=18)}<div><p><b style="font-weight:500">Te quedan 2,4 GB de espacio.</b> A tu ritmo alcanza para unas 3 semanas.</p><div style="margin-top:8px">{btn("Ver espacio", "", "outline xs r")}</div></div>{btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</div>"""
    tiles = "".join(f'<section class="tile" style="min-height:150px"><header><h2>{t}</h2></header><div class="fig md"><b>{v}</b><span>{u}</span></div></section>' for t, v, u in [("Vendido en 7 días", "$ 4,2", "M"), ("Conversaciones en 7 días", "318", "atendidas"), ("Clientes nuevos", "41", "contactos")])
    return f"""<div class="pg">
      <div class="panelhead"><div><p class="k">Axi Demo · jueves 8 de octubre</p><h1>Buenas tardes, Isabel</h1></div></div>
      {notice_line()}
      <div class="bento b3">{tiles}</div>
      <div class="cmp" style="margin-top:28px"><span>Antes · 82 px en dos filas</span>{before}</div>
      <div class="cmp"><span>Ahora · una línea de 44 px · en el celular se oculta «a tu ritmo…»</span>{notice_line()}</div>
    </div>"""


# ============================================================================ artboards
def wrap(body: str) -> str:
    return body


VIEWS = [
    ("overview", "P1 · Almacenamiento (platform)", view_overview(), "El disco del servidor, la sobreventa, quién llena el disco y la tabla de tenants. La isla dice qué atender."),
    ("tenant", "P2 · Tenant › Almacenamiento", view_tenant(), "Uso contra cuota, en qué se va, crecimiento, retención, depurar e historial."),
    ("purge", "P2b · Depurar: vista previa", view_purge(), "Filtros por tipo, edad y origen. La cifra dice cuánto se libera y qué se conserva. La barra de acción en tinta."),
    ("confirm", "P2c · Confirmación fuerte", view_purge(confirm=True), "Escribir ELIMINAR {slug} y la contraseña. Borrado inmediato."),
    ("files", "P2d · Archivos grandes", view_files(), "Selección en lote; lo que tiene otros usos se conserva."),
    ("quota", "P2e · Cambiar cuota", view_quota(), "La del plan o ampliada, con atajos de GB, margen y motivo."),
    ("plan", "P3 · Plan › almacenamiento incluido", view_plan(), "La cuota del plan va fuera del LimitsEditor."),
    ("self", "T1 · Mi empresa › Almacenamiento", view_tenant_self("warn"), "Solo lectura para owner/admin. Lo que queda, en qué se va y soporte."),
    ("selffull", "T1b · Mi empresa · lleno", view_tenant_self("full"), "Banda informativa y CTA de soporte."),
    ("selfnone", "T1c · Mi empresa · sin cuota", view_tenant_self("none"), "Sin límite: solo el desglose."),
    ("noticeline", "T2b · Aviso al 80 % en una línea", view_notice_line(), "El aviso del Panel en una sola fila: icono, lo que queda, el ritmo, «Ver espacio →» y la ✕."),
    ("notices", "T2 · Avisos", view_notices(), "Composer, subida rechazada, 80 % y archivo eliminado."),
    ("states", "Estados de platform", view_states(), "Disco sin lectura, cargando, error, tenant nuevo y sin cuota."),
    ("overviewna", "P1b · Disco sin lectura", view_overview(unavailable=True), "El último valor con su antigüedad."),
]
BODY = {k: b for k, _, b, _ in VIEWS}

H = {
    "overview": (1440, 1340), "tenant": (1440, 2030), "purge": (1440, 1100), "confirm": (1440, 1100), "files": (1440, 920),
    "quota": (1440, 1100), "plan": (1440, 980), "self": (1440, 1020), "selffull": (1440, 1030), "selfnone": (1440, 820),
    "notices": (1440, 700), "noticeline": (1440, 640), "states": (1440, 740), "overviewna": (1440, 1300),
}
HM = {"overview": 2530, "tenant": 3410, "purge": 2090, "self": 1620, "notices": 1150, "noticeline": 1100}


def boards() -> list[dict]:
    plan = [
        ("overview", 1440, False, "Main.dc.html", "P1 · Almacenamiento — disco, cuotas y tenants", 0),
        ("overview", 1440, True, "OverviewOscuro.dc.html", "P1 · oscuro", 0),
        ("overview", 390, False, "OverviewMovil.dc.html", "P1 · celular", 0),
        ("overviewna", 1440, False, "OverviewSinLectura.dc.html", "P1b · disco sin lectura", 0),
        ("tenant", 1440, False, "Tenant.dc.html", "P2 · Tenant › Almacenamiento", 1),
        ("tenant", 1440, True, "TenantOscuro.dc.html", "P2 · oscuro", 1),
        ("tenant", 390, False, "TenantMovil.dc.html", "P2 · celular", 1),
        ("purge", 1440, False, "Depurar.dc.html", "P2b · Depurar — vista previa y barra en tinta", 2),
        ("confirm", 1440, False, "Confirmar.dc.html", "P2c · Confirmación fuerte", 2),
        ("purge", 390, False, "DepurarMovil.dc.html", "P2b · celular", 2),
        ("files", 1440, False, "ArchivosGrandes.dc.html", "P2d · Archivos grandes en lote", 2),
        ("quota", 1440, False, "Cuota.dc.html", "P2e · Cambiar cuota", 3),
        ("plan", 1440, False, "Plan.dc.html", "P3 · Plan › almacenamiento incluido", 3),
        ("states", 1440, False, "Estados.dc.html", "Estados de platform", 3),
        ("self", 1440, False, "MiEmpresa.dc.html", "T1 · Mi empresa › Almacenamiento (84 %)", 4),
        ("self", 1440, True, "MiEmpresaOscuro.dc.html", "T1 · oscuro", 4),
        ("self", 390, False, "MiEmpresaMovil.dc.html", "T1 · celular", 4),
        ("selffull", 1440, False, "MiEmpresaLleno.dc.html", "T1b · lleno", 4),
        ("selfnone", 1440, False, "MiEmpresaSinCuota.dc.html", "T1c · sin cuota", 4),
        ("notices", 1440, False, "Avisos.dc.html", "T2 · Avisos y archivo eliminado", 5),
        ("notices", 390, False, "AvisosMovil.dc.html", "T2 · celular", 5),
        ("noticeline", 1440, False, "AvisoUnaLinea.dc.html", "T2b · Aviso al 80 % en una línea (C-10)", 6),
        ("noticeline", 1440, True, "AvisoUnaLineaOscuro.dc.html", "T2b · oscuro", 6),
        ("noticeline", 390, False, "AvisoUnaLineaMovil.dc.html", "T2b · celular", 6),
    ]
    out = []
    for key, w, dark, file, title, row in plan:
        h = H[key][1] if w > 400 else HM[key]
        body = BODY[key].replace("isl isl-glass", "isl isl-dark") if dark else BODY[key]
        out.append({"file": file, "title": title, "body": body, "w": w, "h": h, "dark": dark, "row": row})
    return out


ROW_NAMES = {0: "Platform · el disco y los tenants", 1: "Platform · la ficha del tenant", 2: "Platform · depurar",
             3: "Platform · cuota, plan y estados", 4: "Tenant · Mi empresa › Almacenamiento", 5: "Tenant · avisos", 6: "Tenant · aviso al 80 % en una línea"}


def canvas(bs: list[dict]) -> dict:
    by_row: dict[int, list[dict]] = {}
    for b in bs:
        by_row.setdefault(b["row"], []).append(b)
    y = 0
    boards_out, order, notes = {}, [], {}
    for r in sorted(by_row):
        x = 0
        width = 0
        tallest = 0
        for b in by_row[r]:
            boards_out[b["file"]] = {"x": x, "y": y, "w": b["w"], "h": b["h"], "title": b["title"]}
            order.append(b["file"])
            x += b["w"] + 80
            width = x
            tallest = max(tallest, b["h"])
        notes[f"row{r}"] = {"x": 0, "y": y - 300, "text": ROW_NAMES[r], "kind": "title1", "maxW": width}
        y += tallest + 420
    return {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-10-08T21:00:00Z"}, "title": "Almacenamiento · control por tenant",
            "launch": {"view": "canvas"}, "pages": [], "boards": boards_out, "order": order, "notes": notes, "designSystems": []}


K.extra_css += DRIVE_CSS

if __name__ == "__main__":
    K.build_html("Almacenamiento", "Mockup · no es producto", "Control de almacenamiento", [(k, l, f'<div class="shell">{b}</div>', n) for k, l, b, n in VIEWS])
    bs = boards()
    K.export_artboards([{k: v for k, v in b.items() if k != "row"} for b in bs])
    proj = HERE / "project"
    (proj / "canvas.json").write_text(json.dumps(canvas(bs), indent=1, ensure_ascii=False))
    print(f"  canvas.json: {len(bs)} artboards")
