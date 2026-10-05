#!/usr/bin/env python3
"""Mockup F0 · la isla viva del asistente y los hallazgos de la entrevista de Alba.

Plan: docs/plans/island_live_plan.md. Genera `island-live.html` junto a este script.

Toma TAL CUAL:
- de `assistant-kit-premium.template.html`: los tokens literales (capa 1 y 2), el aura, el
  escenario y el rig del avatar (la misma cara de Axel y Alba);
- de `src/app/globals.css`: el bloque real de la isla (L/S/M) y el del hilo (burbujas, lista
  agrupada, puntos y onda). Así lo que se ve aquí es lo que ya pinta el producto, y lo nuevo
  (las formas P/A/R/E, los chips y el punto) va aparte y marcado.

    python3 docs/design/mockups/island-live.build.py
"""
from __future__ import annotations

import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Icons, font_css  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent
NAME = "island-live"
icons = Icons(HERE / f"{NAME}.lucide.json")

KIT = (HERE / "assistant-kit-premium.template.html").read_text()
GLOBALS = (HERE.parents[2] / "src" / "app" / "globals.css").read_text()

google, faces = font_css()
if not faces:
    faces = "\n".join(re.findall(r"@font-face\s*\{[^}]*\}", (HERE / "cmo-despacho-minimalista.html").read_text()))
    google = (
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700'
        '&display=swap">'
    )


def between(src: str, start: str, end: str) -> str:
    a = src.index(start)
    b = src.index(end, a)
    return src[a:b]


TOKENS_CSS = between(KIT, "/* ======================================================================\n   CAPA 1", "*, *::before")
FIELD_CSS = between(KIT, ".assistant-field {", ".assistant-chat")
STAGE_CSS = between(KIT, ".assistant-stage {", "/* Hilo */")
RIG_JS = between(KIT, "  /* ---------- avatar: rig y poses", "  /* la mirada sigue al puntero")
ISLAND_CSS = between(GLOBALS, ".assistant-chat[data-empty] {", "/* --------------------------------------------------------------------------\n   Burbujas")
CHAT_CSS = between(GLOBALS, ".assistant-bubble-user {", "/* Documentos (F8 Cobros)")

HTML = (HERE / f"{NAME}.template.html").read_text()


def render(html: str) -> str:
    html = (
        html.replace("{{GOOGLE}}", google)
        .replace("{{FONTS}}", faces)
        .replace("{{TOKENS_CSS}}", TOKENS_CSS)
        .replace("{{FIELD_CSS}}", FIELD_CSS)
        .replace("{{STAGE_CSS}}", STAGE_CSS)
        .replace("{{ISLAND_CSS}}", ISLAND_CSS)
        .replace("{{CHAT_CSS}}", CHAT_CSS)
        .replace("{{RIG_JS}}", RIG_JS)
    )

    def icon(m: re.Match[str]) -> str:
        name, size = m.group(1), m.group(2)
        return icons(name, size=int(size or 16))

    return re.sub(r"\{\{ic:([a-z0-9-]+)(?::(\d+))?\}\}", icon, html)


(HERE / f"{NAME}.html").write_text(render(HTML))
icons.save()
print(f"[isla] escrito {NAME}.html")
