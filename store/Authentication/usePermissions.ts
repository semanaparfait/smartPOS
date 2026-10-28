import { ALL_PERMISSION_KEYS } from "@/config/permissions";
import useAuth from "@/store/Authentication/useAuth";
import { useMemo } from "react";

const OWNER_ROLES = ["OWNER", "ADMIN"];

export const isOwnerRole = (role?: string | null) => OWNER_ROLES.includes((role ?? "").toUpperCase());

// What the signed-in user may do. Hiding UI is only for convenience; the API
// must refuse the same actions, or anyone could call it directly.
//
// - Owners can do everything.
// - Employees get `profile.permissions` from their role.
// - If the backend doesn't send `permissions` yet (field missing), everything
//   stays allowed so the app keeps working until the backend is updated. An
//   empty array means "nothing allowed".
export default function usePermissions() {
  const profile = useAuth((s) => s.profile);

  return useMemo(() => {
    const owner = isOwnerRole(profile?.role);
    const enforced = !owner && Array.isArray(profile?.permissions);
    const granted = new Set(owner || !enforced ? ALL_PERMISSION_KEYS : profile!.permissions!);

    const can = (key: string) => granted.has(key);
    return {
      can,
      canAny: (...keys: string[]) => keys.some(can),
      isOwner: owner,
      // False while the backend doesn't send permissions; useful for a notice.
      enforced,
      granted,
    };
  }, [profile]);
}
