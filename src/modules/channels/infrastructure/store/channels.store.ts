import { create } from "zustand"

export type InboxView = "inbox" | "my-inbox" | "chats" | "scheduled" | "archived" | "closed" | "starred"

export type ChannelsUIState = {
  selectedView: InboxView
  selectedChannelId: string | null
  searchQuery: string
  sortBy: "created_at" | "updated_at" | "name"
  sortDir: "asc" | "desc"
  setView: (v: InboxView) => void
  setChannel: (id: string | null) => void
  setSearch: (q: string) => void
  setSort: (by: ChannelsUIState["sortBy"], dir: ChannelsUIState["sortDir"]) => void
}

export const useChannelsStore = create<ChannelsUIState>((set) => ({
  selectedView: "inbox",
  selectedChannelId: null,
  searchQuery: "",
  sortBy: "created_at",
  sortDir: "desc",
  setView: (v) => set({ selectedView: v }),
  setChannel: (id) => set({ selectedChannelId: id }),
  setSearch: (q) => set({ searchQuery: q }),
  setSort: (by, dir) => set({ sortBy: by, sortDir: dir }),
}))