import { render, screen } from "@testing-library/react";

let params = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => params,
}));

/* eslint-disable @typescript-eslint/no-require-imports -- el mock de arriba
   exige require() tras jest.mock (import estático se izaría antes del mock) */
const { OAuthCallbackView } =
  require("../OAuthCallbackView") as typeof import("../OAuthCallbackView");
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * F11: el aterrizaje del alta OAuth no llama a ninguna API — cuenta el
 * resultado que viene en la URL y ofrece el siguiente paso. Un callback cojo
 * (ok sin id, sin status) se trata como error con reintento.
 */
describe("OAuthCallbackView", () => {
  it("con status=ok lleva al detalle de la integración creada", () => {
    params = new URLSearchParams(
      "provider=salesforce&status=ok&integration_id=int-9",
    );
    render(<OAuthCallbackView />);

    expect(screen.getByText("Todo listo")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Configurar y sincronizar/i }),
    ).toHaveAttribute("href", "/settings/integrations/int-9");
  });

  it("con status=error muestra el motivo tal cual y ofrece reintentar", () => {
    params = new URLSearchParams(
      "provider=salesforce&status=error&message=El%20usuario%20cancel%C3%B3",
    );
    render(<OAuthCallbackView />);

    expect(screen.getByText("El usuario canceló")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Reintentar/i })).toHaveAttribute(
      "href",
      "/settings/integrations/connect?provider=salesforce",
    );
  });

  it("un callback cojo (ok sin integration_id) se trata como error", () => {
    params = new URLSearchParams("provider=salesforce&status=ok");
    render(<OAuthCallbackView />);

    expect(screen.getByText("La conexión no se completó")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Reintentar/i }),
    ).toBeInTheDocument();
  });
});
