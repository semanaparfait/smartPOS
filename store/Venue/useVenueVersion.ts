import { create } from "zustand";

// Goes up when the owner saves the floor map, so open maps load it again.
export const useVenueVersion = create<{ version: number; bump: () => void }>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
