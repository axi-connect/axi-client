# Entrega y bienvenida · upgrade premium de UI/UX

> Rama `feat/entrega-premium` (cliente), sale de `feat/entrega-bienvenida` 242e8a9b (PR 1 certificado, sin fusionar).
> Mockup aprobado por el dueño el 2026-09-25: canvas https://claude.ai/artifact/MMrzfFEq7DnJBxUgXhW38U,
> copia en `/home/davela/dev/axi/docs/design/mockups/entrega-bienvenida-premium/`.
> Auditoría: la sesión `audit-upgrade-design`, con evidencia en `docs/qa/entrega-bienvenida/upgrade-design/`.

## Alcance

| Fase | Pantalla | Qué cambia | Datos |
|---|---|---|---|
| F1 | Ficha del tenant · Resumen | Bento vivo: recorrido de 7 días con «hoy», bienvenida, acceso de la dueña, lo próximo, oferta; identificación compacta | Ya existen: tenant, `GET …/delivery`, `GET …/delivery/context` (oferta) |
| F2 | Preparar entrega | Una columna: cada paso cerrado se pliega en su resumen con «Editar»; «Antes de enviar» siempre a la vista con «Resolver como soporte»; barra flotante con progreso y «Enviar»; borrador guardado solo | Igual que hoy (el borrador sigue en este navegador) |
| F3 | Bienvenida enviada | Línea de tiempo con la hora de cada paso y «esperando» hasta que la dueña crea su contraseña (se refresca solo); «Lo que sigue» con las dos citas en .ics; «Si no le llegó» | `GET …/delivery` (pasos, intentos con `sent_at`, `password_set_at`) |
| F4 | Entrar como soporte + barra de soporte | Motivos rápidos, duración 15/30/60, recuadro «Puedes / No puedes»; barra con píldora y tiempo restante | Sin cambios de contrato |
| F5 | Crea tu contraseña | Dos paneles en escritorio (marca + formulario), cabecera de marca en el celular, reglas de la contraseña que se cumplen mientras escribe | `inspect` (ya trae `business_name`) |
| F6 | Tarjetas «Conversaciones de prueba» y «Puesta en marcha» de la ficha | Barras por día local con el % del tope del plan trial; 5 pasos del recorrido. Ocultas para billing_ops (403) | Servidor `feat/entrega-premium` f671c2da: `GET …/delivery/trial-progress` (puerto `CONVERSATION_SERIES` en usage + `ONBOARDING_PROGRESS`) |

## Adaptaciones del mockup al sistema de diseño (docs/design/DESIGN-SYSTEM.md)

- **Pestañas del tenant**: siguen siendo `NavTabs` con el activo en `bg-accent` (§9.3: blanco sobre coral no pasa AA a 13 px). El mockup las pintaba en píldora negra.
- **Sin anillos de progreso** (§9 «nunca anillos ni tiles de vanidad»): el progreso va en tramos lineales, como `RouteLine`.
- **Colores por tokens** y los dos temas: la tarjeta «Lo próximo» y la barra flotante son islas de tinta (`bg-foreground text-background` en claro); en oscuro, tarjeta elevada con borde.
- **El CTA primario** sigue siendo `Button` (`bg-primary`). El coral más oscuro #D13F42 del correo es solo del correo.

## Lo que no se toca (acordado con la constructora del PR 1)

- El token viaja en `#token` y se borra con `replaceState`; `safeInternalNext` en `/auth/*`.
- N1: la copia al equipo nunca muestra el enlace.
- La barra de soporte solo la ve el admin (silencio); `auth/support_readonly_suspended` sigue diciendo «solo lectura, sin tiempo real».
- `Dialog` con devolución de foco; los bloqueos conservan su acción de soporte.
- La vista previa del correo es el HTML del servidor (`POST …/delivery/preview`).

## Verjas por fase

`npm run lint` acotado, `npm test -- --testPathPattern <zona>`, y al cerrar: `tsc` (heap manual) y `next build`, de una en una. Renderizar cada pantalla y medir desbordes antes de pasarla al auditor.

## Estado

| Commit | Qué |
|---|---|
| cliente 850f5cfc · dcceac73 · e13fab8c · deb40ea2 · 5f0ec85a | F1–F5 |
| servidor f671c2da | endpoint de F6 (con test de integración: aislamiento y día local) |
| cliente 62611d91 | correcciones de la auditoría A1–A17 (informe en `docs/qa/entrega-bienvenida/upgrade-design/` del monorepo) y fichas F6 |
| cliente (siguiente) | piezas del bento a `shared/components/features/bento`; DESIGN-SYSTEM §9.5–§9.8 y §12, DESIGN §5.2.1 |

El mockup aprobado se copió a `docs/design/mockups/entrega-bienvenida-premium/` (canvas del Design
artifact: un `.dc.html` por pantalla).
