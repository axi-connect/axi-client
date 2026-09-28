import { fireEvent, render, screen } from "@testing-library/react";

import type { CategoryTreeNodeDTO } from "@/modules/catalog/domain/category";
import { CategoryTree } from "../CategoryTree";

const node = (id: string, name: string, children: CategoryTreeNodeDTO[] = [], o: Partial<CategoryTreeNodeDTO> = {}): CategoryTreeNodeDTO =>
  ({
    id,
    parent_id: null,
    name,
    description: null,
    position: 0,
    is_active: true,
    origin: "platform",
    taxonomy_code: "t",
    search_aliases: [],
    created_at: "",
    updated_at: "",
    product_count: 0,
    children,
    ...o,
  }) as CategoryTreeNodeDTO;

const TREE = [
  node("facial", "Cuidado facial", [node("serums", "Sérums", [], { product_count: 9, search_aliases: ["serum", "suero", "concentrado", "booster"] })], { product_count: 1 }),
  node("kits", "Kits", [], { origin: "integration", taxonomy_code: null, product_count: 3 }),
  node("micro", "Microblading", [], { is_active: false }),
];

function setup(expanded = new Set<string>(["facial"]), canManage = true) {
  const handlers = { onToggle: jest.fn(), onCreateChild: jest.fn(), onEdit: jest.fn(), onRemove: jest.fn(), onShow: jest.fn() };
  render(<CategoryTree nodes={TREE} expanded={expanded} canManage={canManage} {...handlers} />);
  return handlers;
}

describe("CategoryTree (catálogo premium F4)", () => {
  it("cada fila: origen, sinónimos (3 y +N), productos y las acciones en la fila", () => {
    setup();
    expect(screen.getByRole("tree", { name: "Categorías" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Sérums" })).toHaveAttribute("aria-level", "2");
    expect(screen.getByRole("img", { name: "De la tienda conectada" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Oculta" })).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    // El conteo se pinta dos veces: bajo el nombre en el celular y en su columna desde `sm`.
    expect(screen.getAllByText("9 productos")).toHaveLength(2);
    expect(screen.getAllByText("1 producto")).toHaveLength(2);
    // Taxonomía se oculta; la de la tienda se elimina; la oculta se vuelve a mostrar
    expect(screen.getByRole("button", { name: "Ocultar Cuidado facial" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar Kits" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar Microblading" })).toBeInTheDocument();
  });

  it("las acciones llaman a su handler con la categoría", () => {
    const handlers = setup();
    fireEvent.click(screen.getByRole("button", { name: "Crear subcategoría en Sérums" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Kits" }));
    fireEvent.click(screen.getByRole("button", { name: "Mostrar Microblading" }));
    expect(handlers.onCreateChild).toHaveBeenCalledWith(expect.objectContaining({ id: "serums" }));
    expect(handlers.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "kits" }));
    expect(handlers.onShow).toHaveBeenCalledWith(expect.objectContaining({ id: "micro" }));
  });

  it("teclado: ↓ baja, ← pliega una rama abierta, → despliega una cerrada", () => {
    const handlers = setup();
    const facial = screen.getByRole("treeitem", { name: "Cuidado facial" });
    facial.focus();
    fireEvent.keyDown(facial, { key: "ArrowDown" });
    expect(screen.getByRole("treeitem", { name: "Sérums" })).toHaveFocus();
    fireEvent.keyDown(facial, { key: "ArrowLeft" });
    expect(handlers.onToggle).toHaveBeenCalledWith("facial");
  });

  it("sin permiso: se lee, sin acciones", () => {
    setup(new Set(), false);
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expandir Cuidado facial" })).toBeInTheDocument();
  });
});
