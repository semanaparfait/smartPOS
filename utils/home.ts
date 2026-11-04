import { MANAGE_SHORTCUTS, ownerPageAccess } from "@/config/ownerAccess";
import { TILL_NAV } from "@/config/tillNav";
import type { profile as Profile } from "@/store/Authentication/AuthTypes";
import { accessOf } from "@/store/Authentication/usePermissions";
import type { DeviceKind } from "@/config/deviceTypes";

export type Area = "owner" | "till" | "kitchen" | "rider";

export const KITCHEN_HOME = "/(kitchen)/kitchen";
export const OWNER_HOME = "/(owner)/owner/dashboard";
export const RIDER_HOME = "/(rider)/rider";
const PROFILE_HOME = "/(till)/till/profile/profile";

// Who the signed-in person is, for picking their screens.
export const jobOf = (profile: Profile | null | undefined) => {
  const { isOwner, enforced, can } = accessOf(profile);
  const company = profile?.company;
  return {
    isOwner,
    // Only roles given these on purpose: a role without a list allows everything.
    kitchen: enforced && can("kitchen.prepare"),
    rider: enforced && can("deliveries.ride") && !!company?.deliveryEnabled,
    can,
  };
};

// The one screen each person starts on, after sign-in and after a refresh:
// - a kitchen display, or kitchen staff: the kitchen screen
// - owners: the dashboard
// - riders: their deliveries
// - other workers: the first till screen they may open, else an owner page they
//   were given, else their profile.
export function homeFor(profile: Profile | null | undefined, deviceType?: DeviceKind | null): string {
  if (deviceType === "KITCHEN_DISPLAY") return KITCHEN_HOME;
  const job = jobOf(profile);
  if (job.isOwner) return OWNER_HOME;
  if (job.kitchen) return KITCHEN_HOME;
  if (job.rider) return RIDER_HOME;

  const deliveryOn = !!profile?.company?.deliveryEnabled;
  const till = TILL_NAV.find(
    (item) =>
      item.permissions &&
      item.permissions.some(job.can) &&
      (!item.delivery || deliveryOn),
  );
  if (till) return till.route;

  const page = MANAGE_SHORTCUTS.flatMap((s) => s.routes).find((route) => {
    const needs = ownerPageAccess(route);
    return !!needs && needs.some(job.can);
  });
  return page ?? PROFILE_HOME;
}

// Whether this person belongs in an area at all; pages inside still check their
// own permission.
export function canEnter(area: Area, profile: Profile | null | undefined, deviceType?: DeviceKind | null) {
  const job = jobOf(profile);
  const kitchenDevice = deviceType === "KITCHEN_DISPLAY";
  if (area === "kitchen") return kitchenDevice || job.isOwner || job.kitchen;
  if (area === "rider") return !kitchenDevice && job.rider;
  if (kitchenDevice || job.kitchen) return false;
  if (area === "till") return true;
  // Workers reach owner pages only when given at least one.
  return (
    job.isOwner ||
    MANAGE_SHORTCUTS.some((s) =>
      s.routes.some((route) => {
        const needs = ownerPageAccess(route);
        return !!needs && needs.some(job.can);
      }),
    )
  );
}
