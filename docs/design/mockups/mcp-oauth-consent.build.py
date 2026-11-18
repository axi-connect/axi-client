#!/usr/bin/env python3
"""Mockup F5 «Axel OS» — conectar Claude (u otra app MCP) a Axi, más la tarjeta de F3.

Para aprobación del dueño ANTES de tocar `src/` (regla: mockup HTML aprobado primero).
Vistas: pantalla de consentimiento OAuth (escritorio, app local, estados, 390 px),
«Aplicaciones conectadas» en Mi cuenta (lista, desconectar, vacío) y la tarjeta
`ActionConfirmCard` de F3 (rama axi-client feat/axel-os-f3) en todos sus estados,
1440 y 390, claro y oscuro (botón «Tema» de la barra).

    python3 docs/design/mockups/mcp-oauth-consent.build.py
"""
from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

k = Kit("mcp-oauth-consent")
ic = k.ic

k.extra_css = r"""
/* ---------- piezas de sistema que el kit no trae ---------- */
.glass-overlay{background:color-mix(in srgb, var(--background) 80%, transparent);-webkit-backdrop-filter:saturate(160%) blur(20px);backdrop-filter:saturate(160%) blur(20px);border:1px solid color-mix(in srgb, var(--border) 60%, transparent);box-shadow:var(--shadow-overlay)}
.btn.contrast{background:var(--foreground);color:var(--background)}
.btn.glass{background:color-mix(in srgb, var(--background) 60%, transparent);color:var(--foreground);border-color:color-mix(in srgb, var(--border) 80%, transparent);border-radius:999px;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.btn.pill{border-radius:999px;height:40px;padding:0 18px}
.btn.pill.sm{height:36px;padding:0 16px}
.ink-tile{width:40px;height:40px;border-radius:13px;flex:none;display:grid;place-items:center;background:var(--foreground);color:var(--background)}
.ink-tile.muted{background:color-mix(in srgb, var(--foreground) 8%, transparent);color:var(--muted-foreground)}
.kicker{display:flex;flex-wrap:wrap;align-items:center;gap:0 8px;font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground)}
.kicker .st{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.kicker .st i{width:6px;height:6px;border-radius:50%;background:var(--foreground);display:inline-block}
.kicker .st i.ok{background:var(--axi-success)} .kicker .st i.err{background:var(--axi-destructive)} .kicker .st i.warn{background:var(--axi-warning)} .kicker .st i.off{background:var(--muted-foreground)}
.backdrop{min-height:calc(100vh - 44px);background:
  radial-gradient(900px 500px at 15% -10%, color-mix(in srgb, var(--axi-brand) 10%, transparent), transparent 60%),
  radial-gradient(700px 500px at 110% 110%, color-mix(in srgb, var(--axi-violet) 8%, transparent), transparent 60%),
  var(--background);}

/* ---------- consentimiento ---------- */
.consent-wrap{display:flex;justify-content:center;padding:56px 16px 72px}
.consent{width:100%;max-width:480px;border-radius:28px;padding:28px;display:flex;flex-direction:column;gap:20px}
.pair{display:flex;align-items:center;justify-content:center;gap:14px}
.pair .logo{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;font-family:var(--font-heading);font-weight:700;font-size:22px;border:1px solid var(--border);background:var(--background)}
.pair .logo.axi{background:var(--axi-brand);color:#fff;border:0}
.pair .logo.claude{background:#d97757;color:#fff;border:0}
.pair .logo.local{color:var(--muted-foreground)}
.pair .link{display:flex;gap:4px;color:var(--muted-foreground)}
.pair .link span{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.5}
.consent h1{font-size:22px;text-align:center;line-height:1.25}
.consent .sub{text-align:center;color:var(--muted-foreground);font-size:13.5px}
.who{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:var(--secondary)}
.who .av{width:36px;height:36px;border-radius:50%;background:color-mix(in srgb, var(--axi-brand) 18%, var(--background));color:var(--axi-brand);display:grid;place-items:center;font-weight:600;font-size:13px;flex:none}
.who b{font-weight:600;display:block;font-size:13.5px}
.who small{color:var(--muted-foreground);font-size:12.5px}
.who a{margin-left:auto;font-size:12.5px;font-weight:500;color:var(--foreground);text-underline-offset:3px;text-decoration-color:var(--border)}
.verified{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted-foreground);justify-content:center}
.verified .ic{color:var(--axi-success)}
.verified.unv .ic{color:var(--axi-warning)}
.sec-t{font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground);margin-bottom:-8px}
.areas{display:flex;flex-direction:column;border-radius:18px;background:color-mix(in srgb, var(--background) 85%, transparent);border:1px solid var(--border)}
.area{display:grid;grid-template-columns:32px minmax(0,1fr);gap:4px 12px;padding:12px 14px;border-bottom:1px solid var(--border-soft)}
.area:last-child{border-bottom:0}
.area .aic{width:32px;height:32px;border-radius:10px;background:var(--secondary);display:grid;place-items:center}
.area .at{font-weight:600;font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.area .ad{font-size:12.5px;color:var(--muted-foreground);line-height:1.45}
.area .lvl{grid-column:2;margin-top:6px}
.area.off .at,.area.off .aic{opacity:.55}
.lvlseg{display:inline-flex;gap:2px;padding:2px;border-radius:999px;background:var(--secondary);border:1px solid var(--border-soft)}
.lvlseg button{height:26px;padding:0 11px;border-radius:999px;font-size:12px;font-weight:500;color:var(--muted-foreground);white-space:nowrap}
.lvlseg button[aria-checked="true"]{background:var(--background);color:var(--foreground);box-shadow:0 1px 2px rgb(0 0 0/.08)}
.lvlseg button[disabled]{opacity:.4;cursor:not-allowed}
.promise{display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:var(--muted-foreground)}
.promise div{display:flex;gap:8px;align-items:flex-start}
.promise .ic{color:var(--foreground);margin-top:1px}
.dest{font-size:12.5px;color:var(--muted-foreground);text-align:center}
.dest b{color:var(--foreground);font-weight:600}
.actions{display:flex;gap:8px;flex-direction:column}
.actions .btn{width:100%}
.legal{font-size:11.5px;color:var(--muted-foreground);text-align:center;line-height:1.5}
.legal a{color:var(--foreground)}
.state-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px;max-width:1080px;margin:0 auto;padding:40px 16px 72px;align-items:start}
.state-card{border-radius:28px;padding:28px;display:flex;flex-direction:column;gap:16px;align-items:center;text-align:center}
.state-card .eic{width:52px;height:52px;border-radius:16px;background:var(--secondary);display:grid;place-items:center}
.state-card h2{font-size:19px;font-family:var(--font-heading)}
.state-card p{color:var(--muted-foreground);font-size:13.5px;max-width:40ch}
.state-cap{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;align-self:flex-start}

/* ---------- marcos 390 ---------- */
.phones{display:flex;flex-wrap:wrap;gap:32px;justify-content:center;padding:40px 16px 72px}
.phone{width:390px;max-width:100%;border-radius:44px;border:10px solid color-mix(in srgb, var(--foreground) 88%, transparent);overflow:hidden;box-shadow:var(--shadow-overlay);background:var(--background)}
.phone .status{height:34px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;font-size:12px;font-weight:600}
.phone .scroll{max-height:760px;overflow:auto}
.phone .consent{border-radius:0;border:0;box-shadow:none;padding:20px 18px 28px;max-width:none}
.phone .consent-wrap{padding:0}
.phone-cap{text-align:center;font-size:12px;color:var(--muted-foreground);margin-top:10px}

/* ---------- Mi cuenta ---------- */
.apps{display:flex;flex-direction:column}
.app{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:4px 14px;align-items:start;padding:16px 0;border-bottom:1px solid var(--border-soft)}
.app:last-child{border-bottom:0}
.app .alogo{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;font-family:var(--font-heading);font-weight:700;font-size:17px}
.app .alogo.claude{background:#d97757;color:#fff}
.app .alogo.local{background:var(--secondary);color:var(--muted-foreground)}
.app .an{font-weight:600;font-size:14.5px;display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
.app .am{font-size:12.5px;color:var(--muted-foreground);margin-top:2px}
.app .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
@container (max-width: 560px){ .app{grid-template-columns:44px minmax(0,1fr)} .app .ctl{grid-column:2} }

/* ---------- Axel (columna del chat) y tarjeta F3 ---------- */
.axel{max-width:760px;margin:0 auto;padding:28px 16px 72px;display:flex;flex-direction:column;gap:18px}
.bubble-user{align-self:flex-end;max-width:70%;padding:10px 14px;border-radius:18px 18px 6px 18px;background:var(--secondary);font-size:14px}
.bubble-axel{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.6}
.bubble-axel .orb{width:28px;height:28px;border-radius:50%;flex:none;background:radial-gradient(circle at 35% 30%, #fff 0, var(--axi-brand) 45%, var(--axi-violet) 100%)}
.from-mcp{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted-foreground)}
.acard{border-radius:24px;padding:20px;display:flex;flex-direction:column;gap:16px}
.acard.fresh{box-shadow:var(--shadow-overlay),0 0 0 2px color-mix(in srgb, var(--foreground) 14%, transparent)}
.ahead{display:flex;gap:14px;align-items:flex-start}
.ahead h3{font-size:18px;line-height:1.3;margin-top:3px}
.diff{display:flex;flex-direction:column;border-radius:16px;background:color-mix(in srgb, var(--background) 85%, transparent);border:1px solid var(--border)}
.diff div{padding:10px 14px;border-bottom:1px solid var(--border-soft)} .diff div:last-child{border-bottom:0}
.diff dt{font-size:11.5px;color:var(--muted-foreground)}
.diff dd{margin:2px 0 0;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;font-size:14px;font-variant-numeric:tabular-nums}
.diff s{color:var(--muted-foreground);text-decoration-color:color-mix(in srgb, var(--muted-foreground) 60%, transparent)}
.diff b{font-weight:600}
.diff .ic{color:var(--muted-foreground);align-self:center}
.effects .t{font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground)}
.effects ul{margin:6px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}
.effects li{display:flex;gap:8px;font-size:13px;color:var(--muted-foreground);line-height:1.55}
.effects li::before{content:"";width:4px;height:4px;border-radius:50%;background:color-mix(in srgb, var(--muted-foreground) 60%, transparent);margin-top:.6em;flex:none}
.risk{display:grid;grid-template-columns:18px minmax(0,1fr);gap:10px;padding:12px 14px;border-radius:16px;border:1px solid color-mix(in srgb, var(--axi-warning) 35%, var(--border));background:color-mix(in srgb, var(--axi-warning) 8%, var(--background));font-size:12.5px;line-height:1.55}
.risk .ic{color:var(--axi-warning);margin-top:1px}
.outcome{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.55}
.outcome .ic.ok{color:var(--axi-success)} .outcome .ic.err{color:var(--axi-destructive)} .outcome .ic.warn{color:var(--axi-warning)} .outcome .ic.off{color:var(--muted-foreground)}
.abtns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.group{display:flex;flex-direction:column;border-radius:16px;background:color-mix(in srgb, var(--background) 85%, transparent);border:1px solid var(--border)}
.group li{list-style:none;padding:14px 16px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:10px}
.group li:last-child{border-bottom:0}
.group .s{font-size:14.5px;font-weight:600;line-height:1.35}
.group .diff{border:0;background:none;gap:6px}
.group .diff div{padding:0;border:0}
.sweep{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}
.sweep span{font-size:12px;color:var(--muted-foreground)}
.cap{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;margin-bottom:-8px}
.phone .axel{padding:16px 14px 28px;gap:14px}
.phone .acard{padding:16px;border-radius:22px}
.phone .ahead h3{font-size:16.5px}
.spin{animation:spin 1s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}
"""


