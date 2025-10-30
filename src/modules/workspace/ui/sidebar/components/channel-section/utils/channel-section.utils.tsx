import { useMemo } from "react"
import { AiOutlineMail } from 'react-icons/ai'
import { ChannelType } from "@/modules/channels/domain/enums"
import { ChannelWsStatus } from "@/modules/channels/domain/channel"
import { QrCode, CircleCheckBig, Rocket, Loader } from "lucide-react"
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from 'react-icons/fa'

// ==========================================
// UTILIDADES
// ==========================================

const QRCodeIcon = ({ channelId, onClick }: { channelId: string, onClick: (id: string) => void }) => <QrCode onClick={() => onClick(channelId)} className="cursor-pointer hover:text-blue-500" />

const statusIcons = (channelId: string, onQrCodeClick: (channelId: string) => void): Record<ChannelWsStatus, React.ReactNode> => ({
  ready: <Rocket />,
  authenticated: <CircleCheckBig />,
  connecting: <Loader className="animate-spin" />,
  connected: <QRCodeIcon channelId={channelId} onClick={onQrCodeClick} />,
  disconnected: <QRCodeIcon channelId={channelId} onClick={onQrCodeClick} />,
})

export const ChannelStatusIcon = ({ status, channelId, onQrCodeClick }: { status: ChannelWsStatus; channelId: string; onQrCodeClick: (channelId: string) => void }) => useMemo(() => statusIcons(channelId, onQrCodeClick)[status], [status, channelId, onQrCodeClick])

export const channelStatusColor = (status: ChannelWsStatus) => {
  const statusColors: Record<ChannelWsStatus, string> = {
    ready: 'bg-purple-500',
    connected: 'bg-green-500',
    disconnected: 'bg-gray-400',
    authenticated: 'bg-blue-500',
    connecting: 'bg-yellow-500 animate-pulse',
  };

  return statusColors[status] ?? statusColors.disconnected;
}

export const IconChannel: React.FC<{ channel: ChannelType }> = ({ channel }) => {
  const IconChannelComponent: React.ComponentType<{ size: number; color: string }> = (() => {
    switch (channel) {
      case 'WHATSAPP':
        return FaWhatsapp
      case 'EMAIL':
        return AiOutlineMail
      case 'INSTAGRAM':
        return FaInstagram
      case 'MESSENGER':
        return FaFacebookMessenger
    }
  })()!

  return <IconChannelComponent size={20} color="currentColor" />
}