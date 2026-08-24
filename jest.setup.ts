import '@testing-library/jest-dom'

/**
 * Polyfills de APIs del navegador que jsdom no implementa y que los primitivos
 * de Radix necesitan para medir y posicionar (Popover, Select, Tooltip,
 * DropdownMenu). Sin ellos, cualquier test que abra un popover revienta con
 * `ResizeObserver is not defined`.
 */
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver
}

if (!('DOMRect' in globalThis)) {
  globalThis.DOMRect = class DOMRect {
    constructor(
      public x = 0,
      public y = 0,
      public width = 0,
      public height = 0,
    ) {}
    get top() {
      return this.y
    }
    get left() {
      return this.x
    }
    get right() {
      return this.x + this.width
    }
    get bottom() {
      return this.y + this.height
    }
    static fromRect(rect?: DOMRectInit) {
      return new DOMRect(rect?.x, rect?.y, rect?.width, rect?.height)
    }
    toJSON() {
      return { ...this }
    }
  } as unknown as typeof globalThis.DOMRect
}

/**
 * framer-motion las necesita: `matchMedia` para `useReducedMotion` (y
 * `TiltCard`, que además consulta `(hover: none)`) e `IntersectionObserver`
 * para el `whileInView` de `Reveal`. Sin estos, cualquier test que renderice
 * una sección de la landing revienta antes del primer assert.
 *
 * Los defaults describen el navegador de referencia: sin preferencia de
 * movimiento reducido y con puntero fino.
 */
if (!('matchMedia' in globalThis)) {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.matchMedia
}

if (!('IntersectionObserver' in globalThis)) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    root = null
    rootMargin = ''
    thresholds: readonly number[] = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  } as unknown as typeof globalThis.IntersectionObserver
}

// Radix las usa para el foco y el scroll dentro de los overlays.
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
Element.prototype.releasePointerCapture ??= function releasePointerCapture() {}
Element.prototype.hasPointerCapture ??= function hasPointerCapture() {
  return false
}

/**
 * `crypto.randomUUID` no existe en el `crypto` de jsdom (sí en los navegadores
 * objetivo, que lo exponen en contexto seguro — HTTPS y localhost). El store del
 * CMO lo usa para proponer el id del turno antes de enviarlo, así que sin esto
 * el test del turno en vivo revienta en la primera línea.
 *
 * No es un uuid criptográfico: es un identificador de correlación de una
 * petición, y en el test solo tiene que ser único y tener forma de uuid.
 */
if (typeof globalThis.crypto?.randomUUID !== "function") {
  let counter = 0
  // `crypto` mismo puede no existir. Antes se llamaba a `defineProperty` sobre
  // `undefined`, que revienta y se lleva por delante TODO el setup — un fallo
  // que no habla de lo que falta.
  if (globalThis.crypto === undefined) {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: {} })
  }
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => {
      counter += 1
      const tail = String(counter).padStart(12, "0")
      return `00000000-0000-4000-8000-${tail}` as `${string}-${string}-${string}-${string}-${string}`
    },
  })
}

/**
 * `AbortSignal.timeout` tampoco está en el jsdom que trae jest-environment-jsdom
 * (llegó en jsdom 21; el entorno de jest fija uno anterior). Los navegadores
 * objetivo lo tienen desde 2022 y el store lo usa para el presupuesto del turno.
 *
 * La réplica es fiel en lo que importa: aborta al vencer con `TimeoutError`. El
 * temporizador va `unref`ado donde se pueda para que un test no quede colgado
 * esperando 100 segundos.
 */
if (typeof AbortSignal.timeout !== "function") {
  Object.defineProperty(AbortSignal, "timeout", {
    configurable: true,
    value: (ms: number) => {
      const controller = new AbortController()
      const timer = setTimeout(() => {
        controller.abort(new DOMException("The operation timed out.", "TimeoutError"))
      }, ms)
      ;(timer as unknown as { unref?: () => void }).unref?.()
      return controller.signal
    },
  })
}
