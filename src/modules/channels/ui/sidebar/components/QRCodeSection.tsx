"use client"

import Image from "next/image"
import { Loader } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { QRCodeResponse } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/shared/components/layout/sidebar/core"
import { API_BASE_URL } from "@/core/config/env"

interface QRCodeSectionProps {
  qrCode: QRCodeResponse | null
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  onClose?: () => void
}

export function QRCodeSection({ qrCode, loading, error, onRefresh, onClose }: QRCodeSectionProps) {
    return (
    qrCode && (
      <SidebarGroup>
        <SidebarGroupLabel>Código QR</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center">
                <Loader className="animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center text-sm text-red-500">
                {error}
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <Image
                    src={`${API_BASE_URL}/${qrCode.qrCodeUrl}`}
                    alt="QR Code"
                    width={150}
                    height={150}
                    className="border border-border rounded"
                  />
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  Escanea con WhatsApp Web
                </div>
                <div className="text-center text-xs">
                  Expira: {new Date(qrCode.expiresAt).toLocaleString()}
                </div>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={onRefresh}
                    disabled={loading}
                  >
                    Generar Nuevo QR
                  </Button>
                  {onClose && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full"
                      onClick={onClose}
                    >
                      Cerrar
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  )
}

export default QRCodeSection