# ============================================================ consentimiento
AREAS = [
    ("package", "Catálogo e inventario", "Productos, precios, variantes y stock.", "escribir", "escribir"),
    ("receipt", "Pedidos y pagos reportados", "Pedidos, estados y pagos que reportan tus clientes.", "leer", "leer"),
    ("users", "Contactos", "Clientes y prospectos, su ficha y su consentimiento.", "leer", "leer"),
    ("kanban", "Oportunidades y tareas", "Pipeline, etapas, actividades y tareas del equipo.", "escribir", "leer"),
]


def lvlseg(requested: str, chosen: str) -> str:
    opts = [("no", "Sin acceso"), ("leer", "Ver"), ("escribir", "Ver y cambiar")]
    out = []
    for key, label in opts:
        disabled = key == "escribir" and requested == "leer"
        out.append(
            f'<button role="radio" aria-checked="{str(key == chosen).lower()}"'
            f'{" disabled" if disabled else ""}>{label}</button>'
        )
    return f'<div class="lvlseg" role="radiogroup" aria-label="Nivel de acceso">{"".join(out)}</div>'


def area_rows(areas) -> str:
    rows = []
    for icon, title, desc, requested, chosen in areas:
        tag = '<span class="badge outline">Pidió ver y cambiar</span>' if requested == "escribir" else ""
        rows.append(
            f'<div class="area {"off" if chosen == "no" else ""}">'
            f'<span class="aic">{ic(icon, size=16)}</span>'
            f'<div><div class="at">{title}{tag}</div><p class="ad">{desc}</p></div>'
            f'<div class="lvl">{lvlseg(requested, chosen)}</div></div>'
        )
    return f'<div class="areas">{"".join(rows)}</div>'


