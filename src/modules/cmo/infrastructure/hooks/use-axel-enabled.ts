"use client";

import { useEffect } from "react";

import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";

/**
 * ¿Está Axel encendido para esta empresa? (`company.settings.cmo.enabled`).
 *
 * El interruptor nace apagado a propósito — Axel cuesta dinero y no se enciende
 * por omisión —, así que la isla de la cabecera tiene que preguntarlo antes de
 * existir: un tenant que nunca lo encendió veía a Axel en toda la plataforma y,
 * si le escribía, el servidor respondía `cmo/disabled`.
 *
 * La regla de visibilidad, en una frase: **se monta cuando sabemos que está
 * encendido; mientras no lo sabemos no se pinta; si la consulta falla, se
 * pinta**. Lo segundo es deliberado y se aparta del `?? true` de `CmoView`: ahí
 * la pantalla tiene que dibujar algo, aquí la ausencia es el estado neutro, y
 * pintar para esconder un instante después sería el mismo parpadeo que este
 * arreglo quita. Lo tercero es fallar abierta: sin respuesta no se puede
 * afirmar que esté apagado, y silenciar los avisos por un error de red sería
 * peor que el síntoma.
 *
 * @param active si la isla es aplicable (fuera de /cmo y con permiso). Los
 * ajustes no se piden cuando no lo es.
 */
export function useAxelEnabled(active: boolean): boolean {
  const settings = useCmoStore((state) => state.settings);
  const ensureSettings = useCmoStore((state) => state.ensureSettings);

  useEffect(() => {
    if (active) void ensureSettings();
  }, [active, ensureSettings]);

  if (settings.status === "error") return true;
  return settings.status === "ready" && settings.data !== null && settings.data.enabled;
}
