import { fireEvent, render, screen } from "@testing-library/react";
import type { AuditLog } from "../../../../domain/audit";
import { AuditLogRow } from "../AuditLogRow";

const log = (over: Partial<AuditLog>): AuditLog => ({
  id: "a-1",
  company_id: "t-1",
  actor_user_id: null,
  actor_type: "platform_admin",
  action: "platform.pricing_updated",
  entity_type: "pricing",
  entity_id: "ab12cd34-0000-0000-0000-000000000000",
  changes: { margin_multiplier: [1.25, 1.3] },
  ip: "190.85.1.1",
  trace_id: "01H9XKTRACE3F",
  occurred_at: "2026-07-17T11:00:00Z",
  ...over,
});

function renderRow(entry: AuditLog) {
  render(
    <ul>
      <AuditLogRow log={entry} tenantName="Acme Corp" />
    </ul>,
  );
}

describe("AuditLogRow", () => {
  it("una acción de riesgo lleva el borde rojo sutil", () => {
    renderRow(log({ action: "tenancy.impersonation_used", changes: null }));
    const item = screen.getByRole("listitem");
    expect(item.className).toContain("border-l-destructive/40");
  });

  it("una acción normal NO lleva el borde de riesgo", () => {
    renderRow(log({}));
    expect(screen.getByRole("listitem").className).not.toContain("border-l-destructive/40");
  });

  it("expandir muestra el JsonDiff con antes → después y el trace copiable", () => {
    renderRow(log({}));
    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("margin_multiplier")).toBeInTheDocument();
    expect(screen.getByText("1.25")).toBeInTheDocument();
    expect(screen.getByText("1.3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar trace/i })).toBeInTheDocument();
  });

  it("changes con forma desconocida cae a JSON crudo (nunca rompe)", () => {
    renderRow(log({ changes: { nota: "estructura libre" } }));
    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText(/estructura libre/)).toBeInTheDocument();
    expect(screen.getByText(/"nota"/)).toBeInTheDocument();
  });
});