def consent_card(*, local: bool = False) -> str:
    if local:
        logo = f'<span class="logo local">{ic("monitor", size=24)}</span>'
        title = "«Mi asistente local» quiere conectarse a tu cuenta de Axi"
        verified = (
            f'<span class="verified unv">{ic("triangle-alert", size=14)}Nombre declarado por la propia app: '
            "Axi no puede verificarlo</span>"
        )
        warn = k.notice(
            "warn",
            "<b>Esta app corre en un computador</b> y vuelve a <span class='mono'>127.0.0.1:33418</span>. "
            "Continúa solo si tú la acabas de abrir. Si llegaste aquí por un enlace que te mandaron, cancela.",
        )
        dest = "Al aprobar vuelves a <b>127.0.0.1</b> (este computador)"
        areas = [AREAS[0][:3] + ("leer", "leer"), AREAS[1]]
    else:
        logo = '<span class="logo claude">C</span>'
        title = "Claude quiere conectarse a tu cuenta de Axi"
        verified = f'<span class="verified">{ic("badge-check", size=14)}Verificado por su dominio: <b>claude.ai</b></span>'
        warn = ""
        dest = "Al aprobar vuelves a <b>claude.ai</b>"
        areas = AREAS
    return f"""
<div class="consent glass-overlay">
  <div class="pair">{logo}<span class="link"><span></span><span></span><span></span></span><span class="logo axi">a</span></div>
  <div style="display:flex;flex-direction:column;gap:6px">
    <h1>{title}</h1>
    {verified}
  </div>
  <div class="who"><span class="av">CP</span><div><b>Camila Pérez</b><small>Joao's Burguer · Dueña</small></div><a href="#">No soy yo</a></div>
  {warn}
  <p class="sec-t">Podrá usar estas áreas</p>
  {area_rows(areas)}
  <div class="promise">
    <div>{ic("shield-check", size=15)}<span>Solo hace lo que tu rol permite. Nunca más.</span></div>
    <div>{ic("hand", size=15)}<span>Antes de cambiar algo, te pide confirmarlo.</span></div>
    <div>{ic("unplug", size=15)}<span>La desconectas cuando quieras en <b>Mi cuenta</b>.</span></div>
  </div>
  <p class="dest">{dest}</p>
  <div class="actions">
    {k.btn("Permitir acceso", "check", "contrast pill")}
    {k.btn("Cancelar", "", "glass pill")}
  </div>
  <p class="legal">Al permitirlo, {"esta app" if local else "Claude"} podrá ver los datos de Joao's Burguer de las áreas elegidas, con tu usuario. Lee los <a href="#">términos</a>.</p>
</div>"""


