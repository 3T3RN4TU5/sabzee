"use client";

import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  emoji?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, emoji?: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (message, emoji) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, message, emoji }] });
    setTimeout(() => get().dismiss(id), 2600);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
