'use client'

import { create } from 'zustand'
import type { User, ChatMessage } from '@/types'

interface AppState {
  user: User | null
  setUser: (user: User | null) => void

  // Chat state
  chatMessages: ChatMessage[]
  addChatMessage: (msg: ChatMessage) => void
  clearChat: () => void

  // Search state
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedEventFilter: string | null
  setSelectedEventFilter: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  chatMessages: [],
  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  selectedEventFilter: null,
  setSelectedEventFilter: (selectedEventFilter) => set({ selectedEventFilter }),
}))
