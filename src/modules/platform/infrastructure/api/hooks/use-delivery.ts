"use client";

/**
 * Hooks de «Preparar entrega» (TanStack Query + `deliveryApi`).
 *
 * - Las vistas previas (correo + kit, y el precio de la oferta) esperan a que
 *   el borrador deje de cambiar: una llamada por pausa, no una por tecla.
 *   Mientras llega la nueva se sigue viendo la anterior (`keepPreviousData`),
 *   así el iframe no parpadea en blanco.
 * - Enviar y reenviar invalidan la entrega y la lista de tenants (el estado
 *   de la prueba cambia al enviar).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { isHttpError } from "@/core/api/problem";
import { deliveryApi } from "../delivery-api";
import type {
  CreateDeliveryWire,
  DeliveryDraftWire,
  DeliveryResponseWire,
  OfferSelectionWire,
} from "../delivery.dto";
import { platformKeys } from "../query-keys";

/** Pausa tras la última edición antes de pedir la vista previa del correo y el kit. */
export const DELIVERY_PREVIEW_DEBOUNCE_MS = 700;
/** El precio responde antes: es una consulta liviana y se mira mientras se elige. */
export const OFFER_QUOTE_DEBOUNCE_MS = 400;
/** Mientras el correo está en cola, la entrega se refresca sola. */
export const DELIVERY_QUEUED_POLL_MS = 5_000;
/**
 * Enviada y el dueño aún sin contraseña: la ficha y «Bienvenida enviada» se
 * enteran solas de que la creó. Más espaciado que la cola: puede tardar horas.
 */
export const DELIVERY_PASSWORD_POLL_MS = 30_000;

/**
 * El valor, pero solo cuando lleva `delayMs` sin cambiar. Compara por
 * contenido (JSON), no por identidad: un objeto nuevo con lo mismo no
 * reinicia la espera ni dispara otra consulta.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const serialized = JSON.stringify(value ?? null);
  const [debounced, setDebounced] = useState<{ key: string; value: T }>({ key: serialized, value });

  useEffect(() => {
    if (serialized === debounced.key) return;
    const timer = setTimeout(() => setDebounced({ key: serialized, value }), delayMs);
    return () => clearTimeout(timer);
    // `value` va implícito en `serialized`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, delayMs, debounced.key]);

  return debounced.value;
}

export function useDeliveryContext(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.delivery.context(tenantId),
    queryFn: ({ signal }) => deliveryApi.context(tenantId, signal),
    staleTime: 30_000,
    // Al volver de la pestaña de soporte (H2-5), los bloqueos resueltos se van.
    refetchOnWindowFocus: "always",
  });
}

function isQueued(payload: DeliveryResponseWire | undefined): boolean {
  const status = payload?.delivery?.status;
  return status === "committed" || status === "mail_queued";
}

function awaitsPassword(payload: DeliveryResponseWire | undefined): boolean {
  const delivery = payload?.delivery;
  return delivery?.status === "sent" && delivery.password_set_at === null;
}

/** Cada cuánto se refresca la última entrega; false = no hace falta. */
export function latestDeliveryPollMs(payload: DeliveryResponseWire | undefined): number | false {
  if (isQueued(payload)) return DELIVERY_QUEUED_POLL_MS;
  if (awaitsPassword(payload)) return DELIVERY_PASSWORD_POLL_MS;
  return false;
}

/** La última entrega con sus intentos (la tarjeta de la ficha y el estado «enviado»). */
export function useLatestDelivery(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.delivery.latest(tenantId),
    queryFn: ({ signal }) => deliveryApi.latest(tenantId, signal),
    staleTime: 15_000,
    refetchInterval: (query) => latestDeliveryPollMs(query.state.data),
  });
}

/**
 * Uso de la prueba y puesta en marcha de la ficha. Cambia despacio (una
 * conversación nueva, un paso cerrado): un minuto de frescura basta.
 */
export function useTrialProgress(tenantId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: platformKeys.delivery.trialProgress(tenantId),
    queryFn: ({ signal }) => deliveryApi.trialProgress(tenantId, signal),
    staleTime: 60_000,
    enabled,
    // Un 403 (rol sin acceso) no mejora reintentando.
    retry: (count, error) => !(isHttpError(error) && error.status === 403) && count < 2,
  });
}

export function useOfferCatalog() {
  return useQuery({
    queryKey: platformKeys.delivery.offerCatalog(),
    queryFn: ({ signal }) => deliveryApi.offerCatalog(signal),
    staleTime: 5 * 60_000,
  });
}

/**
 * Vista previa del correo (dueño y equipo) y del kit, con los bloqueos y
 * avisos. `draft = null` = aún no hay datos para pedirla.
 */
export function useDeliveryPreview(
  tenantId: string,
  draft: DeliveryDraftWire | null,
  delayMs: number = DELIVERY_PREVIEW_DEBOUNCE_MS,
) {
  const debounced = useDebouncedValue(draft, delayMs);
  const query = useQuery({
    queryKey: platformKeys.delivery.preview(tenantId, debounced),
    queryFn: ({ signal }) => deliveryApi.preview(tenantId, debounced!, signal),
    enabled: debounced !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: "always",
    retry: false,
  });
  const settling = useMemo(
    () => JSON.stringify(draft ?? null) !== JSON.stringify(debounced ?? null),
    [draft, debounced],
  );
  /** Lo que se ve ya corresponde a lo que hay escrito (ni esperando ni cargando). */
  const upToDate = !settling && !query.isFetching && !query.isPlaceholderData && query.isSuccess;
  return { ...query, settling, upToDate };
}

/** Precio en vivo de la oferta elegida (el mismo cálculo de `/billing`). */
export function useOfferQuote(
  tenantId: string,
  selection: OfferSelectionWire | null,
  delayMs: number = OFFER_QUOTE_DEBOUNCE_MS,
) {
  const debounced = useDebouncedValue(selection, delayMs);
  return useQuery({
    queryKey: platformKeys.delivery.offerQuote(tenantId, debounced),
    queryFn: ({ signal }) => deliveryApi.offerPreview(tenantId, debounced!, signal),
    enabled: debounced !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });
}

export function useCreateDelivery(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDeliveryWire) => deliveryApi.create(tenantId, body),
    onSettled: async () => {
      // También al fallar: un envío que se cortó a la mitad deja pasos
      // anotados, y la página tiene que ver la entrega a medias para retomarla.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: platformKeys.delivery.all(tenantId) }),
        queryClient.invalidateQueries({ queryKey: platformKeys.tenants.all }),
      ]);
    },
  });
}

export function useResendDelivery(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => deliveryApi.resend(tenantId, deliveryId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: platformKeys.delivery.all(tenantId) }),
  });
}
