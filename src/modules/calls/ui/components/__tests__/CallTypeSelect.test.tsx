import { fireEvent, render, screen } from "@testing-library/react";

import { CRM_CALL_TYPES } from "@/modules/calls/domain/playbooks";
import { CallTypeSelect } from "../CallTypeSelect";

describe("CallTypeSelect (plan de modos §7)", () => {
  it("en el CRM solo ofrece Venta, Reactivación y Seguimiento (auditoría M1)", () => {
    render(<CallTypeSelect types={CRM_CALL_TYPES} value="followup" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Tipo de llamada" }));
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Venta y seguimiento comercial", "Reactivación y postventa", "Seguimiento"]);
    expect(options).not.toContain("Cobranza");
    expect(options).not.toContain("Recordatorio de cita");
  });
});
