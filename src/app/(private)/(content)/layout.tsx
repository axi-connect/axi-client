/**
 * Wrapper de las vistas de contenido (dashboard, admin, settings): centra el
 * contenido a 80rem con los gutters estándar sobre la superficie full-width
 * del layout privado. Las vistas de aplicación (workspace) viven fuera de
 * este grupo y son full-bleed. Ver DESIGN-SYSTEM §4.2.
 */
export default function ContentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</div>;
}
