import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/shared/components/features/empty-state";

/**
 * `EmptyState` no tenía test y ahora sirve a los dos materiales de ilustración
 * del sistema (DESIGN-SYSTEM §7). Lo que se blinda aquí es la bisagra: que el
 * material viejo sigue funcionando sin tocar sus 34 llamadas, y que el nuevo
 * retira el disco teñido — que es una decisión de diseño, no un descuido.
 */
describe("EmptyState", () => {
  it("con `icon` mantiene el disco teñido y su acento", () => {
    const { container } = render(
      <EmptyState icon={Inbox} accent="amber" title="Sin conversaciones" />,
    );
    const disc = container.querySelector("span.rounded-full");
    expect(disc).not.toBeNull();
    expect(disc?.getAttribute("class")).toContain("bg-accent-amber/10");
    expect(container.querySelector("svg.glass-glyph")).toBeNull();
  });

  it("con `glyph` pinta el cristal y NO pinta el disco", () => {
    // El glifo ya trae su propio pedestal; un círculo tintado detrás de un
    // objeto de vidrio se lee como dos platos compitiendo.
    const { container } = render(
      <EmptyState glyph="conversation" title="Sin conversaciones" />,
    );
    expect(container.querySelector("svg.glass-glyph")).not.toBeNull();
    expect(container.querySelector("span.rounded-full")).toBeNull();
  });

  it("el glifo entra a tamaño md, el del estado vacío estándar", () => {
    const { container } = render(
      <EmptyState glyph="catalog" title="Aún no tienes productos" />,
    );
    expect(container.querySelector("svg")?.getAttribute("class")).toContain(
      "glass-glyph--md",
    );
  });

  it("pinta título, descripción y la acción que le pasa la vista", () => {
    render(
      <EmptyState
        glyph="catalog"
        title="Aún no tienes productos"
        description="Crea el primero para que tu equipo y la IA puedan ofrecerlo."
        action={<button type="button">Crear producto</button>}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Aún no tienes productos" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Crea el primero/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear producto" }),
    ).toBeInTheDocument();
  });

  it("`dashed` es «aún no hay nada» y `solid` es «no hay resultados»", () => {
    // Son mensajes distintos y el borde es lo que los separa visualmente:
    // el punteado convive con una página vacía, el sólido con contenido.
    const { container: dashed } = render(
      <EmptyState glyph="catalog" title="x" />,
    );
    expect(dashed.firstElementChild?.getAttribute("class")).toContain(
      "border-dashed",
    );
    const { container: solid } = render(
      <EmptyState glyph="noresults" title="x" variant="solid" />,
    );
    expect(solid.firstElementChild?.getAttribute("class")).toContain(
      "bg-background",
    );
  });

  it("la caja no es interactiva: sin `glass-host`, sin enlace y sin botón propio", () => {
    // Un reflejo que se enciende al pasar por encima de algo que no hace nada
    // promete una interacción inexistente (DESIGN-SYSTEM §6).
    const { container } = render(
      <EmptyState glyph="uptodate" title="Todo en orden" />,
    );
    expect(container.querySelector(".glass-host")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });
});
