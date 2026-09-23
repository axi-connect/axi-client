"use client";

import { useEffect, useRef } from "react";

/**
 * Dispara `onReconnect` en el flanco de RECONEXIÓN del socket (segunda subida
 * o posteriores), nunca en la primera conexión: la vista acaba de pedir sus
 * datos y lo que se perdió son los eventos emitidos mientras el socket estuvo
 * caído.
 *
 * Por qué existe: cinco hooks de slice (calls, orders, marketing, billing,
 * crm) hacían `wasConnectedRef.current = connected` al final del efecto. Eso
 * exige dos ticks conectados CONSECUTIVOS, imposible en un true→false→true, así
 * que la recarga de reconexión nunca disparaba. El flag correcto es «alguna
 * vez conectado» y no se apaga al caer (cmo F19 y documents F8 lo tenían bien;
 * aquí queda una sola copia con su test de dos signos).
 */
export function useReconnect(
  connected: boolean,
  onReconnect: () => void | Promise<void>,
): void {
  const everConnectedRef = useRef(false);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!connected) return;
    if (everConnectedRef.current) void onReconnectRef.current();
    everConnectedRef.current = true;
  }, [connected]);
}
