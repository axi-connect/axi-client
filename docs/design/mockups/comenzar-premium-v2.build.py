#!/usr/bin/env python3
"""Ensambla el mockup navegable de /comenzar (Fase 0) en un solo HTML autocontenido."""
import json, pathlib

S = pathlib.Path(__file__).parent
FONTS = json.load(open(S / "fonts.json"))
LUCIDE = json.load(open(S / "lucide.json"))
ISOLOGO = open(S / "isologo.svg").read().replace('width="500" height="500"', 'width="100%" height="100%"')

def ic(name, cls="", size=20):
    return (f'<svg class="ic {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'{LUCIDE[name]}</svg>')

def font_face(family, weight, key):
    return (f'@font-face{{font-family:"{family}";font-weight:{weight};font-style:normal;font-display:swap;'
            f'src:url(data:font/woff2;base64,{FONTS[key]}) format("woff2")}}')

FONT_CSS = "\n".join([
    font_face("Poppins", 400, "poppins-400"), font_face("Poppins", 500, "poppins-500"),
    font_face("Poppins", 600, "poppins-600"), font_face("Poppins", 700, "poppins-700"),
    font_face("Nexa", 700, "nexa-700"), font_face("Nexa", 200, "nexa-200"),
    font_face("Geist Mono", "100 900", "geist-mono"),
])

# ───────────────────────── Tokens (copiados de globals.css) ─────────────────────────
LIGHT = """
  --background:#ffffff; --foreground:#171717;
  --axi-brand:#e65759; --axi-brand-2:#e02f2f; --axi-violet:#7c3aed; --axi-amber:#f0a431; --axi-muted:#f4f4f5;
  --axi-success:#16a34a; --axi-warning:#d97706; --axi-destructive:#dc2626; --axi-info:#2563eb; --axi-on-color:#ffffff;
  --accent-mix:14%;
  --orb-brand:18%; --orb-violet:10%; --dots:5%;
  color-scheme:light;
"""
DARK = """
  --background:#0a0a0a; --foreground:#ededed;
  --axi-brand:#fb7185; --axi-brand-2:#df4f4f; --axi-violet:#a78bfa; --axi-amber:#fbbf24; --axi-muted:#18181b;
  --axi-success:#4ade80; --axi-warning:#fbbf24; --axi-destructive:#f87171; --axi-info:#60a5fa; --axi-on-color:#0a0a0a;
  --accent-mix:42%;
  --orb-brand:26%; --orb-violet:16%; --dots:7%;
  color-scheme:dark;
"""

CSS = r"""
:root{ __LIGHT__ }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ __DARK__ } }
:root[data-theme="dark"]{ __DARK__ }

:root{
  /* Capa 2 — semánticos (equivalente al @theme inline) */
  --color-background:var(--background); --color-foreground:var(--foreground);
  --color-border:color-mix(in srgb, var(--foreground) 12%, var(--background));
  --color-primary:var(--axi-brand); --color-primary-foreground:var(--axi-on-color);
  --color-secondary:color-mix(in srgb, var(--foreground) 6%, var(--background));
  --color-card:var(--background);
  --color-muted:var(--axi-muted);
  --color-muted-foreground:color-mix(in srgb, var(--foreground) 70%, transparent);
  --color-accent:color-mix(in srgb, var(--axi-brand) var(--accent-mix), var(--background));
  --color-input:color-mix(in srgb, var(--foreground) 14%, var(--background));
  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:20px;
  --shadow-float:0 1px 2px rgb(0 0 0 / .05), 0 4px 12px rgb(0 0 0 / .06);
  --shadow-overlay:0 1px 2px rgb(0 0 0 / .06), 0 16px 48px rgb(0 0 0 / .16);
  --font-body:"Poppins", Helvetica, Arial, sans-serif;
  --font-heading:"Nexa", "Poppins", sans-serif;
  --font-mono:"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --ease-spring:cubic-bezier(.2,.8,.2,1);
}
*{box-sizing:border-box}
body{margin:0;background:var(--color-background);color:var(--color-foreground);font-family:var(--font-body);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
h1,h2,h3,.font-heading{font-family:var(--font-heading);letter-spacing:-.01em}
button,input,select{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0;padding:0}
a{color:var(--axi-brand);text-decoration:none;font-weight:500}
a:hover{text-decoration:underline}
[hidden]{display:none!important}
.ic{flex:none}
.muted{color:var(--color-muted-foreground)}
.mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
.tabular{font-variant-numeric:tabular-nums}
:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb, var(--axi-brand) 50%, transparent)}

/* ─────────── Barra del mockup (fuera del diseño) ─────────── */
.mockbar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:100;display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;padding:6px 8px;border-radius:999px;font-size:11.5px;
  background:color-mix(in srgb, var(--color-background) 78%, transparent);border:1px solid color-mix(in srgb, var(--color-border) 60%, transparent);box-shadow:var(--shadow-overlay);backdrop-filter:saturate(160%) blur(16px)}
.mockbar .grp{display:flex;gap:2px;padding:2px;border-radius:999px;background:var(--color-secondary)}
.mockbar .grp b{padding:0 6px;font-weight:600;color:var(--color-muted-foreground);align-self:center;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase}
.mockbar button{padding:5px 10px;border-radius:999px;color:var(--color-muted-foreground);font-weight:500;transition:background .2s,color .2s}
.mockbar button[aria-pressed="true"]{background:var(--color-accent);color:var(--color-foreground)}
.mockbar button:hover{color:var(--color-foreground)}

/* ─────────── Escenario ─────────── */
.stage{min-height:100svh;background:var(--color-background)}
.stage[data-vp="mobile"]{display:grid;place-items:start center;padding:28px 0 80px;background:color-mix(in srgb, var(--foreground) 4%, var(--background))}
.field{position:relative;container-type:inline-size;isolation:isolate;overflow-y:auto;overflow-x:hidden;min-height:100svh;
  background-color:color-mix(in srgb, var(--foreground) 2.5%, var(--background));
  background-image:
    radial-gradient(75% 120% at 8% 0%, color-mix(in srgb, var(--axi-brand) 13%, transparent), transparent 72%),
    radial-gradient(65% 110% at 95% 12%, color-mix(in srgb, var(--axi-brand) 8%, transparent), transparent 70%);
  scrollbar-width:thin;scrollbar-color:color-mix(in srgb, var(--axi-brand) 45%, transparent) transparent}
.stage[data-vp="mobile"] .field{width:390px;height:844px;min-height:0;border-radius:44px;box-shadow:0 0 0 10px #111,0 0 0 12px #2a2a2a,0 40px 80px rgb(0 0 0/.35)}
/* orbes que derivan + retícula de puntos: la única decoración */
.orb{position:absolute;pointer-events:none;z-index:-2;border-radius:50%;filter:blur(90px);will-change:transform}
.orb-a{width:640px;height:520px;left:-160px;top:-180px;background:color-mix(in srgb, var(--axi-brand) var(--orb-brand), transparent);animation:drift-a 28s ease-in-out infinite alternate}
.orb-b{width:560px;height:520px;right:-200px;bottom:-160px;background:color-mix(in srgb, var(--axi-violet) var(--orb-violet), transparent);animation:drift-b 34s ease-in-out infinite alternate}
.dots{position:absolute;inset:0;z-index:-1;pointer-events:none;
  background-image:radial-gradient(color-mix(in srgb, var(--foreground) var(--dots), transparent) 1px, transparent 1.2px);background-size:22px 22px;
  -webkit-mask-image:radial-gradient(70% 60% at 50% 30%, #000 30%, transparent 100%);mask-image:radial-gradient(70% 60% at 50% 30%, #000 30%, transparent 100%)}
@keyframes drift-a{to{transform:translate(90px,60px) scale(1.08)}}
@keyframes drift-b{to{transform:translate(-80px,-70px) scale(1.06)}}

.wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 24px}
header.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 0 8px}
.lockup{display:flex;align-items:center;gap:8px}
.lockup .mark{width:32px;height:32px;display:grid}
.lockup .word{font-family:var(--font-heading);font-weight:700;font-size:20px;letter-spacing:-.01em;
  background-image:linear-gradient(to right, var(--axi-brand), var(--axi-brand-2));-webkit-background-clip:text;background-clip:text;color:transparent}
:root[data-theme="dark"] .lockup .word{background-image:none;color:var(--foreground)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .lockup .word{background-image:none;color:var(--foreground)}}
.login{font-size:13px;color:var(--color-muted-foreground);white-space:nowrap}
.lockup .word{white-space:nowrap}
@container (max-width: 640px){.login .q{display:none}header.top{padding-top:18px}}

/* sesión abierta */
.session{margin:10px 0 0;padding:10px 14px;border-radius:14px;font-size:13px;display:flex;gap:10px;align-items:center;
  background:color-mix(in srgb, var(--color-background) 65%, transparent);border:1px solid color-mix(in srgb, var(--color-border) 60%, transparent);box-shadow:var(--shadow-float)}

/* ─────────── Stepper cápsula ─────────── */
.stepper-wrap{display:flex;justify-content:center;padding:22px 0 26px}
.stepper{position:relative;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;
  background:color-mix(in srgb, var(--color-background) 65%, transparent);backdrop-filter:saturate(160%) blur(16px);-webkit-backdrop-filter:saturate(160%) blur(16px);
  border:1px solid color-mix(in srgb, var(--color-border) 60%, transparent);box-shadow:var(--shadow-float)}
.stepper .pill{position:absolute;top:4px;bottom:4px;left:0;width:0;border-radius:999px;background:var(--color-accent);transition:transform .38s var(--ease-spring),width .38s var(--ease-spring);pointer-events:none}
.step{position:relative;z-index:1;display:flex;align-items:center;gap:8px;height:36px;padding:0 14px 0 6px;border-radius:999px;color:var(--color-muted-foreground);font-size:13px;transition:color .2s}
.step[aria-current="step"]{color:var(--color-foreground);font-weight:500}
.step .n{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;font-size:11.5px;font-weight:600;background:var(--color-muted);color:var(--color-muted-foreground);transition:background .3s,color .3s}
.step[aria-current="step"] .n{background:var(--axi-brand);color:var(--axi-on-color)}
.step.done .n{background:color-mix(in srgb, var(--axi-violet) 15%, transparent);color:var(--axi-violet)}
.step.done{cursor:pointer}
.step.done:hover{color:var(--color-foreground)}
.step .n svg{stroke-dasharray:24;stroke-dashoffset:24;stroke-width:2.6}
.step.done .n svg{animation:draw .35s .05s var(--ease-spring) forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.conn{width:22px;height:1px;background:var(--color-border);position:relative;overflow:hidden;border-radius:1px}
.conn::after{content:"";position:absolute;inset:0;background:color-mix(in srgb, var(--axi-violet) 55%, transparent);transform:scaleX(0);transform-origin:left;transition:transform .4s var(--ease-spring)}
.conn.on::after{transform:scaleX(1)}

/* ─────────── Escenario de dos columnas ─────────── */
.scene{display:grid;gap:24px;grid-template-columns:minmax(0,1fr) 360px;align-items:start;padding-bottom:120px}
@container (max-width: 1023px){.scene{grid-template-columns:minmax(0,1fr)}}

.card{position:relative;border-radius:24px;background:var(--color-card);box-shadow:var(--shadow-overlay);padding:32px;overflow:hidden;
  border:1px solid color-mix(in srgb, var(--color-border) 60%, transparent)}
.card::before{content:"";position:absolute;left:24px;right:24px;top:0;height:1px;
  background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--axi-brand) 70%, transparent) 30%, color-mix(in srgb, var(--axi-brand) 70%, transparent) 60%, transparent)}
@container (max-width: 640px){.card{padding:22px 18px;border-radius:20px}}
.card .eyebrow{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--color-muted-foreground);display:flex;gap:8px;align-items:center}
.card .eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--axi-brand);display:inline-block}
.card h1{font-size:28px;line-height:1.15;font-weight:700;margin:8px 0 0;text-wrap:balance}
@container (max-width: 640px){.card h1{font-size:24px}}
.card .lead{margin:8px 0 0;max-width:44rem;color:var(--color-muted-foreground);font-size:14px;line-height:1.6}
.head{transition:opacity .22s ease,transform .3s var(--ease-spring)}
.head.swap{opacity:0;transform:translateY(-4px)}
.panels{margin-top:24px;position:relative}
.panel{transition:opacity .26s ease,transform .38s var(--ease-spring)}
.panel.leaving{opacity:0;transform:translateX(-16px)}
.panel.entering{opacity:0;transform:translateX(16px)}

/* Segmentado inline */
.toprow{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.seg{position:relative;display:inline-flex;gap:2px;padding:4px;border-radius:999px;background:color-mix(in srgb, var(--color-secondary) 60%, transparent);border:1px solid var(--color-border)}
.seg .pill{position:absolute;top:4px;bottom:4px;left:4px;width:0;border-radius:999px;background:var(--color-accent);transition:transform .3s var(--ease-spring),width .3s var(--ease-spring)}
.seg button{position:relative;z-index:1;height:36px;padding:0 16px;border-radius:999px;font-size:13.5px;font-weight:500;color:var(--color-muted-foreground);transition:color .2s}
.seg button[aria-checked="true"]{color:var(--color-foreground)}
.seg-hint{font-size:13px;color:var(--color-muted-foreground);transition:opacity .25s}

/* ─────────── Bento ─────────── */
.bento{display:grid;gap:14px;grid-template-columns:repeat(6,minmax(0,1fr));margin-top:20px}
.bento>*{min-width:0}
.span-2{grid-column:span 2}.span-3{grid-column:span 3}.span-4{grid-column:span 4}.span-6{grid-column:span 6}
.rows-2{grid-row:span 2}
@container (max-width: 860px){.bento>*{grid-column:span 6!important;grid-row:auto!important}}

@property --comet-angle{syntax:"<angle>";initial-value:0deg;inherits:false}
.tilt{position:relative;border-radius:20px;transform-style:preserve-3d}
.offer{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;gap:12px;width:100%;height:100%;text-align:left;padding:22px;border-radius:20px;
  background:var(--color-card);border:1px solid var(--color-border);
  transition:border-color .25s ease,transform .25s ease,box-shadow .25s ease}
.offer:hover{border-color:color-mix(in srgb, var(--axi-brand) 45%, var(--color-border));transform:translateY(-1px)}
.offer[aria-checked="true"]{border-color:color-mix(in srgb, var(--axi-brand) 45%, var(--color-border));box-shadow:var(--shadow-overlay);transform:translateY(-2px)}
/* halo anclado a la esquina de la placa (channel-surface::before) */
.offer::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.55;transition:opacity .3s;
  background:radial-gradient(circle 96px at 34px 34px, color-mix(in srgb, var(--axi-brand) 34%, transparent) 0%, transparent 100%),
    radial-gradient(130% 120% at 0% 0%, color-mix(in srgb, var(--axi-brand) 20%, transparent) 0%, color-mix(in srgb, var(--axi-brand) 7%, transparent) 34%, transparent 66%)}
.offer:hover::before,.offer[aria-checked="true"]::before{opacity:.9}
/* cometa que recorre el borde (channel-surface::after) */
.offer::after{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;opacity:0;pointer-events:none;transition:opacity .25s;
  background:conic-gradient(from var(--comet-angle), transparent 0deg 232deg, color-mix(in srgb, var(--axi-brand) 55%, transparent) 300deg, var(--axi-brand) 344deg, color-mix(in srgb, var(--axi-brand) 90%, var(--background)) 356deg, transparent 360deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);mask-composite:exclude}
.offer:hover::after,.offer:focus-visible::after,.offer[aria-checked="true"]::after{opacity:1;animation:comet 2.6s linear infinite}
.offer[aria-checked="true"]::after{animation-duration:5s}
@keyframes comet{to{--comet-angle:360deg}}
.offer.violet::before{background:radial-gradient(circle 96px at 34px 34px, color-mix(in srgb, var(--axi-violet) 30%, transparent) 0%, transparent 100%),
  radial-gradient(130% 120% at 0% 0%, color-mix(in srgb, var(--axi-violet) 16%, transparent) 0%, transparent 60%)}
.offer.violet::after{background:conic-gradient(from var(--comet-angle), transparent 0deg 232deg, color-mix(in srgb, var(--axi-violet) 55%, transparent) 300deg, var(--axi-violet) 344deg, transparent 360deg)}
.offer.violet:hover,.offer.violet[aria-checked="true"]{border-color:color-mix(in srgb, var(--axi-violet) 45%, var(--color-border))}

.o-head{display:flex;align-items:flex-start;gap:12px}
.plate{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:12px;color:var(--axi-brand);
  background:color-mix(in srgb, var(--axi-brand) 10%, var(--background));border:1px solid color-mix(in srgb, var(--axi-brand) 22%, transparent)}
.plate.violet{color:var(--axi-violet);background:color-mix(in srgb, var(--axi-violet) 10%, var(--background));border-color:color-mix(in srgb, var(--axi-violet) 22%, transparent)}
.o-title{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.o-title b{font-size:15.5px;font-weight:600}
.o-title small{font-size:12px;color:var(--color-muted-foreground)}
.badge{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.02em;
  background:var(--color-accent);color:var(--color-foreground)}
.badge.violet{background:color-mix(in srgb, var(--axi-violet) 14%, var(--background));color:var(--axi-violet)}
.badge.ghost{background:transparent;border:1px solid var(--color-border);color:var(--color-muted-foreground);font-weight:500}
.check{position:absolute;top:14px;right:14px;z-index:2;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--axi-brand);color:var(--axi-on-color);
  transform:scale(0);opacity:0;transition:transform .35s var(--ease-spring),opacity .2s}
.offer[aria-checked="true"] .check{transform:scale(1);opacity:1}
.check.sq{border-radius:7px;transform:scale(1);opacity:1;background:transparent;border:1.5px solid var(--color-border);color:transparent;transition:background .2s,border-color .2s,color .2s,transform .35s var(--ease-spring)}
.offer[aria-checked="true"] .check.sq{background:var(--axi-brand);border-color:var(--axi-brand);color:var(--axi-on-color);transform:scale(1.06)}
.price{display:flex;flex-direction:column;gap:2px;margin-top:2px}
.price .row{display:flex;align-items:baseline;gap:7px;white-space:nowrap}
.price .was{font-size:12px;color:var(--color-muted-foreground)}
.price .big{font-family:var(--font-heading);font-weight:700;font-size:26px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.price .unit{font-size:12px;color:var(--color-muted-foreground)}
.price s{font-size:12px;color:var(--color-muted-foreground);text-decoration-thickness:1px}
.o-meta{font-size:13px;font-weight:500}
.o-tag{font-size:13px;color:var(--color-muted-foreground);line-height:1.55;margin:0}
.o-tag b{color:var(--color-foreground);font-weight:500}
.o-graphic{margin-top:auto;color:var(--axi-brand)}
.o-eyebrow{display:flex;gap:8px;margin-bottom:-2px}
.offer.hi{border-color:color-mix(in srgb, var(--axi-brand) 35%, var(--color-border));box-shadow:var(--shadow-overlay)}
.offer.hi::before{opacity:.8}
@container (min-width: 861px){.tilt:has(.offer.hi){transform:translateY(-8px)}}
.offer{padding:20px}
.price .big{font-size:25px}
.trial{flex-direction:row;align-items:center;gap:18px;padding:16px 20px}
.trial .o-title{flex:1 1 200px;min-width:0}
.trial .trial-track{flex:0 1 220px;min-width:160px;color:var(--axi-brand)}
.trial .trial-after{display:flex;flex-direction:column;flex:none;padding-left:18px;border-left:1px solid color-mix(in srgb, var(--color-border) 80%, transparent)}
.trial .trial-after small{font-size:11.5px;color:var(--color-muted-foreground)}
.trial .trial-after b{font-family:var(--font-heading);font-size:15px;font-weight:700}
.trial .check{top:50%;transform:translateY(-50%) scale(0)}
.trial[aria-checked="true"] .check{transform:translateY(-50%) scale(1)}
@container (max-width: 640px){.trial{flex-wrap:wrap}.trial .trial-track{flex:1 1 100%}.trial .trial-after{padding-left:0;border-left:0;flex-direction:row;gap:6px;align-items:baseline}}
.featured .o-body{display:flex;flex-direction:column;gap:12px}


/* gráficos SVG de capacidad */
.g{width:100%;height:auto;display:block;overflow:visible}
.g .soft{opacity:.35}
.wave rect{transform-origin:center;transition:transform .4s var(--ease-spring)}
.offer:hover .wave rect:nth-child(odd){transform:scaleY(1.35)}
.offer:hover .wave rect:nth-child(even){transform:scaleY(.75)}

.hint{margin:18px 0 0;font-size:13px;color:var(--color-muted-foreground);line-height:1.6}
.note{margin:14px 0 0;padding:12px 16px;border-radius:14px;font-size:13.5px;line-height:1.55;overflow:hidden;
  border:1px solid color-mix(in srgb, var(--axi-violet) 35%, transparent);background:color-mix(in srgb, var(--axi-violet) 8%, transparent);
  transition:opacity .3s,transform .35s var(--ease-spring),max-height .35s}
.note[hidden]{display:block!important;opacity:0;transform:translateY(-6px);max-height:0;padding:0 16px;margin:0;border-width:0}

.foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:22px;padding-top:20px;border-top:1px solid color-mix(in srgb, var(--color-border) 70%, transparent)}
.foot .stepn{font-size:12px;color:var(--color-muted-foreground)}
.cta-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.cta-wrap small{font-size:12px;color:var(--color-muted-foreground)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 20px;border-radius:12px;font-weight:600;font-size:14px;
  background:var(--axi-brand);color:var(--axi-on-color);transition:transform .15s,box-shadow .35s,filter .2s,opacity .2s;
  box-shadow:0 14px 40px color-mix(in srgb, var(--axi-brand) 40%, transparent)}
.btn:hover{filter:brightness(1.05)}
.btn:active{transform:scale(.97)}
.btn[disabled]{opacity:.45;box-shadow:none;cursor:not-allowed;filter:none}
.btn.ghost{background:transparent;color:var(--color-foreground);box-shadow:none;border:1px solid var(--color-border);height:44px}
.btn.ghost:hover{background:var(--color-secondary)}
.btn .spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@container (max-width: 640px){.foot .btn:not(.ghost){width:100%}.cta-wrap{width:100%;align-items:stretch}.cta-wrap small{text-align:center}}

/* ─────────── Formularios ─────────── */
.form{display:grid;gap:18px 16px;grid-template-columns:1fr 1fr}
@container (max-width: 640px){.form{grid-template-columns:1fr}}
.fld{display:flex;flex-direction:column;gap:6px;min-width:0}
.fld.full{grid-column:1/-1}
.fld label{font-size:13px;font-weight:500}
.fld .in{position:relative;display:flex;align-items:center}
.fld input,.fld select{width:100%;height:48px;padding:0 14px;border-radius:12px;background:var(--color-background);border:1px solid var(--color-input);
  transition:border-color .15s,box-shadow .15s;appearance:none;-webkit-appearance:none}
.fld input::placeholder{color:color-mix(in srgb, var(--foreground) 40%, transparent)}
.fld input:focus,.fld select:focus{outline:none;border-color:color-mix(in srgb, var(--axi-brand) 60%, var(--color-input));box-shadow:0 0 0 3px color-mix(in srgb, var(--axi-brand) 22%, transparent)}
.fld .desc{font-size:12px;color:var(--color-muted-foreground);line-height:1.5}
.fld.err input{border-color:var(--axi-destructive);animation:shake .4s var(--ease-spring)}
.fld.err .desc{color:var(--axi-destructive)}
@keyframes shake{0%{transform:translateX(0)}25%{transform:translateX(-3px)}55%{transform:translateX(3px)}80%{transform:translateX(-2px)}100%{transform:translateX(0)}}
.fld .trail{position:absolute;right:12px;color:var(--color-muted-foreground);display:grid}
.fld .sel-arrow{position:absolute;right:12px;pointer-events:none;color:var(--color-muted-foreground);display:grid}
.meter{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:4px}
.meter i{height:5px;border-radius:999px;background:var(--color-secondary);position:relative;overflow:hidden}
.meter i::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--axi-brand);transform:scaleX(0);transform-origin:left;transition:transform .4s var(--ease-spring),background .3s}
.meter[data-score="1"] i:nth-child(-n+1)::after,.meter[data-score="2"] i:nth-child(-n+2)::after,.meter[data-score="3"] i:nth-child(-n+3)::after{transform:scaleX(1)}
.meter[data-score="4"] i::after{transform:scaleX(1);background:var(--axi-violet)}
.meter-label{font-size:12px;color:var(--color-muted-foreground);display:flex;justify-content:space-between}
.meter[data-score="4"]+.meter-label b{color:var(--axi-violet)}
.terms{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.55;cursor:pointer}
.terms .box{flex:none;width:18px;height:18px;margin-top:2px;border-radius:6px;border:1.5px solid var(--color-input);display:grid;place-items:center;color:transparent;transition:background .2s,border-color .2s}
.terms input{position:absolute;opacity:0;width:0;height:0}
.terms input:checked+.box{background:var(--axi-brand);border-color:var(--axi-brand);color:var(--axi-on-color)}
.turnstile{grid-column:1/-1;display:flex;align-items:center;gap:12px;height:64px;padding:0 16px;border-radius:12px;border:1px dashed var(--color-border);font-size:12.5px;color:var(--color-muted-foreground);background:color-mix(in srgb, var(--color-secondary) 50%, transparent)}
.turnstile .dot{width:22px;height:22px;border-radius:50%;border:2px solid var(--axi-success);display:grid;place-items:center;color:var(--axi-success)}
.alert{grid-column:1/-1;padding:12px 16px;border-radius:12px;font-size:13.5px;border:1px solid color-mix(in srgb, var(--axi-destructive) 40%, transparent);background:color-mix(in srgb, var(--axi-destructive) 8%, transparent)}

/* ─────────── Rail: tiquete vivo ─────────── */
.rail{position:sticky;top:24px;display:flex;flex-direction:column;gap:16px;padding:24px;border-radius:20px;
  background:color-mix(in srgb, var(--color-background) 65%, transparent);border:1px solid color-mix(in srgb, var(--color-border) 60%, transparent);box-shadow:var(--shadow-float)}
@container (max-width: 1023px){.rail{display:none}}
.glyph-wrap{display:grid;place-items:center;height:104px;position:relative}
.glyph{position:absolute;width:88px;height:88px;border-radius:50%;display:grid;place-items:center;color:var(--axi-brand);
  background:radial-gradient(60% 60% at 35% 30%, color-mix(in srgb, #fff 55%, transparent), transparent 70%), color-mix(in srgb, var(--axi-brand) 9%, var(--color-background));
  border:1px solid color-mix(in srgb, var(--axi-brand) 30%, var(--color-border));
  box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 60%,transparent), inset 0 -10px 22px color-mix(in srgb, var(--axi-brand) 14%, transparent), 0 16px 36px color-mix(in srgb, var(--axi-brand) 18%, transparent);
  transition:opacity .35s ease,transform .45s var(--ease-spring);opacity:0;transform:scale(.85)}
.glyph.on{opacity:1;transform:scale(1)}
.glyph.violet{color:var(--axi-violet);border-color:color-mix(in srgb, var(--axi-violet) 30%, var(--color-border));background:radial-gradient(60% 60% at 35% 30%, color-mix(in srgb, #fff 55%, transparent), transparent 70%), color-mix(in srgb, var(--axi-violet) 9%, var(--color-background));box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 60%,transparent), 0 16px 36px color-mix(in srgb, var(--axi-violet) 18%, transparent)}
.glyph::after{content:"";position:absolute;inset:6px;border-radius:50%;border:1px solid color-mix(in srgb,#fff 35%,transparent);-webkit-mask:linear-gradient(160deg,#000 20%,transparent 60%);mask:linear-gradient(160deg,#000 20%,transparent 60%)}
:root[data-theme="dark"] .glyph{background:radial-gradient(60% 60% at 35% 30%, color-mix(in srgb, #fff 14%, transparent), transparent 70%), color-mix(in srgb, var(--axi-brand) 12%, var(--color-background))}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .glyph{background:radial-gradient(60% 60% at 35% 30%, color-mix(in srgb, #fff 14%, transparent), transparent 70%), color-mix(in srgb, var(--axi-brand) 12%, var(--color-background))}}
.rail .kicker{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--color-muted-foreground)}
.rail h2{font-size:18px;font-weight:700;margin:4px 0 0}
.rail dl{margin:0;display:flex;flex-direction:column;gap:9px;font-size:13px}
.rail dl>div{display:flex;justify-content:space-between;gap:12px;opacity:0;transform:translateY(6px);animation:rise .4s var(--ease-spring) forwards}
.rail dl>div:nth-child(2){animation-delay:.04s}.rail dl>div:nth-child(3){animation-delay:.08s}.rail dl>div:nth-child(4){animation-delay:.12s}.rail dl>div:nth-child(5){animation-delay:.16s}
@keyframes rise{to{opacity:1;transform:none}}
.rail dt{color:var(--color-muted-foreground)}
.rail dd{margin:0;font-weight:500;text-align:right}
.rail .total{display:flex;justify-content:space-between;align-items:baseline;padding-top:12px;border-top:1px dashed color-mix(in srgb, var(--color-border) 90%, transparent);font-size:13px}
.rail .total b{font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-size:17px;font-weight:600}
.rail .today{display:flex;justify-content:space-between;font-size:13px;color:var(--color-muted-foreground)}
.rail .today b{color:var(--axi-success);font-weight:600}
.trust{display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:14px;border:1px solid color-mix(in srgb, var(--axi-brand) 25%, transparent);background:color-mix(in srgb, var(--axi-brand) 8%, transparent)}
.trust b{font-size:14px;font-weight:600}
.trust div{display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--color-muted-foreground)}
.trust div svg{color:var(--axi-brand)}
.why{display:flex;flex-direction:column;gap:10px}
.why div{display:grid;grid-template-columns:auto 1fr;gap:10px;font-size:12.5px;color:var(--color-muted-foreground);line-height:1.45}
.why div b{color:var(--color-foreground);font-weight:500}
.why .k{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:var(--axi-brand);background:color-mix(in srgb, var(--axi-brand) 10%, var(--background));border:1px solid color-mix(in srgb, var(--axi-brand) 22%, transparent)}
.social{border-top:1px solid color-mix(in srgb, var(--color-border) 70%, transparent);padding-top:14px}
.social .kicker{margin-bottom:8px}
.social ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.social li{display:flex;justify-content:space-between;gap:10px;font-size:12.5px}
.social li b{font-weight:600}
.social li span{color:var(--color-muted-foreground)}
.rail .ent{font-size:12px;color:var(--color-muted-foreground);line-height:1.5;margin:0}
.rail .fx{transition:opacity .25s,transform .3s var(--ease-spring)}
.rail .fx.swap{opacity:0;transform:translateY(6px)}

/* barra inferior móvil */
.mbar{display:none;position:sticky;bottom:0;z-index:5;margin:0 -24px;padding:12px 18px calc(12px + env(safe-area-inset-bottom));
  background:color-mix(in srgb, var(--color-background) 78%, transparent);backdrop-filter:saturate(160%) blur(16px);-webkit-backdrop-filter:saturate(160%) blur(16px);
  border-top:1px solid color-mix(in srgb, var(--color-border) 60%, transparent);align-items:center;justify-content:space-between;gap:12px}
@container (max-width: 1023px){.mbar{display:flex}}
.mbar .l{display:flex;flex-direction:column;min-width:0}
.mbar .l small{font-size:11px;color:var(--color-muted-foreground);letter-spacing:.08em;text-transform:uppercase;font-weight:600}
.mbar .l b{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mbar .l b .mono{font-weight:600}
.mbar .btn{height:42px;padding:0 16px;flex:none}

@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
  .orb{animation:none!important}
  .rail dl>div{opacity:1;transform:none}
}
"""

CSS = CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)

