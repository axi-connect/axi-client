#!/usr/bin/env python3
"""Lienzo «Comenta y recibe» — Marketing › Redes (F0 del plan comment-automation, 2026-11-06).

Uso: `python3 docs/design/mockups/comment-automation/build.py` → `comment-automation/comment-automation.html`.
Cada pantalla vive en su módulo (dos constructores en paralelo); este archivo solo las ensambla.
"""
import pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from _shared import K  # noqa: E402
import screens_list  # noqa: E402

VIEWS = list(screens_list.VIEWS)
try:
    import screens_editor  # noqa: E402
    VIEWS[1:1] = screens_editor.VIEWS  # el editor va justo después de la lista
except ModuleNotFoundError:
    print("[build] screens_editor.py aún no existe: se arma solo la lista y el detalle", file=sys.stderr)

K.build_html(
    "Comenta y recibe",
    "F0 · Redes",
    "Comentario → respuesta pública → mensaje privado → entrega → venta",
    VIEWS,
)
