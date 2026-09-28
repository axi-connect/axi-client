import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { OrdersPanel, ORDERS_PANEL_PAGE_SIZE, sortOrdersForPanel } from "../OrdersPanel"
import type { ConversationDTO } from "@/modules/inbox/domain/inbox"

jest.mock("@/modules/documents/public", () => ({ DocumentsList: () => null }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))
const listOrders = jest.fn()
jest.mock("@/modules/orders/public", () => {
  const actual = jest.requireActual("@/modules/orders/domain/order")
  return {
    ...actual,
    listOrders: (...args: unknown[]) => listOrders(...args),
  }
})

const order = (over: Record<string, unknown>) => ({
  id: "o1",
  order_number: 3391,
  payment_state: "partially_paid",
  total_cents: 438000000,
  paid_cents: 131400000,
  balance_cents: 306600000,
  currency: "COP",
  service_date: "2026-11-14",
  created_at: "2026-09-20T10:00:00Z",
  items: [{ product_name: "Santa Marta · 2 personas" }],
  payments: [],
  ...over,
})
const props = { conversation: {} as ConversationDTO, contactId: "k1", contextVersion: 0 }

beforeEach(() => listOrders.mockReset())

describe("OrdersPanel — los pedidos del contacto (F4 · D5)", () => {
  it("filtra en el servidor por contacto con página chica", async () => {
    listOrders.mockResolvedValue({ data: [], meta: { total: 0 } })
    render(<OrdersPanel {...props} />)
    await waitFor(() => expect(listOrders).toHaveBeenCalledTimes(1))
    expect(listOrders).toHaveBeenCalledWith(expect.objectContaining({ contact_id: "k1", page_size: ORDERS_PANEL_PAGE_SIZE }))
    expect(ORDERS_PANEL_PAGE_SIZE).toBeLessThanOrEqual(10)
    expect(await screen.findByText("Aún no tiene pedidos")).toBeInTheDocument()
  })

  it("con saldo primero, con su cobro y su saldo", async () => {
    listOrders.mockResolvedValue({
      data: [order({ id: "paid", order_number: 2210, payment_state: "paid", created_at: "2026-09-25T10:00:00Z", items: [{ product_name: "Cartagena" }] }), order({})],
      meta: { total: 2 },
    })
    render(<OrdersPanel {...props} />)
    const cards = await screen.findAllByRole("listitem")
    expect(cards[0]).toHaveTextContent("Santa Marta · 2 personas")
    expect(cards[0]).toHaveTextContent("Abonado")
    expect(cards[0]).toHaveTextContent("Saldo")
    expect(cards[1]).toHaveTextContent("Pagado")
    expect(screen.getAllByRole("link", { name: /Abrir el pedido/ })[0]).toHaveAttribute("href", "/orders/o1")
  })

  it("error con reintento que vuelve a pedir", async () => {
    listOrders.mockRejectedValueOnce(new Error("red")).mockResolvedValueOnce({ data: [], meta: { total: 0 } })
    render(<OrdersPanel {...props} />)
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }))
    expect(await screen.findByText("Aún no tiene pedidos")).toBeInTheDocument()
    expect(listOrders).toHaveBeenCalledTimes(2)
  })

  it("al cambiar de contacto NO se ve ni un instante lo del anterior (auditoría F4-H1)", async () => {
    listOrders.mockResolvedValueOnce({ data: [order({ items: [{ product_name: "Viaje de Laura" }] })], meta: { total: 1 } })
    const { rerender } = render(<OrdersPanel {...props} contactId="laura" />)
    expect(await screen.findByText("Viaje de Laura")).toBeInTheDocument()
    // El siguiente contacto: su respuesta todavía no llega.
    listOrders.mockReturnValueOnce(new Promise(() => {}))
    rerender(<OrdersPanel {...props} contactId="mariana" />)
    expect(screen.queryByText("Viaje de Laura")).not.toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Cargando los pedidos" })).toBeInTheDocument()
  })

  it("un refresco del MISMO contacto conserva lo que hay a la vista (no parpadea)", async () => {
    listOrders.mockResolvedValueOnce({ data: [order({ items: [{ product_name: "Viaje de Laura" }] })], meta: { total: 1 } })
    const { rerender } = render(<OrdersPanel {...props} contactId="laura" />)
    expect(await screen.findByText("Viaje de Laura")).toBeInTheDocument()
    listOrders.mockReturnValueOnce(new Promise(() => {}))
    rerender(<OrdersPanel {...props} contactId="laura" contextVersion={1} />)
    expect(screen.getByText("Viaje de Laura")).toBeInTheDocument()
  })

  it("con más pedidos que la página, lleva a la ficha con el total (auditoría F4-H2)", async () => {
    listOrders.mockResolvedValue({ data: [order({})], meta: { total: 14 } })
    render(<OrdersPanel {...props} />)
    expect(await screen.findByRole("link", { name: /Ver los 14 pedidos en la ficha/ })).toHaveAttribute("href", "/crm/contacts/k1")
  })

  it("sortOrdersForPanel: saldo antes que pagado, y el más reciente primero", () => {
    const sorted = sortOrdersForPanel([
      order({ id: "a", payment_state: "paid", created_at: "2026-09-26T00:00:00Z" }),
      order({ id: "b", created_at: "2026-09-01T00:00:00Z" }),
      order({ id: "c", payment_state: "unpaid", created_at: "2026-09-10T00:00:00Z" }),
    ] as never)
    expect(sorted.map((o) => o.id)).toEqual(["c", "b", "a"])
  })
})
