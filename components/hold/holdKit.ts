import { useEffect, useState } from "react";
import useAuth from "@/store/Authentication/useAuth";
import type { CartResponse } from "@/store/Cart/cartTypes";

// Longest a sale may stay on hold, as the owner set it.
export const useMaxHold = () =>
  useAuth((s) => s.profile?.company?.maxHoldMinutes ?? 60);

export const holdMs = (cart: CartResponse) => new Date(cart.holdUntil ?? 0).getTime();

// Held long enough that no more waiting is allowed.
export const atHoldLimit = (cart: CartResponse, maxMinutes: number) =>
  holdMs(cart) >= new Date(cart.heldAt ?? 0).getTime() + maxMinutes * 60_000;

// "4:05" left, or "0:00" once it has run out.
export const countdown = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export const cartTotal = (cart: CartResponse) =>
  (cart.items ?? []).reduce((sum, i) => sum + Number(i.totalPrice ?? 0), 0);

// The current time, refreshed every second while `running`.
export function useNow(running: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}