def page_consent() -> str:
    return f'<div class="backdrop"><div class="consent-wrap">{consent_card()}</div></div>'


def page_consent_local() -> str:
    return f'<div class="backdrop"><div class="consent-wrap">{consent_card(local=True)}</div></div>'


def page_consent_states() -> str:
    def card(cap: str, icon: str, tone: str, title: str, body: str, acts: str) -> str:
        return (
            f'<div><p class="state-cap">{cap}</p><div class="state-card glass-overlay" style="margin-top:10px">'
            f'<span class="eic" style="color:var({tone})">{ic(icon, size=22)}</span><h2>{title}</h2><p>{body}</p>'
            f'<div class="actions" style="width:100%">{acts}</div></div></div>'
        )

    login = (
        '<div><p class="state-cap">Sin sesión iniciada</p><div class="state-card glass-overlay" style="margin-top:10px">'
        '<div class="pair"><span class="logo claude">C</span><span class="link"><span></span><span></span><span></span></span><span class="logo axi">a</span></div>'
        "<h2>Inicia sesión para conectar Claude</h2><p>Usa tu usuario de siempre del panel de Axi. Después verás qué pide Claude antes de aprobar nada.</p>"
        f'<div class="actions" style="width:100%">{k.btn("Iniciar sesión", "log-in", "contrast pill")}</div>'
        '<p class="legal">Vuelves aquí sola al entrar.</p></div></div>'
    )
    return f"""<div class="backdrop"><div class="state-grid">
{login}
{card("Solicitud vencida o ya respondida", "clock", "--muted-foreground", "Esta solicitud ya no está activa",
      "Pasaron más de 15 minutos o ya la respondiste. Vuelve a Claude y conecta de nuevo.", k.btn("Volver a Claude", "arrow-left", "glass pill"))}
{card("Cuenta de plataforma (admin de Axi)", "shield-alert", "--axi-warning", "Entra con un usuario de la empresa",
      "Las apps se conectan a la cuenta de un negocio. Con un usuario de plataforma no se puede.", k.btn("Cambiar de cuenta", "repeat", "glass pill"))}
{card("Solicitud inválida", "circle-alert", "--axi-destructive", "No podemos conectar esta app",
      "La dirección de regreso no coincide con la que la app registró. Por seguridad no seguimos.<br><span class='mono'>redirect_uri no registrada</span>", k.btn("Cerrar", "", "glass pill"))}
</div></div>"""


