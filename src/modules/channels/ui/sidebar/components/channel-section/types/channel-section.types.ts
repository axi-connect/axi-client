import { Channel } from "@/modules/channels/domain/channel";
import { type QRCodeResponse } from "@/modules/channels/infrastructure/services/channels-service.adapter";

export interface ChannelItemProps {
    channel: Channel;
    onNavigate: (path: string) => void;
    onQrCodeClick: (channelId: string) => void; // 👈 Inyección de dependencia
  }
  
export interface ChannelSectionProps {
    onQrError?: (error: string) => void
    onQrGenerated?: (qrCode: QRCodeResponse) => void
}

export interface ChannelsListProps {
    loading: boolean
    channels: Channel[]
    error: Error | null
    onNavigate: (channelId: string) => void
    onQrCodeClick: (channelId: string) => void
}