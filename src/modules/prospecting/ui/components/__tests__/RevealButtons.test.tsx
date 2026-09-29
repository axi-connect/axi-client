import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { RevealButtons, type RevealTarget } from "../RevealButtons";

afterEach(cleanup);

const COSTS = { email: 1, phone: 8 };

function target(overrides: Partial<RevealTarget> = {}): RevealTarget {
  return {
    id: "p-1",
    masked: true,
    revealable: true,
    email: null,
    phone: null,
    has_email: true,
    has_phone: true,
    in_crm: false,
    ...overrides,
  };
}

describe("RevealButtons", () => {
  it("DICE LO QUE CUESTA ANTES DE PULSAR, con el precio de la cuenta", () => {
    render(<RevealButtons target={target()} costs={COSTS} busy={false} waitingPhone={false} onReveal={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Revelar correo · 1 crédito" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Revelar celular · 8 créditos" })).toBeTruthy();
  });

  it("el celular pide también el correo: una sola llamada a Apollo", () => {
    const onReveal = jest.fn();
    render(<RevealButtons target={target()} costs={COSTS} busy={false} waitingPhone={false} onReveal={onReveal} />);
    fireEvent.click(screen.getByRole("button", { name: /celular/ }));
    expect(onReveal).toHaveBeenCalledWith(["email", "phone"]);
  });

  it("LO QUE APOLLO NO TIENE NO SE OFRECE: pagar por nada no es una opción", () => {
    render(
      <RevealButtons
        target={target({ has_phone: false })}
        costs={COSTS}
        busy={false}
        waitingPhone={false}
        onReveal={jest.fn()}
      />,
    );
    const phone = screen.getByRole("button", { name: "Apollo no tiene su celular" }) as HTMLButtonElement;
    expect(phone.disabled).toBe(true);
  });

  it("revelado, el dato ocupa el sitio del botón", () => {
    render(
      <RevealButtons
        target={target({ masked: false, email: "carolina@labrasa.com.co" })}
        costs={COSTS}
        busy={false}
        waitingPhone={false}
        onReveal={jest.fn()}
      />,
    );
    expect(screen.getByText("carolina@labrasa.com.co")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /correo/ })).toBeNull();
  });

  it("mientras llega el celular: «Esperando a Apollo…»", () => {
    render(<RevealButtons target={target()} costs={COSTS} busy={false} waitingPhone onReveal={jest.fn()} />);
    expect(screen.getByRole("status").textContent).toContain("Esperando a Apollo");
  });

  it("sin precio declarado dice «–», nunca un número inventado", () => {
    render(
      <RevealButtons
        target={target()}
        costs={{ email: null, phone: null }}
        busy={false}
        waitingPhone={false}
        onReveal={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Revelar correo" }).textContent).toContain("–");
  });

  it("ya en el CRM no se revela nada", () => {
    render(
      <RevealButtons target={target({ in_crm: true })} costs={COSTS} busy={false} waitingPhone={false} onReveal={jest.fn()} />,
    );
    expect(screen.getByText("Ya en tu CRM")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