def phone(inner: str, cap: str) -> str:
    return (
        f'<div><div class="phone"><div class="status"><span>9:41</span><span>{ic("wifi", size=14)} {ic("battery-full", size=16)}</span></div>'
        f'<div class="scroll shell">{inner}</div></div><p class="phone-cap">{cap}</p></div>'
    )


def page_consent_mobile() -> str:
    return (
        '<div class="backdrop"><div class="phones">'
        + phone(f'<div class="consent-wrap">{consent_card()}</div>', "390 · Claude (dominio verificado)")
        + phone(f'<div class="consent-wrap">{consent_card(local=True)}</div>', "390 · app local (no verificada)")
        + "</div></div>"
    )


# ============================================================ Mi cuenta
def app_row(logo: str, cls: str, name: str, tags: str, meta: str, chips: list[str]) -> str:
    chip_html = "".join(k.badge(c, "outline") for c in chips)
    return (
        f'<div class="app"><span class="alogo {cls}">{logo}</span>'
        f'<div><div class="an">{name}{tags}</div><p class="am">{meta}</p><div class="chips">{chip_html}</div></div>'
        f'<div class="ctl">{k.btn("Desconectar", "unplug", "outline sm")}</div></div>'
    )


def apps_card(empty: bool = False) -> str:
    if empty:
        body = (
            f'<div class="empty"><span class="eic">{ic("plug", size=22)}</span><h3>Ninguna app conectada</h3>'
            "<p>Cuando conectes Claude u otra app a Axi, aparecerá aquí con lo que puede ver y cambiar.</p>"
            f'<div class="acts">{k.btn("Cómo conectar Claude", "external-link", "outline sm")}</div></div>'
        )
    else:
        body = '<div class="apps">' + app_row(
            "C", "claude", "Claude", k.badge("Verificada · claude.ai", "ok"),
            "Conectada el 18 nov. · Último uso hace 5 min",
            ["Catálogo · ver y cambiar", "Pedidos · ver", "Contactos · ver", "Oportunidades · ver"],
        ) + app_row(
            ic("monitor", size=20), "local", "Mi asistente local", k.badge("Local · no verificada", "warn"),
            "Conectada el 12 nov. · Sin uso hace 6 días",
            ["Catálogo · ver", "Pedidos · ver"],
        ) + "</div>"
    return f"""<section class="card">
  <div class="card-head"><div><h2>{ic("plug", size=18)}Aplicaciones conectadas</h2>
  <p class="lead">Apps que usan Axi con tu usuario, como Claude. Solo pueden lo que tu rol permite y piden confirmación antes de cambiar algo.</p></div></div>
  {body}
  <div class="card-foot"><span>Desconectar corta el acceso al instante. Cambiar tu contraseña también las desconecta.</span></div>
</section>"""


