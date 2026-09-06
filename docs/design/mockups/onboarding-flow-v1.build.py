#!/usr/bin/env python3
"""Mockup «Onboarding Flow»: bienvenida sobre el campo coral, drenado al suelo de app, cinco pasos + Listo con la misma ruta animada, banner, verificación, skeleton y error."""
import json, pathlib

S = pathlib.Path(__file__).parent
FONTS = json.load(open(S / "fonts.json"))
LUCIDE = json.load(open(S / "lucide.json"))
ISOLOGO = open(S / "isologo.svg").read().replace('width="500" height="500"', 'width="100%" height="100%"')

def ic(name, cls="", size=20, sw=2):
    return (f'<svg class="ic {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{LUCIDE[name]}</svg>')

def font_face(family, weight, key):
    return (f'@font-face{{font-family:"{family}";font-weight:{weight};font-style:normal;font-display:swap;'
            f'src:url(data:font/woff2;base64,{FONTS[key]}) format("woff2")}}')

FONT_CSS = "\n".join([font_face("Poppins", 400, "poppins-400"), font_face("Poppins", 500, "poppins-500"),
                      font_face("Poppins", 600, "poppins-600"), font_face("Poppins", 700, "poppins-700"),
                      font_face("Nexa", 700, "nexa-700"), font_face("Nexa", 200, "nexa-200"),
                      font_face("Geist Mono", "100 900", "geist-mono")])

def cop(n): return "$" + f"{n:,}".replace(",", ".")

# ---------------------------------------------------------------- tokens (los de globals.css; el campo y el suelo son dos alcances del mismo material)
LIGHT = """
  --background:#ffffff; --foreground:#171717;
  --axi-brand:#e65759; --axi-brand-2:#e02f2f; --axi-violet:#7c3aed; --axi-amber:#f59e0b; --axi-success:#16a34a; --axi-destructive:#dc2626; --axi-on-color:#ffffff;
  --field-fg:#ffffff;
  --field:linear-gradient(180deg, color-mix(in srgb, var(--axi-brand-2) 55%, var(--axi-brand)) 0%, var(--axi-brand) 46%, color-mix(in srgb, var(--axi-brand) 58%, var(--background)) 100%);
  --field-glow:radial-gradient(70% 55% at 18% 0%, color-mix(in srgb, var(--background) 22%, transparent), transparent 70%);
  --field-cta-fg:var(--axi-brand);
  --ambient:radial-gradient(60% 42% at 12% 0%, color-mix(in srgb, var(--axi-brand) 9%, transparent), transparent 70%), radial-gradient(50% 40% at 92% 100%, color-mix(in srgb, var(--axi-violet) 7%, transparent), transparent 70%);
  color-scheme:light;
"""
DARK = """
  --background:#0a0a0a; --foreground:#ededed;
  --axi-brand:#fb7185; --axi-brand-2:#df4f4f; --axi-violet:#a78bfa; --axi-amber:#fbbf24; --axi-success:#4ade80; --axi-destructive:#f87171; --axi-on-color:#0a0a0a;
  --field-fg:#ededed;
  --field:linear-gradient(180deg, color-mix(in srgb, var(--axi-brand) 26%, var(--background)) 0%, var(--background) 55%, color-mix(in srgb, var(--axi-violet) 14%, var(--background)) 100%);
  --field-glow:radial-gradient(60% 50% at 20% 0%, color-mix(in srgb, var(--axi-brand) 30%, transparent), transparent 70%), radial-gradient(50% 45% at 85% 100%, color-mix(in srgb, var(--axi-violet) 22%, transparent), transparent 70%);
  --field-cta-fg:#0a0a0a;
  --ambient:radial-gradient(60% 42% at 12% 0%, color-mix(in srgb, var(--axi-brand) 16%, transparent), transparent 70%), radial-gradient(50% 40% at 92% 100%, color-mix(in srgb, var(--axi-violet) 14%, transparent), transparent 70%);
  color-scheme:dark;
"""

