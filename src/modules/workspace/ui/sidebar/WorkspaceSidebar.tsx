"use client"

import { useState, useEffect } from "react"
import { WebSocketEventBus } from "@/core/websocket/websocket-event-bus"
import { InboxSection, ChannelSection, QRCodeSection } from "./components"
import { Sidebar, SidebarContent, SidebarSeparator } from "@/shared/components/layout/sidebar/core"
import { type QRCodeResponse } from "@/modules/channels/infrastructure/services/channels-service.adapter"

export default function WorkspaceSidebar() {
  // Local QR state for the sidebar
  const [qrLoading, setQrLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<QRCodeResponse | null>(null)
  const [selectedChannelForQr, setSelectedChannelForQr] = useState<string | null>(null)

  const handleQrGenerated = (newQrCode: QRCodeResponse) => {
    setQrCode(newQrCode)
    setQrLoading(false)
    setQrError(null)
  }

  const handleQrError = (error: string) => {
    setQrError(error)
    setQrLoading(false)
  }

  const handleRefreshQr = () => {
    if (selectedChannelForQr) {
      setQrLoading(true)
      setQrError(null)
      setRefreshTrigger(prev => prev + 1) // Trigger refresh in ChannelList
    }
  }

  const handleCloseQr = () => {
    setQrCode(null)
    setQrLoading(false)
    setQrError(null)
    setSelectedChannelForQr(null)
  }

  useEffect(() => {
    const handler = ()=>{
      setQrCode(null)
      console.log("channel-authenticated event ")
    }

    WebSocketEventBus.on('channel-authenticated', handler)
    return () => WebSocketEventBus.off('channel-authenticated', handler)
  }, [])

  return (
    <Sidebar variant="inset" side="left" collapsible="none" className="relative rounded-l-2xl bg-gradient-to-br from-muted/50 to-muted border-r border-border">
      {/* <SidebarHeader className="px-3 py-2">
        <div className="text-sm font-medium">Channels</div>
      </SidebarHeader> */}

      <SidebarContent>
        <InboxSection />
        <SidebarSeparator />
        <ChannelSection
          key={refreshTrigger}
          onQrError={handleQrError}
          onQrGenerated={handleQrGenerated}
        />  

        <QRCodeSection
          qrCode={qrCode}
          error={qrError}
          loading={qrLoading}
          onClose={handleCloseQr}
          onRefresh={handleRefreshQr}
        />
      </SidebarContent>
    </Sidebar>
  )
}