#!/usr/bin/env python3
"""Mockup v3 de /comenzar: flujo minimalista de una pregunta por pantalla con ruta curva animada (adaptación del patrón Jitter a la marca Axi)."""
import json, pathlib, re

S = pathlib.Path(__file__).parent
FONTS = json.load(open(S / "fonts.json"))
LUCIDE = json.load(open(S / "lucide.json"))
ISOLOGO = open(S / "isologo.svg").read()

# gráficos de capacidad del mockup v2 (los que aprobó el dueño), reutilizados tal cual
_src = open(S / "build_comenzar_mockup.py").read()
exec(re.search(r"\ndef graphic\(kind\):.*?(?=\nSUBS = )", _src, re.S).group(0))

def ic(name, cls="", size=20, sw=2):
    return (f'<svg class="ic {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{LUCIDE[name]}</svg>')

def mono_logo():
    # isotipo monocromo: las tres cintas en el color del texto del campo (autorizado en DESIGN.md §2.2 para fondos de color)
    body = re.sub(r'fill="url\(#[^)]*\)"', 'fill="currentColor"', ISOLOGO)
    body = re.sub(r"<defs>.*?</defs>", "", body, flags=re.S)
    return body.replace('width="500" height="500"', 'width="100%" height="100%"')

def font_face(family, weight, key):
    return (f'@font-face{{font-family:"{family}";font-weight:{weight};font-style:normal;font-display:swap;'
            f'src:url(data:font/woff2;base64,{FONTS[key]}) format("woff2")}}')

FONT_CSS = "\n".join([font_face("Poppins", 400, "poppins-400"), font_face("Poppins", 500, "poppins-500"),
                      font_face("Poppins", 600, "poppins-600"), font_face("Poppins", 700, "poppins-700"),
                      font_face("Nexa", 700, "nexa-700"), font_face("Nexa", 200, "nexa-200"),
                      font_face("Geist Mono", "100 900", "geist-mono")])

def cop(n): return "$" + f"{n:,}".replace(",", ".")

LIGHT = """
  --background:#ffffff; --foreground:#171717;
  --axi-brand:#e65759; --axi-brand-2:#e02f2f; --axi-violet:#7c3aed; --axi-success:#16a34a; --axi-destructive:#dc2626; --axi-on-color:#ffffff;
  /* el campo: cielo coral. Texto blanco sobre el gradiente de marca (momento hero autorizado, DESIGN §3.2) */
  --field-fg:#ffffff;
  --field:linear-gradient(180deg, color-mix(in srgb, var(--axi-brand-2) 55%, var(--axi-brand)) 0%, var(--axi-brand) 46%, color-mix(in srgb, var(--axi-brand) 58%, var(--background)) 100%);
  --field-glow:radial-gradient(70% 55% at 18% 0%, color-mix(in srgb, var(--background) 22%, transparent), transparent 70%);
  --cta-fg:var(--axi-brand);
  color-scheme:light;
"""
DARK = """
  --background:#0a0a0a; --foreground:#ededed;
  --axi-brand:#fb7185; --axi-brand-2:#df4f4f; --axi-violet:#a78bfa; --axi-success:#4ade80; --axi-destructive:#f87171; --axi-on-color:#0a0a0a;
  /* el campo: noche de marca. El mismo layout sobre el suelo casi negro con aurora coral y violeta */
  --field-fg:#ededed;
  --field:linear-gradient(180deg, color-mix(in srgb, var(--axi-brand) 26%, var(--background)) 0%, var(--background) 55%, color-mix(in srgb, var(--axi-violet) 14%, var(--background)) 100%);
  --field-glow:radial-gradient(60% 50% at 20% 0%, color-mix(in srgb, var(--axi-brand) 30%, transparent), transparent 70%), radial-gradient(50% 45% at 85% 100%, color-mix(in srgb, var(--axi-violet) 22%, transparent), transparent 70%);
  --cta-fg:#0a0a0a;
  color-scheme:dark;
"""

