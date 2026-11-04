import { tr } from "@/i18n";

// Extras SmartPOS turns on per company (the super admin decides on the website).
// A switched-off extra is hidden here and refused by the API.
export type FeatureKey = "services" | "delivery" | "floorMap" | "kitchen";

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  services: "Services & bookings",
  delivery: "Delivery",
  floorMap: "Floor map & tables",
  kitchen: "Kitchen screen",
};

// The pages each extra brings, by address (route groups are not in it).
const FEATURE_PAGES: { prefix: string; feature: FeatureKey }[] = [
  { prefix: "/owner/services", feature: "services" },
  { prefix: "/till/Services", feature: "services" },
  { prefix: "/owner/map", feature: "floorMap" },
  { prefix: "/till/tables", feature: "floorMap" },
  { prefix: "/owner/deliveries", feature: "delivery" },
  { prefix: "/owner/riders", feature: "delivery" },
  { prefix: "/owner/Settings/Delivery", feature: "delivery" },
  { prefix: "/till/deliveries", feature: "delivery" },
  { prefix: "/rider", feature: "delivery" },
  { prefix: "/owner/Settings/Kitchen", feature: "kitchen" },
  { prefix: "/kitchen", feature: "kitchen" },
];

type WithFeatures = { company?: { features?: Partial<Record<FeatureKey, boolean>> | null } | null } | null | undefined;

// A server that doesn't send `features` yet has no switches: everything stays on.
export const hasFeature = (profile: WithFeatures, feature: FeatureKey) => {
  const features = profile?.company?.features;
  return !features || features[feature] === true;
};

const toPath = (route: string) => route.replace(/\/\([^)]+\)/g, "").replace(/\/$/, "") || "/";

// The extra a page belongs to, if any.
export const featureOfPage = (route: string): FeatureKey | null => {
  const path = toPath(route);
  return FEATURE_PAGES.find((p) => path === p.prefix || path.startsWith(`${p.prefix}/`))?.feature ?? null;
};

// The page's extra is on (or it belongs to none).
export const pageFeatureOn = (profile: WithFeatures, route: string) => {
  const feature = featureOfPage(route);
  return !feature || hasFeature(profile, feature);
};

export const featureOffMessage = (feature: FeatureKey) =>
  `${tr(FEATURE_LABELS[feature])} ${tr("is not turned on for your company. Contact SmartPOS to add it.")}`;