CSS = r"""
:root{ __LIGHT__ }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ __DARK__ } }
:root[data-theme="dark"]{ __DARK__ }
:root{
  --font-body:"Poppins", Helvetica, Arial, sans-serif; --font-heading:"Nexa","Poppins",sans-serif; --font-mono:"Geist Mono",ui-monospace,monospace;
  --ease:cubic-bezier(.2,.8,.2,1);
}
*{box-sizing:border-box}
body{margin:0;background:var(--background);color:var(--foreground);font-family:var(--font-body);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
h1,h2{font-family:var(--font-heading);font-weight:700;letter-spacing:-.02em;margin:0}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0;padding:0}
[hidden]{display:none!important}
.ic{flex:none}
:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb, var(--fg) 55%, transparent)}
a{color:inherit}

/* ---- el material: dos alcances, un vocabulario ------------------------------------------------ */
.field{
  --fg:var(--field-fg);
  --glass:color-mix(in srgb, var(--fg) 16%, transparent);
  --glass-hover:color-mix(in srgb, var(--fg) 24%, transparent);
  --glass-on:color-mix(in srgb, var(--fg) 30%, transparent);
  --line:color-mix(in srgb, var(--fg) 26%, transparent);
  --line-on:var(--fg);
  --soft:color-mix(in srgb, var(--fg) 78%, transparent);
  --input:var(--glass);
  --cta-bg:var(--fg); --cta-fg:var(--field-cta-fg); --cta-shadow:rgb(0 0 0/.18);
  --done-bg:var(--glass-on); --done-fg:var(--fg); --done-ring:var(--glass);
  --accent:var(--fg);
  color:var(--fg);
}
.ground{
  --fg:var(--foreground);
  --glass:color-mix(in srgb, var(--background) 65%, transparent);
  --glass-hover:color-mix(in srgb, var(--background) 88%, transparent);
  --glass-on:var(--background);
  --line:color-mix(in srgb, var(--fg) 11%, transparent);
  --line-on:color-mix(in srgb, var(--fg) 34%, transparent);
  --soft:color-mix(in srgb, var(--fg) 58%, transparent);
  --input:var(--background);
  --cta-bg:var(--axi-brand); --cta-fg:var(--axi-on-color); --cta-shadow:color-mix(in srgb, var(--axi-brand) 35%, transparent);
  --done-bg:var(--axi-violet); --done-fg:var(--axi-on-color); --done-ring:color-mix(in srgb, var(--axi-violet) 20%, transparent);
  --accent:var(--axi-violet);
  color:var(--fg);
}

/* barra del mockup */
.mockbar{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:100;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;align-items:center;padding:6px 8px;border-radius:18px;font-size:11.5px;max-width:calc(100vw - 24px);
  background:color-mix(in srgb, var(--background) 82%, transparent);color:var(--foreground);border:1px solid color-mix(in srgb, var(--foreground) 12%, transparent);box-shadow:0 16px 48px rgb(0 0 0/.18);backdrop-filter:saturate(160%) blur(16px)}
.mockbar .grp{display:flex;gap:2px;padding:2px;border-radius:999px;background:color-mix(in srgb, var(--foreground) 6%, transparent);flex-wrap:wrap}
.mockbar .grp b{padding:0 6px;font-weight:600;opacity:.6;align-self:center;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase}
.mockbar button{padding:5px 9px;border-radius:999px;opacity:.7;font-weight:500;white-space:nowrap}
.mockbar button[aria-pressed="true"]{background:color-mix(in srgb, var(--axi-brand) 16%, transparent);color:var(--axi-brand);opacity:1}

/* escenario */
.stage{min-height:100svh;background:var(--background);padding-top:0}
.stage[data-vp="mobile"]{display:grid;place-items:start center;padding:110px 0 80px;background:color-mix(in srgb, var(--foreground) 5%, var(--background))}
.ground{position:relative;container-type:inline-size;isolation:isolate;overflow:hidden;min-height:100svh;display:flex;flex-direction:column;background:var(--ambient), var(--background)}
.stage[data-vp="mobile"] .ground{width:390px;height:844px;min-height:0;border-radius:44px;box-shadow:0 0 0 10px #111,0 0 0 12px #2a2a2a,0 40px 80px rgb(0 0 0/.35)}
.scroller{position:absolute;inset:0;overflow-x:hidden;overflow-y:auto;display:flex;flex-direction:column}
.stage[data-vp="mobile"] .scroller{border-radius:44px}
.stage[data-vp="desktop"] .ground{padding-top:0}
.stage[data-vp="desktop"] .scroller{position:relative;inset:auto;min-height:100svh}

/* la capa del campo: cubre el suelo y se hunde */
.fieldLayer{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;overflow-x:hidden;overflow-y:auto;
  background:var(--field-glow), var(--field);transition:transform .6s cubic-bezier(.4,0,.2,1)}
.fieldLayer.drain{transform:translateY(100%)}
.grain{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.5;
  background-image:radial-gradient(color-mix(in srgb, var(--fg) 9%, transparent) 1px, transparent 1.2px);background-size:26px 26px;
  -webkit-mask-image:radial-gradient(80% 70% at 50% 20%, #000 20%, transparent 100%);mask-image:radial-gradient(80% 70% at 50% 20%, #000 20%, transparent 100%)}

header.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:28px 40px 0;flex:none}
@container (max-width: 640px){header.top{padding:22px 22px 0}}
.lockup{display:flex;align-items:center;gap:8px;color:var(--fg);text-decoration:none}
.lockup .mark{width:32px;height:32px;display:grid}
.lockup .word{font-family:var(--font-heading);font-weight:700;font-size:20px;letter-spacing:-.01em;white-space:nowrap}
.field .lockup .word{color:var(--fg)}
.ground .lockup .word{background-image:linear-gradient(90deg,var(--axi-brand),var(--axi-violet));-webkit-background-clip:text;background-clip:text;color:transparent}
.toplink{font-size:13px;color:var(--soft);text-decoration:none;white-space:nowrap}
.toplink b{color:var(--fg);font-weight:600}
.toplink:hover b{text-decoration:underline}
.pillnote{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--line);font-size:12px;color:var(--soft);white-space:nowrap}
.dots{display:flex;gap:7px;align-items:center}
.dots i{width:6px;height:6px;border-radius:50%;background:color-mix(in srgb, var(--fg) 30%, transparent);transition:background .3s,transform .3s var(--ease)}
.dots i.on{background:var(--fg);transform:scale(1.25)}
.dots i.done{background:var(--accent)}
@container (max-width: 640px){.dots{display:none}.hide-sm{display:none}}

main{flex:1;display:grid;place-items:center;padding:20px 24px 0}
.stage[data-vp="desktop"] main{padding-top:100px}
:root[data-vp="mobile"] .mockbar{top:auto;bottom:12px}
.q{width:100%;max-width:760px;display:flex;flex-direction:column;align-items:center;text-align:center;transition:opacity .28s ease,transform .45s var(--ease)}
.q.wide{max-width:960px}.q.full{max-width:1100px}
.q.out{opacity:0;transform:translateY(-18px)}
.q.in{opacity:0;transform:translateY(22px)}
.q h1{font-size:clamp(30px, 4.4cqw, 52px);line-height:1.05;text-wrap:balance;max-width:16ch}
.q .sub{margin:14px 0 0;font-size:15px;color:var(--soft);max-width:48ch;line-height:1.55}
.q .body{width:100%;margin-top:26px;display:flex;flex-direction:column;align-items:center;gap:10px}
@container (max-width: 640px){.q .body{margin-top:22px}.q .sub{font-size:14px}}
.eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--soft)}

/* controles */
.gi{width:100%;height:52px;padding:0 16px;border-radius:14px;border:1px solid var(--line);background:var(--input);color:var(--fg);text-align:left;transition:background .2s,border-color .2s;appearance:none;-webkit-appearance:none}
.gi::placeholder{color:color-mix(in srgb, var(--fg) 45%, transparent)}
.gi:focus{outline:none;border-color:var(--line-on);box-shadow:none}
textarea.gi{height:auto;min-height:96px;padding:12px 16px;resize:vertical;line-height:1.5}
.gi-wrap{position:relative;width:100%}
.gi-wrap .trail{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--soft);display:grid;pointer-events:none}
.lbl{display:block;font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--soft);margin:0 0 6px;text-align:left}
.cta{width:min(100%,440px);height:56px;border-radius:14px;background:var(--cta-bg);color:var(--cta-fg);font-weight:600;font-size:15.5px;display:inline-flex;align-items:center;justify-content:center;gap:8px;
  margin-top:6px;transition:transform .15s,opacity .25s,box-shadow .3s;box-shadow:0 18px 50px var(--cta-shadow)}
.cta:hover{transform:translateY(-1px)}
.cta:active{transform:scale(.98)}
.cta[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none}
.cta .spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.cta.ghost{background:var(--glass);color:var(--fg);border:1px solid var(--line);box-shadow:none;height:48px;font-size:14.5px;margin-top:0}
.cta.ghost:hover{background:var(--glass-hover)}
.fine{margin:8px 0 0;font-size:12.5px;color:var(--soft);max-width:52ch}
.fine.err{color:var(--fg);font-weight:500}
.ground .fine.err{color:var(--axi-destructive)}
.back{margin-top:10px;font-size:13px;color:var(--soft);display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 12px;transition:background .2s,color .2s}
.back:hover{background:var(--glass);color:var(--fg)}
.actions{display:flex;flex-direction:column;align-items:center;gap:10px;width:min(100%,440px);margin-top:8px}

.seg{position:relative;display:inline-flex;gap:2px;padding:4px;border-radius:999px;background:var(--glass);border:1px solid var(--line)}
.seg .pill{position:absolute;top:4px;bottom:4px;left:4px;width:0;border-radius:999px;background:var(--fg);transition:transform .32s var(--ease)}
.seg button{position:relative;z-index:1;height:34px;padding:0 16px;border-radius:999px;font-size:13px;font-weight:600;color:var(--soft);transition:color .25s;white-space:nowrap}
.seg button[aria-checked="true"]{color:var(--background)}
.field .seg button[aria-checked="true"]{color:var(--field-cta-fg)}

/* fichas (mismo componente que la oferta; el material cambia por alcance) */
.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:100%}
.tiles.two{grid-template-columns:repeat(2,minmax(0,1fr))}
@container (max-width: 860px){.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (max-width: 640px){.tiles,.tiles.two{grid-template-columns:1fr}}
.tile{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 96px;column-gap:14px;align-items:center;min-height:96px;padding:14px 14px 14px 16px;border-radius:16px;text-align:left;
  background:var(--glass);border:1px solid var(--line);color:var(--fg);transition:background .2s,border-color .2s,transform .25s var(--ease),box-shadow .25s}
.tile:hover{background:var(--glass-hover);transform:translateY(-1px)}
.tile[aria-checked="true"]{background:var(--glass-on);border-color:var(--line-on);transform:translateY(-2px);box-shadow:0 14px 36px rgb(0 0 0/.12)}
.tile .t{display:flex;flex-direction:column;gap:3px;min-width:0;padding-right:4px}
.tile .t b{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap;line-height:1.25}
.tile .t .d{font-size:12.5px;color:var(--soft);line-height:1.4}
.tile .gfx{color:var(--fg);opacity:.85;width:96px;display:grid;align-self:center}
.tile .gfx svg{width:100%;height:auto;overflow:visible}
.tile .mark{position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--fg);color:var(--background);transform:scale(0);transition:transform .35s var(--ease)}
.field .tile .mark{color:var(--field-cta-fg)}
.tile[aria-checked="true"] .mark{transform:scale(1)}
.chip{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;background:var(--accent);color:var(--done-fg)}
.field .chip{background:var(--fg);color:var(--field-cta-fg)}
.skills{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.skills i{font-style:normal;font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--soft)}

/* hoja sólida: superficie densa, sin cristal (DESIGN-SYSTEM §5.2) */
.sheet{width:100%;background:var(--background);border:1px solid var(--line);border-radius:20px;padding:20px;text-align:left;box-shadow:0 12px 40px rgb(0 0 0/.06)}
.sheet h2{font-size:17px;letter-spacing:-.01em}
.sheet .muted{font-size:13px;color:var(--soft)}

/* horario (SchedulesEditor tal cual) */
.days{display:flex;flex-direction:column;gap:8px}
.day{display:flex;align-items:center;gap:14px;padding:8px 12px;border:1px solid var(--line);border-radius:10px}
.sw{width:36px;height:20px;border-radius:999px;background:var(--axi-brand);position:relative;flex:none}
.sw::after{content:"";position:absolute;top:2px;left:18px;width:16px;height:16px;border-radius:50%;background:#fff}
.sw.off{background:color-mix(in srgb, var(--fg) 20%, transparent)}
.sw.off::after{left:2px}
.day .n{width:88px;font-size:13.5px;font-weight:500}
.day .ti{height:36px;width:120px;padding:0 10px;border-radius:8px;border:1px solid var(--line);background:var(--background);font-variant-numeric:tabular-nums;font-size:13.5px}
.day .a{font-size:13px;color:var(--soft)}
@container (max-width: 640px){.day .ti{width:88px}.day .n{width:64px}}
.sheet .foot{display:flex;justify-content:flex-end;margin-top:12px}
.btn{height:40px;padding:0 16px;border-radius:10px;font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:8px;background:var(--axi-brand);color:var(--axi-on-color)}
.btn.o{background:transparent;border:1px solid var(--line);color:var(--fg)}
.btn.sm{height:34px;padding:0 12px;font-size:13px}

/* dropzone */
.drop{width:100%;border:1.5px dashed var(--line-on);border-radius:20px;padding:34px 24px;display:flex;flex-direction:column;align-items:center;gap:10px;background:var(--glass);transition:background .2s,border-color .2s;cursor:pointer}
.drop:hover{background:var(--glass-hover);border-color:var(--fg)}
.drop .plate{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;background:var(--background);border:1px solid var(--line);color:var(--fg);box-shadow:0 8px 24px rgb(0 0 0/.08)}
.drop b{font-size:16px;font-weight:600}
.drop p{margin:0;font-size:13px;color:var(--soft);max-width:46ch}
.drop .ex{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:4px}
.drop .ex i{font-style:normal;font-family:var(--font-mono);font-size:11.5px;padding:3px 9px;border-radius:999px;background:var(--background);border:1px solid var(--line);color:var(--soft)}
.hint{display:flex;gap:10px;align-items:flex-start;width:100%;padding:12px 14px;border-radius:14px;background:color-mix(in srgb, var(--accent) 8%, transparent);border:1px solid color-mix(in srgb, var(--accent) 22%, transparent);font-size:13px;text-align:left;color:var(--fg)}
.hint .ic{color:var(--accent);margin-top:2px}

/* el escaneo: la IA lee el catálogo */
.scan{display:grid;grid-template-columns:260px minmax(0,1fr);gap:18px;width:100%;align-items:start;text-align:left}
@container (max-width: 640px){.scan{grid-template-columns:1fr}}
.doc{position:relative;overflow:hidden;border-radius:18px;background:var(--glass-on);border:1px solid var(--line);padding:16px;min-height:250px;box-shadow:0 12px 40px rgb(0 0 0/.06)}
.doc .fh{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600}
.doc .fh small{display:block;font-weight:400;color:var(--soft);font-size:11.5px}
.doc .fh .ic{color:var(--accent)}
.doc .ln{height:8px;border-radius:999px;background:color-mix(in srgb, var(--fg) 9%, transparent);margin-top:14px}
.doc .ln.s{width:60%}.doc .ln.m{width:80%}
.doc .beam{position:absolute;left:0;right:0;top:0;height:2px;background:var(--accent);box-shadow:0 0 18px 4px color-mix(in srgb, var(--accent) 45%, transparent);animation:scan 2.4s ease-in-out infinite alternate}
@keyframes scan{from{transform:translateY(14px)}to{transform:translateY(236px)}}
.doc.stall .beam{animation-play-state:paused;opacity:.4}
.found{display:flex;flex-direction:column;gap:8px}
.found .st{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;color:var(--soft)}
.found .st .badge{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:999px;background:color-mix(in srgb, var(--accent) 12%, transparent);color:var(--accent)}
.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 14px;border-radius:12px;background:var(--glass-on);border:1px solid var(--line);font-size:13.5px;animation:rowin .38s var(--ease) both}
.row small{display:block;color:var(--soft);font-size:11.5px}
.row b{font-family:var(--font-mono);font-weight:600;font-variant-numeric:tabular-nums;font-size:13px}
.row.miss b{color:var(--soft);font-weight:400;font-style:italic;font-family:var(--font-body)}
@keyframes rowin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.more{font-size:12.5px;color:var(--soft);padding:2px 14px}
.stallbox{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;background:var(--glass);border:1px solid var(--line);font-size:13px;text-align:left}
.stallbox .r{display:flex;gap:8px;flex-wrap:wrap}

/* revisión: tabla en hoja sólida */
.rev{width:100%;text-align:left}
.rev .bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.tbl{width:100%;overflow-x:auto;border:1px solid var(--line);border-radius:16px;background:var(--background)}
table{width:100%;border-collapse:collapse;min-width:720px;font-size:13.5px}
th{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--soft);font-weight:600;text-align:left;padding:12px 14px;border-bottom:1px solid var(--line)}
td{padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:middle}
tr:last-child td{border-bottom:0}
td .in{height:34px;padding:0 10px;border-radius:8px;border:1px solid var(--line);background:var(--background);width:100%;font-size:13px}
td .in.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums;width:120px}
td .in.warn{border-color:color-mix(in srgb, var(--axi-amber) 70%, transparent);background:color-mix(in srgb, var(--axi-amber) 6%, transparent)}
.cb{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--line-on);display:grid;place-items:center;color:transparent}
.cb.on{background:var(--fg);border-color:var(--fg);color:var(--background)}
.tone{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}
.tone.ok{background:color-mix(in srgb, var(--axi-success) 12%, transparent);color:var(--axi-success)}
.tone.warn{background:color-mix(in srgb, var(--axi-amber) 14%, transparent);color:color-mix(in srgb, var(--axi-amber) 80%, var(--fg))}
.tone.dup{background:var(--glass);color:var(--soft);border:1px solid var(--line)}

/* agentes */
.agents{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:22px;width:100%;align-items:start;text-align:left}
@container (max-width: 860px){.agents{grid-template-columns:1fr}.agents .phone{order:-1;justify-self:center}}
.form{display:flex;flex-direction:column;gap:14px;width:100%}
.form .fl{display:flex;flex-direction:column}
.form .help{font-size:12px;color:var(--soft);margin:5px 0 0}
.form .cnt{font-size:11.5px;color:var(--soft);text-align:right;margin-top:4px;font-variant-numeric:tabular-nums}
.phone{width:280px;max-width:100%;border-radius:36px;background:var(--background);border:1px solid var(--line);box-shadow:0 30px 80px rgb(0 0 0/.16), inset 0 0 0 6px color-mix(in srgb, var(--fg) 6%, transparent);padding:14px 12px 16px;display:flex;flex-direction:column;gap:10px;position:sticky;top:12px}
.phone .sb{display:flex;justify-content:space-between;font-size:10.5px;font-weight:600;padding:2px 14px 0;color:var(--soft)}
.phone .hd{display:flex;align-items:center;gap:10px;padding:8px 8px 10px;border-bottom:1px solid var(--line)}
.phone .av{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--axi-brand),var(--axi-violet));color:#fff;font-weight:700;font-size:14px;flex:none}
.phone .hd b{font-size:13.5px;display:block;line-height:1.2}
.phone .hd small{font-size:11px;color:var(--soft)}
/* alto fijo: el teléfono no crece mientras entran los mensajes (corrección del dueño, 2026-09-05) */
.chat{display:flex;flex-direction:column;gap:6px;padding:4px 4px 2px;height:318px;overflow:hidden}
@container (max-width: 860px){.chat{height:262px}}
.msg{max-width:86%;padding:8px 11px;border-radius:14px;font-size:12.5px;line-height:1.4;animation:rowin .38s var(--ease) both}
.msg.u{align-self:flex-end;background:color-mix(in srgb, var(--fg) 8%, transparent);border-bottom-right-radius:4px}
.msg.a{align-self:flex-start;background:color-mix(in srgb, var(--axi-violet) 12%, transparent);border-bottom-left-radius:4px}
.msg.a::before{content:"";}
.typing{display:inline-flex;gap:3px;padding:10px 12px}
.typing i{width:5px;height:5px;border-radius:50%;background:var(--soft);animation:blink 1.2s infinite}
.typing i:nth-child(2){animation-delay:.2s}.typing i:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
.phone .inp{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border-radius:999px;border:1px solid var(--line);font-size:12px;color:var(--soft)}
.created{display:flex;flex-direction:column;gap:8px;width:100%;text-align:left}
.created .row{grid-template-columns:auto minmax(0,1fr) auto}
.created .av{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--axi-brand),var(--axi-violet));color:#fff;font-weight:700;font-size:13px}

/* whatsapp: el wizard compartido, en marco sólido */
.wiz .steps{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--soft);margin:6px 0 16px;flex-wrap:wrap}
.wiz .steps i{font-style:normal;display:inline-flex;align-items:center;gap:6px}
.wiz .steps i::before{content:"";width:8px;height:8px;border-radius:50%;background:color-mix(in srgb, var(--fg) 20%, transparent)}
.wiz .steps i.on{color:var(--fg);font-weight:600}
.wiz .steps i.on::before{background:var(--axi-brand)}
.wiz .steps i.done::before{background:var(--axi-violet)}
.wiz .steps span{width:16px;height:1px;background:var(--line)}
.wiz ul{margin:12px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.wiz li{display:flex;gap:10px;font-size:13.5px;line-height:1.45}
.wiz li .ic{color:var(--axi-brand);margin-top:3px}
.notice{display:flex;gap:10px;align-items:flex-start;width:100%;padding:12px 14px;border-radius:14px;background:var(--glass-on);border:1px solid var(--line);font-size:13px;text-align:left;box-shadow:0 8px 24px rgb(0 0 0/.05)}
.notice .ic{margin-top:2px;color:var(--fg)}
.gate{display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 20px;text-align:center;border:1px dashed var(--line-on);border-radius:16px;margin-top:14px}
.gate b{font-size:15px}
.gate p{margin:0;font-size:13px;color:var(--soft);max-width:40ch}

/* listo */
.iso{width:96px;height:96px;display:grid;margin-bottom:6px;animation:pulse 2.4s var(--ease) 1}
@keyframes pulse{0%{transform:scale(.9);opacity:.6}50%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
.sum{width:100%;max-width:520px;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;text-align:left}
.sum li{display:grid;grid-template-columns:32px minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;background:var(--glass-on);border:1px solid var(--line);font-size:14px;opacity:0;transform:translateY(12px);transition:opacity .4s var(--ease),transform .5s var(--ease)}
.sum li.show{opacity:1;transform:none}
.sum li .k{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--glass);border:1px solid var(--line);color:var(--fg)}
.sum li.done .k{background:var(--done-bg);color:var(--done-fg);border-color:var(--done-bg)}
.sum li small{display:block;color:var(--soft);font-size:12px}
.sum li .s{font-size:12.5px;font-weight:600;color:var(--accent)}
.sum li.skip .s{color:var(--soft);font-weight:500}
.ent{width:100%;max-width:520px;padding:16px 18px;border-radius:16px;border:1px solid color-mix(in srgb, var(--axi-brand) 25%, transparent);background:color-mix(in srgb, var(--axi-brand) 5%, transparent);text-align:left;opacity:0;transform:translateY(12px);transition:opacity .4s var(--ease),transform .5s var(--ease)}
.ent.show{opacity:1;transform:none}
.ent h3{margin:0;font-size:14px;display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.ent h3 small{font-weight:400;font-size:12px;color:var(--soft)}
.ent dl{margin:10px 0 0;display:grid;grid-template-columns:1fr auto;row-gap:6px;font-size:13.5px}
.ent dt{color:var(--fg)}
.ent dd{margin:0;font-family:var(--font-mono);font-weight:600;font-variant-numeric:tabular-nums;text-align:right}
.ent dd span{font-family:var(--font-body);font-weight:400;color:var(--soft);margin-left:6px}
.ent p{margin:10px 0 0;font-size:12.5px;color:var(--soft)}

/* la ruta */
.route{position:relative;height:280px;flex:none;overflow:hidden;margin-top:8px;transition:transform .7s var(--ease),opacity .5s}
.route.rise{transform:translateY(96px);opacity:0}
@container (max-width: 640px){.route{height:210px}}
@media (max-height: 760px){.route{height:210px}}
.track{position:absolute;left:0;top:0;height:100%;transition:transform .8s var(--ease);will-change:transform}
.track > svg{position:absolute;left:0;top:0;overflow:visible}
.track path{fill:none;stroke:color-mix(in srgb, var(--fg) 80%, transparent);stroke-width:1.5}
.ground .track path{stroke:color-mix(in srgb, var(--fg) 26%, transparent)}
.node{position:absolute;display:grid;place-items:center;border-radius:50%;width:60px;height:60px;color:var(--fg);
  background:var(--glass);border:1px solid var(--line-on);
  transform:translate(-50%,-50%);transition:width .8s var(--ease),height .8s var(--ease),opacity .6s,background .4s,border-color .4s,box-shadow .5s,color .4s;cursor:default}
.ground .node{background:var(--glass-on);border-color:var(--line)}
.node > svg{width:24px;height:24px;transition:width .6s var(--ease),height .6s var(--ease)}
.node.near{width:72px;height:72px}
.node.far{opacity:.55}
.node.closed{cursor:pointer}
.node.closed:hover{background:var(--glass-hover)}
.node.skipped{border-style:dashed}
.node .badge{position:absolute;right:-2px;top:-2px;width:18px;height:18px;border-radius:50%;background:var(--done-bg);color:var(--done-fg);display:grid;place-items:center;transform:scale(0);transition:transform .35s var(--ease)}
.node.done .badge{transform:scale(1)}
.node.lit{background:var(--done-bg);color:var(--done-fg);border-color:var(--done-bg);box-shadow:0 0 0 10px var(--done-ring)}
.node.lit .badge{transform:scale(0)}
.node.on{width:128px;height:128px;background:var(--glass-on);border:2px solid var(--fg);box-shadow:0 0 0 10px var(--glass),0 24px 60px rgb(0 0 0/.14)}
.ground .node.on{box-shadow:0 0 0 10px color-mix(in srgb, var(--fg) 5%, transparent),0 24px 60px rgb(0 0 0/.12)}
.node.on > svg{width:44px;height:44px}
@container (max-width: 640px){.node{width:44px;height:44px}.node > svg{width:18px;height:18px}.node.near{width:52px;height:52px}.node.on{width:96px;height:96px}.node.on > svg{width:34px;height:34px}}
.node .tip{position:absolute;top:calc(100% + 10px);white-space:nowrap;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--soft);opacity:0;transition:opacity .4s}
.node.on .tip{opacity:1}

/* bienvenida */
.wel .isob{width:96px;height:96px;display:grid;margin:6px 0 2px}
.wel .offer{display:inline-flex;align-items:center;gap:8px;min-height:34px;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:var(--glass);font-size:13px;font-weight:500}
.wel .offer span{color:var(--soft);font-weight:400}
.steps5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;width:100%;margin-top:6px;list-style:none;padding:0}
@container (max-width: 860px){.steps5{grid-template-columns:repeat(2,minmax(0,1fr))}.steps5 li:last-child{grid-column:1/-1}}
.steps5 li{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:14px;background:var(--glass);border:1px solid var(--line);text-align:left}
.steps5 li .k{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--glass-on);border:1px solid var(--line-on)}
.steps5 li b{font-size:13px;line-height:1.2}
.steps5 li small{font-size:11.5px;color:var(--soft);line-height:1.35}
.stepsmeta{display:flex;justify-content:space-between;width:100%;font-size:12.5px;color:var(--soft);margin-top:4px}
@container (max-width: 640px){.stepsmeta{flex-direction:column;align-items:center;gap:2px;text-align:center}}
.stepsmeta b{color:var(--fg);font-weight:600}
.wel .link{font-size:13px;color:var(--soft);margin:2px 0 0}
.wel .link a{color:var(--fg);font-weight:600;text-decoration:none}
.wel .link a:hover{text-decoration:underline}

/* verificación */
.disc{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;background:var(--glass-on);border:2px solid var(--fg);color:var(--fg);box-shadow:0 0 0 10px var(--glass);margin-bottom:10px}
.disc.done{background:var(--done-bg);color:var(--done-fg);border-color:var(--done-bg);box-shadow:0 0 0 10px var(--done-ring)}
.mockstate{display:inline-flex;gap:4px;padding:3px;border-radius:999px;border:1px dashed var(--line);font-size:11px;margin-top:18px}
.mockstate b{padding:0 8px;align-self:center;opacity:.6;font-weight:600}
.mockstate button{padding:4px 10px;border-radius:999px;color:var(--soft)}
.mockstate button[aria-pressed="true"]{background:var(--glass-on);color:var(--fg)}

/* banner en el panel */
.dash{width:100%;display:grid;grid-template-columns:220px minmax(0,1fr);min-height:100%;text-align:left}
@container (max-width: 860px){.dash{grid-template-columns:1fr}.dash aside{display:none}}
.dash aside{border-right:1px solid var(--line);padding:22px 16px;display:flex;flex-direction:column;gap:6px;font-size:13.5px}
.dash aside .it{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:10px;color:var(--soft)}
.dash aside .it.on{background:var(--glass-on);color:var(--fg);border:1px solid var(--line)}
.dash .content{padding:26px 28px;display:flex;flex-direction:column;gap:18px}
.dash .content h2{font-size:22px}
.banner{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:18px 20px;border-radius:18px;border:1px solid color-mix(in srgb, var(--axi-brand) 25%, transparent);background:var(--ambient), var(--background)}
@container (max-width: 640px){.banner{grid-template-columns:1fr}}
.banner h3{margin:0;font-size:16px;font-family:var(--font-heading)}
.banner p{margin:4px 0 0;font-size:13px;color:var(--soft)}
.mini{display:flex;align-items:center;margin:12px 0 0;padding:0;list-style:none}
.mini li{display:flex;align-items:center}
.mini .k{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--glass-on);border:1px solid var(--line-on);color:var(--fg)}
.mini .k svg{width:14px;height:14px}
.mini li.done .k{background:var(--done-bg);color:var(--done-fg);border-color:var(--done-bg)}
.mini li.skipped .k{border-style:dashed}
.mini li+li::before{content:"";width:22px;height:1px;background:var(--line-on);display:block}
.mini li[title]{position:relative}
.banner .acts{display:flex;gap:8px;align-items:center}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@container (max-width: 640px){.cards{grid-template-columns:1fr}}
.cards .c{padding:16px;border-radius:16px;border:1px solid var(--line);background:var(--background)}
.cards .c small{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--soft);font-weight:600}
.cards .c b{display:block;font-family:var(--font-heading);font-size:26px;margin-top:6px;font-variant-numeric:tabular-nums}

/* skeleton y error */
.sk{width:100%;max-width:760px;display:flex;flex-direction:column;align-items:center;gap:14px;animation:skpulse 1.6s ease-in-out infinite}
.sk i{display:block;border-radius:12px;background:color-mix(in srgb, var(--fg) 8%, transparent)}
@keyframes skpulse{50%{opacity:.55}}
.route.dim{opacity:.35;pointer-events:none}

/* confeti */
.confetti{position:absolute;inset:0;pointer-events:none;z-index:20}

.rm *,.rm *::before,.rm *::after{transition-duration:.001ms!important;animation-duration:.001ms!important;animation-iteration-count:1!important}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{transition-duration:.001ms!important;animation-duration:.001ms!important;animation-iteration-count:1!important}}
"""
CSS = CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)