CSS = r"""
:root{ __LIGHT__ }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ __DARK__ } }
:root[data-theme="dark"]{ __DARK__ }
:root{
  --fg:var(--field-fg);
  --glass:color-mix(in srgb, var(--fg) 16%, transparent);
  --glass-hover:color-mix(in srgb, var(--fg) 24%, transparent);
  --glass-on:color-mix(in srgb, var(--fg) 30%, transparent);
  --line:color-mix(in srgb, var(--fg) 26%, transparent);
  --soft:color-mix(in srgb, var(--fg) 78%, transparent);
  --font-body:"Poppins", Helvetica, Arial, sans-serif; --font-heading:"Nexa","Poppins",sans-serif; --font-mono:"Geist Mono",ui-monospace,monospace;
  --ease:cubic-bezier(.2,.8,.2,1);
}
*{box-sizing:border-box}
body{margin:0;background:var(--background);color:var(--foreground);font-family:var(--font-body);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
h1{font-family:var(--font-heading);font-weight:700;letter-spacing:-.02em;margin:0}
button,input,select{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0;padding:0}
[hidden]{display:none!important}
.ic{flex:none}
:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb, var(--fg) 55%, transparent)}

/* barra del mockup */
.mockbar{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:100;display:flex;gap:6px;align-items:center;padding:6px 8px;border-radius:999px;font-size:11.5px;
  background:color-mix(in srgb, var(--background) 82%, transparent);color:var(--foreground);border:1px solid color-mix(in srgb, var(--foreground) 12%, transparent);box-shadow:0 16px 48px rgb(0 0 0/.18);backdrop-filter:saturate(160%) blur(16px)}
.mockbar .grp{display:flex;gap:2px;padding:2px;border-radius:999px;background:color-mix(in srgb, var(--foreground) 6%, transparent)}
.mockbar .grp b{padding:0 6px;font-weight:600;opacity:.6;align-self:center;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase}
.mockbar button{padding:5px 10px;border-radius:999px;opacity:.7;font-weight:500}
.mockbar button[aria-pressed="true"]{background:color-mix(in srgb, var(--axi-brand) 16%, transparent);color:var(--axi-brand);opacity:1}

/* el campo */
.stage{min-height:100svh;background:var(--background)}
.stage[data-vp="mobile"]{display:grid;place-items:start center;padding:28px 0 80px;background:color-mix(in srgb, var(--foreground) 5%, var(--background))}
.field{position:relative;container-type:inline-size;isolation:isolate;overflow-x:hidden;overflow-y:auto;min-height:100svh;display:flex;flex-direction:column;color:var(--fg);
  background:var(--field-glow), var(--field)}
.stage[data-vp="mobile"] .field{width:390px;height:844px;min-height:0;border-radius:44px;box-shadow:0 0 0 10px #111,0 0 0 12px #2a2a2a,0 40px 80px rgb(0 0 0/.35)}
.grain{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.5;
  background-image:radial-gradient(color-mix(in srgb, var(--fg) 9%, transparent) 1px, transparent 1.2px);background-size:26px 26px;
  -webkit-mask-image:radial-gradient(80% 70% at 50% 20%, #000 20%, transparent 100%);mask-image:radial-gradient(80% 70% at 50% 20%, #000 20%, transparent 100%)}

header.top{display:flex;align-items:center;justify-content:space-between;padding:28px 40px 0}
@container (max-width: 640px){header.top{padding:22px 22px 0}}
.lockup{display:flex;align-items:center;gap:8px;color:var(--fg);text-decoration:none}
.lockup .mark{width:32px;height:32px;display:grid}
.lockup .word{font-family:var(--font-heading);font-weight:700;font-size:20px;letter-spacing:-.01em;white-space:nowrap}
.dots{display:flex;gap:7px;align-items:center}
.dots i{width:6px;height:6px;border-radius:50%;background:color-mix(in srgb, var(--fg) 38%, transparent);transition:background .3s,transform .3s var(--ease)}
.dots i.on{background:var(--fg);transform:scale(1.25)}
.dots i.done{background:color-mix(in srgb, var(--fg) 70%, transparent)}

main{flex:1;display:grid;place-items:center;padding:16px 24px 0}
.q{width:100%;max-width:760px;display:flex;flex-direction:column;align-items:center;text-align:center;transition:opacity .28s ease,transform .45s var(--ease)}
.q.out{opacity:0;transform:translateY(-18px)}
.q.in{opacity:0;transform:translateY(22px)}
.q h1{font-size:clamp(32px, 4.6cqw, 54px);line-height:1.05;text-wrap:balance;max-width:14ch}
.q .sub{margin:14px 0 0;font-size:15px;color:var(--soft);max-width:46ch;line-height:1.55}
.q .body{width:100%;margin-top:24px;display:flex;flex-direction:column;align-items:center;gap:10px}
@container (max-width: 640px){.q .body{margin-top:22px}.q .sub{font-size:14px}}

/* controles de cristal blanco (patrón de la referencia, radios iOS del sistema) */
.gi{width:min(100%,440px);height:56px;padding:0 18px;border-radius:14px;border:1px solid var(--line);background:var(--glass);color:var(--fg);text-align:left;
  transition:background .2s,border-color .2s;appearance:none;-webkit-appearance:none}
.gi::placeholder{color:color-mix(in srgb, var(--fg) 55%, transparent)}
.gi:focus{outline:none;background:var(--glass-hover);border-color:color-mix(in srgb, var(--fg) 60%, transparent);box-shadow:none}
.gi-wrap{position:relative;width:min(100%,440px)}
.gi-wrap .gi{width:100%}
.gi-wrap .trail{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--soft);display:grid}
.gi-wrap .lbl{position:absolute;left:18px;top:-9px;padding:0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--soft);
  background:transparent}
.fields{display:flex;flex-direction:column;gap:12px;width:min(100%,440px);align-items:stretch}
.fields .gi-wrap{width:100%}
.help{font-size:12.5px;color:var(--soft);margin:4px 0 0;text-align:left;width:min(100%,440px)}
.cta{width:min(100%,440px);height:56px;border-radius:14px;background:var(--fg);color:var(--cta-fg);font-weight:600;font-size:15.5px;display:inline-flex;align-items:center;justify-content:center;gap:8px;
  margin-top:6px;transition:transform .15s,opacity .25s,box-shadow .3s;box-shadow:0 18px 50px color-mix(in srgb, var(--background) 0%, rgb(0 0 0/.18))}
.cta:hover{transform:translateY(-1px)}
.cta:active{transform:scale(.98)}
.cta[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none}
.cta .spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.fine{margin:10px 0 0;font-size:12.5px;color:var(--soft)}
.back{margin-top:14px;font-size:13px;color:var(--soft);display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 12px;transition:background .2s,color .2s}
.back:hover{background:var(--glass);color:var(--fg)}

/* segmentado de cristal */
.seg{position:relative;display:inline-flex;gap:2px;padding:4px;border-radius:999px;background:var(--glass);border:1px solid var(--line);margin-bottom:6px}
.seg .pill{position:absolute;top:4px;bottom:4px;left:4px;width:0;border-radius:999px;background:var(--fg);transition:transform .32s var(--ease),width .32s var(--ease)}
.seg button{position:relative;z-index:1;height:36px;padding:0 18px;border-radius:999px;font-size:13.5px;font-weight:600;color:var(--soft);transition:color .25s}
.seg button[aria-checked="true"]{color:var(--cta-fg)}

/* fichas de oferta */
.tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:min(100%,700px)}
@container (max-width: 640px){.tiles{grid-template-columns:1fr}}
.tile{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 128px;column-gap:16px;align-items:center;min-height:100px;padding:14px 16px 14px 18px;border-radius:14px;text-align:left;
  background:var(--glass);border:1px solid var(--line);color:var(--fg);transition:background .2s,border-color .2s,transform .25s var(--ease),box-shadow .25s}
.tile:hover{background:var(--glass-hover);transform:translateY(-1px)}
.tile[aria-checked="true"]{background:var(--glass-on);border-color:var(--fg);box-shadow:0 12px 36px color-mix(in srgb, #000 14%, transparent)}
.tile .t{display:flex;flex-direction:column;gap:2px;min-width:0}
.tile .t b{font-size:15.5px;font-weight:600;display:flex;align-items:center;gap:8px}
.tile .t .pr{font-family:var(--font-heading);font-weight:700;font-size:17px;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.tile .t .pr small{font-family:var(--font-body);font-weight:400;font-size:12px;color:var(--soft);margin-left:6px}
.tile .t .pr s{font-weight:400;font-size:12px;color:var(--soft);margin-left:6px}
.tile .t .d{font-size:12.5px;color:var(--soft);line-height:1.4}
.tile .gfx{color:var(--fg);opacity:.85;width:128px;display:grid;align-self:center;padding-top:20px}
.tile .gfx svg{width:100%;height:auto;overflow:hidden}
.tile .t{padding-right:4px}
.tile .t .pr{white-space:nowrap}
.tile .t .d{line-height:1.35}
.tile .mark{position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--fg);color:var(--cta-fg);transform:scale(0);transition:transform .35s var(--ease)}
.tile[aria-checked="true"] .mark{transform:scale(1)}
.tile .mark.sq{border-radius:6px;transform:scale(1);background:transparent;border:1.5px solid var(--line);color:transparent;transition:background .2s,border-color .2s,color .2s}
.tile[aria-checked="true"] .mark.sq{background:var(--fg);border-color:var(--fg);color:var(--cta-fg)}
.chip{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;background:var(--fg);color:var(--cta-fg)}
.tile.hi{grid-column:1/-1;grid-template-columns:minmax(0,1fr) 190px}
.tile.hi .gfx{width:190px}
@container (max-width: 640px){.tile,.tile.hi{grid-template-columns:minmax(0,1fr) 112px}.tile .gfx,.tile.hi .gfx{width:112px}}
.note{margin:6px 0 0;font-size:13px;color:var(--soft);transition:opacity .3s}
.note b{color:var(--fg);font-weight:600}

/* medidor, términos, turnstile */
.meter{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;width:min(100%,440px)}
.meter i{height:4px;border-radius:999px;background:var(--glass);position:relative;overflow:hidden}
.meter i::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--fg);transform:scaleX(0);transform-origin:left;transition:transform .4s var(--ease)}
.meter[data-score="1"] i:nth-child(-n+1)::after,.meter[data-score="2"] i:nth-child(-n+2)::after,.meter[data-score="3"] i:nth-child(-n+3)::after,.meter[data-score="4"] i::after{transform:scaleX(1)}
.meter-label{width:min(100%,440px);display:flex;justify-content:space-between;font-size:12px;color:var(--soft);margin:-2px 0 0}
.terms{display:flex;gap:10px;align-items:flex-start;width:min(100%,440px);font-size:13px;line-height:1.5;text-align:left;color:var(--soft);cursor:pointer;margin-top:4px}
.terms a{color:var(--fg);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.terms .box{flex:none;width:18px;height:18px;margin-top:2px;border-radius:6px;border:1.5px solid var(--line);display:grid;place-items:center;color:transparent;background:var(--glass);transition:background .2s,border-color .2s,color .2s}
.terms input{position:absolute;opacity:0;width:0;height:0}
.terms input:checked+.box{background:var(--fg);border-color:var(--fg);color:var(--cta-fg)}
.summary{width:min(100%,440px);display:flex;justify-content:space-between;gap:12px;padding:12px 16px;border-radius:14px;background:var(--glass);border:1px solid var(--line);font-size:13px;text-align:left;margin-top:4px}
.summary b{font-family:var(--font-mono);font-weight:600;font-variant-numeric:tabular-nums}
.summary .l{display:flex;flex-direction:column;min-width:0}
.summary .l small{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--soft)}
.summary .r{text-align:right;display:flex;flex-direction:column}
.summary .r small{font-size:11.5px;color:var(--soft)}

/* la ruta */
.route{position:relative;height:240px;flex:none;overflow:hidden;margin-top:8px}
@container (max-width: 640px){.route{height:190px}}
.track{position:absolute;left:0;top:0;height:100%;transition:transform .8s var(--ease);will-change:transform}
.track > svg{position:absolute;left:0;top:0;overflow:visible}
.track path{fill:none;stroke:color-mix(in srgb, var(--fg) 80%, transparent);stroke-width:1.5}
.node{position:absolute;display:grid;place-items:center;border-radius:50%;width:60px;height:60px;color:var(--fg);
  background:var(--glass);border:1px solid color-mix(in srgb, var(--fg) 40%, transparent);
  transform:translate(-50%,-50%);transition:width .8s var(--ease),height .8s var(--ease),opacity .6s,background .4s,border-color .4s,box-shadow .5s;cursor:default}
.node svg{width:24px;height:24px;transition:width .6s var(--ease),height .6s var(--ease)}
.node.near{width:76px;height:76px}
.node.far{opacity:.55}
.node.done{cursor:pointer}
.node.done:hover{background:var(--glass-hover)}
.node.on{width:136px;height:136px;background:var(--glass-on);border:2px solid var(--fg);box-shadow:0 0 0 10px color-mix(in srgb, var(--fg) 8%, transparent),0 24px 60px color-mix(in srgb, #000 14%, transparent)}
.node.on svg{width:44px;height:44px}
@container (max-width: 640px){.node{width:44px;height:44px}.node svg{width:18px;height:18px}.node.near{width:56px;height:56px}.node.on{width:100px;height:100px}.node.on svg{width:34px;height:34px}}
.node .tip{position:absolute;top:calc(100% + 10px);white-space:nowrap;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--soft);opacity:0;transition:opacity .4s}
.node.on .tip{opacity:1}
.helpbtn{position:absolute;right:28px;bottom:26px;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--foreground);color:var(--background);font-weight:700;box-shadow:0 10px 30px rgb(0 0 0/.25)}

@media (prefers-reduced-motion: reduce){*,*::before,*::after{transition-duration:.001ms!important;animation-duration:.001ms!important}}
"""
CSS = CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)

