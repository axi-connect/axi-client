"use client";

/**
 * Enviar una ubicación como lo haría el cliente por WhatsApp (F2): presets de
 * ciudades colombianas para probar cobertura de envío sin buscar coordenadas,
 * o lat/lng a mano. El navegador del operador no aporta nada: la geolocalización
 * del sandbox no es la del cliente.
 */
import { useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";

export type SessionLocation = { latitude: number; longitude: number; name?: string; address?: string };

const PRESETS: { label: string; location: SessionLocation }[] = [
  { label: "Medellín · Laureles", location: { latitude: 6.2447, longitude: -75.5896, name: "Laureles", address: "Medellín, Antioquia" } },
  { label: "Bogotá · Chapinero", location: { latitude: 4.6486, longitude: -74.0628, name: "Chapinero", address: "Bogotá, D.C." } },
  { label: "Cali · San Fernando", location: { latitude: 3.4285, longitude: -76.5406, name: "San Fernando", address: "Cali, Valle del Cauca" } },
  { label: "Barranquilla · El Prado", location: { latitude: 10.9985, longitude: -74.7993, name: "El Prado", address: "Barranquilla, Atlántico" } },
  { label: "Fuera de cobertura · Leticia", location: { latitude: -4.2153, longitude: -69.9406, name: "Leticia", address: "Amazonas" } },
];

type LocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (location: SessionLocation) => void;
};

export function LocationDialog({ open, onOpenChange, onSend }: LocationDialogProps) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const latitude = Number(lat.replace(",", "."));
  const longitude = Number(lng.replace(",", "."));
  const manualValid =
    Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && lat !== "" && lng !== "";

  const send = (location: SessionLocation) => {
    onSend(location);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      config={{
        title: "Enviar ubicación",
        description: "Llega como el pin que comparte un cliente por WhatsApp: sirve para probar captura de dirección y cobertura de envío.",
        body: (
          <div className="space-y-4">
            <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Ubicaciones de ejemplo">
              {PRESETS.map((preset) => (
                <li key={preset.label}>
                  <button
                    type="button"
                    onClick={() => send(preset.location)}
                    className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <MapPin aria-hidden="true" className="size-4 shrink-0 text-info" />
                    <span className="min-w-0">
                      <span className="block font-medium">{preset.label}</span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {preset.location.latitude.toFixed(4)}, {preset.location.longitude.toFixed(4)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="loc-lat">Latitud</Label>
                <Input id="loc-lat" inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} placeholder="6.2447" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="loc-lng">Longitud</Label>
                <Input id="loc-lng" inputMode="decimal" value={lng} onChange={(event) => setLng(event.target.value)} placeholder="-75.5896" />
              </div>
            </div>
          </div>
        ),
        actions: [
          { label: "Cancelar", variant: "outline" },
          {
            label: "Enviar coordenadas",
            keepOpen: true,
            onClick: () => {
              if (manualValid) send({ latitude, longitude });
            },
          },
        ],
      }}
    />
  );
}