# ───────────────────────── Datos reales (landing.content.ts) ─────────────────────────
PKGS = {
    "esencial": dict(name="Esencial", icon="MessageCircle", list=259800, founder=154900, inherits=None,
                     tag="Para el negocio que ya vende por chat y quiere ordenarlo y medirlo.",
                     bullets=["WhatsApp oficial, Instagram y Messenger", "Agente vendedor con tu catálogo y pedidos"]),
    "crecimiento": dict(name="Crecimiento", icon="ChartNoAxesColumn", list=369800, founder=220900, inherits="Esencial", badge="Más elegido",
                        tag="Para el que ya escala y necesita captación, llamadas y medición.",
                        bullets=["Axel, tu CMO con IA: propone campañas y las mide", "Captación de leads con datos verificados", "Llamadas con voz natural desde tu propio número", "Embudo en pesos y calidad de cada conversación"]),
    "escala": dict(name="Escala", icon="Network", list=569800, founder=340900, inherits="Crecimiento",
                   tag="Para la operación con varios equipos y varias líneas abiertas.",
                   bullets=["Varias líneas de WhatsApp y equipos separados", "Roles y permisos, sin límite de usuarios"]),
    "free_trial": dict(name="Free Trial", icon="Sparkles", tag="Pruébalo con tu propio catálogo y tu WhatsApp, sin poner un peso."),
}
MODS = {
    "calls": dict(name="Llamadas con IA", icon="Phone", price=289900, quota="200 minutos", eq="≈ 60 llamadas",
                  extras="CRM y Analítica incluidos · 100 conversaciones de chat",
                  tag="Tu agente llama y contesta con voz natural: confirma citas, cobra y hace seguimiento, con tu propio número."),
    "leads": dict(name="Captación de leads", icon="Radar", price=169900, quota="500 leads", eq="≈ 150 leads verificados",
                  extras="CRM y Analítica incluidos · campañas · 200 conversaciones",
                  tag="Encuentra empresas y contactos por zona y rubro, verifica sus datos y escríbeles por WhatsApp."),
    "crm": dict(name="CRM con IA", icon="Users", price=129900, quota="500 conversaciones", eq="≈ 2.000 contactos",
                extras="Analítica, copiloto y tareas automáticas incluidos",
                tag="Contactos, embudo y seguimiento con un copiloto que resume cada cliente y sugiere el siguiente paso."),
    "scheduling": dict(name="Agenda y reservas", icon="CalendarClock", price=89900, quota="300 conversaciones", eq="citas ilimitadas",
                       extras="CRM y Analítica incluidos · recordatorios",
                       tag="Tu agente agenda, confirma y reagenda por WhatsApp, y recuerda cada cita para que nadie falte."),
}

