import { fireEvent, render, screen } from "@testing-library/react";
import type { HsmHeaderMediaDTO } from "@/modules/marketing/domain/template-catalog";
import { TemplateMediaHeader } from "../TemplateMediaHeader";

const MEDIA: HsmHeaderMediaDTO = {
  mode: "fixed",
  kind: "image",
  storage_key: "companies/c1/hsm_templates/obj",
  mime_type: "image/jpeg",
  byte_size: 412_000,
  handle: "4::aW",
  file_name: "coleccion.jpg",
  preview_url: "https://s3.test/firmada",
};

describe("TemplateMediaHeader · la cabecera de medio en una burbuja", () => {
  it("con copia de axi enseña la imagen de verdad", () => {
    render(<TemplateMediaHeader kind="image" media={MEDIA} />);
    expect(screen.getByRole("img", { name: "Imagen de la plantilla" })).toHaveAttribute("src", "https://s3.test/firmada");
  });

  it("si la URL firmada caducó, vuelve al hueco con icono en vez de una imagen rota", () => {
    render(<TemplateMediaHeader kind="image" media={MEDIA} />);
    fireEvent.error(screen.getByRole("img", { name: "Imagen de la plantilla" }));

    expect(screen.getByRole("img", { name: "Imagen de la plantilla" }).tagName).toBe("SPAN");
  });

  it("sin copia (creada en Meta) enseña el hueco; el video, su póster", () => {
    const { rerender } = render(<TemplateMediaHeader kind="image" media={null} />);
    expect(screen.getByText("Imagen de la plantilla")).toBeInTheDocument();
    rerender(<TemplateMediaHeader kind="video" media={null} />);
    expect(screen.getByRole("img", { name: "Video de la plantilla" })).toBeInTheDocument();
  });

  it("un documento dice su nombre", () => {
    render(<TemplateMediaHeader kind="document" media={{ ...MEDIA, kind: "document", file_name: "catalogo.pdf" }} />);
    expect(screen.getByText("catalogo.pdf")).toBeInTheDocument();
  });
});
