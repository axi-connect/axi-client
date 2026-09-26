"""Kit de los lienzos premium P6–P8 (documentos). Mismo vocabulario que P1–P5:
superficies sólidas, bordes finos, coral solo como acción, estado en el punto,
isla de cristal para el contenido y tinta para la barra «Cambios sin guardar».
El papel es blanco también en oscuro."""

import json
import os

ISLAND = open(
    "/root/axi/axi-client/docs/design/mockups/cobros-premium/island-recipe.css"
).read()

FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@500;600;700;800'
    '&amp;family=Poppins:wght@400;500;600&amp;family=Geist+Mono:wght@400;500&amp;display=swap" rel="stylesheet">'
)

LIGHT = dict(
    bg="#F5F5F7", fg="#0B0B0E", fg2="#3A3A40", mut="#6B6B73", card="#FFFFFF",
    line="rgba(0,0,0,.06)", line2="rgba(0,0,0,.12)", soft="#F4F4F5", soft2="#ECECEF",
    desk="#EBEBEE", side="rgba(255,255,255,.6)", shadow="0 1px 0 rgba(0,0,0,.04),0 12px 32px -18px rgba(16,16,24,.18)",
    cardBorder="rgba(0,0,0,.05)", on="#0B0B0E", onFg="#FFFFFF", swOff="#D4D4D8",
    ok="#16A34A", warn="#D97706", bad="#DC2626", info="#2563EB",
)
DARK = dict(
    bg="#0A0A0A", fg="#EDEDED", fg2="#C4C4CC", mut="#A1A1AA", card="#141416",
    line="rgba(255,255,255,.08)", line2="rgba(255,255,255,.14)", soft="#1E1E22", soft2="#26262B",
    desk="#0F0F11", side="#0E0E10", shadow="none",
    cardBorder="rgba(255,255,255,.08)", on="#EDEDED", onFg="#0A0A0A", swOff="#3F3F46",
    ok="#4ADE80", warn="#FBBF24", bad="#F87171", info="#60A5FA",
)