# ---------------------------------------------------------------- gráficos monocromos (currentColor, trazo 1.5, mismo lenguaje que los de la oferta)
def frame(vb, body):
    return f'<svg viewBox="{vb}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vector-effect:non-scaling-stroke">{body}</svg>'

NICHE_GFX = {
    "restaurants": frame("0 0 120 64", '<circle cx="60" cy="34" r="24"/><circle cx="60" cy="34" r="15" opacity=".45"/><path d="M14 10v22M20 10v10a6 6 0 0 1-12 0V10M14 32v22" opacity=".8"/><path d="M104 10c-5 4-6 12-6 18h8V10zM106 28v26" opacity=".8"/>'),
    "retail_fashion": frame("0 0 120 64", '<path d="M60 12a5 5 0 1 1 5-5"/><path d="M60 12v6L14 44h92L60 18"/><path d="M14 44v6h92v-6" opacity=".4"/><rect x="82" y="8" width="26" height="16" rx="4" opacity=".55"/><circle cx="89" cy="16" r="2" fill="currentColor" stroke="none" opacity=".55"/>'),
    "hotels_tourism": frame("0 0 120 64", '<path d="M8 54V22h12v14h60v-6h22v24"/><path d="M8 44h94" opacity=".5"/><rect x="26" y="26" width="22" height="10" rx="4" fill="currentColor" opacity=".25" stroke="none"/><path d="M8 54v4M102 54v4" opacity=".6"/><circle cx="104" cy="14" r="6" opacity=".7"/><path d="M110 14h6l2 2-2 2h-6" opacity=".7"/>'),
    "health_beauty": frame("0 0 120 64", '<rect x="14" y="12" width="70" height="46" rx="8"/><path d="M14 26h70" opacity=".5"/><path d="M30 6v10M68 6v10" opacity=".7"/><path d="M49 48c-6-4-12-9-12-14a6 6 0 0 1 12-3 6 6 0 0 1 12 3c0 5-6 10-12 14z" fill="currentColor" opacity=".3" stroke="none"/><circle cx="100" cy="40" r="12" opacity=".7"/><path d="M100 33v7l5 3" opacity=".7"/>'),
    "real_estate": frame("0 0 120 64", '<path d="M12 32 44 8l32 24"/><path d="M20 28v28h48V28" /><rect x="36" y="40" width="16" height="16" rx="2" fill="currentColor" opacity=".25" stroke="none"/><circle cx="94" cy="24" r="9" opacity=".8"/><path d="M100 30l14 14M108 38l-4 4M112 42l-3 3" opacity=".8"/>'),
    "education": frame("0 0 120 64", '<path d="M8 22 50 8l42 14-42 14z"/><path d="M24 28v14c0 6 12 10 26 10s26-4 26-10V28" opacity=".7"/><path d="M92 22v16" opacity=".6"/><rect x="82" y="40" width="30" height="18" rx="3" opacity=".55"/><path d="M88 46h18M88 52h12" opacity=".55"/>'),
    "professional_services": frame("0 0 120 64", '<rect x="12" y="20" width="64" height="38" rx="8"/><path d="M32 20v-6a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v6" /><path d="M12 36h64" opacity=".5"/><rect x="38" y="32" width="12" height="8" rx="2" fill="currentColor" opacity=".3" stroke="none"/><path d="M88 14h24M88 22h24M88 30h16M88 38h20M88 46h12" opacity=".6"/>'),
    "b2b_distribution": frame("0 0 120 64", '<path d="M10 56V34l16-8 16 8v22z"/><path d="M42 56V34l16-8 16 8v22z"/><path d="M26 34V12l16-6 16 6v22" opacity=".7"/><path d="M10 34l16 8 16-8M42 34l16 8 16-8" opacity=".5"/><path d="M84 40h26M104 34l6 6-6 6" opacity=".8"/>'),
    "other": frame("0 0 120 64", '<circle cx="34" cy="34" r="6" fill="currentColor" stroke="none" opacity=".45"/><circle cx="60" cy="34" r="6" fill="currentColor" stroke="none" opacity=".7"/><circle cx="86" cy="34" r="6" fill="currentColor" stroke="none"/><path d="M100 8l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" opacity=".8"/><path d="M14 52l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" opacity=".6"/>'),
}
ROLE_GFX = {
    "ventas": frame("0 0 120 64", '<rect x="8" y="10" width="64" height="30" rx="12"/><path d="M22 40l-4 10 14-10"/><path d="M22 22h36M22 30h20" opacity=".6"/><path d="M84 30l14-14h14v14L98 44z" opacity=".8"/><circle cx="104" cy="24" r="2.5" fill="currentColor" stroke="none"/>'),
    "reservas": frame("0 0 120 64", '<rect x="16" y="12" width="88" height="46" rx="8"/><path d="M16 26h88" opacity=".5"/><path d="M34 6v10M86 6v10" opacity=".7"/><path d="M48 42l8 8 16-16" stroke-width="2"/>'),
    "soporte": frame("0 0 120 64", '<path d="M24 40v-8a36 36 0 0 1 72 0v8"/><rect x="16" y="36" width="16" height="18" rx="6"/><rect x="88" y="36" width="16" height="18" rx="6"/><path d="M96 54c0 6-8 8-24 8" opacity=".7"/><circle cx="60" cy="14" r="3" fill="currentColor" stroke="none" opacity=".4"/>'),
    "captacion": frame("0 0 120 64", '<path d="M60 58a24 24 0 1 1 24-24" opacity=".8"/><path d="M60 58a38 38 0 1 1 38-38" opacity=".45"/><path d="M60 34l30-24"/><circle cx="60" cy="34" r="4" fill="currentColor" stroke="none"/><circle cx="92" cy="44" r="3" fill="currentColor" stroke="none" opacity=".7"/><circle cx="24" cy="18" r="3" fill="currentColor" stroke="none" opacity=".5"/>'),
}

