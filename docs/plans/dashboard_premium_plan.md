# Panel (dashboard) ultra-premium

Aprobado por el dueño el 2026-09-25 sobre el canvas https://claude.ai/artifact/VZwjsFscdsex1HBm22d1EJ (copia en el
monorepo: `docs/design/mockups/dashboard-premium/`). Rama `feat/dashboard-premium`. Es el primer módulo del upgrade
de la plataforma al lenguaje de Calidad y Bienvenida (DESIGN-SYSTEM §9.5 y §9.5.1).

## Qué cambia

- **Cabecera** (`DashboardHeader`, sustituye a `DashboardBanner`): logo de la empresa, antetítulo «EMPRESA · FECHA»,
  saludo en Nexa grande y la línea de estado derivada de lo ya cargado; «En vivo» solo mientras el socket está
  conectado; el selector de período a la derecha.
- **Bento** con la rejilla de §9.5: tres columnas en `xl`, la isla anclada a la derecha, sin filas en px.
- **La isla «Lo próximo»** (`NextUpIsland`, material por defecto: cristal blanco). Sustituye a «Requiere tu atención».
  Sale de datos que ya se piden, ordenados por gravedad en `domain/next-up.ts` (puro, testeado):
  canal caído → IA en pausa → cola → asignadas a ti → pagos por verificar. Sin nada pendiente dice «Todo al día».
  Mientras carga el dato que la decide, pinta su silueta (no una isla y luego otra).
- **Primer día**: el banner de configuración pendiente se muda a la isla («Empieza por aquí» con los pasos). El
  slice `onboarding` publica `useOnboardingResume()` (el puerto aplica la regla: qué pasos, si se muestra, ocultar)
  y retira `OnboardingResumeBanner`, que ya no tenía consumidor.
- **La meta** (`GoalProgressBlock`, slice `commercial`): de franja a ficha grande del bento — la cifra, la frase de
  `paceHeadline` (la misma del hero de Comercial), la línea compacta y la procedencia. Acepta `className` para que el
  panel decida su sitio.
- **Fichas**: Vendido y Ticket (una cifra cada una), Conversaciones (cifras, serie nuevas/resueltas y quién resolvió),
  Estado del sistema (canales con `ChannelKindIcon` + IA), Clientes nuevos (cifra, curva y reparto por etapa), Lo más
  vendido (importe y barra por unidades) y Consumo del plan (barras con la marca del 80 % y el costo del ciclo).
- **Color**: coral y violeta; sale el ámbar de Clientes nuevos (DESIGN §3.1: nunca los tres acentos).
- **Error por ficha** con «Reintentar» (el store gana `refreshCustomers`, `refreshUsage` y `refreshChannels`);
  un error nunca se confunde con un vacío. Vacíos que dicen qué pasa y qué hacer.
- **Skeleton** con la silueta nueva.

## Qué no cambia

- Contratos, permisos (RBAC natural: lo que el rol no puede leer no se pide ni se pinta), tiempo real, período por
  defecto del store (7 días).
- `DashboardCard` y `MetricTile` siguen publicados: los consume `analytics`.

## Verificación

- tsc, lint y jest acotados a lo tocado; `next build`, uno a uno con `flock`.
- Render con el arnés (`docs/qa/dashboard-premium/arnes`): día normal, alertas, todo al día, rol agente, primer
  día, errores y datos largos; 390 → 1440, claro y oscuro.
