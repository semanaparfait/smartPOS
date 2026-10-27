import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { fetchUniversalDeviceInfo } from "@/utils/device";
import { getDeviceSecret } from "@/utils/deviceSecret";
import { useEffect } from "react";
import { AppState } from "react-native";

const HEARTBEAT_MS = 30_000;

// Keeps this device "online" for the owner by calling the heartbeat every ~30s,
// whether or not anyone is logged in. Paused while the app is in the background.
// The secret is re-read on each beat, so a newly entered secret is picked up.
export default function useDeviceHeartbeat() {
  const sendHeartbeat = useDeviceInfo((s) => s.sendHeartbeat);

  useEffect(() => {
    let deviceId: string | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const beat = async () => {
      if (!deviceId) {
        try {
          deviceId = (await fetchUniversalDeviceInfo()).deviceId;
        } catch (error) {
          console.warn("Heartbeat: unable to resolve device ID.", error);
          return;
        }
      }
      const secret = await getDeviceSecret();
      if (cancelled || !deviceId) return;
      await sendHeartbeat(deviceId, secret);
    };

    const start = () => {
      if (timer) return;
      beat();
      timer = setInterval(beat, HEARTBEAT_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    start();
    const sub = AppState.addEventListener("change", (state) =>
      state === "active" ? start() : stop(),
    );

    return () => {
      cancelled = true;
      stop();
      sub.remove();
    };
  }, [sendHeartbeat]);
}