def cop(n):
    return "$" + f"{n:,}".replace(",", ".")

def graphic(kind):
    if kind == "esencial":
        return ('<svg class="g" viewBox="0 0 160 56" fill="none" stroke="currentColor" stroke-width="1.5">'
                '<rect class="soft" x="2" y="4" width="72" height="26" rx="10"/><path class="soft" d="M14 30 L10 40 L24 30"/>'
                '<rect x="60" y="24" width="96" height="28" rx="12"/><path d="M140 52 L146 60 L132 52"/>'
                '<path d="M98 38 l6 6 l12 -12" stroke-width="2"/></svg>')
    if kind == "crecimiento":
        bars = [10, 16, 14, 22, 26, 34, 40, 50]
        rects = "".join(f'<rect x="{10+i*20}" y="{54-h}" width="10" height="{h}" rx="3" fill="currentColor" opacity="{0.22+0.1*i:.2f}"/>' for i, h in enumerate(bars))
        return (f'<svg class="g" viewBox="0 0 176 60" fill="none">{rects}'
                '<path d="M15 44 C 45 40, 70 34, 95 26 S 140 12, 165 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
                '<circle cx="165" cy="6" r="4" fill="currentColor"/><circle cx="165" cy="6" r="8" fill="currentColor" opacity=".25"/></svg>')
    if kind == "trial":
        days = "".join(
            f'<g><rect x="{i*30}" y="8" width="24" height="24" rx="8" fill="currentColor" opacity="{1 if i==0 else .14}"/>'
            + (f'<path d="M7 20 l4 4 l7 -8" stroke="var(--axi-on-color)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' if i==0 else f'<text x="{i*30+12}" y="24.5" text-anchor="middle" font-size="10" font-weight="600" fill="currentColor" font-family="Poppins, sans-serif">{i+1}</text>')
            + '</g>' for i in range(7))
        return f'<svg class="g" viewBox="0 0 204 40">{days}<text x="0" y="39.5" font-size="8.5" letter-spacing=".08em" fill="currentColor" opacity=".7" font-family="Poppins, sans-serif">HOY</text><text x="204" y="39.5" text-anchor="end" font-size="8.5" letter-spacing=".08em" fill="currentColor" opacity=".7" font-family="Poppins, sans-serif">DÍA 7</text></svg>'
    if kind == "escala":
        return ('<svg class="g" viewBox="0 0 160 56" fill="none" stroke="currentColor" stroke-width="1.5">'
                '<circle cx="20" cy="12" r="6"/><circle cx="20" cy="30" r="6"/><circle cx="20" cy="48" r="6"/>'
                '<line class="soft" x1="34" y1="12" x2="150" y2="12"/><line class="soft" x1="34" y1="30" x2="150" y2="30"/><line class="soft" x1="34" y1="48" x2="150" y2="48"/>'
                '<circle cx="70" cy="12" r="3" fill="currentColor"/><circle cx="110" cy="12" r="3" fill="currentColor"/>'
                '<circle cx="90" cy="30" r="3" fill="currentColor"/><circle cx="130" cy="30" r="3" fill="currentColor"/>'
                '<circle cx="60" cy="48" r="3" fill="currentColor"/><circle cx="100" cy="48" r="3" fill="currentColor"/><circle cx="140" cy="48" r="3" fill="currentColor"/></svg>')
    if kind == "calls":
        bars = [8, 18, 30, 44, 26, 52, 36, 20, 42, 28, 14, 34, 48, 22, 10, 30, 40, 18, 8]
        rects = "".join(f'<rect x="{6+i*9}" y="{(56-h)/2:.0f}" width="4" height="{h}" rx="2" fill="currentColor" opacity="{0.35+0.65*(h/52):.2f}"/>' for i, h in enumerate(bars))
        return f'<svg class="g wave" viewBox="0 0 180 56">{rects}</svg>'
    if kind == "leads":
        dots = "".join(f'<circle cx="{10+x*20}" cy="{8+y*16}" r="1.2" fill="currentColor" opacity=".25"/>' for x in range(9) for y in range(3))
        pin = lambda x, y, o: f'<g opacity="{o}"><path d="M{x} {y} c-6 0 -9 -4.5 -9 -9 a9 9 0 1 1 18 0 c0 4.5 -3 9 -9 9z" stroke="currentColor" stroke-width="1.5" fill="color-mix(in srgb, currentColor 18%, transparent)"/><circle cx="{x}" cy="{y-9}" r="3" fill="currentColor"/></g>'
        return f'<svg class="g" viewBox="0 0 180 56" fill="none">{dots}{pin(40,46,1)}{pin(96,38,.75)}{pin(146,50,.55)}</svg>'
    if kind == "crm":
        return ('<svg class="g" viewBox="0 0 180 56" fill="none" stroke="currentColor" stroke-width="1.5">'
                '<path d="M6 8 H174 L142 26 H38 Z" fill="color-mix(in srgb, currentColor 10%, transparent)"/>'
                '<path d="M38 30 H142 L122 44 H58 Z" fill="color-mix(in srgb, currentColor 18%, transparent)"/>'
                '<path d="M58 48 H122 L108 55 H72 Z" fill="currentColor" stroke="none"/>'
                '<text x="90" y="20" text-anchor="middle" font-size="9" fill="currentColor" stroke="none" font-family="Geist Mono, monospace">1.240 → 612 → 318</text></svg>')
    if kind == "scheduling":
        cells = ""
        for r in range(4):
            for c in range(7):
                sel = (r == 1 and c == 3)
                cells += (f'<rect x="{8+c*24}" y="{4+r*13}" width="16" height="9" rx="3" fill="currentColor" opacity="{1 if sel else .18}"/>' if not sel else
                          f'<rect x="{8+c*24-3}" y="{4+r*13-3}" width="22" height="15" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="{8+c*24}" y="{4+r*13}" width="16" height="9" rx="3" fill="currentColor"/>')
        return f'<svg class="g" viewBox="0 0 180 56">{cells}</svg>'
    return ""

