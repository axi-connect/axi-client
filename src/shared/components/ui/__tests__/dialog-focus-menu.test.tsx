import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
// El menú enfoca su primer ítem en un requestAnimationFrame.
import { StrictMode, useState } from "react"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "../dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu"

/**
 * QA H5-1: «⋮ → Eliminar», el patrón de todo el panel. El último elemento
 * enfocado fuera del diálogo es el ítem del menú, que se desmonta; el foco
 * tiene que volver al botón ⋮.
 */
function MenuThenDialog() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Acciones de Acme">
            ⋮
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setOpen(true)}>Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Eliminar Acme</DialogTitle>
          <DialogDescription>No se puede deshacer.</DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <button type="button">Cancelar</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

async function openFromMenu() {
  const trigger = screen.getByRole("button", { name: "Acciones de Acme" })
  trigger.focus()
  fireEvent.click(trigger)
  const item = await screen.findByRole("menuitem", { name: "Eliminar" })
  item.focus()
  await act(async () => {
    fireEvent.click(item)
  })
  await screen.findByRole("dialog", { name: "Eliminar Acme" })
  return trigger
}

describe("diálogo abierto desde un ítem de menú (QA H5-1)", () => {
  it.each(["escape", "close-button", "cancel"] as const)("al cerrar con %s el foco vuelve al botón ⋮", async (way) => {
    render(
      <StrictMode>
        <MenuThenDialog />
      </StrictMode>,
    )
    const trigger = await openFromMenu()
    const dialog = screen.getByRole("dialog")
    if (way === "escape") fireEvent.keyDown(dialog, { key: "Escape" })
    if (way === "close-button") fireEvent.click(screen.getByRole("button", { name: "Close" }))
    if (way === "cancel") fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
