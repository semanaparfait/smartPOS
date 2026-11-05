import { useEffect } from "react";
import useAuth from "@/store/Authentication/useAuth";
import { listenForTaps, registerForNotifications } from "@/utils/pushNotifications";

// Turns phone notifications on for whoever is signed in, and opens the right
// screen when one is tapped. Used once, in the root layout.
export default function useNotifications() {
  const userId = useAuth((s) => s.profile?.id);

  useEffect(() => {
    if (userId) void registerForNotifications();
  }, [userId]);

  useEffect(() => listenForTaps(() => useAuth.getState().profile?.role), []);
}
