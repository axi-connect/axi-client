import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode, useState } from "react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "../dialog"

/**
 * QA H3-2: al cerrar, el foco vuelve al botón que abrió el diálogo. En modo
 * estricto (el de desarrollo), los efectos corren dos veces: una captura del
 * foco hecha en un efecto del contenido ya ve el foco DENTRO del diálogo.
 */

type CloseWay = "escape" | "close-button" | "primary-action"

function close(way: CloseWay) {
  const dialog = screen.getByRole("dialog")
  if (way === "escape") fireEvent.keyDown(dialog, { key: "Escape" })
  if (way === "close-button") fireEvent.click(screen.getByRole("button", { name: "Close" }))
  if (way === "primary-action") fireEvent.click(screen.getByRole("button", { name: "Guardar" }))
}

function Body({ onPrimary }: { onPrimary?: () => void }) {
  return (
    <DialogContent>
      <DialogTitle>Entrar como soporte</DialogTitle>
      <DialogDescription>Queda registrado.</DialogDescription>
      <input aria-label="Motivo" autoFocus />
      <DialogFooter>
        {onPrimary ? (
          <button type="button" onClick={onPrimary}>
            Guardar
          </button>
        ) : (
          <DialogClose asChild>
            <button type="button">Guardar</button>
          </DialogClose>
        )}
      </DialogFooter>
    </DialogContent>
  )
}

function Controlled() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <Body onPrimary={() => setOpen(false)} />
      </Dialog>
    </>
  )
}

function WithTrigger() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button">Abrir</button>
      </DialogTrigger>
      <Body />
    </Dialog>
  )
}

const WAYS: CloseWay[] = ["escape", "close-button", "primary-action"]

describe.each([
  ["controlado", Controlled],
  ["con DialogTrigger", WithTrigger],
])("DialogContent %s: el foco vuelve al botón (QA H3-2)", (_name, Component) => {
  it.each(WAYS)("al cerrar con %s", async (way) => {
    render(
      <StrictMode>
        <Component />
      </StrictMode>,
    )
    const opener = screen.getByRole("button", { name: "Abrir" })
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole("dialog", { name: "Entrar como soporte" })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Motivo" })))

    close(way)
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })
})
