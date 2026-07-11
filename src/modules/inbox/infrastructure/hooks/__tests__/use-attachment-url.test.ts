import { act, renderHook, waitFor } from "@testing-library/react"
import {
  clearAttachmentUrlCache,
  getFreshAttachmentUrl,
  useAttachmentUrl,
} from "../use-attachment-url"
import { getAttachmentUrl } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"

jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  getAttachmentUrl: jest.fn(),
}))

const mockedGetAttachmentUrl = getAttachmentUrl as jest.MockedFunction<typeof getAttachmentUrl>

describe("use-attachment-url (cache de URLs firmadas)", () => {
  beforeEach(() => {
    clearAttachmentUrlCache()
    mockedGetAttachmentUrl.mockReset()
    mockedGetAttachmentUrl.mockResolvedValue({ url: "https://s3/u1", expires_in_seconds: 300 })
  })

  it("getFreshAttachmentUrl: cachea y dedupea peticiones concurrentes", async () => {
    const [first, second] = await Promise.all([
      getFreshAttachmentUrl("c1", "m1", "a1"),
      getFreshAttachmentUrl("c1", "m1", "a1"),
    ])
    expect(first).toBe("https://s3/u1")
    expect(second).toBe("https://s3/u1")
    expect(mockedGetAttachmentUrl).toHaveBeenCalledTimes(1)

    // Cache hit dentro del TTL: sin nueva petición
    await getFreshAttachmentUrl("c1", "m1", "a1")
    expect(mockedGetAttachmentUrl).toHaveBeenCalledTimes(1)
  })

  it("expirada (TTL - margen agotado): re-pide", async () => {
    mockedGetAttachmentUrl.mockResolvedValueOnce({ url: "https://s3/u1", expires_in_seconds: 10 })
    await getFreshAttachmentUrl("c1", "m1", "a1")
    // 10 s - 30 s de margen < 0 → la entrada nace expirada
    await getFreshAttachmentUrl("c1", "m1", "a1")
    expect(mockedGetAttachmentUrl).toHaveBeenCalledTimes(2)
  })

  it("hook con enabled=false: no pide hasta habilitar (carga perezosa)", async () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useAttachmentUrl("c1", "m1", "a1", { enabled }),
      { initialProps: { enabled: false } },
    )
    expect(result.current.status).toBe("idle")
    expect(mockedGetAttachmentUrl).not.toHaveBeenCalled()

    rerender({ enabled: true })
    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(result.current.url).toBe("https://s3/u1")
  })

  it("refresh(): invalida la entrada y re-pide", async () => {
    const { result } = renderHook(() => useAttachmentUrl("c1", "m1", "a1"))
    await waitFor(() => expect(result.current.status).toBe("ready"))

    mockedGetAttachmentUrl.mockResolvedValue({ url: "https://s3/u2", expires_in_seconds: 300 })
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.url).toBe("https://s3/u2"))
    expect(mockedGetAttachmentUrl).toHaveBeenCalledTimes(2)
  })

  it("fallo de red: status error y la cache no queda envenenada", async () => {
    mockedGetAttachmentUrl.mockRejectedValueOnce(new Error("network"))
    const { result } = renderHook(() => useAttachmentUrl("c1", "m1", "a1"))
    await waitFor(() => expect(result.current.status).toBe("error"))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.status).toBe("ready"))
  })
})
