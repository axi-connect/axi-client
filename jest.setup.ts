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
