// Sign-in lock: after too many wrong PINs or passwords the server locks this
// device for a while. The server decides (see docs/sign-in-lock-server-spec.md);
// this keeps the countdown on screen, survives an app restart, and opens again
// as soon as the owner unlocks the device.
import { API_URL } from "@/config/api";
import { tr } from "@/i18n";
import { onDeviceEvent } from "@/store/Realtime/useDeviceSocket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { create } from "zustand";

export interface SignInLock {
  // When it opens again (this device's clock, ms).
  until: number;
  // The server's own words, e.g. "Too many wrong PINs".
  message: string | null;
}

interface LockState {
  lock: SignInLock | null;
  // Wrong tries left before the device locks; null when the server doesn't say.
  attemptsLeft: number | null;
  setLock: (lock: SignInLock | null) => void;
  setAttemptsLeft: (left: number | null) => void;
}

const STORAGE_KEY = "smartpos.signInLock.v1";

export const useSignInLock = create<LockState>((set) => ({
  lock: null,
  attemptsLeft: null,
  setLock: (lock) => {
    set({ lock, ...(lock ? {} : { attemptsLeft: null }) });
    if (lock) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lock)).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
  setAttemptsLeft: (attemptsLeft) => set({ attemptsLeft }),
}));

export const clearSignInLock = () => useSignInLock.getState().setLock(null);

// After a restart the countdown carries on where it was.
export async function loadSavedLock() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "null") as SignInLock | null;
    if (saved && saved.until > Date.now() && !useSignInLock.getState().lock) {
      useSignInLock.setState({ lock: saved });
    } else if (saved && saved.until <= Date.now()) {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  } catch {
    // A broken saved value just means no lock is shown; the server still decides.
  }
}

const serverMessage = (data: any): string | null => {
  const message = Array.isArray(data?.message) ? data.message.join("\n") : data?.message;
  if (typeof message !== "string" || !message) return null;
  // Nest's built-in throttler message isn't meant for people.
  if (/throttler/i.test(message)) return null;
  return message;
};

// 423 (locked) or 429 (too many requests) → a lock; anything else → null.
// Seconds left (`retryAfter` / Retry-After) are preferred over `lockedUntil`, so a
// device whose clock is wrong still counts down the right time.
export function lockFromResponse(response: Response, data: any): SignInLock | null {
  if (response.status !== 423 && response.status !== 429) return null;
  return lockFromData(data, response.headers.get("Retry-After"));
}

function lockFromData(data: any, retryAfterHeader?: string | null): SignInLock {
  const retryAfter = Number(data?.retryAfter ?? retryAfterHeader);
  const lockedUntil = data?.lockedUntil ? Date.parse(data.lockedUntil) : NaN;
  const until =
    Number.isFinite(retryAfter) && retryAfter > 0
      ? Date.now() + retryAfter * 1000
      : Number.isFinite(lockedUntil)
        ? lockedUntil
        : Date.now() + 60_000;
  return {
    until,
    message: serverMessage(data) ?? tr("Too many wrong tries."),
  };
}

// Reads a failed sign-in: saves the lock or the tries left, and returns the
// message to show.
export function readFailedSignIn(response: Response, data: any, fallback: string): string {
  const lock = lockFromResponse(response, data);
  const state = useSignInLock.getState();
  if (lock) {
    state.setLock(lock);
    return lock.message ?? fallback;
  }
  state.setAttemptsLeft(typeof data?.attemptsLeft === "number" ? data.attemptsLeft : null);
  return serverMessage(data) ?? fallback;
}

// Asks the server whether this device is still locked, so an unlock by the owner
// shows up here. Older servers without the endpoint are ignored.
export async function refreshLockStatus(deviceId: string | null) {
  if (!API_URL || !deviceId) return;
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/lock-status/${encodeURIComponent(deviceId)}`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (!response.ok) return;
    const data = await response.json();
    if (!data?.locked) {
      if (useSignInLock.getState().lock) clearSignInLock();
      if (typeof data?.attemptsLeft === "number") useSignInLock.getState().setAttemptsLeft(data.attemptsLeft);
      return;
    }
    const lock = lockFromData(data);
    useSignInLock.getState().setLock({ ...lock, message: useSignInLock.getState().lock?.message ?? lock.message });
  } catch {
    // Offline: keep counting down what we have.
  }
}

// The owner unlocked (or the server locked) this device: the device socket says
// so straight away. Attached on first use, not at import, to avoid an import cycle.
let watching = false;
function watchLockEvents() {
  if (watching) return;
  watching = true;
  onDeviceEvent("signin.unlocked", () => clearSignInLock());
  onDeviceEvent<any>("signin.locked", (data) => useSignInLock.getState().setLock(lockFromData(data)));
}

// Milliseconds left on the lock, ticking every second; 0 when not locked.
// Clears the lock when time is up, and checks the server every 15 s meanwhile.
export function useLockCountdown(deviceId: string | null) {
  const lock = useSignInLock((s) => s.lock);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    watchLockEvents();
    loadSavedLock();
  }, []);

  useEffect(() => {
    if (!lock) return;
    setNow(Date.now());
    const tick = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lock.until) clearSignInLock();
    }, 1000);
    const poll = setInterval(() => refreshLockStatus(deviceId), 15_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [lock, deviceId]);

  return lock ? Math.max(0, lock.until - now) : 0;
}

// 4:59, or 1:04:59 for an hour or more.
export function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
