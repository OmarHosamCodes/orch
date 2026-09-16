import { create } from "zustand";

type NotificationsInboxUiState = {
  openRequested: boolean;
  requestOpen: () => void;
  consumeOpen: () => void;
};

/** Bridge so rail overflow can still request the notifications popover if the icon variant is remounted. */
export const useNotificationsInboxUiStore = create<NotificationsInboxUiState>((set) => ({
  openRequested: false,
  requestOpen: () => set({ openRequested: true }),
  consumeOpen: () => set({ openRequested: false }),
}));