NICHES = [
    ("restaurants", "Restaurantes y comida", "Menú, domicilios y pedidos por chat."),
    ("retail_fashion", "Retail y moda", "Catálogo con tallas, colores y stock."),
    ("hotels_tourism", "Hoteles y turismo", "Reservas, disponibilidad y ventas adicionales."),
    ("health_beauty", "Salud, belleza y citas", "Agenda intensiva y recordatorios."),
    ("real_estate", "Inmobiliarias", "Leads de alto valor y visitas agendadas."),
    ("education", "Educación y cursos", "Matrículas y seguimiento de interesados."),
    ("professional_services", "Servicios profesionales", "Cotizaciones, agenda y CRM."),
    ("b2b_distribution", "Distribuidores B2B", "Pedidos recurrentes y listas de precios."),
    ("other", "Otro tipo de negocio", "Plantillas generales que ajustas a tu medida."),
]
def niche_tile(code, name, d):
    return (f'<button type="button" role="radio" aria-checked="false" data-niche="{code}" class="tile">'
            f'<span class="mark">{ic("Check", size=13, sw=2.6)}</span>'
            f'<span class="t"><b>{name}</b><span class="d">{d}</span></span><span class="gfx">{NICHE_GFX[code]}</span></button>')

TEMPLATES = [
    ("ventas", "Vendedor de menú", "Ventas", "Toma pedidos, sugiere combos y cierra el domicilio.", ["Catálogo", "Pedidos", "Domicilios"], True),
    ("reservas", "Anfitrión de reservas", "Reservas", "Reserva mesas, confirma y recuerda la cita.", ["Agenda", "Recordatorios"], False),
    ("soporte", "Atención al cliente", "Atención", "Resuelve dudas, horarios y reclamos con criterio.", ["Preguntas frecuentes", "Escalado"], False),
]
def tpl_tile(role, name, rl, d, skills, rec):
    badge = '<span class="chip">Recomendado</span>' if rec else ""
    sk = "".join(f"<i>{s}</i>" for s in skills)
    return (f'<button type="button" role="radio" aria-checked="{"true" if rec else "false"}" data-tpl="{role}" data-name="{name}" class="tile">'
            f'<span class="mark">{ic("Check", size=13, sw=2.6)}</span>'
            f'<span class="t"><b>{name}{badge}</b><span class="d">{rl} · {d}</span><span class="skills">{sk}</span></span><span class="gfx">{ROLE_GFX[role]}</span></button>')

STEPS = [("niche", "Negocio", "Store"), ("hours", "Horario", "Clock"), ("catalog", "Catálogo", "Package"), ("agents", "Agentes", "Bot"), ("whatsapp", "WhatsApp", "MessageCircle"), ("done", "Listo", "Sparkles")]
PITCH = {"niche": "El tipo de negocio afina agentes y catálogo", "hours": "Cuándo atiende tu agente y cuándo avisa", "catalog": "Sube tu carta o lista y la IA la lee", "agents": "Plantillas de tu sector, a tu medida", "whatsapp": "Conecta tu número cuando quieras"}

def phone(id_):
    return f'''<div class="phone" id="{id_}" aria-label="Vista previa de la conversación">
  <div class="sb"><span>9:41</span><span style="display:inline-flex;gap:4px">{ic("Signal", size=11)}{ic("Wifi", size=11)}{ic("BatteryFull", size=11)}</span></div>
  <div class="hd"><span class="av" data-av>V</span><div><b data-pname>Vendedor de Joao's Burguer</b><small data-pchar>Personalidad: Axel · en línea</small></div></div>
  <div class="chat" data-chat></div>
  <div class="inp">{ic("Plus", size=14)}<span style="flex:1">Escribe un mensaje</span>{ic("Mic", size=14)}</div>
</div>'''

DAYS = [("Lunes", True), ("Martes", True), ("Miércoles", True), ("Jueves", True), ("Viernes", True), ("Sábado", True), ("Domingo", False)]
def day_row(n, on):
    body = (f'<input class="ti" value="09:00" aria-label="Hora de apertura"><span class="a">a</span><input class="ti" value="18:00" aria-label="Hora de cierre">' if on
            else '<span class="a">Cerrado</span>')
    return f'<div class="day"><span class="sw{"" if on else " off"}" role="switch" aria-checked="{str(on).lower()}" aria-label="Atención el {n}"></span><span class="n">{n}</span>{body}</div>'