def password_card() -> str:
    return f"""<section class="card"><div class="card-head"><div><h2>{ic("key-round", size=18)}Cambiar contraseña</h2>
<p class="lead">Al cambiarla se cierran tus otras sesiones.</p></div></div>
<div class="form">{k.field("Contraseña actual", k.input("", "••••••••"))}{k.field("Nueva contraseña", k.input("", "Mínimo 10 caracteres"))}
<div class="form-actions">{k.btn("Guardar", "", "")}</div></div></section>"""


def page_account(empty: bool = False, modal: bool = False) -> str:
    overlay = ""
    if modal:
        overlay = f"""<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
<h2>¿Desconectar Claude?</h2>
<p>Claude dejará de ver y cambiar los datos de Joao's Burguer en cuanto confirmes. Las acciones que dejó pendientes se descartan.</p>
<div class="modal-foot">{k.btn("Cancelar", "", "outline")}{k.btn("Desconectar", "unplug", "destructive")}</div></div></div>"""
    return f"""<div class="shell" style="min-height:calc(100vh - 44px)"><div class="page">
{k.crumb("Mi cuenta")}
<div class="header"><div><h1>Mi cuenta</h1><p class="lead">Tu acceso al panel.</p></div></div>
{password_card()}
{apps_card(empty)}
</div>{overlay}</div>"""


# ============================================================ F3: ActionConfirmCard
def kicker(label: str, dot: str, state: str) -> str:
    return f'<span class="kicker"><span>{label}</span><span class="st"><i class="{dot}"></i>{state}</span></span>'


def diff(lines: list[tuple[str, str | None, str]]) -> str:
    rows = []
    for label, before, after in lines:
        b = (
            f'<s>{before}</s>{ic("arrow-right", size=14)}' if before is not None else ""
        )
        rows.append(f"<div><dt>{label}</dt><dd>{b}<b>{after}</b></dd></div>")
    return f'<dl class="diff">{"".join(rows)}</dl>'


def effects(items: list[str]) -> str:
    lis = "".join(f"<li>{i}</li>" for i in items)
    return f'<div class="effects"><span class="t">Qué va a pasar</span><ul>{lis}</ul></div>'


def outcome(icon: str, tone: str, text: str) -> str:
    return f'<p class="outcome">{ic(icon, cls=tone, size=16)}<span>{text}</span></p>'


def single(*, icon: str, label: str, dot: str, state: str, summary: str, body: str, buttons: str,
           muted: bool = False, fresh: bool = False, origin: str = "") -> str:
    org = f'<span class="from-mcp">{ic("plug", size=13)}{origin}</span>' if origin else ""
    return f"""<article class="acard glass-overlay {"fresh" if fresh else ""}">
<div class="ahead"><span class="ink-tile {"muted" if muted else ""}">{ic(icon, size=18)}</span>
<div style="display:flex;flex-direction:column;gap:4px;min-width:0">{kicker(label, dot, state)}<h3>{summary}</h3>{org}</div></div>
{body}{buttons}</article>"""


def btns(confirm: str = "Confirmar", confirm_icon: str = "check", busy: bool = False, small: bool = False) -> str:
    sz = " sm" if small else ""
    if busy:
        c = k.btn("Confirmando…", "loader-circle", f"contrast pill{sz}", 'disabled aria-disabled="true"').replace(
            'class="ic', 'class="ic spin', 1
        )
        r = k.btn("Descartar", "", f"glass pill{sz}", 'disabled aria-disabled="true"')
    else:
        c = k.btn(confirm, confirm_icon, f"contrast pill{sz}")
        r = k.btn("Descartar", "", f"glass pill{sz}")
    return f'<div class="abtns">{c}{r}</div>'


PRICE = single(
    icon="pencil-line", label="Cambio", dot="", state="por confirmar", fresh=True,
    summary="Subir el precio de la Joao's Mixta a $ 29.000",
    body=diff([("Precio de venta", "$ 27.000", "$ 29.000")]) + effects(["Se ve en el catálogo y en el agente desde que confirmes."]),
    buttons=btns(),
)

