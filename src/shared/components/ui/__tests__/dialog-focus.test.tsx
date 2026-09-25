import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../dialog"

function Controlled() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Entrar como soporte</DialogTitle>
          <DialogDescription>Queda registrado.</DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  )
}

describe("DialogContent: el foco al cerrar (QA H3-2)", () => {
  it("un diálogo CONTROLADO devuelve el foco a quien lo abrió, no a <body>", async () => {
    render(<Controlled />)
    const opener = screen.getByRole("button", { name: "Abrir" })
    opener.focus()
    fireEvent.click(opener)
    const dialog = await screen.findByRole("dialog", { name: "Entrar como soporte" })
    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(document.activeElement).toBe(opener)
  })

  it("con DialogTrigger, el foco vuelve al trigger", async () => {
    render(
      <Dialog>
        <DialogTrigger>Abrir con trigger</DialogTrigger>
        <DialogContent>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>x</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    const trigger = screen.getByRole("button", { name: "Abrir con trigger" })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = await screen.findByRole("dialog")
    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(document.activeElement).toBe(trigger)
  })
})