def css(t):
    return f"""
:root{{--bg:{t['bg']};--fg:{t['fg']};--fg2:{t['fg2']};--mut:{t['mut']};--card:{t['card']};--line:{t['line']};--line2:{t['line2']};--soft:{t['soft']};--soft2:{t['soft2']};--desk:{t['desk']};--on:{t['on']};--onfg:{t['onFg']};--swoff:{t['swOff']};--ok:{t['ok']};--warn:{t['warn']};--bad:{t['bad']};--info:{t['info']}}}
body{{margin:0;font-family:Poppins,system-ui,sans-serif;color:var(--fg);background:var(--bg)}}
a{{color:var(--fg)}}
button{{font-family:Poppins,sans-serif;color:inherit}}
.d{{font-family:Urbanist,Poppins,sans-serif}}
.m{{font-family:"Geist Mono",ui-monospace,monospace}}
.nav{{display:flex;align-items:center;gap:12px;height:36px;padding:0 12px;border-radius:10px;font-size:13.5px;color:var(--fg2);text-decoration:none}}
.nav-on{{background:var(--card);color:var(--fg);font-weight:500;box-shadow:0 1px 2px rgba(0,0,0,.06),0 0 0 1px var(--line)}}
.grp{{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);padding:14px 12px 6px}}
.card{{background:var(--card);border-radius:24px;box-shadow:{t['shadow']};border:1px solid {t['cardBorder']}}}
.lbl{{font-size:12px;color:var(--mut);white-space:nowrap}}
.kick{{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}}
.btn{{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 20px;border-radius:999px;font:500 14px Poppins,sans-serif;border:0;cursor:pointer;text-decoration:none;white-space:nowrap}}
.btn-p{{background:#D13F42;color:#FFFFFF;box-shadow:0 10px 24px -10px rgba(209,63,66,.55)}}
.btn-p[disabled]{{opacity:.45;box-shadow:none;cursor:not-allowed}}
.btn-s{{background:var(--card);color:var(--fg);border:1px solid var(--line2)}}
.btn-g{{background:transparent;color:var(--fg)}}
.btn-sm{{height:32px;padding:0 14px;font-size:13px}}
.icb{{width:38px;height:38px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--card);border:1px solid var(--line2);color:var(--fg);cursor:pointer;flex-shrink:0;padding:0}}
.icb-sm{{width:30px;height:30px}}
.tab{{height:40px;padding:0 14px;border-radius:999px;font:500 13.5px Poppins,sans-serif;color:var(--fg2);display:inline-flex;align-items:center;gap:8px;text-decoration:none;white-space:nowrap;border:0;background:transparent;cursor:pointer}}
.tab-on{{background:var(--on);color:var(--onfg)}}
.seg{{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--card);border:1px solid var(--line);align-self:flex-start}}
.pill{{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:500;background:var(--soft);color:var(--fg);white-space:nowrap}}
.dot{{width:6px;height:6px;border-radius:9px;flex-shrink:0}}
.dot-ok{{background:var(--ok)}}.dot-warn{{background:var(--warn)}}.dot-bad{{background:var(--bad)}}.dot-info{{background:var(--info)}}.dot-mut{{background:var(--mut)}}
.srow{{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px;padding:14px 0;border-top:1px solid var(--line)}}
.stitle{{font-size:14px;font-weight:600}}
.shint{{font-size:12.5px;color:var(--mut);margin-top:2px;line-height:1.45}}
.sw{{position:relative;width:48px;height:28px;border-radius:999px;border:0;cursor:pointer;flex-shrink:0;padding:0;transition:background .18s}}
.sw .knob{{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:999px;background:#FFFFFF;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.2,.8,.2,1)}}
.sw-on{{background:var(--on)}}.sw-on .knob{{transform:translateX(20px);background:var(--onfg)}}
.sw-off{{background:var(--swoff)}}
.field{{display:flex;flex-direction:column;gap:6px;min-width:0}}
.field label{{font-size:12.5px;font-weight:500;color:var(--fg2)}}
.field .hint{{font-size:11.5px;color:var(--mut);line-height:1.4}}
.input{{height:44px;border-radius:12px;border:1px solid var(--line2);background:var(--card);padding:0 14px;font:14px Poppins,sans-serif;color:var(--fg);box-sizing:border-box;width:100%;display:flex;align-items:center;white-space:nowrap;overflow:hidden}}
.ph{{color:var(--mut)}}
.cap{{width:36px;height:36px;border-radius:12px;background:var(--soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--fg2)}}
.cap-sm{{width:18px;height:18px;border-radius:6px}}
.chip{{height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--line2);background:var(--card);font:500 12px Poppins,sans-serif;color:var(--fg2);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}}
.chip-on{{background:var(--on);color:var(--onfg);border-color:var(--on)}}
.tag{{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:999px;font-size:11.5px;color:var(--fg2);background:var(--soft);white-space:nowrap}}
.tok{{font-family:"Geist Mono",monospace;font-size:11.5px;padding:1px 5px;border-radius:6px;background:rgba(124,58,237,.10);color:#6D28D9}}
.tok-bad{{background:rgba(220,38,38,.10);color:#B91C1C;text-decoration:underline wavy rgba(220,38,38,.6)}}
.radio{{width:18px;height:18px;border-radius:999px;border:1.5px solid var(--line2);flex-shrink:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center}}
.radio-on{{border-color:var(--on)}}.radio-on::after{{content:"";width:8px;height:8px;border-radius:9px;background:var(--on)}}
.opt{{display:grid;grid-template-columns:18px minmax(0,1fr);gap:12px;align-items:start;padding:14px 16px;border-radius:16px;border:1px solid var(--line2);background:var(--card);cursor:pointer;text-align:left;width:100%;box-sizing:border-box}}
.opt-on{{border-color:var(--on);box-shadow:inset 0 0 0 1px var(--on)}}
.opt[aria-disabled="true"]{{opacity:.55;cursor:not-allowed}}
.fact{{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;padding:9px 0;border-top:1px solid var(--line)}}
.note{{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:10px;align-items:start;padding:12px 14px;border-radius:16px;font-size:13px;line-height:1.45}}
.note-warn{{border:1px solid rgba(217,119,6,.35);background:rgba(217,119,6,.06)}}
.note-bad{{border:1px solid rgba(220,38,38,.30);background:rgba(220,38,38,.05)}}
.note-info{{border:1px solid var(--line2);background:var(--soft)}}
.menu{{background:var(--card);border-radius:18px;border:1px solid var(--line);box-shadow:0 24px 60px -24px rgba(16,16,24,.35),0 2px 6px rgba(0,0,0,.06);padding:6px;display:flex;flex-direction:column}}
.mi{{display:grid;grid-template-columns:18px minmax(0,1fr);gap:12px;padding:10px 12px;border-radius:12px;align-items:start;text-align:left;border:0;background:transparent;cursor:pointer;width:100%}}
.mi:hover,.mi-hl{{background:var(--soft)}}
.mi b{{display:block;font-size:13.5px;font-weight:500}}.mi span{{display:block;font-size:12px;color:var(--mut)}}
.scrim{{position:absolute;inset:0;background:rgba(11,11,14,.42)}}
.dlg{{background:var(--card);border-radius:28px;box-shadow:0 40px 90px -30px rgba(0,0,0,.45);border:1px solid var(--line)}}
.toast{{display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 18px 0 8px;border-radius:999px;background:#0B0B0E;color:#FFFFFF;font-size:13.5px;font-weight:500;box-shadow:0 20px 40px -18px rgba(0,0,0,.5)}}
.pm{{position:relative;display:block;width:30px;height:38px;flex-shrink:0;overflow:hidden;border-radius:3px;border:1px solid #E4E4E7;background:#FFFFFF;box-shadow:0 1px 2px rgba(0,0,0,.08),0 4px 10px rgba(0,0,0,.08)}}
.pm i{{position:absolute;left:5px;right:5px;top:6px;height:2px;border-radius:1px}}
.pm u{{position:absolute;top:12px;left:5px;right:9px;height:18px;background-image:repeating-linear-gradient(#E4E4E7 0 1.5px,transparent 1.5px 4.5px)}}
.pm-busy u{{animation:fill 2.4s ease-in-out infinite}}
.pm-off{{transform:rotate(-3deg);opacity:.55}}
.pm-bad em{{position:absolute;right:-1px;bottom:-1px;width:14px;height:14px;border-top-left-radius:7px;background:#DC2626}}
@keyframes fill{{0%{{clip-path:inset(0 0 100% 0)}}60%,100%{{clip-path:inset(0 0 0 0)}}}}
@keyframes pulse{{50%{{opacity:.35}}}}
@keyframes slide{{0%{{transform:translateX(-100%)}}100%{{transform:translateX(250%)}}}}
.beat{{width:7px;height:7px;border-radius:9px;background:var(--info);animation:pulse 1.4s ease-in-out infinite;flex-shrink:0}}
.drow{{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:4px 14px;align-items:center;padding:14px 20px;position:relative}}
.drow+.drow::before{{content:"";position:absolute;top:0;left:44px;right:0;height:1px;background:var(--line)}}
.dname{{font-size:14.5px;font-weight:500;letter-spacing:-.005em}}
.dmeta{{margin-top:2px;display:flex;flex-wrap:wrap;align-items:center;gap:0 6px;font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums}}
.dmeta .m{{font-size:12px;color:var(--fg);opacity:.85}}
.dline{{grid-column:2/4;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mut);line-height:1.5}}
.sep{{opacity:.45}}
.sheet{{background:#FFFFFF;color:#18181B;box-shadow:0 1px 2px rgba(0,0,0,.08),0 18px 40px -18px rgba(0,0,0,.28);border-radius:4px;box-sizing:border-box;font-family:Urbanist,Poppins,sans-serif}}
.sheet p{{margin:0}}
@media (prefers-reduced-motion: reduce){{.sw,.sw .knob{{transition:none}}.beat,.pm-busy u{{animation:none}}}}
"""


