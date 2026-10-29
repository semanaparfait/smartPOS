import type { Ionicons } from "@expo/vector-icons";

// What a device is used for. The owner picks it when approving the device and
// can change it later; the device opens on the matching screens.
export type DeviceKind = "POS_TERMINAL" | "KITCHEN_DISPLAY" | "CUSTOMER_DISPLAY";

export const DEVICE_KINDS: {
  value: DeviceKind;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "POS_TERMINAL",
    label: "Till",
    description: "Cashier: products, carts, payments and sales.",
    icon: "storefront-outline",
  },
  {
    value: "KITCHEN_DISPLAY",
    label: "Kitchen display",
    description: "Kitchen: incoming orders, preparing and ready.",
    icon: "restaurant-outline",
  },
  {
    value: "CUSTOMER_DISPLAY",
    label: "Customer display",
    description: "Shows the customer their order and payment from one till.",
    icon: "tv-outline",
  },
];

// Devices from before types existed are tills.
export const deviceKind = (value?: string | null): DeviceKind =>
  DEVICE_KINDS.some((k) => k.value === value) ? (value as DeviceKind) : "POS_TERMINAL";

export const deviceKindMeta = (value?: string | null) =>
  DEVICE_KINDS.find((k) => k.value === deviceKind(value))!;