PRODUCTS = [
    ("Hamburguesa clásica", "Hamburguesas", 24900, "ok"), ("Doble queso", "Hamburguesas", 31900, "ok"), ("Combo familiar", "Combos", 78900, "ok"),
    ("Papas rústicas", "Acompañamientos", None, "warn"), ("Limonada de coco", "Bebidas", 8900, "ok"), ("Malteada de arequipe", "Bebidas", None, "warn"),
    ("Alitas BBQ ×8", "Entradas", None, "warn"), ("Brownie con helado", "Postres", 12900, "ok"),
]
def prod_row(i, name, cat, price, tone):
    if price:
        pr = f'<input class="in num" value="{f"{price:,}".replace(",", ".")}" aria-label="Precio">'
    else:
        pr = '<input class="in num warn" placeholder="Escríbelo" aria-label="Precio">'
    st = '<span class="tone ok">Listo</span>' if tone == "ok" else '<span class="tone warn">Falta precio</span>'
    cb = '<span class="cb on">' + ic("Check", size=12, sw=3) + '</span>' if tone == "ok" else '<span class="cb"></span>'
    return (f'<tr data-tone="{tone}"><td>{cb}</td><td><input class="in" value="{name}" aria-label="Nombre"></td><td>{pr}</td>'
            f'<td><input class="in" value="{cat}" aria-label="Categoría"></td><td class="muted" style="font-size:13px;color:var(--soft)">Producto</td><td>{st}</td></tr>')

def route(id_):
    nodes = "".join(f'<div class="node" data-i="{i}" data-code="{code}">{ic(icon, size=24, sw=1.8)}<span class="badge">{ic("Check", size=11, sw=3)}</span><span class="tip">{label}</span></div>' for i, (code, label, icon) in enumerate(STEPS))
    return f'<nav class="route" id="{id_}" aria-label="Recorrido de la configuración"><div class="track" id="track"><svg id="routeSvg"><path id="routePath" d=""/></svg>{nodes}</div></nav>'

SCREENS = [("welcome", "Bienvenida"), ("niche", "Negocio"), ("hours", "Horario"), ("catalog", "Catálogo"), ("scan", "Leyendo"), ("review", "Revisar"),
           ("agents", "Agentes"), ("customize", "Personalizar"), ("created", "Creado"), ("whatsapp", "WhatsApp"), ("done", "Listo"),
           ("banner", "Banner"), ("verify", "Verificar"), ("skeleton", "Cargando"), ("error", "Error")]

HTML_HEAD = f"""<title>Onboarding Flow</title>
<meta name="description" content="Mockup del onboarding «Flow»: bienvenida sobre el campo, cinco pasos sobre el suelo del panel con la ruta animada, y el cierre">
<style>
{FONT_CSS}
{CSS}
</style>
<div class="mockbar" role="toolbar" aria-label="Controles del mockup">
  <div class="grp"><b>Tema</b><button data-theme-set="system" aria-pressed="true">Sistema</button><button data-theme-set="light">Claro</button><button data-theme-set="dark">Oscuro</button></div>
  <div class="grp"><b>Vista</b><button data-vp="desktop" aria-pressed="true">Escritorio</button><button data-vp="mobile">Móvil</button></div>
  <div class="grp"><b>Mov.</b><button data-rm="0" aria-pressed="true">Normal</button><button data-rm="1">Reducido</button></div>
  <div class="grp"><b>Pantalla</b>{"".join(f'<button data-screen="{k}">{v}</button>' for k, v in SCREENS)}</div>
</div>
"""

WELCOME = f"""
<div class="fieldLayer field" id="fieldLayer">
  <div class="grain" aria-hidden="true"></div>
  <canvas class="confetti" id="confettiA"></canvas>
  <header class="top">
    <a class="lockup" href="#" aria-label="axi connect"><span class="mark">{ISOLOGO}</span><span class="word">axi connect</span></a>
    <span class="pillnote" id="fieldPill">Prueba de 7 días · sin tarjeta</span>
  </header>
  <main>
    <div class="q wel wide" id="q-welcome">
      <span class="isob">{ISOLOGO}</span>
      <span class="eyebrow">{ic("Check", size=13, sw=2.6)} Cuenta creada</span>
      <h1 style="margin-top:8px">Bienvenido a Axi Connect, Joao</h1>
      <p class="sub"><b style="color:var(--fg);font-weight:600">Joao's Burguer</b> ya tiene su cuenta. Tu prueba de 7 días empieza hoy y vence el <b style="color:var(--fg);font-weight:600">12 de septiembre</b>; hasta entonces no te pedimos tarjeta.</p>
      <div class="body">
        <span class="offer">Crecimiento <span>·</span> <span>paquete completo en prueba</span></span>
        <div class="stepsmeta"><b>Lo que haremos ahora</b><span>unos 10 minutos · puedes saltar pasos</span></div>
        <ol class="steps5" aria-label="Lo que haremos ahora">
          {"".join(f'<li><span class="k">{ic(icon, size=16, sw=1.9)}</span><b>{label}</b><small>{PITCH[code]}</small></li>' for code, label, icon in STEPS[:5])}
        </ol>
        <button type="button" class="cta" id="startBtn">Configurar mi empresa {ic("ArrowRight", size=16)}</button>
        <p class="link">Si prefieres, <a href="#" data-screen="banner">ve directo a tu panel</a>: te recordamos lo que falte.</p>
      </div>
    </div>

    <div class="q" id="q-verify" hidden>
      <span class="disc" id="vdisc">{ic("MailCheck", size=40, sw=1.6)}</span>
      <h1 id="vtitle">Correo confirmado</h1>
      <p class="sub" id="vsub">Ya puedes conectar WhatsApp e invitar a tu equipo. Sigue donde lo dejaste.</p>
      <div class="body">
        <button type="button" class="cta" id="vcta" data-screen="whatsapp">Continuar con la configuración {ic("ArrowRight", size=16)}</button>
        <div class="mockstate" aria-label="Estado (mockup)"><b>estado</b><button data-vstate="ok" aria-pressed="true">Confirmado</button><button data-vstate="expired">Caducado</button><button data-vstate="verifying">Verificando</button></div>
      </div>
    </div>
  </main>
</div>
"""

