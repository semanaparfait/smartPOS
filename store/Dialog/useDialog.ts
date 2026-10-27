import { create } from "zustand";

export type DialogTone = "danger" | "warning" | "success" | "info";

export interface DialogOptions {
  title: string;
  message: string;
  tone?: DialogTone;
  confirmLabel?: string;
  // Omit for a notice with a single button.
  cancelLabel?: string;
}

interface DialogRequest extends DialogOptions {
  resolve: (confirmed: boolean) => void;
}

interface DialogStore {
  current: DialogRequest | null;
  queue: DialogRequest[];
  open: (request: DialogRequest) => void;
  close: (confirmed: boolean) => void;
}

// One dialog at a time; later requests wait in the queue.
const useDialog = create<DialogStore>((set, get) => ({
  current: null,
  queue: [],
  open: (request) =>
    get().current ? set({ queue: [...get().queue, request] }) : set({ current: request }),
  close: (confirmed) => {
    const { current, queue } = get();
    current?.resolve(confirmed);
    set({ current: queue[0] ?? null, queue: queue.slice(1) });
  },
}));

// Styled replacement for Alert.alert / window.confirm. Resolves true on confirm.
export const showDialog = (options: DialogOptions) =>
  new Promise<boolean>((resolve) => useDialog.getState().open({ ...options, resolve }));

export const confirmDialog = (options: Omit<DialogOptions, "cancelLabel"> & { cancelLabel?: string }) =>
  showDialog({ cancelLabel: "Cancel", confirmLabel: "Confirm", ...options });

export const notify = (options: Omit<DialogOptions, "cancelLabel">) =>
  showDialog({ confirmLabel: "Got it", ...options }).then(() => undefined);

export default useDialog;