PKGS = {
    "free_trial": dict(name="Free Trial", price=None, d="Producto completo · después eliges tu plan", g="trial"),
    "esencial": dict(name="Esencial", founder=154900, lst=259800, d="El escalón de entrada · 1.000 conversaciones", g="esencial"),
    "crecimiento": dict(name="Crecimiento", founder=220900, lst=369800, d="Todo Esencial y más · 1.000 conversaciones", g="crecimiento", badge="Más elegido"),
    "escala": dict(name="Escala", founder=340900, lst=569800, d="Para varios equipos · 1.000 conversaciones", g="escala"),
}
MODS = {
    "calls": dict(name="Llamadas con IA", price=289900, d="200 minutos al mes ≈ 60 llamadas"),
    "leads": dict(name="Captación de leads", price=169900, d="500 leads al mes ≈ 150 verificados"),
    "crm": dict(name="CRM con IA", price=129900, d="500 conversaciones ≈ 2.000 contactos"),
    "scheduling": dict(name="Agenda y reservas", price=89900, d="300 conversaciones · citas ilimitadas"),
}

def tile_pkg(code):
    p = PKGS[code]
    hi = " hi" if code == "crecimiento" else ""
    badge = f'<span class="chip">{p["badge"]}</span>' if p.get("badge") else ""
    pr = ('<span class="pr">7 días gratis</span>' if "founder" not in p
          else f'<span class="pr">{cop(p["founder"])}<small>COP/mes</small></span>')
    return f'''<button type="button" role="radio" aria-checked="false" data-pkg="{code}" class="tile{hi}">
  <span class="mark">{ic("Check", size=13, sw=2.6)}</span>
  <span class="t"><b>{p["name"]}{badge}</b>{pr}<span class="d">{p["d"]}</span></span>
  <span class="gfx">{graphic(p["g"])}</span></button>'''