SUBS = {"esencial": "El escalón de entrada", "crecimiento": "Todo Esencial y más", "escala": "Para varios equipos"}

def pkg_card(code, extra_cls=""):
    p = PKGS[code]
    if code == "free_trial":
        return f'''
<div class="tilt span-6">
  <button type="button" role="radio" aria-checked="false" data-pkg="free_trial" class="offer trial">
    <span class="check">{ic("Check", size=14)}</span>
    <span class="plate">{ic("Sparkles")}</span>
    <span class="o-title"><b>Free Trial</b><small>7 días con el producto completo. Sin tarjeta, sin compromiso.</small></span>
    <span class="trial-track" aria-hidden="true">{graphic("trial")}</span>
    <span class="trial-after"><small>Después</small><b>Eliges tu plan</b></span>
  </button>
</div>'''
    hi = code == "crecimiento"
    badge = f'<div class="o-eyebrow"><span class="badge">{p["badge"]}</span></div>' if p.get("badge") else ""
    return f'''
<div class="tilt span-2">
  <button type="button" role="radio" aria-checked="false" data-pkg="{code}" class="offer{" hi" if hi else ""}">
    <span class="check">{ic("Check", size=14)}</span>
    {badge}
    <div class="o-head"><span class="plate">{ic(p["icon"])}</span><span class="o-title"><b>{p["name"]}</b><small>{SUBS[code]}</small></span></div>
    <div class="price"><div class="row"><span class="big tabular">{cop(p["founder"])}</span></div><div class="was">COP/mes · <s class="tabular">{cop(p["list"])}</s> lista</div></div>
    <div class="o-meta">1.000 conversaciones al mes</div>
    <p class="o-tag">{p["tag"]}</p>
    <div class="o-graphic">{graphic(code)}</div>
  </button>
</div>'''


