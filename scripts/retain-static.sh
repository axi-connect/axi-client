#!/bin/sh
# Retención de los estáticos de Next entre despliegues (hotfix «Application error», 2026-10-19).
#
# Corre DENTRO del Dockerfile (etapa runner) y une, en el `.next/static` de la imagen nueva:
#   - los estáticos que ya traía la imagen en servicio (etapa `previous`), y
#   - los del build nuevo,
# podando lo que ya no pertenece a ningún build reciente.
#
# Por qué: cada push a main sustituye el contenedor. Sin esto, un HTML de la versión
# anterior (pestaña abierta o restaurada, ir/volver, HTML descargado justo antes del
# swap) pedía chunks que ya no existían → 404 → ChunkLoadError → «Application error».
# Los nombres de los chunks llevan hash de contenido, así que dos builds nunca chocan.
#
# Cada build deja un manifiesto `<UTC YYYYmmddHHMMSS>-<sha>.txt` con sus archivos en el
# directorio de retención (FUERA de `static`: no se sirve). Se conservan los manifiestos
# de los últimos KEEP_BUILDS builds QUE además tengan menos de KEEP_DAYS días; el del
# build actual siempre. Se borra todo archivo que no figure en un manifiesto conservado.
# La fecha va en el nombre del manifiesto: no depende del mtime de las capas de Docker.
#
# Uso: retain-static.sh <static-del-build-nuevo> <static-destino> <dir-de-retención> [sha]
# Documento: docs/plans/hotfix_application_error_plan.md
set -eu

NEW_DIR=$1
DEST_DIR=$2
RET_DIR=$3
SHA=${4:-unknown}
KEEP_BUILDS=${KEEP_BUILDS:-15}
KEEP_DAYS=${KEEP_DAYS:-14}
NOW_EPOCH=${RETAIN_NOW_EPOCH:-$(date -u +%s)} # fijable en las pruebas

stamp_of() { date -u -d "@$1" +%Y%m%d%H%M%S; }

mkdir -p "$DEST_DIR" "$RET_DIR"
list_files() { (cd "$1" && find . -type f | sed 's|^\./||' | sort); }

# Arranque: la primera imagen con este script hereda estáticos SIN manifiesto. Se les
# da uno con la fecha de ahora menos un segundo, para que no se poden en este despliegue.
if [ -z "$(ls -A "$RET_DIR")" ] && [ -n "$(ls -A "$DEST_DIR")" ]; then
  list_files "$DEST_DIR" > "$RET_DIR/$(stamp_of $((NOW_EPOCH - 1)))-previous.txt"
fi

current="$(stamp_of "$NOW_EPOCH")-$SHA.txt"
list_files "$NEW_DIR" > "$RET_DIR/$current"
cp -a "$NEW_DIR/." "$DEST_DIR/"

cutoff=$(stamp_of $((NOW_EPOCH - KEEP_DAYS * 86400)))
keep_list=$(mktemp)
drop_list=$(mktemp)
# Del más nuevo al más viejo: los primeros KEEP_BUILDS con fecha >= cutoff, y el actual.
ls "$RET_DIR" | grep -E '^[0-9]{14}-.+\.txt$' | sort -r | awk -v n="$KEEP_BUILDS" -v c="$cutoff" \
  -v cur="$current" -v keep="$keep_list" -v drop="$drop_list" \
  '{ if ($0 == cur || (NR <= n && substr($0, 1, 14) >= c)) print > keep; else print > drop }'
touch "$keep_list" "$drop_list"

while IFS= read -r manifest; do rm -f "$RET_DIR/$manifest"; done < "$drop_list"

wanted=$(mktemp)
while IFS= read -r manifest; do cat "$RET_DIR/$manifest"; done < "$keep_list" | sort -u > "$wanted"

# Línea a línea y sin expansión: hay rutas con () y [] (`app/(public)/…`, `[...path]`).
stale=$(mktemp)
list_files "$DEST_DIR" | grep -vxF -f "$wanted" > "$stale" || true
while IFS= read -r file; do rm -f "$DEST_DIR/$file"; done < "$stale"
removed=$(wc -l < "$stale")
# Directorios que quedaron vacíos.
find "$DEST_DIR" -mindepth 1 -depth -type d | while IFS= read -r dir; do rmdir "$dir" 2>/dev/null || true; done

echo "retain-static: builds conservados=$(wc -l < "$keep_list") podados=$(wc -l < "$drop_list") archivos borrados=$removed tamaño=$(du -sh "$DEST_DIR" | cut -f1)"
rm -f "$keep_list" "$drop_list" "$wanted" "$stale"
