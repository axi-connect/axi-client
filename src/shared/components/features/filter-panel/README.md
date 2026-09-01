# FilterPanel

Panel de filtros compartido de la plataforma: una hoja lateral cuyos filtros se
**declaran como datos**, chips removibles fuera de ella y un botón con el
contador de lo que está puesto.

> **Regla.** Un listado nuevo con filtros usa `FilterPanel` + un `*.filters.ts`
> con su esquema. **Nunca un panel propio.** Hoy hay cinco implementaciones del
> mismo patrón (`ContactFilters`, `ProductFilters`, `AdvancedSearchOptions` y
> los `Select` sueltos de cartera y admin); la sexta no se escribe. La absorción
> de las cinco es trabajo aparte y va de acuerdo con la sesión que posee cada
> una — `AdvancedSearchOptions` primero, que es la más evolucionada.
>
> **Fuera de alcance a propósito:** `AudienceFilterBuilder`. Es un constructor
> de audiencias con grupos Y/O, no un panel de filtros, y alguien intentará
> fusionarlos.

## Por qué existe

`shared/` **no puede importar de `modules/`** (arquitectura §3.3, regla 7). Un
panel compartido no puede, por tanto, conocer ni un estado, ni un origen, ni una
etiqueta: recibe un `FilterSchema` y el consumidor aporta las opciones. Es el
mismo principio de «configuración por datos, no por código» que ya rige
`DynamicForm`.

## Estructura

```
src/shared/components/features/filter-panel/
  FilterPanel.tsx          # la hoja (borrador contra aplicado)
  FilterTrigger.tsx        # el botón «Filtros» con su contador
  FilterChips.tsx          # chips removibles, FUERA de la hoja
  filter-schema.ts         # tipos + funciones puras (sin React)
  controls/
    PillGroup.tsx          # multivalor (aria-pressed) y exclusivo (radiogroup)
    IconCards.tsx          # tarjetas con icono, mismas dos semánticas
    StepsRow.tsx           # umbrales etiquetados (Select)
    CountSteps.tsx         # 0..N sobre SegmentedControl
    SwitchRow.tsx          # Switch + descripción + aviso contextual
    TextRow.tsx
    DateRow.tsx            # <input type="date"> nativo
  index.ts
```

## Uso

```tsx
const FILTERS: FilterSchema = {
  sections: [{ id: "datos", title: "Datos del lead" }],
  filters: [
    { kind: "multi", key: "status", label: "Estado", options: STATUS_OPTIONS },
    { kind: "flags", key: "require", label: "Datos exigidos", section: "datos",
      modeKey: "require_mode", modeLabels: { all: "Todos", any: "Al menos uno" },
      options: REQUIRABLE_OPTIONS },
    { kind: "steps", key: "min_score", label: "Calidad mínima", section: "datos",
      options: SCORE_STEPS },
    { kind: "count", key: "min_data", label: "Datos completos", section: "datos", max: 5 },
    { kind: "switch", key: "verified_only", label: "Solo verificados" },
    { kind: "text", key: "city", label: "Ciudad", placeholder: "Bogotá" },
  ],
};

<FilterTrigger count={countActive(FILTERS, applied)} onClick={() => setOpen(true)} />
<FilterChips schema={FILTERS} values={applied} onRemove={(key) => apply(removeFilter(FILTERS, applied, key))} />

<FilterPanel
  open={open}
  onOpenChange={setOpen}
  schema={FILTERS}
  value={applied}
  resultCount={count}
  countNoun={{ one: "lead", many: "leads" }}
  onDraftChange={debouncedCount}
  onApply={apply}
/>

// Al pedir la página:
listLeads({ ...serializeFilters(FILTERS, applied), page })
```

Las opciones **salen de los diccionarios del slice** (`Record<Enum, string>`),
nunca escritas a mano en el JSX: el fallo que motivó este componente fue un
desplegable de orígenes que listaba 3 de 6 valores porque estaban a mano y el
compilador no vigilaba nada.

## Serialización — es un contrato

| tipo | alambre |
|---|---|
| `multi` / `flags` | CSV `join(",")`; vacío ⇒ no viaja. `flags` con `modeKey` añade `${nombre}_mode=all\|any` |
| `steps` / `count` | el valor crudo bajo `paramName ?? key`; `null` / `0` ⇒ no viaja |
| `switch` | **solo cuando es verdadero** |
| `text` | recortado; `""` ⇒ no viaja |
| `date` | `${nombre}_after` / `${nombre}_before` |

Dos trampas que esto cierra, y las dos están probadas:

