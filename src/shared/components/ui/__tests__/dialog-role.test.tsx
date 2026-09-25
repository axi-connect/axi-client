import { render, screen } from "@testing-library/react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../dialog"

describe("DialogContent (QA H2-11)", () => {
  it("es un diálogo modal para el lector de pantalla, con su título", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Entrar como soporte</DialogTitle>
          <DialogDescription>Queda registrado.</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    const dialog = screen.getByRole("dialog", { name: "Entrar como soporte" })
    expect(dialog).toHaveAttribute("aria-modal", "true")
  })
})
