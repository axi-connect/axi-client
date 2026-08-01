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

// Radix las usa para el foco y el scroll dentro de los overlays.
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
Element.prototype.releasePointerCapture ??= function releasePointerCapture() {}
Element.prototype.hasPointerCapture ??= function hasPointerCapture() {
  return false
}