DARK_EXTRA = ".tok{background:rgba(167,139,250,.16);color:#C4B5FD}.tok-bad{background:rgba(248,113,113,.14);color:#FCA5A5}.note-warn{background:rgba(251,191,36,.07)}"


def page(title, body, *, dark=False, w=1440, h=900, logic=None, extra_css=""):
    t = DARK if dark else LIGHT
    logic = logic or "class Component extends DCLogic {\n  renderVals() { return {}; }\n}"
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>
{css(t)}
{ISLAND}
{DARK_EXTRA if dark else ""}
{extra_css}
</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
{logic}
</script>
</body>
</html>
"""


ICON = {
    "home": '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"></path>',
    "inbox": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"></path>',
    "users": '<circle cx="9" cy="8" r="4"></circle><path d="M3 21a6 6 0 0 1 12 0"></path><path d="M16 4a4 4 0 0 1 0 8M21 21a6 6 0 0 0-4-5.6"></path>',
    "bag": '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><path d="M3 6h18M16 10a4 4 0 0 1-8 0"></path>',
    "card": '<rect x="2" y="5" width="20" height="14" rx="3"></rect><path d="M2 10h20M6 15h4"></path>',
    "layers": '<path d="M12 3 3 8l9 5 9-5-9-5Z"></path><path d="m3 13 9 5 9-5"></path>',
    "building": '<path d="M4 21V7l8-4 8 4v14"></path><path d="M9 21v-6h6v6"></path>',
    "user": '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    "bell": '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"></path>',
    "moon": '<path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10Z"></path>',
    "sun": '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>',
    "image": '<rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"></path>',
    "heading": '<path d="M6 4v16M18 4v16M6 12h12"></path>',
    "parties": '<circle cx="8" cy="8" r="3.5"></circle><circle cx="17" cy="9" r="2.5"></circle><path d="M2 20a6 6 0 0 1 12 0M14 20a4.5 4.5 0 0 1 8 0"></path>',
    "text": '<path d="M4 6h16M4 12h16M4 18h10"></path>',
    "list": '<path d="M9 6h11M9 12h11M9 18h11"></path><circle cx="4.5" cy="6" r="1"></circle><circle cx="4.5" cy="12" r="1"></circle><circle cx="4.5" cy="18" r="1"></circle>',
    "clauses": '<path d="M10 6h10M10 12h10M10 18h10"></path><path d="M4 5h1.5v3M4 11.5h2L4 14h2M4 17h2v3H4"></path>',
    "table": '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 10h18M3 15h18M9 10v10"></path>',
    "sigma": '<path d="M18 5H6l6 7-6 7h12"></path>',
    "calendar": '<rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M16 2v4M8 2v4M3 10h18"></path>',
    "pen": '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
    "footer": '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 16h18"></path>',
    "up": '<path d="m6 15 6-6 6 6"></path>', "down": '<path d="m6 9 6 6 6-6"></path>',
    "x": '<path d="M18 6 6 18M6 6l12 12"></path>',
    "plus": '<path d="M12 5v14M5 12h14"></path>',
    "lock": '<rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>',
    "db": '<ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"></path>',
    "branch": '<circle cx="6" cy="6" r="2.5"></circle><circle cx="6" cy="18" r="2.5"></circle><circle cx="18" cy="8" r="2.5"></circle><path d="M6 8.5v7M18 10.5c0 4-6 3-10.5 5.5"></path>',
    "repeat": '<path d="m17 2 4 4-4 4"></path><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"></path><path d="M21 13v2a3 3 0 0 1-3 3H3"></path>',
    "reset": '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path>',
    "zoomin": '<circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3M11 8v6M8 11h6"></path>',
    "zoomout": '<circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3M8 11h6"></path>',
    "expand": '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>',
    "alert": '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"></path><path d="M12 9v4M12 17h.01"></path>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="M12 8v4M12 16h.01"></path>',
    "power": '<path d="M12 2v10"></path><path d="M18.4 6.6a9 9 0 1 1-12.8 0"></path>',
    "chev": '<path d="m9 18 6-6-6-6"></path>',
    "dots": '<circle cx="5" cy="12" r="1.2"></circle><circle cx="12" cy="12" r="1.2"></circle><circle cx="19" cy="12" r="1.2"></circle>',
    "send": '<path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4Z"></path>',
    "copy": '<rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path>',
    "wa": '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.4A8.5 8.5 0 1 1 21 11.5Z"></path>',
    "mail": '<rect x="2" y="4" width="20" height="16" rx="3"></rect><path d="m22 7-10 6L2 7"></path>',
    "history": '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5M12 7v5l3 2"></path>',
    "archive": '<rect x="2" y="3" width="20" height="5" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"></path>',
    "check": '<path d="m5 12 5 5 9-10"></path>',
    "clock": '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    "ext": '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>',
    "menu": '<path d="M4 7h16M4 12h16M4 17h16"></path>',
    "zap": '<path d="M13 2 3 14h9l-1 8 10-12h-9Z"></path>',
    "receipt": '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 1V2l-1 1-3-2-3 2-3-2-3 2-3-2Z"></path><path d="M8 8h8M8 12h8M8 16h5"></path>',
    "sign": '<path d="M20 19H4M16 3l5 5-9 9H7v-5Z"></path>',
    "file": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path>',
    "hash": '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"></path>',
    "back": '<path d="m15 18-6-6 6-6"></path>',
}


def ic(name, size=18, sw=1.7, color="currentColor", style=""):
    return (
        f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
        f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
        f'{(" style=" + chr(34) + style + chr(34)) if style else ""}>{ICON[name]}</svg>'
    )


LOGO = (
    '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="11" cy="15" r="7.5" fill="none" '
    'stroke="#D13F42" stroke-width="4"></circle><path d="M16 5 L25 24" stroke="#F2A93B" stroke-width="4" '
    'stroke-linecap="round"></path><path d="M25 5 L17 20" stroke="#7B5CF0" stroke-width="4" stroke-linecap="round"></path></svg>'
)


def sidebar(active, dark=False):
    items = [
        ("home", "Inicio", None), ("inbox", "Inbox", None), ("users", "Contactos", None),
        (None, "Ventas", "grp"), ("bag", "Pedidos", None), ("card", "Cartera", None), ("layers", "Catálogo", None),
        (None, "Configuración", "grp"), ("building", "Mi empresa", None), ("card", "Pagos", None), ("user", "Equipo", None),
    ]
    out = []
    for icon, label, kind in items:
        if kind == "grp":
            out.append(f'<div class="grp">{label}</div>')
        elif label == active:
            out.append(f'<a class="nav nav-on" href="#" aria-current="page">{ic(icon, color="#D13F42")}{label}</a>')
        else:
            out.append(f'<a class="nav" href="#">{ic(icon)}{label}</a>')
    return f"""<aside style="width:248px;flex-shrink:0;padding:18px 14px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--line);background:{DARK['side'] if dark else LIGHT['side']}">
    <div style="display:flex;align-items:center;gap:10px;padding:4px 10px 16px">{LOGO}<div style="display:flex;flex-direction:column;gap:2px"><span class="d" style="font-weight:700;font-size:15px">Axi Connect</span><span style="font-size:11.5px;color:var(--mut)">JuanitoXpeditions</span></div></div>
    {''.join(out)}
    <div style="flex-grow:1"></div>
    <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:var(--card);border:1px solid var(--line)"><div style="width:32px;height:32px;border-radius:999px;background:var(--on);color:var(--onfg);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">JR</div><div style="display:flex;flex-direction:column"><span style="font-size:13px;font-weight:500">Juanita R.</span><span style="font-size:11.5px;color:var(--mut)">Dueña</span></div></div>
  </aside>"""


def topbar(crumbs, dark=False):
    parts = []
    for i, c in enumerate(crumbs):
        if i:
            parts.append('<span aria-hidden="true">/</span>')
        last = i == len(crumbs) - 1
        parts.append(f'<span style="{"color:var(--fg);font-weight:500" if last else ""}">{c}</span>')
    return f"""<header style="height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;flex-shrink:0">
      <nav aria-label="Ruta" style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--mut)">{''.join(parts)}</nav>
      <div style="display:flex;gap:10px"><button class="icb" aria-label="Notificaciones">{ic('bell', 16, 1.8)}</button><button class="icb" aria-label="Tema">{ic('sun' if dark else 'moon', 16, 1.8)}</button></div>
    </header>"""


def pm(code, tone="ok", extra=""):
    color = {"contract": "#e65759", "quote": "#f0a431", "proposal": "#0891b2", "receipt": "#16a34a",
             "statement": "#2563eb", "cuenta_cobro": "#7c3aed"}.get(code, "#e65759")
    if tone == "bad":
        color = "#dc2626"
    cls = {"busy": " pm-busy", "off": " pm-off", "bad": " pm-bad"}.get(tone, "")
    return f'<span class="pm{cls}" aria-hidden="true" style="{extra}"><i style="background:{color}"></i><u></u>{"<em></em>" if tone == "bad" else ""}</span>'


def write(folder, name, html):
    import re
    # Las variables de plantilla se muestran, no se enlazan: {{snake_case}} va escapado.
    html = re.sub(r"\{\{([a-z]+_[a-z_]+)\}\}", r"&#123;&#123;\1&#125;&#125;", html)
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, name), "w") as f:
        f.write(html)


def canvas(folder, title, boards, rows):
    """boards: [(file, w, h, title, interactive)] en filas; rows: [(texto, [files])]."""
    spec = {f: (w, h, t, i) for f, w, h, t, i in boards}
    out = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-09-26T20:00:00Z"}, "title": title,
           "launch": {"view": "canvas"}, "pages": [], "boards": {}, "order": [], "notes": {}, "designSystems": []}
    y = 0
    for r, (text, files) in enumerate(rows):
        x = 0
        tallest = 0
        out["notes"][f"row{r}"] = {"x": 0, "y": y - 300, "text": text, "kind": "title1", "maxW": 4400}
        for f in files:
            w, h, t, i = spec[f]
            b = {"x": x, "y": y, "w": w, "h": h, "title": t}
            if i:
                b["is_interactive"] = True
            out["boards"][f] = b
            out["order"].append(f)
            x += w + 80
            tallest = max(tallest, h)
        y += tallest + 460
    with open(os.path.join(folder, "canvas.json"), "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
