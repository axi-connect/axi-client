"use client"

import Image from "next/image"
import { Button } from "@/shared/components/ui/button"
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/shared/components/layout/sidebar/core"

/**
 * Muestra el QR / pairing code de WhatsApp Web recibido por WS
 * (`channel.qr_code`). Desaparece solo cuando el canal conecta
 * (`channel.status_changed: connected` limpia vía este mismo store).
 */
export function QRCodeSection() {
  const { channels, pairingByChannel, clearPairingState } = useChannelStore()

  // El primer canal con pairing activo y aún no conectado.
  const entry = Object.entries(pairingByChannel).find(([channelId, state]) => {
    const channel = channels.find((c) => c.id === channelId)
    return (state.qr_image || state.pairing_code) && channel?.status !== "connected"
  })

  if (!entry) return null
  const [channelId, pairing] = entry
  const channel = channels.find((c) => c.id === channelId)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Vincular {channel?.name ?? "canal"}</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="p-4 space-y-3">
          {pairing.qr_image && (
            <div className="flex justify-center">
              <Image
                src={pairing.qr_image}
                alt="Código QR de vinculación de WhatsApp"
                width={150}
                height={150}
                unoptimized
                className="border border-border rounded"
              />
            </div>
          )}
          {pairing.pairing_code && (
            <div className="text-center text-sm">
              Código: <span className="font-mono font-semibold">{pairing.pairing_code}</span>
            </div>
          )}
          <div className="text-center text-xs text-muted-foreground">
            WhatsApp → Dispositivos vinculados → Vincular dispositivo
          </div>
          <Button size="sm" variant="ghost" className="w-full" onClick={() => clearPairingState(channelId)}>
            Ocultar
          </Button>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export default QRCodeSection
