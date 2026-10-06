"use client";

import { createContext, useContext, type ReactNode } from "react";

import { APP_SHELL, type PieceId } from "@/modules/landing/ui/content/productos.content";
import { Glyph } from "./parts";

/** Quién abre una pieza desde la barra lateral (lo da ProductosPieces). */
export const PiecesNav = createContext<((id: PieceId) => void) | null>(null);

/**
 * La ventana del panel tal como es en la app: barra lateral con el negocio y
 * la navegación por secciones, cabecera con las migas y el contenido de la
 * pieza. La sección activa de la barra es la pieza que se ve, así el visitante
 * aprende dónde vive cada cosa; un clic en la barra abre esa pieza.
 *
 * La barra es decorativa para el teclado (el dock es el tablist): sus botones
 * llevan `tabIndex={-1}` para no duplicar paradas de foco.
 */
export function AppShell({ piece, children }: { piece: PieceId; children: ReactNode }) {
  const open = useContext(PiecesNav);
  const current = APP_SHELL.groups.flatMap((g) => g.items).find((i) => i.piece === piece);

  return (
    <div className="pp-app">
      <aside className="pp-app-side" aria-hidden="true">
        <div className="pp-app-brand">
          {/* El monograma de «Tecnología, Medellín», el negocio de la home. */}
          <span className="pp-app-logo" aria-hidden="true">
            {APP_SHELL.monogram}
          </span>
          <span>
            <b>{APP_SHELL.business}</b>
            <small>{APP_SHELL.role}</small>
          </span>
        </div>
        <nav className="pp-app-nav">
          <span className="pp-app-item" data-home="">
            <Glyph d={APP_SHELL.home.icon} size={17} />
            {APP_SHELL.home.label}
          </span>
          {APP_SHELL.groups.map((group) => (
            <div key={group.label} className="pp-app-group">
              <span className="pp-app-group-label">{group.label}</span>
              {group.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  tabIndex={-1}
                  className="pp-app-item"
                  data-on={item.piece === piece ? "" : undefined}
                  onClick={() => (item.piece && open ? open(item.piece) : undefined)}
                >
                  <Glyph d={item.icon} size={17} />
                  <span className="pp-grow">{item.label}</span>
                  {item.badge ? <span className="pp-app-badge">{item.badge}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="pp-app-me">
          <span className="pp-av">LA</span>
          <span>
            <b>{APP_SHELL.me.name}</b>
            <small>{APP_SHELL.me.mail}</small>
          </span>
        </div>
      </aside>
      <div className="pp-app-main">
        <header className="pp-app-top" aria-hidden="true">
          <span className="pp-app-crumbs">
            {APP_SHELL.crumbRoot}
            <span>/</span>
            <b>{current?.label ?? ""}</b>
          </span>
          <span className="pp-grow" />
          <span className="pp-app-search">
            <Glyph d={APP_SHELL.searchIcon} size={14} />
            {APP_SHELL.search}
            <kbd>⌘K</kbd>
          </span>
          <span className="pp-app-icon">
            <Glyph d={APP_SHELL.bellIcon} size={16} />
          </span>
        </header>
        <div className="pp-app-body">{children}</div>
      </div>
    </div>
  );
}
