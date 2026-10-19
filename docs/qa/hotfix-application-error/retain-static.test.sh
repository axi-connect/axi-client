#!/bin/sh
# Prueba de scripts/retain-static.sh (hotfix «Application error», docs/plans/hotfix_application_error_plan.md).
# Seis despliegues simulados en cadena. Correr con el sh de la imagen (busybox) y con el del sistema:
#   docker run --rm -v "$PWD":/w -w /w node:22-alpine sh docs/qa/hotfix-application-error/retain-static.test.sh
#   sh docs/qa/hotfix-application-error/retain-static.test.sh
set -eu
R="$(cd "$(dirname "$0")/../../.." && pwd)/scripts/retain-static.sh"
fail() { echo "FALLO: $1"; exit 1; }
mk() { mkdir -p "$(dirname "$1")"; echo x > "$1"; }
D=$(mktemp -d); mkdir -p $D/dest $D/ret
# 1) arranque: imagen vieja sin manifiestos
mk $D/dest/chunks/old-aaa.js; mk "$D/dest/chunks/app/(public)/page-old.js"; mk $D/dest/BUILDOLD/_buildManifest.js
rm -rf $D/new; mk $D/new/chunks/new-bbb.js; mk "$D/new/chunks/app/(public)/page-new.js"; mk "$D/new/chunks/app/api/proxy/[...path]/route-n.js"; mk $D/new/chunks/shared-ccc.js
NOW=1760000000
RETAIN_NOW_EPOCH=$NOW sh $R $D/new $D/dest $D/ret sha1
[ -f $D/dest/chunks/old-aaa.js ] || fail "arranque: borró los heredados"
[ -f "$D/dest/chunks/app/(public)/page-old.js" ] || fail "arranque: parentesis"
[ -f "$D/dest/chunks/app/api/proxy/[...path]/route-n.js" ] || fail "corchetes"
[ "$(ls $D/ret | wc -l)" = 2 ] || fail "arranque: 2 manifiestos"
# 2) build 2 un día después: old-* siguen (manifiesto previous < 14 días)
rm -rf $D/new; mk $D/new/chunks/b2.js; mk $D/new/chunks/shared-ccc.js
RETAIN_NOW_EPOCH=$((NOW+86400)) sh $R $D/new $D/dest $D/ret sha2
[ -f $D/dest/chunks/old-aaa.js ] && [ -f $D/dest/chunks/new-bbb.js ] && [ -f $D/dest/chunks/b2.js ] || fail "build2 conserva"
# 3) build 3 quince días después: se podan «previous» y sha1 (más de 14 días); sha2 (14 días justos) se queda
rm -rf $D/new; mk $D/new/chunks/b3.js; mk $D/new/chunks/shared-ccc.js
RETAIN_NOW_EPOCH=$((NOW+15*86400)) sh $R $D/new $D/dest $D/ret sha3
[ ! -f $D/dest/chunks/old-aaa.js ] || fail "no podó por antigüedad"
[ ! -f $D/dest/chunks/new-bbb.js ] || fail "no podó sha1"
[ ! -d $D/dest/BUILDOLD ] || fail "no borró directorio vacío"
[ -f $D/dest/chunks/b2.js ] || fail "podó sha2 (dentro de 14 días)"
[ -f $D/dest/chunks/shared-ccc.js ] && [ -f $D/dest/chunks/b3.js ] || fail "borró del actual"
# 4) tope por número: KEEP_BUILDS=2 con tres builds seguidos (despliegues 4 a 6)
for i in 4 5 6; do rm -rf $D/new; mk $D/new/chunks/b$i.js; mk $D/new/chunks/shared-ccc.js
  KEEP_BUILDS=2 RETAIN_NOW_EPOCH=$((NOW+15*86400+i)) sh $R $D/new $D/dest $D/ret sha$i; done
[ ! -f $D/dest/chunks/b4.js ] && [ -f $D/dest/chunks/b5.js ] && [ -f $D/dest/chunks/b6.js ] || fail "tope por número"
[ "$(ls $D/ret | wc -l)" = 2 ] || fail "manifiestos sobrantes"
echo TODO-OK