GROUP = f"""<section class="acard glass-overlay">
<div class="ahead"><span class="ink-tile">{ic("layers", size=18)}</span>
<div style="display:flex;flex-direction:column;gap:4px">{kicker("3 cambios", "", "3 por confirmar")}<h3>Axel dejó 3 cambios listos</h3></div></div>
<ol class="group" style="margin:0;padding:0">
<li>{kicker("Cambio", "", "por confirmar")}<p class="s">Stock de Salchipapa Grande</p>{diff([("Unidades", "12", "40")])}{btns(small=True)}</li>
<li>{kicker("Cambio", "", "por confirmar")}<p class="s">Nueva categoría «Para compartir»</p>{diff([("Nombre", None, "Para compartir")])}{btns(small=True)}</li>
<li>{kicker("Cambio", "", "por confirmar")}<p class="s">Ocultar «Perro Especial» del catálogo</p>{diff([("Visible", "Sí", "No")])}{btns(small=True)}</li>
</ol>
<div class="sweep">{k.btn("Confirmar todo", "check", "contrast pill")}<span>Uno por uno, en orden. Puedes descartar los que no quieras.</span></div>
</section>"""

EXTERNAL = single(
    icon="send", label="Acción externa", dot="", state="por aprobar",
    summary="Enviar la campaña «2×1 de jueves» a 1.240 clientes",
    body=effects(["Sale por WhatsApp hoy a las 6:00 p. m.", "Usa la plantilla aprobada «promo_jueves».", "Costo estimado: 1.240 mensajes de marketing."])
    + f'<div class="risk" role="note">{ic("triangle-alert", size=16)}<span>Sale de tu cuenta: puede llegar a tus clientes, tener costo o no poder deshacerse. Revísalo antes de aprobar.</span></div>',
    buttons=btns("Aprobar", "shield-check"),
)

FROM_CLAUDE = single(
    icon="pencil-line", label="Cambio", dot="", state="por confirmar", origin="Pedido desde Claude (app conectada)",
    summary="Cambiar el estado del pedido #1682 a «Entregado»",
    body=diff([("Estado", "En camino", "Entregado")]),
    buttons=btns(),
)

BUSY = single(
    icon="pencil-line", label="Cambio", dot="", state="por confirmar",
    summary="Subir el precio de la Joao's Mixta a $ 29.000",
    body=diff([("Precio de venta", "$ 27.000", "$ 29.000")]), buttons=btns(busy=True),
)
EXECUTED = single(
    icon="pencil-line", label="Cambio", dot="ok", state="hecho", muted=True,
    summary="Subir el precio de la Joao's Mixta a $ 29.000",
    body=diff([("Precio de venta", "$ 27.000", "$ 29.000")]) + outcome("circle-check", "ok", "Hecho. La Joao's Mixta ya cuesta $ 29.000."),
    buttons="",
)
FAILED = single(
    icon="send", label="Acción externa", dot="err", state="falló", muted=True,
    summary="Enviar la campaña «2×1 de jueves» a 1.240 clientes",
    body=outcome("circle-x", "err", "No se pudo enviar: la plantilla «promo_jueves» está en revisión en Meta. No se envió nada ni hubo costo."),
    buttons="",
)
FORBIDDEN = single(
    icon="pencil-line", label="Cambio", dot="warn", state="sin permiso",
    summary="Borrar el producto «Combo Viejo»",
    body=outcome("shield-alert", "warn", "No tienes permiso para hacer este cambio (catalogo:manage). Pídeselo a quien administra tu cuenta."),
    buttons=f'<div class="abtns">{k.btn("Descartar", "", "glass pill")}</div>',
)
EXPIRED = single(
    icon="pencil-line", label="Cambio", dot="off", state="vencido", muted=True,
    summary="Bajar el domicilio gratis a pedidos desde $ 40.000",
    body=outcome("clock", "off", "Venció sin confirmarse. Si todavía lo quieres, pídeselo de nuevo a Axel."),
    buttons="",
)
REJECTED = single(
    icon="pencil-line", label="Cambio", dot="off", state="descartado", muted=True,
    summary="Ocultar «Perro Especial» del catálogo",
    body=outcome("ban", "off", "Descartado. No se cambió nada."), buttons="",
)