GROUND_SCREENS = f"""
<div class="q wide" id="q-niche" hidden>
  <h1>¿Qué tipo de negocio tienes?</h1>
  <p class="sub">Con esto afinamos las plantillas de agentes, las categorías del catálogo y los ejemplos que verás.</p>
  <div class="body">
    <div class="tiles" role="radiogroup" aria-label="Tipo de negocio">{"".join(niche_tile(*n) for n in NICHES)}</div>
    <button type="button" class="cta" id="nicheCta" disabled>Continuar {ic("ArrowRight", size=16)}</button>
    <p class="fine" id="nicheFine">Elige el tipo de negocio para continuar.</p>
  </div>
</div>

<div class="q" id="q-hours" hidden>
  <h1>¿Cuándo atiende tu negocio?</h1>
  <p class="sub">Venía Lunes a Sábado de 9 a 18. Ajústalo a como opera tu negocio y guarda; o mantenlo y sigue.</p>
  <div class="body">
    <div class="sheet" style="max-width:640px">
      <div class="days">{"".join(day_row(*d) for d in DAYS)}</div>
      <div class="foot"><button type="button" class="btn" data-adv="hours" data-status="done">Guardar horario</button></div>
    </div>
    <div class="actions">
      <button type="button" class="cta ghost" data-adv="hours" data-status="skipped">Mantener este horario y continuar</button>
      <p class="fine">Tu agente atiende en este horario y fuera de él avisa · zona horaria America/Bogota</p>
      <button type="button" class="back" data-screen="niche">{ic("ArrowLeft", size=14)} Atrás</button>
    </div>
  </div>
</div>

<div class="q" id="q-catalog" hidden>
  <h1>Carga tu catálogo</h1>
  <p class="sub">Sube el archivo que ya tienes. No hace falta que esté ordenado: la IA se encarga y tú revisas.</p>
  <div class="body">
    <div class="drop" role="button" tabindex="0" data-screen="scan" style="max-width:560px">
      <span class="plate">{ic("Upload", size=24, sw=1.8)}</span>
      <b>Arrastra tu catálogo o haz clic para elegirlo</b>
      <p>La IA lee el archivo, arma tus productos y te pregunta solo lo que no encuentre. Excel, CSV, PDF con texto o una foto del menú, hasta 10 MB.</p>
      <span class="ex"><i>menu.xlsx</i><i>lista-de-precios.pdf</i><i>foto-carta.jpg</i><i>productos.csv</i></span>
    </div>
    <div class="hint" style="max-width:560px">{ic("Sparkles", size=16)}<span>Para restaurantes suele bastar la carta en PDF o una foto: la IA separa entradas, platos, bebidas y postres.</span></div>
    <div class="actions">
      <button type="button" class="cta ghost" data-adv="catalog" data-status="skipped">Cargarlo a mano después</button>
      <p class="fine">Con catálogo, tu agente vende con precios reales desde el primer chat.</p>
      <button type="button" class="back" data-screen="hours">{ic("ArrowLeft", size=14)} Atrás</button>
    </div>
  </div>
</div>

<div class="q wide" id="q-scan" hidden>
  <h1>Estamos leyendo tu catálogo</h1>
  <p class="sub">Puedes esperar aquí o seguir con los agentes y volver después.</p>
  <div class="body">
    <div class="scan" style="max-width:820px">
      <div class="doc" id="doc" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Analizando el archivo">
        <div class="beam" aria-hidden="true"></div>
        <div class="fh">{ic("FileText", size=22, sw=1.6)}<span>carta-joaos.pdf<small>3 páginas · 1,2 MB</small></span></div>
        <div class="ln m"></div><div class="ln"></div><div class="ln s"></div><div class="ln"></div><div class="ln m"></div><div class="ln s"></div><div class="ln"></div><div class="ln m"></div>
      </div>
      <div class="found">
        <div class="st"><span role="status" id="scanStatus">Leyendo la página 1 de 3…</span><span class="badge" id="scanBadge">Analizando</span></div>
        <div id="foundRows"></div>
        <div class="stallbox" id="stallbox" hidden>
          <span>Este archivo está tardando más de lo normal. Puedes seguir esperando o continuar con los agentes: el análisis sigue y lo retomas aquí.</span>
          <span class="r"><button type="button" class="btn sm o" id="keepWaiting">Seguir esperando</button><button type="button" class="btn sm" data-screen="agents">Continuar con los agentes</button></span>
        </div>
      </div>
    </div>
    <div class="actions">
      <button type="button" class="cta ghost" data-screen="agents">Continuar con los agentes</button>
      <p class="fine">La lectura sigue en segundo plano. Te avisamos cuando esté lista para revisar.</p>
    </div>
  </div>
</div>

<div class="q full" id="q-review" hidden>
  <h1>Revisa lo que encontramos</h1>
  <p class="sub" id="revSub">8 productos en «carta-joaos.pdf». 3 necesitan un dato antes de crearse.</p>
  <div class="body">
    <div class="rev">
      <div class="bar">
        <div class="seg" role="radiogroup" aria-label="Filtro" id="revSeg"><span class="pill"></span>
          <button type="button" role="radio" aria-checked="true" data-f="all">Todos · 8</button>
          <button type="button" role="radio" aria-checked="false" data-f="warn">Falta información · 3</button>
          <button type="button" role="radio" aria-checked="false" data-f="ok">Listos · 5</button></div>
        <button type="button" class="btn sm o" id="excl">Excluir los incompletos (3)</button>
      </div>
      <div class="tbl"><table>
        <thead><tr><th>Incluir</th><th>Nombre</th><th>Precio (COP)</th><th>Categoría</th><th>Tipo</th><th>Estado</th></tr></thead>
        <tbody id="prodBody">{"".join(prod_row(i, *p) for i, p in enumerate(PRODUCTS))}</tbody>
      </table></div>
    </div>
    <button type="button" class="cta" id="createBtn" data-adv="catalog" data-status="done">Crear 5 productos {ic("ArrowRight", size=16)}</button>
    <p class="fine" id="revFine">Solo se crean los productos listos; completa o excluye los 3 que faltan.</p>
    <button type="button" class="back" data-screen="catalog">{ic("ArrowLeft", size=14)} Atrás</button>
  </div>
</div>

<div class="q wide" id="q-agents" hidden>
  <h1>¿Quién atenderá por ti?</h1>
  <p class="sub">Elegimos plantillas para restaurantes y comida. Personaliza nombre, tono y personalidad, o crea el recomendado tal cual con un clic.</p>
  <div class="body">
    <div class="agents">
      <div class="tiles" role="radiogroup" aria-label="Plantillas" id="tplTiles" style="grid-template-columns:1fr">{"".join(tpl_tile(*t) for t in TEMPLATES)}</div>
      {phone("phoneA")}
    </div>
    <div class="actions">
      <button type="button" class="cta" data-adv="agents" data-status="done" data-then="created">Crear el recomendado tal cual {ic("ArrowRight", size=16)}</button>
      <button type="button" class="cta ghost" data-screen="customize">Personalizar</button>
      <p class="fine">Usa tu catálogo y tu horario automáticamente · modelo y parámetros ya afinados</p>
      <button type="button" class="back" data-adv="agents" data-status="skipped">Configurar después</button>
    </div>
  </div>
</div>

<div class="q wide" id="q-customize" hidden>
  <h1 id="custTitle">Dale su voz a Vendedor de Joao's Burguer</h1>
  <p class="sub">Cambia lo que quieras; todo se puede ajustar después en Agentes.</p>
  <div class="body">
    <div class="agents">
      <div class="sheet"><div class="form">
        <div class="fl"><label class="lbl" for="agName">Nombre del agente</label><input class="gi" id="agName" value="Vendedor de Joao's Burguer" placeholder="Como se presentará en el chat"><p class="help">Así se presenta en el chat.</p></div>
        <div class="fl"><span class="lbl">Tono</span>
          <div class="seg" role="radiogroup" aria-label="Tono" id="toneSeg"><span class="pill"></span>
            <button type="button" role="radio" aria-checked="true" data-tone="cercano">Cercano</button>
            <button type="button" role="radio" aria-checked="false" data-tone="formal">Formal</button>
            <button type="button" role="radio" aria-checked="false" data-tone="directo">Directo</button></div></div>
        <div class="fl"><label class="lbl" for="agChar">Personalidad</label><div class="gi-wrap"><select class="gi" id="agChar"><option>Axel</option><option>Nova</option><option>Sol</option></select><span class="trail">{ic("ChevronDown", size=16)}</span></div></div>
        <div class="fl"><label class="lbl" for="agExtra">Datos clave que debe saber</label><textarea class="gi" id="agExtra" placeholder="Zonas de entrega, pedido mínimo, medios de pago, promociones…">Domicilio en Chapinero y Teusaquillo. Pedido mínimo $25.000. Pagamos con Nequi y tarjeta.</textarea><p class="cnt">97 / 2000</p></div>
        <p class="help" style="margin:0">Modelo, temperatura y límites los fija la plantilla. <a href="#" style="font-weight:600">Ajustes avanzados en Agentes</a></p>
      </div></div>
      {phone("phoneB")}
    </div>
    <div class="actions">
      <button type="button" class="cta" data-adv="agents" data-status="done" data-then="created">Crear agente {ic("ArrowRight", size=16)}</button>
      <p class="fine">Tu agente empieza a atender en cuanto conectes un canal.</p>
      <button type="button" class="back" data-screen="agents">{ic("ArrowLeft", size=14)} Atrás</button>
    </div>
  </div>
</div>

<div class="q" id="q-created" hidden>
  <h1>Tu agente está listo</h1>
  <p class="sub">Puedes crear otro con una plantilla distinta o continuar. Todo se ajusta después en Agentes.</p>
  <div class="body">
    <ul class="created" aria-label="Agentes creados" style="max-width:520px;margin:0;padding:0;list-style:none">
      <li class="row"><span class="av" id="crAv">V</span><span><span id="crName">Vendedor de Joao's Burguer</span><small id="crMeta">Ventas · tono cercano · Axel</small></span><span class="chip">Creado</span></li>
    </ul>
    <div class="actions">
      <button type="button" class="cta" data-screen="whatsapp">Continuar {ic("ArrowRight", size=16)}</button>
      <button type="button" class="cta ghost" data-screen="agents">Crear otro agente</button>
    </div>
  </div>
</div>

<div class="q" id="q-whatsapp" hidden>
  <h1>Conecta tu WhatsApp</h1>
  <p class="sub">Es opcional ahora, pero es lo que pone a trabajar a tu agente. También puedes hacerlo después desde Canales.</p>
  <div class="body">
    <div class="notice" style="max-width:640px" role="status" id="mailNotice">{ic("MailWarning", size=18, sw=1.8)}<span><b>Verifica tu correo</b> para conectar canales e invitar a tu equipo. Te enviamos el enlace a joao@joaosburguer.co. <a href="#" data-screen="verify" style="font-weight:600">Reenviar</a></span></div>
    <div class="sheet wiz" style="max-width:640px">
      <h2>Antes de empezar</h2>
      <p class="muted" style="margin:4px 0 0">Ten a mano lo que Meta te va a pedir. Tarda unos tres minutos.</p>
      <div class="steps"><i class="done">Canal</i><span></span><i class="on">Antes de empezar</i><span></span><i>Conectar</i><span></span><i>Listo</i></div>
      <ul>
        <li>{ic("Check", size=15, sw=2.4)}<span>Un número que <b>no</b> esté en uso en WhatsApp personal o Business (o que puedas liberar).</span></li>
        <li>{ic("Check", size=15, sw=2.4)}<span>Acceso a la cuenta de Meta Business de tu empresa, o permiso para crearla.</span></li>
        <li>{ic("Check", size=15, sw=2.4)}<span>Recibir un código por SMS o llamada en ese número.</span></li>
      </ul>
      <div class="gate" id="gate">{ic("Lock", size=20, sw=1.8)}<b>Verifica tu correo para conectar WhatsApp</b><p>Conectar un canal de Meta exige un correo verificado. Abre el enlace que te enviamos y vuelve aquí.</p><button type="button" class="btn sm o" data-screen="verify">Ya lo verifiqué</button></div>
      <div class="foot" id="gateFoot" hidden><button type="button" class="btn" id="metaBtn">Continuar con Meta {ic("ExternalLink", size=15)}</button></div>
    </div>
    <div class="actions">
      <button type="button" class="cta" id="waCta" data-adv="whatsapp" data-status="done" hidden>Continuar {ic("ArrowRight", size=16)}</button>
      <button type="button" class="cta ghost" data-adv="whatsapp" data-status="skipped">Conectar después</button>
      <p class="fine">Instagram y Messenger se conectan después desde Canales, con la misma cuenta de Meta.</p>
      <button type="button" class="back" data-screen="agents">{ic("ArrowLeft", size=14)} Atrás</button>
    </div>
  </div>
</div>

<div class="q" id="q-done" hidden>
  <span class="iso" id="isoDone">{ISOLOGO}</span>
  <h1>Joao's Burguer está lista</h1>
  <p class="sub">Esto es lo que dejaste configurado. Lo que quedó para después lo encuentras en el panel, y te lo recordamos hasta que lo termines.</p>
  <div class="body">
    <ol class="sum" id="sum"></ol>
    <div class="ent" id="ent" aria-label="Qué incluye tu prueba">
      <h3>Tu prueba de 7 días incluye <small>Vence el 12 de septiembre</small></h3>
      <dl><dt>Conversaciones con IA</dt><dd>1.000<span>≈ 3.000 mensajes</span></dd><dt>Agentes</dt><dd>3</dd><dt>Usuarios del equipo</dt><dd>5</dd><dt>Canales</dt><dd>2<span>WhatsApp + 1</span></dd></dl>
      <p>Al continuar con Crecimiento pasas a las cuotas completas. Lo eliges en Facturación cuando quieras.</p>
    </div>
    <button type="button" class="cta" data-screen="banner">Ir a mi panel {ic("ArrowRight", size=16)}</button>
    <p class="fine">Puedes volver a cualquier paso desde Ajustes.</p>
  </div>
</div>

<div class="q full dashq" id="q-banner" hidden style="align-items:stretch;text-align:left">
  <div class="dash">
    <aside>
      <div class="it on">{ic("LayoutDashboard", size=16)} Panel</div><div class="it">{ic("Inbox", size=16)} Bandeja</div><div class="it">{ic("Bot", size=16)} Agentes</div><div class="it">{ic("Package", size=16)} Catálogo</div><div class="it">{ic("Users", size=16)} Contactos</div><div class="it">{ic("MessageCircle", size=16)} Canales</div>
    </aside>
    <div class="content">
      <h2>Buenos días, Joao</h2>
      <section class="banner" aria-label="Configuración pendiente">
        <div>
          <h3 id="bnTitle">Te faltan 2 pasos para dejar tu negocio listo</h3>
          <p>Completa lo pendiente para que tu agente empiece a atender y vender.</p>
          <ol class="mini" id="mini" aria-label="Estado de los pasos"></ol>
        </div>
        <div class="acts"><button type="button" class="btn o sm">Ocultar</button><button type="button" class="btn sm" data-screen="catalog">Continuar {ic("ArrowRight", size=14)}</button></div>
      </section>
      <div class="cards"><div class="c"><small>Conversaciones hoy</small><b>0</b></div><div class="c"><small>Pedidos</small><b>0</b></div><div class="c"><small>Contactos</small><b>0</b></div></div>
    </div>
  </div>
</div>

<div class="q" id="q-skeleton" hidden aria-busy="true" aria-label="Cargando tu configuración">
  <div class="sk"><i style="width:60%;height:44px"></i><i style="width:80%;height:16px;margin-top:4px"></i><i style="width:100%;max-width:520px;height:96px;margin-top:16px;border-radius:16px"></i><i style="width:100%;max-width:520px;height:96px;border-radius:16px"></i><i style="width:min(100%,440px);height:56px;margin-top:8px;border-radius:14px"></i></div>
</div>

<div class="q" id="q-error" hidden>
  <h1>No pudimos cargar tu progreso</h1>
  <p class="sub">El servidor no respondió a tiempo. Tus respuestas guardadas siguen ahí: reintenta o vuelve más tarde desde el panel.</p>
  <div class="body">
    <button type="button" class="cta" data-screen="niche">Reintentar {ic("RotateCw", size=16)}</button>
    <button type="button" class="back" data-screen="banner">Ir al panel</button>
  </div>
</div>
"""

BODY = f"""
<div class="stage" id="stage" data-vp="desktop">
<div class="ground" id="ground">
  <div class="scroller" id="scroller">
    <canvas class="confetti" id="confettiB"></canvas>
    <header class="top">
      <a class="lockup" href="#" aria-label="axi connect"><span class="mark">{ISOLOGO}</span><span class="word">axi connect</span></a>
      <div class="dots" id="dots" aria-hidden="true">{"".join('<i></i>' for _ in range(6))}</div>
      <a class="toplink" href="#" data-screen="banner" id="topLink"><span class="hide-sm">Tu progreso ya está guardado · </span><b>Salir al panel</b></a>
    </header>
    <main>{GROUND_SCREENS}</main>
    {route("route")}
  </div>
  {WELCOME}
</div>
</div>
"""