def mod_card(code):
    m = MODS[code]
    return f'''
<div class="tilt span-3">
  <button type="button" role="checkbox" aria-checked="false" data-mod="{code}" class="offer">
    <span class="check sq">{ic("Check", size=14)}</span>
    <div class="o-head"><span class="plate">{ic(m["icon"])}</span><span class="o-title"><b>{m["name"]}</b><small>{m["extras"]}</small></span></div>
    <div class="price"><div class="row"><span class="big tabular">{cop(m["price"])}</span></div><div class="was">COP/mes · tras la prueba</div></div>
    <div class="o-meta">{m["quota"]} al mes <span class="muted">{m["eq"]}</span></div>
    <p class="o-tag">{m["tag"]}</p>
    <div class="o-graphic">{graphic(code)}</div>
  </button>
</div>'''

BULLET_CSS = """
.bl{list-style:none;margin:2px 0 0;padding:0;display:grid;gap:7px;font-size:13px}
.bl li{display:flex;gap:8px;align-items:flex-start;color:var(--color-muted-foreground)}
.bl li svg{color:var(--axi-brand);margin-top:3px}
"""

HTML = f"""<title>Comenzar Premium</title>
<meta name="description" content="Mockup navegable del registro autoservicio de Axi Connect">
<style>
{FONT_CSS}
{CSS}
{BULLET_CSS}
</style>

<div class="mockbar" role="toolbar" aria-label="Controles del mockup">
  <div class="grp"><b>Tema</b><button data-theme-set="system" aria-pressed="true">Sistema</button><button data-theme-set="light">Claro</button><button data-theme-set="dark">Oscuro</button></div>
  <div class="grp"><b>Vista</b><button data-vp="desktop" aria-pressed="true">Escritorio</button><button data-vp="mobile">Móvil</button></div>
  <div class="grp"><b>Estado</b><button data-state="empty">Sin elegir</button><button data-state="pkg">Paquete</button><button data-state="mods">2 módulos</button><button data-state="nit">Error NIT</button><button data-state="sending">Enviando</button><button data-state="session">Sesión abierta</button></div>
</div>

<div class="stage" id="stage" data-vp="desktop">
<div class="field" id="field">
  <div class="orb orb-a" aria-hidden="true"></div>
  <div class="orb orb-b" aria-hidden="true"></div>
  <div class="dots" aria-hidden="true"></div>

  <div class="wrap">
    <header class="top">
      <a class="lockup" href="#" aria-label="axi connect"><span class="mark">{ISOLOGO}</span><span class="word">axi connect</span></a>
      <p class="login"><span class="q">¿Ya tienes cuenta? </span><a href="#">Inicia sesión</a></p>
    </header>

    <p class="session" role="status" id="session" hidden>{ic("Info", size=16)}<span>Ya tienes una sesión abierta. <a href="#">Ir a mi panel</a> o continúa para crear otra empresa.</span></p>

    <div class="stepper-wrap">
      <ol class="stepper" id="stepper" aria-label="Progreso del registro" style="list-style:none;margin:0">
        <span class="pill" id="stepPill"></span>
        <li class="step" data-i="0"><span class="n"><span class="num">1</span>{ic("Check", size=13)}</span><span class="lbl">Oferta</span></li>
        <li class="conn" aria-hidden="true"></li>
        <li class="step" data-i="1"><span class="n"><span class="num">2</span>{ic("Check", size=13)}</span><span class="lbl">Empresa</span></li>
        <li class="conn" aria-hidden="true"></li>
        <li class="step" data-i="2"><span class="n"><span class="num">3</span>{ic("Check", size=13)}</span><span class="lbl">Cuenta</span></li>
      </ol>
    </div>

    <div class="scene">
      <section class="card" aria-live="polite">
        <div class="head" id="head">
          <p class="eyebrow"><i></i><span id="eyebrow">Paso 1 de 3 · 7 días gratis, sin tarjeta</span></p>
          <h1 id="title">Elige cómo quieres empezar</h1>
          <p class="lead" id="lead">Todo arranca con 7 días de prueba sin tarjeta. Cambia de opinión cuando quieras: la prueba es la misma.</p>
        </div>

        <div class="panels">
          <!-- Paso 1 · Oferta -->
          <div class="panel" data-panel="0">
            <div class="toprow">
              <div class="seg" role="radiogroup" aria-label="Tipo de oferta" id="seg">
                <span class="pill" id="segPill"></span>
                <button type="button" role="radio" aria-checked="true" data-kind="package">Paquete</button>
                <button type="button" role="radio" aria-checked="false" data-kind="modules">Módulos</button>
              </div>
              <span class="seg-hint" id="segHint">El producto completo. Solo cambia cuántas conversaciones atiende.</span>
            </div>

            <div class="bento" role="radiogroup" aria-label="Paquetes" id="pkgGrid">
              {pkg_card("crecimiento")}
              {pkg_card("esencial")}
              {pkg_card("escala")}
              {pkg_card("free_trial")}
            </div>

            <div class="bento" role="group" aria-label="Módulos" id="modGrid" hidden>
              {mod_card("calls")}
              {mod_card("leads")}
              {mod_card("crm")}
              {mod_card("scheduling")}
            </div>

            <p class="hint">Los Módulos se contratan sueltos y no se combinan con un Paquete. Todo empieza con 7 días de prueba sin tarjeta.</p>
            <p class="note" role="note" id="note" hidden>Con dos o más módulos, <strong>Crecimiento</strong> sale mejor y trae el producto completo. <a href="#">Comparar</a></p>

            <div class="foot">
              <span class="stepn">Paso 1 de 3</span>
              <div class="cta-wrap">
                <button type="button" class="btn" id="next0" disabled>Continuar {ic("ArrowRight", size=16)}</button>
                <small id="blocker">Elige un paquete o al menos un módulo para continuar.</small>
              </div>
            </div>
          </div>

          <!-- Paso 2 · Empresa -->
          <div class="panel" data-panel="1" hidden>
            <div class="form">
              <div class="fld"><label for="f-name">Nombre de la empresa</label><div class="in"><input id="f-name" placeholder="Como la conocen tus clientes" value="Savage Colombia"></div></div>
              <div class="fld" id="fld-nit"><label for="f-nit">NIT</label><div class="in"><input id="f-nit" inputmode="numeric" placeholder="900.000.000-0" value="901.234.567-8"></div>
                <p class="desc" id="nitDesc">Con dígito de verificación. Lo usamos para identificar tu empresa al iniciar sesión.</p></div>
              <div class="fld"><label for="f-country">País</label><div class="in"><select id="f-country"><option>Colombia</option><option>México</option><option>Perú</option><option>Chile</option></select><span class="sel-arrow">{ic("ChevronDown", size=16)}</span></div>
                <p class="desc">La moneda y la zona horaria se ajustan solas.</p></div>
              <div class="fld"><label for="f-city">Ciudad</label><div class="in"><input id="f-city" placeholder="Ciudad principal" value="Bogotá"></div>
                <p class="desc">Donde opera tu negocio. Ajusta ejemplos, zonas de entrega y agenda.</p></div>
            </div>
            <div class="foot">
              <button type="button" class="btn ghost" data-go="0">{ic("ArrowLeft", size=16)} Atrás</button>
              <button type="button" class="btn" data-go="2">Continuar {ic("ArrowRight", size=16)}</button>
            </div>
          </div>

          <!-- Paso 3 · Cuenta -->
          <div class="panel" data-panel="2" hidden>
            <div class="form">
              <div class="fld"><label for="f-you">Tu nombre</label><div class="in"><input id="f-you" placeholder="Nombre y apellido" value="Laura Restrepo"></div></div>
              <div class="fld"><label for="f-mail">Correo de trabajo</label><div class="in"><input id="f-mail" type="email" placeholder="nombre@empresa.com" value="laura@savagecolombia.com"></div>
                <p class="desc">Te enviaremos un enlace para verificarlo. Puedes seguir configurando mientras tanto.</p></div>
              <div class="fld full"><label for="f-pass">Contraseña</label><div class="in"><input id="f-pass" type="password" value="Savage2026!bogota" autocomplete="new-password"><button type="button" class="trail" aria-label="Mostrar contraseña" id="eye">{ic("Eye", size=18)}</button></div>
                <div class="meter" id="meter" data-score="4"><i></i><i></i><i></i><i></i></div>
                <p class="meter-label"><span>Mínimo 10 caracteres, una mayúscula y un número</span><b id="meterLabel">Muy buena</b></p></div>
              <label class="terms full"><input type="checkbox" checked><span class="box">{ic("Check", size=12)}</span><span>Acepto los <a href="#">Términos del servicio</a> y la <a href="#">Política de privacidad</a>. Tus datos se tratan según la Ley 1581 de 2012.</span></label>
              <div class="turnstile" aria-label="Verificación Cloudflare Turnstile"><span class="dot">{ic("Check", size=12)}</span><span>Verificación completada · Cloudflare Turnstile</span></div>
              <p class="alert" role="alert" id="alert" hidden>Demasiados intentos. Reintenta en 38 s.</p>
            </div>
            <div class="foot">
              <button type="button" class="btn ghost" data-go="1">{ic("ArrowLeft", size=16)} Atrás</button>
              <div class="cta-wrap">
                <button type="button" class="btn" id="submit"><span class="lbl">Crear mi cuenta y empezar</span>{ic("ArrowRight", "arrow", size=16)}</button>
                <small>Sin tarjeta. Entras directo a configurar tu empresa.</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside class="rail" aria-label="Resumen de tu elección" id="rail">
        <div class="glyph-wrap" id="glyphs">
          <div class="glyph on" data-g="ai">{ic("Sparkles", size=34)}</div>
          <div class="glyph" data-g="package">{ic("MessageCircle", size=34)}</div>
          <div class="glyph" data-g="calls">{ic("Phone", size=34)}</div>
          <div class="glyph" data-g="leads">{ic("Radar", size=34)}</div>
          <div class="glyph" data-g="crm">{ic("Users", size=34)}</div>
          <div class="glyph" data-g="scheduling">{ic("CalendarClock", size=34)}</div>
          <div class="glyph violet" data-g="trial">{ic("Sparkles", size=34)}</div>
          <div class="glyph" data-g="company">{ic("Building2", size=34)}</div>
          <div class="glyph" data-g="account">{ic("ShieldCheck", size=34)}</div>
        </div>
        <div class="fx" id="railBody"></div>
        <div class="trust">
          <b>7 días gratis, sin tarjeta</b>
          <div>{ic("Check", size=14)}Pagas solo si decides seguir</div>
          <div>{ic("Check", size=14)}Si no sigues, tus datos quedan intactos</div>
          <div>{ic("Check", size=14)}Tarifa de fundador congelada en pesos</div>
        </div>
        <div class="social">
          <p class="kicker">Ya venden con Axi</p>
          <ul>
            <li><b>Joao's Burguer</b><span>comida rápida, Palmira</span></li>
            <li><b>Savage</b><span>moda urbana, Bogotá</span></li>
            <li><b>The Brothers Inc</b><span>estudio de grabación, Bogotá</span></li>
          </ul>
        </div>
        <p class="ent">¿Alto volumen o base de datos dedicada? <a href="#">Hablemos de Enterprise</a>.</p>
      </aside>
    </div>

    <div class="mbar" id="mbar">
      <div class="l"><small id="mbK">Tu elección</small><b id="mbV">Elige un paquete o un módulo</b></div>
      <button type="button" class="btn" id="mbBtn" disabled>Continuar {ic("ArrowRight", size=16)}</button>
    </div>
  </div>
</div>
</div>

<script>
(() => {{
const PKGS = {json.dumps({k: {"name": v["name"], "founder": v.get("founder"), "list": v.get("list")} for k, v in PKGS.items()})};
const MODS = {json.dumps({k: {"name": v["name"], "price": v["price"], "quota": v["quota"]} for k, v in MODS.items()})};
const cop = n => "$" + n.toLocaleString("es-CO", {{maximumFractionDigits:0}});
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const st = {{ step:0, kind:"package", pkg:null, mods:new Set(), nit:false, sending:false, session:false }};
const COPY = [
  ["Paso 1 de 3 · 7 días gratis, sin tarjeta", "Elige cómo quieres empezar", "Todo arranca con 7 días de prueba sin tarjeta. Cambia de opinión cuando quieras: la prueba es la misma."],
  ["Paso 2 de 3 · lo justo para crear tu cuenta", "Cuéntanos de tu empresa", "Lo justo para crear tu cuenta. El resto lo configuras después, con guía."],
  ["Paso 3 de 3 · serás la persona propietaria", "Crea tu cuenta", "Serás la persona propietaria de la cuenta: podrás invitar a tu equipo y asignar permisos después."],
];

/* ───── tema / viewport / estados del mockup ───── */
const root = document.documentElement;
function setTheme(v){{ if(v==="system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", v);
  $$("[data-theme-set]").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.themeSet===v))); }}
$$("[data-theme-set]").forEach(b=>b.onclick=()=>setTheme(b.dataset.themeSet));
$$("[data-vp]").forEach(b=>b.onclick=()=>{{ $("#stage").dataset.vp=b.dataset.vp; $$("[data-vp]").forEach(x=>x.setAttribute("aria-pressed", String(x===b))); requestAnimationFrame(()=>{{placePill($("#stepper"), $("#stepPill"), '[aria-current="step"]'); placePill($("#seg"), $("#segPill"), '[aria-checked="true"]');}}); }});
$$("[data-state]").forEach(b=>b.onclick=()=>{{ $$("[data-state]").forEach(x=>x.setAttribute("aria-pressed", String(x===b))); preset(b.dataset.state); }});
function preset(name){{
  st.nit=false; st.sending=false; st.session=false;
  if(name==="empty"){{ st.kind="package"; st.pkg=null; st.mods.clear(); go(0); }}
  if(name==="pkg"){{ st.kind="package"; st.pkg="crecimiento"; st.mods.clear(); go(0); }}
  if(name==="mods"){{ st.kind="modules"; st.pkg=null; st.mods=new Set(["calls","crm"]); go(0); }}
  if(name==="nit"){{ if(!selectionOk()) {{ st.kind="package"; st.pkg="crecimiento"; }} st.nit=true; go(1); }}
  if(name==="sending"){{ if(!selectionOk()) {{ st.kind="package"; st.pkg="crecimiento"; }} st.sending=true; go(2); }}
  if(name==="session"){{ st.session=true; render(); }}
  render();
}}

/* ───── pastillas que se deslizan ───── */
function placePill(list, pill, sel){{ const a=list.querySelector(sel); if(!a){{pill.style.opacity="0";return;}} pill.style.opacity="1"; pill.style.width=a.offsetWidth+"px"; pill.style.transform=`translateX(${{a.offsetLeft-(list===$("#seg")?4:0)}}px)`; }}

/* ───── navegación de pasos ───── */
function selectionOk(){{ return st.kind==="package" ? !!st.pkg : st.mods.size>0; }}
let animating=false;
function go(n){{
  if(n===st.step){{ render(); return; }}
  if(n>0 && !selectionOk()) n=0;
  const from=$(`[data-panel="${{st.step}}"]`), to=$(`[data-panel="${{n}}"]`), head=$("#head");
  st.step=n; renderStepper(); renderRail();
  if(reduced){{ from.hidden=true; to.hidden=false; setHead(); return; }}
  head.classList.add("swap"); from.classList.add("leaving");
  setTimeout(()=>{{ from.hidden=true; from.classList.remove("leaving"); setHead(); head.classList.remove("swap");
    to.hidden=false; to.classList.add("entering"); void to.offsetWidth; to.classList.remove("entering"); }}, 200);
}}
function setHead(){{ const c=COPY[st.step]; $("#eyebrow").textContent=c[0]; $("#title").textContent=c[1]; $("#lead").textContent=c[2]; }}
$$("[data-go]").forEach(b=>b.onclick=()=>go(+b.dataset.go));
$("#next0").onclick=()=>go(1);
$("#mbBtn").onclick=()=>{{ if(st.step<2) go(st.step+1); else submit(); }};
$("#submit").onclick=submit;
function submit(){{ st.sending=true; render(); setTimeout(()=>{{ st.sending=false; render(); }}, 2600); }}

function renderStepper(){{
  $$("#stepper .step").forEach(li=>{{ const i=+li.dataset.i; li.classList.toggle("done", i<st.step); li.toggleAttribute("aria-current", i===st.step); if(i===st.step) li.setAttribute("aria-current","step"); li.onclick = i<st.step ? ()=>go(i) : null; li.querySelector(".num").hidden = i<st.step; li.querySelector("svg").style.display = i<st.step ? "" : "none"; }});
  $$("#stepper .conn").forEach((c,i)=>c.classList.toggle("on", i<st.step));
  placePill($("#stepper"), $("#stepPill"), '[aria-current="step"]');
}}

/* ───── oferta ───── */
$$("#seg button").forEach(b=>b.onclick=()=>{{ st.kind=b.dataset.kind; if(st.kind==="package") st.mods.clear(); else st.pkg=null; render(); }});
$$("[data-pkg]").forEach(b=>b.onclick=()=>{{ st.pkg=b.dataset.pkg; render(); }});
$$("[data-mod]").forEach(b=>b.onclick=()=>{{ const m=b.dataset.mod; st.mods.has(m)?st.mods.delete(m):st.mods.add(m); render(); }});

function summary(){{
  if(st.kind==="package" && st.pkg){{
    const p=PKGS[st.pkg];
    if(st.pkg==="free_trial") return {{kind:"Paquete", title:"Free Trial", glyph:"trial", lines:[["Incluye","Producto completo con topes de prueba"],["Duración","7 días"]], total:null}};
    return {{kind:"Paquete", title:p.name, glyph:"package", lines:[["Conversaciones","1.000 al mes"],["Pago","Mensual"],["Precio de lista",cop(p.list)+" COP"],["Fundador (−40 %)","congelado en pesos"]], total:p.founder}};
  }}
  if(st.kind==="modules" && st.mods.size){{
    const ms=[...st.mods].map(k=>MODS[k]); const total=ms.reduce((a,m)=>a+m.price,0);
    return {{kind:"Módulos", title: ms.length===1?ms[0].name:ms.length+" módulos", glyph:[...st.mods][0], lines: ms.map(m=>[m.name, cop(m.price)]), total}};
  }}
  return null;
}}
let lastTotal=0;
function countUp(el, to){{ const from=lastTotal; lastTotal=to; if(reduced||from===to){{ el.textContent=cop(to)+" COP/mes"; return; }}
  const t0=performance.now(), d=520; (function f(t){{ const k=Math.min(1,(t-t0)/d), e=1-Math.pow(1-k,3); el.textContent=cop(Math.round(from+(to-from)*e))+" COP/mes"; if(k<1) requestAnimationFrame(f); }})(t0); }}

function renderRail(){{
  const s=summary(); const body=$("#railBody");
  let g = s ? s.glyph : "ai"; if(st.step===1) g="company"; if(st.step===2) g="account";
  $$("#glyphs .glyph").forEach(x=>x.classList.toggle("on", x.dataset.g===g));
  let html="";
  if(!s){{ html=`<p class="kicker">Tu elección</p><h2>Elige cómo empezar</h2><p class="muted" style="margin:6px 0 0;font-size:13px;line-height:1.6">Un Paquete trae el producto completo; un Módulo, una sola capacidad con su volumen.</p>`; }}
  else {{
    html=`<p class="kicker">${{s.kind}}</p><h2>${{s.title}}</h2><dl style="margin-top:12px">${{s.lines.map(([k,v])=>`<div><dt>${{k}}</dt><dd>${{v}}</dd></div>`).join("")}}</dl>`;
    if(s.total!=null) html+=`<div class="total" style="margin-top:12px"><span class="muted">Después de la prueba</span><b id="total"></b></div>`;
    html+=`<div class="today" style="margin-top:6px"><span>Hoy pagas</span><b>$0</b></div>`;
    if(st.step===2) html+=`<div class="today" style="margin-top:2px"><span>Tu prueba vence</span><b style="color:var(--color-foreground)">12 de septiembre</b></div>`;
  }}
  if(st.step===1){{
    html+=`<div class="why" style="margin-top:16px"><p class="kicker" style="margin:0">Por qué pedimos esto</p>
      <div><span class="k">{ic("Building2", size=14)}</span><span><b>NIT</b> · identifica tu empresa al entrar</span></div>
      <div><span class="k">{ic("MapPin", size=14)}</span><span><b>Ciudad</b> · ajusta ejemplos, zonas y agenda</span></div>
      <div><span class="k">{ic("Clock", size=14)}</span><span><b>País</b> · moneda y zona horaria, solas</span></div></div>`;
  }}
  body.classList.add("swap"); setTimeout(()=>{{ body.innerHTML=html; body.classList.remove("swap"); const t=$("#total"); if(t) countUp(t, s.total); }}, reduced?0:160);
  // barra móvil
  $("#mbK").textContent = s ? s.kind : "Tu elección";
  $("#mbV").innerHTML = s ? (s.title + (s.total!=null ? ` · <span class="mono">${{cop(s.total)}}</span>/mes` : " · 7 días gratis")) : "Elige un paquete o un módulo";
  const mb=$("#mbBtn"); mb.disabled=!selectionOk(); mb.innerHTML = st.step<2 ? `Continuar {ic("ArrowRight", size=16)}` : `Crear mi cuenta {ic("ArrowRight", size=16)}`;
}}

function render(){{
  // segmentado
  $$("#seg button").forEach(b=>b.setAttribute("aria-checked", String(b.dataset.kind===st.kind)));
  placePill($("#seg"), $("#segPill"), '[aria-checked="true"]');
  $("#segHint").textContent = st.kind==="package" ? "El producto completo. Solo cambia cuántas conversaciones atiende." : "Solo la capacidad que te falta. Puedes elegir varias.";
  $("#pkgGrid").hidden = st.kind!=="package"; $("#modGrid").hidden = st.kind!=="modules";
  $$("[data-pkg]").forEach(b=>b.setAttribute("aria-checked", String(st.kind==="package"&&st.pkg===b.dataset.pkg)));
  $$("[data-mod]").forEach(b=>b.setAttribute("aria-checked", String(st.mods.has(b.dataset.mod))));
  $("#note").hidden = !(st.kind==="modules" && st.mods.size>=2);
  const ok=selectionOk(); $("#next0").disabled=!ok; $("#blocker").hidden=ok;
  $("#blocker").textContent = st.kind==="modules" ? "Elige al menos un módulo para continuar." : "Elige un paquete o al menos un módulo para continuar.";
  // empresa
  $("#fld-nit").classList.toggle("err", st.nit); $("#nitDesc").textContent = st.nit ? "Ese NIT ya tiene una cuenta en Axi Connect. Si es tuya, inicia sesión." : "Con dígito de verificación. Lo usamos para identificar tu empresa al iniciar sesión.";
  // cuenta
  const sb=$("#submit"); sb.disabled=st.sending; sb.querySelector(".lbl").textContent = st.sending ? "Creando tu cuenta…" : "Crear mi cuenta y empezar";
  sb.querySelector(".arrow").outerHTML = st.sending ? `{ic("LoaderCircle", "arrow spin", size=16)}` : `{ic("ArrowRight", "arrow", size=16)}`;
  $("#alert").hidden = true;
  $("#session").hidden = !st.session;
  renderStepper(); renderRail();
}}

/* ───── contraseña ───── */
const pass=$("#f-pass"); $("#eye").onclick=()=>{{ pass.type = pass.type==="password"?"text":"password"; $("#eye").innerHTML = pass.type==="password" ? `{ic("Eye", size=18)}` : `{ic("EyeOff", size=18)}`; }};
const LBL={{0:"Mínimo 10 caracteres",1:"Débil: añade una mayúscula y un número",2:"Regular: añade un número o un símbolo",3:"Buena",4:"Muy buena"}};
function score(p){{ let s=0; if(p.length>=10)s++; if(/[A-Z]/.test(p))s++; if(/\\d/.test(p))s++; if(/[^A-Za-z0-9]/.test(p)||p.length>=14)s++; return s; }}
pass.oninput=()=>{{ const s=score(pass.value); $("#meter").dataset.score=s; $("#meterLabel").textContent=LBL[s]; }};

/* ───── tilt 3D (TiltCard, depth 6) ───── */
if(!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches){{
  $$(".tilt").forEach(el=>{{
    let tx=0,ty=0,cx=0,cy=0,raf=0,hov=false;
    const loop=()=>{{ cx+=(tx-cx)*.12; cy+=(ty-cy)*.12; el.style.transform=`perspective(900px) rotateX(${{(-cy*6).toFixed(2)}}deg) rotateY(${{(cx*6).toFixed(2)}}deg) scale(${{hov?1.012:1}})`;
      if(Math.abs(tx-cx)>.001||Math.abs(ty-cy)>.001) raf=requestAnimationFrame(loop); else {{ raf=0; if(!hov) el.style.transform=""; }} }};
    const start=()=>{{ if(!raf) raf=requestAnimationFrame(loop); }};
    el.addEventListener("pointermove",e=>{{ const r=el.getBoundingClientRect(); tx=(e.clientX-r.left)/r.width-.5; ty=(e.clientY-r.top)/r.height-.5; start(); }});
    el.addEventListener("pointerenter",()=>{{hov=true;start();}});
    el.addEventListener("pointerleave",()=>{{hov=false;tx=0;ty=0;start();}});
  }});
}}

/* ───── arranque por query (para capturas) ───── */
const q=new URLSearchParams(location.search);
if(q.get("theme")) setTheme(q.get("theme"));
if(q.get("vp")==="mobile") $$("[data-vp]").find(b=>b.dataset.vp==="mobile").click();
render();
if(q.get("state")) preset(q.get("state")); else preset("pkg");
if(q.get("step")) go(+q.get("step"));
addEventListener("resize",()=>{{ placePill($("#stepper"), $("#stepPill"), '[aria-current="step"]'); placePill($("#seg"), $("#segPill"), '[aria-checked="true"]'); }});
document.fonts && document.fonts.ready.then(()=>{{ placePill($("#stepper"), $("#stepPill"), '[aria-current="step"]'); placePill($("#seg"), $("#segPill"), '[aria-checked="true"]'); }});
}})();
</script>
"""

out = S / "comenzar-premium.html"
out.write_text(HTML)
print(out, len(HTML) // 1024, "KB")
