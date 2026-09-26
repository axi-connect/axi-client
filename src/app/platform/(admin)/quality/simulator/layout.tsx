/**
 * El simulacro es una vista de APLICACIÓN (DESIGN-SYSTEM §4.2): en escritorio
 * con alto suficiente (`app-fit`) ocupa exactamente el alto que queda bajo el
 * título y las tabs, y cada columna —rail, chat, inspector— scrollea por
 * dentro. El marcador vive en el layout para que `loading.tsx` lo herede.
 */
export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-app-view className="flex w-full flex-col app-fit:min-h-0 app-fit:flex-1">
      {children}
    </div>
  );
}