1. **El arreglo no puede llegar a la capa HTTP.** `buildListParams` castea a
   `string | number | boolean | undefined` y `http.ts` hace `String(value)`, así
   que un arreglo se serializa a `a,b,c` **por accidente** y un objeto se
   convierte en `"[object Object]"` **en silencio**. Aquí se une con comas
   explícitamente y el arreglo no sale de esta capa.
2. **Un interruptor en falso no viaja.** Un backend lee `verified_only=false`
   como «exijo que NO esté verificado», que es lo contrario de «no me importa».

`serializeFilters` solo toca las llaves del esquema: `sort`, `page` y el texto
del buscador viven en el mismo objeto de estado y los serializa quien los posee.
`clearAll` respeta la misma frontera — «Limpiar» no se lleva el orden.

## Decisiones que no conviene revertir

- **La hoja va sobre `DetailSheet`, no sobre `sheet.tsx`.** `SheetFooter` es
  `mt-auto` dentro de un cuerpo que no es flex: el botón «Ver 41 leads» se va con
  el scroll. `DetailSheet` trae pie fijo, `useBodyScrollLock` con recuento de
  referencias, `LAYERS.detailSheet` (60) —por lo que los `Select` de dentro
  (flotantes, 70) pintan por encima y no por detrás— y `side="auto"`, que por
  debajo de 768px lo convierte en hoja inferior. Nada de
  `calc(100svh - cabecera)`: `flex-1` hasta abajo.
- **Borrador contra aplicado.** La hoja edita una copia sembrada de `value` en
  cada apertura; solo `onApply` publica. Escape, la X y el clic fuera
  **descartan**, sin preguntar.
- **El contador no lo calcula la hoja.** Emite `onDraftChange`, el consumidor
  debouncea y responde `resultCount`. `undefined` ⇒ «Aplicar filtros»;
  `null` ⇒ «Ver resultados» (nunca un número inventado); mientras hay una cuenta
  en vuelo el botón **sigue habilitado**, porque un botón que no responde se lee
  como pantalla rota.
- **Lo seleccionado se marca por ELEVACIÓN, no por tinte**: `bg-background` +
  `shadow-float` + borde más firme, y el coral solo en la marca de verificación
  de 14px. Blanco sobre `--axi-brand` da ~3.1:1 y no pasa AA a 12–13px. Es una
  desviación consciente del recetario de pestañas de §9.3 (que sí permite
  `bg-accent`): en una hoja con decenas de pastillas, el tinte al 14 % repetido
  la convierte en un damero. La excepción es `CountSteps`, que va sobre
  `SegmentedControl` y respeta su recetario en vez de abrir una 24ª copia a mano
  del segmentado.
- **Nada de deslizadores.** Los rangos se expresan como `steps` etiquetados,
  porque *nadie distingue un 43 de un 47 y un deslizador promete esa precisión*.
  Un rango cerrado son DOS `steps`. Beneficio colateral: no entra
  `@radix-ui/react-slider`, que no está instalado.
- **Un solo centinela: `NO_FILTER_VALUE = "__all__"`.** Los `Select` de Radix no
  aceptan `""` ni `null` como valor de ítem. Hoy en el repo conviven `"any"`,
  `"all"` y `"__all__"` para la misma idea; se adopta la ortografía mayoritaria
  en vez de inventar una cuarta.
- **El conmutador todos/alguno cuelga del conjunto, no de la opción** (D3 del
  plan). Sin `modeKey` el filtro es un AND, que es lo que espera quien no lo
  declaró. Se guarda como ausencia cuando vale `all`: un `require_mode=all`
  explícito dice lo mismo que no decir nada y ensucia el estado compartido.
- **Toda clase tonal por opción (`dotClassName`) es un literal de un diccionario
  CERRADO del consumidor.** Nunca `` `bg-${tono}` ``: Tailwind v4 extrae las
  clases estáticamente del fuente, así que una clase interpolada no genera CSS
  (misma trampa que los z-index).
- **Semántica por modo.** Exclusivo sin panel ⇒ `role="radiogroup"` con tabindex
  móvil. No excluyente ⇒ `<button aria-pressed>`. Nunca `role="radio"` para un
  conmutador independiente ni `role="tab"` sin `tabpanel`.

## Qué NO hace

- **No filtra datos.** No conoce la lista; solo emite estado.
- **No cuenta resultados.** Ver arriba.
- **No guarda estado.** Lo aplicado vive en el consumidor, con lo que aplicar un
  filtro pueda necesitar además (volver a la página 1, tirar la selección).
- **No sabe de URL.** Sincronizar con el query string es del consumidor.
