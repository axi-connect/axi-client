"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation";
import { AiOutlineMail } from 'react-icons/ai'
import { ChannelType } from "../../domain/enums"
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from 'react-icons/fa'
import { useChannels } from "@/modules/channels/infrastructure/channels.context"
import { useChannelsStore } from "@/modules/channels/infrastructure/channels.store"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
} from "@/shared/components/layout/sidebar/core"
import { InboxIcon, Radio, StarIcon, MessageSquareIcon, CalendarClockIcon, ArchiveIcon, XCircleIcon, Plus, EllipsisVertical, CircleFadingPlus, QrCode, CircleCheckBig, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Button } from "@/shared/components/ui/button";

export function ChannelSidebar() {
  const router = useRouter()
  const { selectedView, setView } = useChannelsStore()
  const { fetchChannels, channels, loading, counts } = useChannels()

  const IconChannel: React.FC<{ channel: ChannelType }> = ({ channel }) => {
    const IconChannelComponent: React.ComponentType<{ size: number; color: string }> = (() => {
      switch (channel) {
        case 'WHATSAPP':
          return FaWhatsapp;
        case 'EMAIL':
          return AiOutlineMail;
        case 'INSTAGRAM':
          return FaInstagram;
        case 'MESSENGER':
          return FaFacebookMessenger;
      }
    })()!;

    return <IconChannelComponent size={20} color="currentColor" />;
  };

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  // useEffect(() => {
  //   console.log("counts", channels)
  // }, [channels])

  return (
    <Sidebar variant="inset" side="left" collapsible="none" className="relative rounded-l-2xl bg-gradient-to-br from-muted/50 to-muted">
      <SidebarHeader className="px-3 py-2">
        <div className="text-sm font-medium">Channels</div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Inbox</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={selectedView === "inbox"} onClick={() => setView("inbox")}>
                  <InboxIcon />
                  <span>Inbox</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{counts.inbox}</SidebarMenuBadge>
              </SidebarMenuItem>
              {/* <SidebarMenuItem>
                <SidebarMenuButton isActive={selectedView === "my-inbox"} onClick={() => setView("my-inbox")}>
                  <InboxIcon />
                  <span>My Inbox</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{counts.myInbox}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={selectedView === "chats"} onClick={() => setView("chats")}>
                  <MessageSquareIcon />
                  <span>Chats</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{counts.chats}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={selectedView === "scheduled"} onClick={() => setView("scheduled")}>
                  <CalendarClockIcon />
                  <span>Scheduled</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{counts.scheduled}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={selectedView === "starred"} onClick={() => setView("starred")}>
                  <StarIcon />
                  <span>Starred</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{counts.starred}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={selectedView === "archived"} onClick={() => setView("archived")}>
                  <ArchiveIcon />
                  <span>Archived</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{counts.archived}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={selectedView === "closed"} onClick={() => setView("closed")}>
                  <XCircleIcon />
                  <span>Closed</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{counts.closed}</SidebarMenuBadge>
              </SidebarMenuItem> */}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="gap-2">
          <SidebarGroupLabel asChild>
            <div className="flex items-center">
              <Radio />
              <span className="ml-2">Canales</span>
              <div className="ml-auto flex gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  title="Agregar canal nuevo"
                  onClick={()=> router.push("/channels/create")}
                >
                  <CircleFadingPlus />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  title="Refrescar canales"
                  onClick={()=> fetchChannels()}
                >
                  <RefreshCw />
                </Button>
              </div>
            </div>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {!loading ? (channels.map((channel) => (
                <SidebarMenuItem key={channel.id}>
                  <SidebarMenuButton onClick={()=> router.push(`/channels/${channel.id}`)}>
                    <IconChannel channel={channel.type as ChannelType} />
                    <span className="capitalize">{channel.name.toLowerCase()}</span>
                  </SidebarMenuButton>
                  <SidebarMenuAction>
                    {
                      channel.is_active ? <CircleCheckBig/> : <QrCode />
                    }
                  </SidebarMenuAction>
                  {/* <SidebarMenuBadge>{channel.count ?? 0}</SidebarMenuBadge> */}
                </SidebarMenuItem>
              ))
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  {
                    Array.from({ length: 3 }).map((_, index) => (
                      <SidebarMenuSkeleton key={index} showIcon={true} />
                    ))
                  }
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default ChannelSidebar