import { act, renderHook } from "@testing-library/react";
import { useJevCategoryReview } from "../use-jev-category-review";
import { reviewTemplateCategory } from "@/modules/marketing/infrastructure/services/templates-service.adapter";
import type { TemplateCategoryReview } from "@/modules/marketing/domain/template-category-review";

jest.mock("@/modules/marketing/infrastructure/services/templates-service.adapter", () => ({
  reviewTemplateCategory: jest.fn(),
}));

const reviewMock = reviewTemplateCategory as jest.MockedFunction<typeof reviewTemplateCategory>;

const LONG = "Hola {{1}}, tu prueba empieza hoy. Si continúas, quedas en el plan Crecimiento.";
const OTHER = "Hola {{1}}, confirmamos que tu prueba comenzó hoy. Tu panel está listo.";

const REVIEW: TemplateCategoryReview = {
  category: "marketing",
  confidence: 0.92,
  probabilities: { marketing: 0.92, utility: 0.07, authentication: 0.01 },
  confident: true,
  source: "jev",
  signals: [],
  review_key: "k",
};

function draft(body: string) {
  return { body, header: null, footer: null };
}

/** Deja correr las promesas resueltas (el `then` del hook). */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useJevCategoryReview — no evalúa cada tecla (hotfix 131049)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reviewMock.mockReset();
    reviewMock.mockResolvedValue(REVIEW);
  });
  afterEach(() => jest.useRealTimers());

  it("escribir seguido no llama; tras 1,8 s de pausa, UNA sola revisión", async () => {
    const { result, rerender } = renderHook(({ body }) => useJevCategoryReview(draft(body)), {
      initialProps: { body: LONG },
    });
    for (const suffix of [" a", " ab", " abc"]) {
      rerender({ body: `${LONG}${suffix}` });
      act(() => jest.advanceTimersByTime(500));
    }
    expect(reviewMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("settling");

    act(() => jest.advanceTimersByTime(1_800));
    await settle();

    expect(reviewMock).toHaveBeenCalledTimes(1);
    expect(reviewMock.mock.calls[0]?.[0].body).toBe(`${LONG} abc`);
    expect(result.current).toMatchObject({ status: "ready", review: REVIEW });
  });

  it("mayúsculas o espacios no cuentan como cambio; volver a un texto revisado no llama", async () => {
    const { rerender } = renderHook(({ body }) => useJevCategoryReview(draft(body)), {
      initialProps: { body: LONG },
    });
    act(() => jest.advanceTimersByTime(1_800));
    await settle();

    rerender({ body: `  ${LONG.toUpperCase()}  ` });
    act(() => jest.advanceTimersByTime(5_000));
    rerender({ body: LONG });
    act(() => jest.advanceTimersByTime(5_000));

    expect(reviewMock).toHaveBeenCalledTimes(1);
  });

  it("salir del campo revisa ya, sin esperar la pausa", async () => {
    const { result } = renderHook(() => useJevCategoryReview(draft(LONG)));
    act(() => result.current.flush());
    await settle();
    expect(reviewMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("ready");
  });

  it("si el texto cambia con una revisión en vuelo, la vieja se aborta", async () => {
    let firstSignal: AbortSignal | undefined;
    reviewMock.mockImplementationOnce((_draft, signal) => {
      firstSignal = signal;
      return new Promise(() => {});
    });
    const { rerender } = renderHook(({ body }) => useJevCategoryReview(draft(body)), {
      initialProps: { body: LONG },
    });
    act(() => jest.advanceTimersByTime(1_800));
    rerender({ body: OTHER });
    act(() => jest.advanceTimersByTime(1_800));
    await settle();

    expect(firstSignal?.aborted).toBe(true);
    expect(reviewMock).toHaveBeenCalledTimes(2);
  });

  it("un texto corto no se revisa", () => {
    const { result } = renderHook(() => useJevCategoryReview(draft("Hola {{1}}")));
    act(() => jest.advanceTimersByTime(5_000));
    expect(reviewMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("antes de enviar: reutiliza lo revisado o espera la revisión", async () => {
    const { result } = renderHook(() => useJevCategoryReview(draft(LONG)));
    let fresh: TemplateCategoryReview | null = null;
    await act(async () => {
      fresh = await result.current.ensureFresh();
    });
    expect(fresh).toEqual(REVIEW);
    await act(async () => {
      await result.current.ensureFresh();
    });
    expect(reviewMock).toHaveBeenCalledTimes(1);
  });

  it("si la revisión falla, se queda el último veredicto y no hay alerta", async () => {
    const { result, rerender } = renderHook(({ body }) => useJevCategoryReview(draft(body)), {
      initialProps: { body: LONG },
    });
    act(() => jest.advanceTimersByTime(1_800));
    await settle();
    reviewMock.mockRejectedValueOnce(new Error("429"));
    rerender({ body: OTHER });
    act(() => jest.advanceTimersByTime(1_800));
    await settle();
    await settle();
    expect(result.current).toMatchObject({ status: "unavailable", review: REVIEW });
  });
});
