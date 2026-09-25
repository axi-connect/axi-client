import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";

const calls: string[] = [];
jest.mock("../../platform-client", () => ({
  platformClient: {
    GET: jest.fn(async () => ({
      data: {
        data: [
          { id: "s-mia-activa", status: "active", platform_user: { id: "adm-1", name: "Camila", email: "c@a.co" } },
          { id: "s-mia-pendiente", status: "pending", platform_user: { id: "adm-1", name: "Camila", email: "c@a.co" } },
          { id: "s-mia-cerrada", status: "ended", platform_user: { id: "adm-1", name: "Camila", email: "c@a.co" } },
          { id: "s-de-otro", status: "active", platform_user: { id: "adm-2", name: "Otro", email: "o@a.co" } },
        ],
      },
    })),
    DELETE: jest.fn(async (_path: string, init: { params: { path: { id: string } } }) => {
      calls.push(`DELETE ${init.params.path.id}`);
      return { data: { session_id: init.params.path.id, already_ended: false } };
    }),
    POST: jest.fn(async () => {
      calls.push("POST");
      return { data: { session_id: "s-nueva", handoff_code: "c".repeat(43), expires_in: 60 } };
    }),
  },
}));

function token(sub: string) {
  const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${b64({ alg: "HS256" })}.${b64({ sub, platform_role: "super_admin" })}.x`;
}
jest.mock("../../../auth/token-storage", () => ({ getPlatformToken: () => token("adm-1") }));

import { useIssueSupportSession } from "../use-support-sessions";

describe("useIssueSupportSession (QA H3-5)", () => {
  it("cierra las sesiones abiertas del mismo admin en el tenant y luego emite la nueva", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useIssueSupportSession("t-1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ reason: "Dejar lista la cuenta para la entrega", minutes: 60, password: "x" });
    });
    expect(calls).toEqual(["DELETE s-mia-activa", "DELETE s-mia-pendiente", "POST"]);
  });
});