def chat(*cards: str) -> str:
    return (
        '<div class="axel">'
        '<div class="bubble-user">Sube la Mixta a 29 mil, pon 40 de stock a la salchipapa grande, crea «Para compartir», '
        "oculta el perro especial y prepara la campaña del 2×1 del jueves.</div>"
        '<div class="bubble-axel"><span class="orb"></span><p>Listo, Camila. Te dejé todo preparado: nada cambia hasta que lo confirmes. '
        "La campaña sale a tus clientes, así que esa va aparte y se aprueba sola.</p></div>"
        + "".join(cards)
        + "</div>"
    )


def page_f3_desktop() -> str:
    return '<div class="backdrop">' + chat(
        '<p class="cap">R1 · un cambio (antes → después) · recién llegado</p>', PRICE,
        '<p class="cap">Grupo de 3 R1 · «Confirmar todo»</p>', GROUP,
        '<p class="cap">R2 · acción externa · «Aprobar» con aviso de riesgo</p>', EXTERNAL,
        '<p class="cap">R1 pedido desde Claude (MCP) · se confirma aquí si la app no pide confirmación</p>', FROM_CLAUDE,
    ) + "</div>"


def page_f3_states() -> str:
    return '<div class="backdrop">' + chat(
        '<p class="cap">Confirmando… (botones deshabilitados hasta que responde el servidor)</p>', BUSY,
        '<p class="cap">Ejecutada</p>', EXECUTED,
        '<p class="cap">Fallida</p>', FAILED,
        '<p class="cap">Sin permiso (se re-autoriza a quien confirma)</p>', FORBIDDEN,
        '<p class="cap">Vencida (30 min)</p>', EXPIRED,
        '<p class="cap">Descartada</p>', REJECTED,
    ) + "</div>"


def page_f3_mobile() -> str:
    return (
        '<div class="backdrop"><div class="phones">'
        + phone(f'<div class="axel">{PRICE}{EXTERNAL}</div>', "390 · R1 y R2")
        + phone(f'<div class="axel">{GROUP}</div>', "390 · grupo de 3")
        + phone(f'<div class="axel">{EXECUTED}{FAILED}{FORBIDDEN}{EXPIRED}</div>', "390 · desenlaces")
        + "</div></div>"
    )


VIEWS = [
    ("consent", "Consentimiento", page_consent(),
     "Claude pide acceso (dominio verificado por CIMD). La persona elige área por área: sin acceso / ver / ver y cambiar, nunca más de lo pedido."),
    ("consent-local", "App local", page_consent_local(),
     "App que vuelve a 127.0.0.1 y cuyo nombre no se puede verificar: aviso explícito y host de regreso a la vista."),
    ("consent-states", "Estados", page_consent_states(),
     "Sin sesión (login normal del panel y vuelve sola), solicitud vencida, usuario de plataforma y solicitud inválida (sin redirigir)."),
    ("consent-390", "Consentimiento 390", page_consent_mobile(), "Las dos pantallas de consentimiento a 390 px."),
    ("account", "Mi cuenta", page_account(),
     "«Aplicaciones conectadas» en /cuenta (lo que cada persona gestiona de SU acceso), debajo de «Cambiar contraseña»."),
    ("account-revoke", "Desconectar", page_account(modal=True), "Confirmación al desconectar: corta el acceso al instante."),
    ("account-empty", "Sin apps", page_account(empty=True), "Estado vacío de la tarjeta."),
    ("f3", "F3 · tarjetas", page_f3_desktop(),
     "ActionConfirmCard (axi-client feat/axel-os-f3, sin mockup previo): R1, grupo de 3, R2 y una acción pedida desde Claude. 1440."),
    ("f3-states", "F3 · desenlaces", page_f3_states(), "Confirmando, ejecutada, fallida, sin permiso, vencida y descartada."),
    ("f3-390", "F3 · 390", page_f3_mobile(), "Las tarjetas de F3 a 390 px."),
]

k.build_html(
    "Conectar apps a Axi",
    "Mockup F5 · Axel OS",
    "Conectar Claude a Axi (OAuth) · Aplicaciones conectadas · Tarjeta de confirmación F3",
    VIEWS,
)
