#!/usr/bin/env python3
"""Mockup F0 · Estudio de agentes (personajes de plataforma, color, voz y brief estructurado).

Genera `agent-studio.html` junto a este script. Tokens literales de
`src/app/globals.css`; iconos lucide del `node_modules`; Nexa incrustada como
data URI y Poppins de Google Fonts (el CSP del Artifact solo admite ese host).

    python3 docs/design/mockups/agent-studio.build.py
"""
from __future__ import annotations

import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Icons, font_css  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent
NAME = "agent-studio"
icons = Icons(HERE / f"{NAME}.lucide.json")

# La Nexa incrustada viaja en el mockup del despacho: se reutiliza tal cual.
google, faces = font_css()
if not faces:
    src = (HERE / "cmo-despacho-minimalista.html").read_text()
    faces = "\n".join(re.findall(r"@font-face\s*\{[^}]*\}", src))
    google = (
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700'
        '&display=swap">'
    )

HTML = (HERE / f"{NAME}.template.html").read_text()


def render(html: str) -> str:
    html = html.replace("{{GOOGLE}}", google).replace("{{FONTS}}", faces)

    def icon(m: re.Match[str]) -> str:
        name, size = m.group(1), m.group(2)
        return icons(name, size=int(size or 16))

    return re.sub(r"\{\{ic:([a-z0-9-]+)(?::(\d+))?\}\}", icon, html)


(HERE / f"{NAME}.html").write_text(render(HTML))
icons.save()
print(f"[kit] escrito {NAME}.html")
