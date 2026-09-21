#!/usr/bin/env python3
"""Mockup · el resumen del cierre de Alba (hotfix P2c, plan alba_hotfix_p1_p5_plan.md §2.3c).

Genera `alba-closing-summary.html` junto a este script. Reutiliza del mockup del kit de
asistente (`assistant-kit-premium.template.html`) los tokens literales de `globals.css`, la
cara de Alba (mismo rig) y las primitivas del kit; aquí solo se diseña el bloque nuevo: lo que
queda listo, lo que pone la persona y lo que le falta, bajo el cierre.

    python3 docs/design/mockups/alba-closing-summary.build.py
"""
from __future__ import annotations

import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Icons, font_css  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent
NAME = "alba-closing-summary"
icons = Icons(HERE / f"{NAME}.lucide.json")

KIT = (HERE / "assistant-kit-premium.template.html").read_text()

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


# Tokens + base (CAPA 1 y 2), el campo, el escenario y el rig: tal cual del kit.
TOKENS_CSS = between(KIT, "/* ======================================================================\n   CAPA 1", "/* ======================================================================\n   KIT DE ASISTENTE")
FIELD_CSS = between(KIT, ".assistant-field {", ".assistant-chat")
STAGE_CSS = between(KIT, ".assistant-stage {", "/* Pregunta dentro de la tarjeta")
RIG_JS = between(KIT, "  /* ---------- avatar: rig y poses", "  const setExpression")

HTML = (HERE / f"{NAME}.template.html").read_text()


def render(html: str) -> str:
    html = (
        html.replace("{{GOOGLE}}", google)
        .replace("{{FONTS}}", faces)
        .replace("{{TOKENS_CSS}}", TOKENS_CSS)
        .replace("{{FIELD_CSS}}", FIELD_CSS)
        .replace("{{STAGE_CSS}}", STAGE_CSS)
        .replace("{{RIG_JS}}", RIG_JS)
    )

    def icon(m: re.Match[str]) -> str:
        name, size = m.group(1), m.group(2)
        return icons(name, size=int(size or 16))

    return re.sub(r"\{\{ic:([a-z0-9-]+)(?::(\d+))?\}\}", icon, html)


(HERE / f"{NAME}.html").write_text(render(HTML))
icons.save()
print(f"[cierre] escrito {NAME}.html")