def tile_mod(code):
    m = MODS[code]
    return f'''<button type="button" role="checkbox" aria-checked="false" data-mod="{code}" class="tile">
  <span class="mark sq">{ic("Check", size=13, sw=2.6)}</span>
  <span class="t"><b>{m["name"]}</b><span class="pr">{cop(m["price"])}<small>COP/mes</small></span><span class="d">Tras la prueba · {m["d"]}</span></span>
  <span class="gfx">{graphic(code)}</span></button>'''

STEPS = [("Oferta", "Blocks"), ("Empresa", "Building2"), ("Ubicación", "MapPin"), ("Tú", "UserRound"), ("Cuenta", "KeyRound")]

def gi(id_, label, value="", ph="", type_="text", trail=None):
    t = f'<span class="trail">{trail}</span>' if trail else ""
    return f'<div class="gi-wrap"><input class="gi" id="{id_}" type="{type_}" aria-label="{label}" placeholder="{ph}" value="{value}">{t}</div>'

HTML = f"""<title>Comenzar Flow</title>
<meta name="description" content="Mockup v3 de /comenzar: una pregunta por pantalla con ruta curva animada">
<style>
{FONT_CSS}
{CSS}
</style>

<div class="mockbar" role="toolbar" aria-label="Controles del mockup">
  <div class="grp"><b>Tema</b><button data-theme-set="system" aria-pressed="true">Sistema</button><button data-theme-set="light">Claro</button><button data-theme-set="dark">Oscuro</button></div>
  <div class="grp"><b>Vista</b><button data-vp="desktop" aria-pressed="true">Escritorio</button><button data-vp="mobile">Móvil</button></div>
  <div class="grp"><b>Paso</b>{"".join(f'<button data-step="{i}">{i+1}</button>' for i in range(5))}</div>
</div>

<div class="stage" id="stage" data-vp="desktop">
<div class="field" id="field">
  <div class="grain" aria-hidden="true"></div>
  <header class="top">
    <a class="lockup" href="#" aria-label="axi connect"><span class="mark">{mono_logo()}</span><span class="word">axi connect</span></a>
    <div class="dots" id="dots" aria-label="Progreso">{"".join('<i></i>' for _ in range(5))}</div>
  </header>

  <main>
    <div class="q" id="q0">
      <h1>¿Cómo quieres empezar?</h1>
      <p class="sub">Todo arranca con 7 días de prueba sin tarjeta. Cambia de opinión cuando quieras: la prueba es la misma.</p>
      <div class="body">
        <div class="seg" role="radiogroup" aria-label="Tipo de oferta" id="seg"><span class="pill" id="segPill"></span>
          <button type="button" role="radio" aria-checked="true" data-kind="package">Paquete</button>
          <button type="button" role="radio" aria-checked="false" data-kind="modules">Módulos</button></div>
        <div class="tiles" role="radiogroup" aria-label="Paquetes" id="pkgTiles">{tile_pkg("crecimiento")}{tile_pkg("esencial")}{tile_pkg("escala")}{tile_pkg("free_trial")}</div>
        <div class="tiles" role="group" aria-label="Módulos" id="modTiles" hidden>{tile_mod("calls")}{tile_mod("leads")}{tile_mod("crm")}{tile_mod("scheduling")}</div>
        <p class="note" id="note" hidden>Con dos o más módulos, <b>Crecimiento</b> sale mejor y trae el producto completo.</p>
        <button type="button" class="cta" id="cta0" disabled>Continuar</button>
        <p class="fine" id="fine0">Elige un paquete o al menos un módulo para continuar.</p>
      </div>
    </div>

    <div class="q" id="q1" hidden>
      <h1>¿Cómo se llama tu empresa?</h1>
      <p class="sub">Lo justo para crear tu cuenta. El resto lo configuras después, con guía.</p>
      <div class="body">
        <div class="fields">{gi("f-name", "Nombre de la empresa", "Savage Colombia", "Nombre de la empresa")}{gi("f-nit", "NIT", "901.234.567-8", "NIT con dígito de verificación")}</div>
        <p class="help">El NIT identifica tu empresa al iniciar sesión.</p>
        <button type="button" class="cta" data-go="2">Continuar</button>
        <button type="button" class="back" data-go="0">{ic("ArrowLeft", size=14)} Atrás</button>
      </div>
    </div>

    <div class="q" id="q2" hidden>
      <h1>¿Dónde opera tu negocio?</h1>
      <p class="sub">La ciudad ajusta ejemplos, zonas de entrega y agenda. La moneda y la zona horaria se ajustan solas.</p>
      <div class="body">
        <div class="fields">
          <div class="gi-wrap"><select class="gi" id="f-country" aria-label="País"><option>Colombia</option><option>México</option><option>Perú</option><option>Chile</option></select><span class="trail">{ic("ChevronDown", size=16)}</span></div>
          {gi("f-city", "Ciudad", "Bogotá", "Ciudad principal")}
        </div>
        <button type="button" class="cta" data-go="3">Continuar</button>
        <button type="button" class="back" data-go="1">{ic("ArrowLeft", size=14)} Atrás</button>
      </div>
    </div>

    <div class="q" id="q3" hidden>
      <h1>¿Y tú, cómo te llamas?</h1>
      <p class="sub">Serás la persona propietaria de la cuenta: podrás invitar a tu equipo y asignar permisos después.</p>
      <div class="body">
        <div class="fields">{gi("f-you", "Tu nombre", "Laura Restrepo", "Nombre y apellido")}{gi("f-mail", "Correo de trabajo", "laura@savagecolombia.com", "nombre@empresa.com", "email")}</div>
        <p class="help">Te enviaremos un enlace para verificar el correo. Puedes seguir configurando mientras tanto.</p>
        <button type="button" class="cta" data-go="4">Continuar</button>
        <button type="button" class="back" data-go="2">{ic("ArrowLeft", size=14)} Atrás</button>
      </div>
    </div>

    <div class="q" id="q4" hidden>
      <h1>Crea tu contraseña</h1>
      <p class="sub">Mínimo 10 caracteres, una mayúscula y un número.</p>
      <div class="body">
        <div class="gi-wrap"><input class="gi" id="f-pass" type="password" aria-label="Contraseña" value="Savage2026!bogota" autocomplete="new-password"><button type="button" class="trail" id="eye" aria-label="Mostrar contraseña">{ic("Eye", size=18)}</button></div>
        <div class="meter" id="meter" data-score="4"><i></i><i></i><i></i><i></i></div>
        <p class="meter-label"><span>Fortaleza</span><b id="meterLabel">Muy buena</b></p>
        <label class="terms"><input type="checkbox" checked><span class="box">{ic("Check", size=12, sw=2.6)}</span><span>Acepto los <a href="#">Términos del servicio</a> y la <a href="#">Política de privacidad</a>. Tus datos se tratan según la Ley 1581 de 2012.</span></label>
        <div class="summary" id="summary"></div>
        <button type="button" class="cta" id="submit"><span class="lbl">Crear mi cuenta y empezar</span>{ic("ArrowRight", "arrow", size=16)}</button>
        <p class="fine">Sin tarjeta. Entras directo a configurar tu empresa.</p>
        <button type="button" class="back" data-go="3">{ic("ArrowLeft", size=14)} Atrás</button>
      </div>
    </div>
  </main>

  <div class="route" id="route" aria-hidden="true">
    <div class="track" id="track"><svg id="routeSvg"><path id="routePath" d=""/></svg>
      {"".join(f'<div class="node" data-i="{i}">{ic(icon, size=24, sw=1.8)}<span class="tip">{label}</span></div>' for i, (label, icon) in enumerate(STEPS))}
    </div>
  </div>
  <button type="button" class="helpbtn" aria-label="Ayuda">?</button>
</div>
</div>

<script>
(() => {{
const PK = {json.dumps({k: {"name": v["name"], "founder": v.get("founder")} for k, v in PKGS.items()})};
const MD = {json.dumps({k: {"name": v["name"], "price": v["price"]} for k, v in MODS.items()})};
const cop = n => "$" + n.toLocaleString("es-CO", {{maximumFractionDigits:0}});
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const N = 5;
const st = {{ step:0, kind:"package", pkg:"crecimiento", mods:new Set() }};

/* mockbar */
const root=document.documentElement;
function setTheme(v){{ v==="system"?root.removeAttribute("data-theme"):root.setAttribute("data-theme",v); $$("[data-theme-set]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.themeSet===v))); }}
$$("[data-theme-set]").forEach(b=>b.onclick=()=>setTheme(b.dataset.themeSet));
$$("[data-vp]").forEach(b=>b.onclick=()=>{{ $("#stage").dataset.vp=b.dataset.vp; $$("[data-vp]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); requestAnimationFrame(()=>{{layoutRoute();placeSeg();}}); }});
$$("[data-step]").forEach(b=>b.onclick=()=>go(+b.dataset.step));

/* la ruta: curva suave con tangentes horizontales, un nodo por paso, el activo siempre centrado */
let SEG=560, geo=[];
function layoutRoute(){{
  const route=$("#route"), W=route.clientWidth, H=route.clientHeight;
  SEG = Math.max(240, Math.min(560, W*0.42));
  const amp = H*0.13, base = H*0.42;
  geo = []; for(let i=-1;i<=N;i++) geo.push([SEG*(i+1), base + (i%2===0?amp:-amp)]);
  let d=`M${{geo[0][0]}} ${{geo[0][1]}}`;
  for(let i=1;i<geo.length;i++){{ const [x0,y0]=geo[i-1],[x1,y1]=geo[i]; d+=` C ${{x0+SEG/2}} ${{y0}}, ${{x1-SEG/2}} ${{y1}}, ${{x1}} ${{y1}}`; }}
  const total=SEG*(N+1);
  const svg=$("#routeSvg"); svg.setAttribute("width",total); svg.setAttribute("height",H); svg.setAttribute("viewBox",`0 0 ${{total}} ${{H}}`);
  $("#routePath").setAttribute("d",d);
  $("#track").style.width=total+"px";
  $$(".node").forEach(n=>{{ const [x,y]=geo[+n.dataset.i+1]; n.style.left=x+"px"; n.style.top=y+"px"; }});
  slideRoute();
}}
function slideRoute(){{ const W=$("#route").clientWidth; const x=geo[st.step+1][0]; $("#track").style.transform=`translateX(${{W/2 - x}}px)`;
  $$(".node").forEach(n=>{{ const i=+n.dataset.i, d=Math.abs(i-st.step); n.classList.toggle("on",d===0); n.classList.toggle("near",d===1); n.classList.toggle("far",d>1); n.classList.toggle("done",i<st.step); }}); }}
$$(".node").forEach(n=>n.onclick=()=>{{ if(+n.dataset.i<st.step) go(+n.dataset.i); }});

/* pasos */
function selectionOk(){{ return st.kind==="package" ? !!st.pkg : st.mods.size>0; }}
let busy=false;
function go(n){{
  if(n===st.step||busy) return; if(n>0&&!selectionOk()) n=0;
  const from=$("#q"+st.step), to=$("#q"+n); st.step=n; renderDots(); slideRoute();
  if(reduced){{ from.hidden=true; to.hidden=false; return; }}
  busy=true; from.classList.add("out");
  setTimeout(()=>{{ from.hidden=true; from.classList.remove("out"); to.hidden=false; to.classList.add("in"); void to.offsetWidth; to.classList.remove("in"); busy=false;
    const f=to.querySelector("input"); if(f&&matchMedia("(hover:hover)").matches) f.focus({{preventScroll:true}}); }}, 240);
}}
function renderDots(){{ $$("#dots i").forEach((d,i)=>{{ d.classList.toggle("on",i===st.step); d.classList.toggle("done",i<st.step); }}); }}
$$("[data-go]").forEach(b=>b.onclick=()=>go(+b.dataset.go));
$("#cta0").onclick=()=>go(1);
document.addEventListener("keydown",e=>{{ if(e.key==="Enter"&&e.target.tagName==="INPUT"){{ const b=e.target.closest(".q").querySelector(".cta"); if(b&&!b.disabled) b.click(); }} }});

/* oferta */
function placeSeg(){{ const a=$('#seg [aria-checked="true"]'), p=$("#segPill"); p.style.width=a.offsetWidth+"px"; p.style.transform=`translateX(${{a.offsetLeft-4}}px)`; }}
$$("#seg button").forEach(b=>b.onclick=()=>{{ st.kind=b.dataset.kind; if(st.kind==="package") st.mods.clear(); else st.pkg=null; render(); }});
$$("[data-pkg]").forEach(b=>b.onclick=()=>{{ st.pkg=b.dataset.pkg; render(); }});
$$("[data-mod]").forEach(b=>b.onclick=()=>{{ const m=b.dataset.mod; st.mods.has(m)?st.mods.delete(m):st.mods.add(m); render(); }});
function summaryHtml(){{
  if(st.kind==="package"&&st.pkg){{ const p=PK[st.pkg]; if(st.pkg==="free_trial") return `<span class="l"><small>Paquete</small>Free Trial · 7 días</span><span class="r"><b>$0</b><small>hoy y durante la prueba</small></span>`;
    return `<span class="l"><small>Paquete</small>${{p.name}} · 1.000 conv./mes</span><span class="r"><b>${{cop(p.founder)}}</b><small>COP/mes tras la prueba · hoy $0</small></span>`; }}
  const ms=[...st.mods].map(k=>MD[k]); const t=ms.reduce((a,m)=>a+m.price,0);
  return `<span class="l"><small>Módulos</small>${{ms.map(m=>m.name).join(" + ")}}</span><span class="r"><b>${{cop(t)}}</b><small>COP/mes tras la prueba · hoy $0</small></span>`;
}}
function render(){{
  $$("#seg button").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.kind===st.kind))); placeSeg();
  $("#pkgTiles").hidden=st.kind!=="package"; $("#modTiles").hidden=st.kind!=="modules";
  $$("[data-pkg]").forEach(b=>b.setAttribute("aria-checked",String(st.kind==="package"&&st.pkg===b.dataset.pkg)));
  $$("[data-mod]").forEach(b=>b.setAttribute("aria-checked",String(st.mods.has(b.dataset.mod))));
  $("#note").hidden=!(st.kind==="modules"&&st.mods.size>=2);
  const ok=selectionOk(); $("#cta0").disabled=!ok; $("#fine0").textContent = ok ? "7 días gratis · sin tarjeta · tus datos quedan intactos" : (st.kind==="modules"?"Elige al menos un módulo para continuar.":"Elige un paquete o al menos un módulo para continuar.");
  if(ok) $("#summary").innerHTML=summaryHtml();
}}
$("#submit").onclick=()=>{{ const b=$("#submit"); b.disabled=true; b.querySelector(".lbl").textContent="Creando tu cuenta…"; b.querySelector(".arrow").outerHTML=`{ic("LoaderCircle", "arrow spin", size=16)}`;
  setTimeout(()=>{{ b.disabled=false; b.querySelector(".lbl").textContent="Crear mi cuenta y empezar"; b.querySelector(".arrow").outerHTML=`{ic("ArrowRight", "arrow", size=16)}`; }},2600); }};

/* contraseña */
const pass=$("#f-pass"); $("#eye").onclick=()=>{{ pass.type=pass.type==="password"?"text":"password"; $("#eye").innerHTML=pass.type==="password"?`{ic("Eye", size=18)}`:`{ic("EyeOff", size=18)}`; }};
const LBL={{0:"Mínimo 10 caracteres",1:"Débil: añade una mayúscula y un número",2:"Regular: añade un número o un símbolo",3:"Buena",4:"Muy buena"}};
pass.oninput=()=>{{ const p=pass.value; let s=0; if(p.length>=10)s++; if(/[A-Z]/.test(p))s++; if(/\\d/.test(p))s++; if(/[^A-Za-z0-9]/.test(p)||p.length>=14)s++; $("#meter").dataset.score=s; $("#meterLabel").textContent=LBL[s]; }};

/* arranque */
const q=new URLSearchParams(location.search);
if(q.get("theme")) setTheme(q.get("theme"));
if(q.get("vp")==="mobile") $$("[data-vp]").find(b=>b.dataset.vp==="mobile").click();
render(); renderDots(); layoutRoute();
if(q.get("kind")==="modules"){{ st.kind="modules"; st.pkg=null; st.mods=new Set(["calls","crm"]); render(); }}
if(q.get("step")) {{ const n=+q.get("step"); $("#q0").hidden=true; $("#q"+n).hidden=false; st.step=n; renderDots(); slideRoute(); }}
new ResizeObserver(()=>{{layoutRoute();placeSeg();}}).observe($("#route"));
document.fonts&&document.fonts.ready.then(placeSeg);
}})();
</script>
"""
out = S / "comenzar-flow.html"
out.write_text(HTML)
print(out, len(HTML) // 1024, "KB")