JS = r"""
<script>
(() => {
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const root = document.documentElement;
const reduced = () => root.classList.contains("rm") || matchMedia("(prefers-reduced-motion: reduce)").matches;
const STEPS = __STEPS__;
const SCREEN_STEP = { niche:0, hours:1, catalog:2, scan:2, review:2, agents:3, customize:3, created:3, whatsapp:4, done:5 };
const st = { screen:"welcome", status:{}, niche:null, tpl:"ventas", tplName:"Vendedor de menú", tone:"cercano", agName:"Vendedor de Joao's Burguer", char:"Axel", welcomed:false };

/* mockbar */
function setTheme(v){ v==="system"?root.removeAttribute("data-theme"):root.setAttribute("data-theme",v); $$("[data-theme-set]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.themeSet===v))); }
$$("[data-theme-set]").forEach(b=>b.onclick=()=>setTheme(b.dataset.themeSet));
$$("[data-vp]").forEach(b=>b.onclick=()=>{ $("#stage").dataset.vp=b.dataset.vp; root.dataset.vp=b.dataset.vp; $$("[data-vp]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); requestAnimationFrame(()=>{layoutRoute();placeSegs();}); });
$$("[data-rm]").forEach(b=>b.onclick=()=>{ root.classList.toggle("rm", b.dataset.rm==="1"); $$("[data-rm]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); });
$$(".mockbar [data-screen]").forEach(b=>b.onclick=()=>show(b.dataset.screen, {jump:true}));

/* la ruta */
const N = STEPS.length; let SEG=560, geo=[];
function layoutRoute(){
  const route=$("#route"), W=route.clientWidth, H=route.clientHeight; if(!W) return;
  SEG = Math.max(240, Math.min(560, W*0.42));
  const amp = H*0.09, base = H*0.47;
  geo = []; for(let i=-1;i<=N;i++) geo.push([SEG*(i+1), base + (i%2===0?amp:-amp)]);
  let d=`M${geo[0][0]} ${geo[0][1]}`;
  for(let i=1;i<geo.length;i++){ const [x0,y0]=geo[i-1],[x1,y1]=geo[i]; d+=` C ${x0+SEG/2} ${y0}, ${x1-SEG/2} ${y1}, ${x1} ${y1}`; }
  const total=SEG*(N+1);
  const svg=$("#routeSvg"); svg.setAttribute("width",total); svg.setAttribute("height",H); svg.setAttribute("viewBox",`0 0 ${total} ${H}`);
  $("#routePath").setAttribute("d",d); $("#track").style.width=total+"px";
  $$(".node").forEach(n=>{ const [x,y]=geo[+n.dataset.i+1]; n.style.left=x+"px"; n.style.top=y+"px"; });
  slideRoute();
}
function currentIndex(){ return SCREEN_STEP[st.screen] ?? 0; }
function slideRoute(){
  const W=$("#route").clientWidth, cur=currentIndex(); if(!geo.length) return;
  $("#track").style.transform=`translateX(${W/2 - geo[cur+1][0]}px)`;
  $$(".node").forEach(n=>{ const i=+n.dataset.i, code=n.dataset.code, d=Math.abs(i-cur), s=st.status[code];
    n.classList.toggle("on",d===0); n.classList.toggle("near",d===1); n.classList.toggle("far",d>1);
    n.classList.toggle("closed",!!s && d!==0); n.classList.toggle("done",s==="done"); n.classList.toggle("skipped",s==="skipped");
    n.setAttribute("aria-current", d===0 ? "step" : "false"); n.setAttribute("aria-label", s ? `Volver a ${STEPS[i][1]}${s==="skipped"?" (para después)":""}` : STEPS[i][1]); });
  $$("#dots i").forEach((d,i)=>{ d.classList.toggle("on",i===cur); d.classList.toggle("done",i<cur); });
}
$$(".node").forEach(n=>n.onclick=()=>{ const code=n.dataset.code; if(st.status[code] && code!=="done") show(code); });

/* pantallas */
const FIELD = new Set(["welcome","verify"]); const NOROUTE = new Set(["banner","error"]);
let busy=false;
function show(id, opts={}){
  if(id===st.screen) return;
  const fromId=st.screen, from=$("#q-"+fromId), to=$("#q-"+id); if(!to) return;
  const fl=$("#fieldLayer");
  // capa del campo: bienvenida y verificación viven en ella
  if(FIELD.has(id)){ const emerge = fl.hidden && fromId && !reduced(); fl.hidden=false; if(emerge){ fl.classList.add("drain"); requestAnimationFrame(()=>requestAnimationFrame(()=>fl.classList.remove("drain"))); } else fl.classList.remove("drain"); $("#fieldPill").textContent = id==="verify" ? "Verificación de correo" : "Prueba de 7 días · sin tarjeta"; }
  else if(FIELD.has(fromId) && !fl.hidden){ if(reduced()) fl.hidden=true; else { fl.classList.add("drain"); setTimeout(()=>{ fl.hidden=true; }, 620); } if(!st.welcomed){ st.welcomed=true; riseRoute(); } }
  st.screen=id; $$(".mockbar [data-screen]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.screen===id)));
  const route=$("#route"); route.hidden = NOROUTE.has(id) || FIELD.has(id); route.classList.toggle("dim", id==="skeleton");
  $("#topLink").hidden = id==="banner"; $("#dots").hidden = NOROUTE.has(id) || id==="skeleton";
  slideRoute();
  swap(from, to); onEnter(id);
}
function swap(from,to){
  if(!from){ to.hidden=false; return; }
  if(from===to) return;
  const fromField=!!from.closest("#fieldLayer"), toField=!!to.closest("#fieldLayer");
  if(reduced()){ from.hidden=true; to.hidden=false; return; }
  if(fromField!==toField){ /* cambio de capa: el campo se hunde (o emerge); la pantalla destino entra por debajo */
    if(fromField) setTimeout(()=>{from.hidden=true;},620); else from.hidden=true;
    to.hidden=false; to.classList.add("in"); void to.offsetWidth; requestAnimationFrame(()=>to.classList.remove("in")); return; }
  busy=true; from.classList.add("out");
  setTimeout(()=>{ from.hidden=true; from.classList.remove("out"); to.hidden=false; to.classList.add("in"); void to.offsetWidth; to.classList.remove("in"); busy=false; }, 240);
}
function riseRoute(){ const r=$("#route"); r.classList.add("rise"); r.hidden=false; setTimeout(()=>{ layoutRoute(); r.classList.remove("rise"); }, 280); }
$$("[data-screen]:not(.mockbar *)").forEach(b=>b.onclick=e=>{ e.preventDefault(); show(b.dataset.screen); });
$("#startBtn").onclick=()=>show("niche");

/* avanzar: cerrar el paso (hecho u omitido) y seguir por el primero abierto */
const ORDER = ["niche","hours","catalog","agents","whatsapp"];
function firstOpen(){ return ORDER.find(c=>!st.status[c]) ?? "done"; }
$$("[data-adv]").forEach(b=>b.onclick=()=>{ st.status[b.dataset.adv]=b.dataset.status; show(b.dataset.then ?? firstOpen()); });

/* negocio */
$$("[data-niche]").forEach(b=>b.onclick=()=>{ st.niche=b.dataset.niche; $$("[data-niche]").forEach(x=>x.setAttribute("aria-checked",String(x===b))); $("#nicheCta").disabled=false; $("#nicheFine").textContent="Afina plantillas, categorías y ejemplos · lo cambias después en Ajustes de empresa"; });
$("#nicheCta").onclick=()=>{ st.status.niche="done"; show(firstOpen()); };

/* el escaneo */
const FOUND = [["Hamburguesa clásica","Hamburguesas","$24.900"],["Doble queso","Hamburguesas","$31.900"],["Combo familiar","Combos","$78.900"],["Papas rústicas","Acompañamientos",null],["Limonada de coco","Bebidas","$8.900"],["Malteada de arequipe","Bebidas",null]];
let scanTimers=[];
function runScan(){
  scanTimers.forEach(clearTimeout); scanTimers=[]; const rows=$("#foundRows"); rows.innerHTML=""; $("#stallbox").hidden=true; $("#doc").classList.remove("stall"); $("#scanBadge").textContent="Analizando";
  const status=$("#scanStatus"); status.textContent="Leyendo la página 1 de 3…";
  const t=(ms,f)=>scanTimers.push(setTimeout(f,reduced()?0:ms));
  t(900,()=>status.textContent="Leyendo la página 2 de 3…"); t(2600,()=>status.textContent="Leyendo la página 3 de 3…"); t(4200,()=>status.textContent="8 productos encontrados hasta ahora");
  FOUND.forEach((p,i)=>t(700+i*650,()=>{ const r=document.createElement("div"); r.className="row"+(p[2]?"":" miss"); r.innerHTML=`<span>${p[0]}<small>${p[1]}</small></span><b>${p[2]??"sin precio"}</b>`; rows.appendChild(r); if(i===FOUND.length-1){ const m=document.createElement("div"); m.className="more"; m.textContent="y 2 más"; rows.appendChild(m); } }));
  t(6200,()=>{ if(st.screen==="scan") show("review"); });
}
$("#keepWaiting").onclick=()=>{ $("#stallbox").hidden=true; $("#doc").classList.remove("stall"); $("#scanBadge").textContent="Analizando"; };
function showStalled(){ scanTimers.forEach(clearTimeout); $("#stallbox").hidden=false; $("#doc").classList.add("stall"); $("#scanBadge").textContent="Tardando más"; $("#scanStatus").textContent="Sigue analizando…"; }

/* revisión */
$$("#revSeg button").forEach(b=>b.onclick=()=>{ $$("#revSeg button").forEach(x=>x.setAttribute("aria-checked",String(x===b))); placeSegs(); const f=b.dataset.f; $$("#prodBody tr").forEach(tr=>tr.hidden = f!=="all" && tr.dataset.tone!==f); });
$("#excl").onclick=()=>{ $$('#prodBody tr[data-tone="warn"]').forEach(tr=>{ tr.style.opacity=".45"; tr.querySelector(".tone").outerHTML='<span class="tone dup">Excluido</span>'; }); $("#excl").disabled=true; $("#excl").style.opacity=".5"; $("#revFine").textContent="Se crean los 5 productos listos. Los excluidos los completas después en Catálogo."; };
$$("#prodBody .in.warn").forEach(inp=>inp.oninput=()=>{ const tr=inp.closest("tr"); if(inp.value.length>=4){ inp.classList.remove("warn"); tr.dataset.tone="ok"; tr.querySelector(".tone").outerHTML='<span class="tone ok">Listo</span>'; tr.querySelector(".cb").outerHTML='<span class="cb on">__CHECK__</span>'; const n=$$('#prodBody tr[data-tone="ok"]').length; $("#createBtn").firstChild.textContent=`Crear ${n} productos `; const w=8-n; $("#revFine").textContent = w ? `Solo se crean los productos listos; completa o excluye los ${w} que faltan.` : "Todo listo para crearse."; } });

/* agentes: la vista previa viva */
const PRODUCT = "una hamburguesa doble";
const LINES = {
  cercano: n=>[["a",`¡Hola! Soy ${n}, de Joao's Burguer. ¿Qué te antoja hoy?`],["u",`¿Tienen ${PRODUCT}?`],["a",`¡Claro! La doble queso está a $31.900. ¿Te la envío a domicilio o pasas a recoger?`],["u","A domicilio, porfa"],["a","Listo, te la aparto. Dime la dirección y en 35 minutos está allá."]],
  formal:  n=>[["a",`Buenas tardes. Le atiende ${n}, de Joao's Burguer. ¿En qué puedo ayudarle?`],["u",`¿Tienen ${PRODUCT}?`],["a",`Con gusto. La doble queso tiene un valor de $31.900. ¿Desea envío a domicilio o recogerla en el local?`],["u","A domicilio, por favor"],["a","Perfecto. Queda reservada a su nombre; indíqueme la dirección y el pedido llega en 35 minutos."]],
  directo: n=>[["a",`Hola, soy ${n} de Joao's Burguer. Dime qué necesitas.`],["u",`¿Tienen ${PRODUCT}?`],["a",`Sí. Doble queso, $31.900. ¿Domicilio o recoges?`],["u","Domicilio"],["a","Hecho. Dirección y en 35 min llega."]],
};
let chatTimers=[];
function renderPhone(){
  chatTimers.forEach(clearTimeout); chatTimers=[];
  const name=st.agName.trim()||st.tplName, lines=LINES[st.tone](name.split(" ")[0]);
  $$("[data-pname]").forEach(e=>e.textContent=name); $$("[data-pchar]").forEach(e=>e.textContent=`Personalidad: ${st.char} · en línea`); $$("[data-av]").forEach(e=>e.textContent=name[0].toUpperCase());
  $$("[data-chat]").forEach(chat=>{ chat.innerHTML=""; lines.forEach(([who,txt],i)=>chatTimers.push(setTimeout(()=>{ const m=document.createElement("div"); m.className="msg "+who; m.textContent=txt; chat.appendChild(m); }, reduced()?0:220+i*420))); });
  $("#custTitle").textContent=`Dale su voz a ${name}`; $("#crName").textContent=name; $("#crAv").textContent=name[0].toUpperCase(); $("#crMeta").textContent=`${({ventas:"Ventas",reservas:"Reservas",soporte:"Atención"})[st.tpl]} · tono ${st.tone} · ${st.char}`;
}
$$("[data-tpl]").forEach(b=>b.onclick=()=>{ st.tpl=b.dataset.tpl; st.tplName=b.dataset.name; const role={ventas:"Vendedor",reservas:"Reservas",soporte:"Atención"}[st.tpl]; st.agName=`${role} de Joao's Burguer`; $("#agName").value=st.agName; $$("[data-tpl]").forEach(x=>x.setAttribute("aria-checked",String(x===b))); renderPhone(); });
$("#agName").oninput=e=>{ st.agName=e.target.value; renderPhone(); };
$$("#toneSeg button").forEach(b=>b.onclick=()=>{ st.tone=b.dataset.tone; $$("#toneSeg button").forEach(x=>x.setAttribute("aria-checked",String(x===b))); placeSegs(); renderPhone(); });
$("#agChar").onchange=e=>{ st.char=e.target.value; renderPhone(); };
$("#agExtra").oninput=e=>{ e.target.nextElementSibling.textContent=`${e.target.value.length} / 2000`; };

/* whatsapp: la puerta del correo */
function renderGate(verified){ $("#gate").hidden=verified; $("#gateFoot").hidden=!verified; $("#mailNotice").hidden=verified; }
$("#metaBtn").onclick=()=>{ const b=$("#metaBtn"); b.disabled=true; b.textContent="Esperando a Meta…"; setTimeout(()=>{ b.textContent="Número conectado ✓"; $("#waCta").hidden=false; }, reduced()?0:1600); };

/* verificación */
const V = { ok:["Correo confirmado","Ya puedes conectar WhatsApp e invitar a tu equipo. Sigue donde lo dejaste.","MailCheck",true,"Continuar con la configuración"],
  expired:["El enlace caducó","Este enlace ya no sirve: venció o ya se usó. Pide uno nuevo desde el paso «WhatsApp» de tu configuración.","MailX",false,"Pedir un enlace nuevo desde mi panel"],
  verifying:["Confirmando tu correo…","Un segundo. Estamos validando el enlace.","LoaderCircle",false,"Continuar con la configuración"] };
$$("[data-vstate]").forEach(b=>b.onclick=()=>{ const [t,s,icon,done,cta]=V[b.dataset.vstate]; $$("[data-vstate]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
  $("#vtitle").textContent=t; $("#vsub").textContent=s; const d=$("#vdisc"); d.classList.toggle("done",done); d.innerHTML=ICONS[icon]; if(icon==="LoaderCircle") d.firstElementChild.classList.add("spin"); $("#vcta").firstChild.textContent=cta+" "; st.verified = b.dataset.vstate==="ok"; renderGate(st.verified); });
$("#vcta").addEventListener("click",()=>{ st.verified = $('[data-vstate][aria-pressed="true"]').dataset.vstate==="ok"; renderGate(st.verified); });

/* listo: la ruta se enciende, el resumen entra, confeti corto */
let doneTimers=[];
function runDone(){
  doneTimers.forEach(clearTimeout); doneTimers=[]; const sum=$("#sum"); sum.innerHTML="";
  const t=(ms,f)=>doneTimers.push(setTimeout(f,reduced()?0:ms));
  const nodes=$$(".node"); nodes.forEach(n=>n.classList.remove("lit"));
  let k=0; ORDER.forEach((code,i)=>{ if(st.status[code]==="done"){ t(300+k*140,()=>nodes[i].classList.add("lit")); k++; } });
  t(300+k*140,()=>nodes[5].classList.add("lit"));
  const LABEL={niche:["Tipo de negocio",({restaurants:"Restaurantes y comida"})[st.niche]??"Restaurantes y comida"],hours:["Horario","Lunes a sábado, 9:00 a 18:00"],catalog:["Catálogo","5 productos creados"],agents:["Agentes",st.agName||"Vendedor de Joao's Burguer"],whatsapp:["WhatsApp","Número conectado"]};
  const base=300+(k+1)*140+200;
  ORDER.forEach((code,i)=>{ const s=st.status[code]||"skipped"; const li=document.createElement("li"); li.className=s==="done"?"done":"skip"; const [lab,val]=LABEL[code];
    li.innerHTML=`<span class="k">${ICONS[STEPS[i][2]]}</span><span>${lab}<small>${s==="done"?val:"Lo retomas desde el panel"}</small></span><span class="s">${s==="done"?"Listo":"Para después"}</span>`; sum.appendChild(li); t(base+i*80,()=>li.classList.add("show")); });
  $("#ent").classList.remove("show"); t(base+ORDER.length*80+60,()=>$("#ent").classList.add("show"));
  const iso=$("#isoDone"); iso.style.animation="none"; void iso.offsetWidth; iso.style.animation="";
  if(!reduced()) t(base,()=>confetti($("#confettiB"),{short:true}));
}

/* banner */
function renderBanner(){ const mini=$("#mini"); mini.innerHTML=""; let open=0; ORDER.forEach((code,i)=>{ const s=st.status[code]; if(s!=="done") open++; const li=document.createElement("li"); li.className=s||""; li.title=STEPS[i][1]; li.innerHTML=`<span class="k">${s==="done"?ICONS.Check:ICONS[STEPS[i][2]]}</span>`; mini.appendChild(li); });
  $("#bnTitle").textContent = open===1 ? "Te falta 1 paso para dejar tu negocio listo" : `Te faltan ${open} pasos para dejar tu negocio listo`; }

function onEnter(id){
  setTimeout(placeSegs,300); setTimeout(placeSegs,900);
  if(id==="scan") runScan(); else scanTimers.forEach(clearTimeout);
  if(id==="done") runDone();
  if(id==="banner") renderBanner();
  if(id==="agents"||id==="customize") renderPhone();
  if(id==="whatsapp") renderGate(!!st.verified);
  requestAnimationFrame(placeSegs);
}

/* segmentados */
function placeSegs(){ $$(".seg").forEach(seg=>{ const a=seg.querySelector('[aria-checked="true"]'), p=seg.querySelector(".pill"); if(!a||!p) return; p.style.width=a.offsetWidth+"px"; p.style.transform=`translateX(${a.offsetLeft-4}px)`; }); }

/* confeti finito de marca: dos cañones laterales y, en la bienvenida, un estallido central */
function confetti(canvas,{short=false}={}){
  const cs=getComputedStyle(root); const colors=["--axi-brand","--axi-amber","--axi-violet"].map(v=>cs.getPropertyValue(v).trim());
  const host=canvas.parentElement; canvas.width=host.clientWidth; canvas.height=host.clientHeight; const ctx=canvas.getContext("2d");
  const P=[]; const spawn=(x,angle,count)=>{ for(let i=0;i<count;i++){ const a=(angle+(Math.random()-.5)*55)*Math.PI/180, v=(short?40:58)*(0.6+Math.random()*.6)/6; P.push({x:x*canvas.width,y:canvas.height*.62,vx:Math.cos(a)*v,vy:-Math.sin(a)*v,c:colors[i%3],r:Math.random()*360,s:4+Math.random()*4,life:1}); } };
  const T0=performance.now(), dur= short?900:2200; let last=T0;
  const burst=()=>{ for(let i=0;i<90;i++){ const a=Math.random()*Math.PI*2, v=(2+Math.random()*5); P.push({x:canvas.width/2,y:canvas.height*.35,vx:Math.cos(a)*v,vy:Math.sin(a)*v-4,c:colors[i%3],r:Math.random()*360,s:4+Math.random()*5,life:1}); } };
  if(!short) setTimeout(burst,900);
  function frame(now){ if(now-last>120 && now-T0<dur){ spawn(0,60,4); spawn(1,120,4); last=now; }
    ctx.clearRect(0,0,canvas.width,canvas.height); let alive=0;
    for(const p of P){ p.vy+=.16; p.vx*=.99; p.x+=p.vx; p.y+=p.vy; p.r+=p.vx*4; p.life-=.006; if(p.life<=0||p.y>canvas.height+20) continue; alive++;
      ctx.save(); ctx.globalAlpha=Math.min(1,p.life*1.4); ctx.translate(p.x,p.y); ctx.rotate(p.r*Math.PI/180); ctx.fillStyle=p.c; ctx.fillRect(-p.s/2,-p.s/3,p.s,p.s*.66); ctx.restore(); }
    if(alive||now-T0<dur) requestAnimationFrame(frame); else ctx.clearRect(0,0,canvas.width,canvas.height); }
  requestAnimationFrame(frame);
}
const ICONS = __ICONS__;

/* arranque */
const q=new URLSearchParams(location.search);
if(q.get("theme")) setTheme(q.get("theme"));
if(q.get("vp")==="mobile") $$("[data-vp]").find(b=>b.dataset.vp==="mobile").click();
if(q.get("rm")==="1") $$("[data-rm]").find(b=>b.dataset.rm==="1").click();
$$(".mockbar [data-screen]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.screen==="welcome")));
if(q.get("done")){ ORDER.forEach(c=>st.status[c]="done"); st.status.whatsapp = q.get("done")==="all" ? "done" : "skipped"; st.status.catalog = q.get("done")==="all" ? "done" : (q.get("done")==="mixed" ? "skipped" : "done"); st.niche="restaurants"; }
$("#route").hidden=true; layoutRoute();
const start=q.get("screen"); if(start && start!=="welcome"){ st.welcomed=true; $("#fieldLayer").hidden=true; $("#q-welcome").hidden=true; st.screen=null; show(start,{jump:true}); if(start==="scan"&&q.get("stalled")) setTimeout(showStalled,300); }
else if(!reduced()) setTimeout(()=>confetti($("#confettiA")),350);
new ResizeObserver(()=>{layoutRoute();placeSegs();}).observe($("#route"));
document.fonts&&document.fonts.ready.then(placeSegs);
document.addEventListener("keydown",e=>{ if(e.key==="s"&&st.screen==="scan") showStalled(); });
})();
</script>
"""
ICONS_JS = json.dumps({k: ic(k, size=16, sw=2) for k in ["Check", "Store", "Clock", "Package", "Bot", "MessageCircle", "Sparkles"]} | {k: ic(k, size=40, sw=1.6) for k in ["MailCheck", "MailX", "LoaderCircle"]})
JS = JS.replace("__STEPS__", json.dumps(STEPS)).replace("__ICONS__", ICONS_JS).replace("__CHECK__", ic("Check", size=12, sw=3).replace("'", "\\'"))

HTML = HTML_HEAD + BODY + JS
out = S / "onboarding-flow.html"
out.write_text(HTML)
print(out, len(HTML) // 1024, "KB")
