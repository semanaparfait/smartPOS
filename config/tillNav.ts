import type { Ionicons } from "@expo/vector-icons";

// The till's sidebar, in order. The first one a worker may open is their home.
export interface TillNavItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
  // URL prefix that counts as this item (defaults to the route), e.g. a folder of pages.
  match?: string;
  // Shown only if the user has at least one of these (none = everyone).
  permissions?: string[];
  // Shown only once the owner turned delivery on.
  delivery?: boolean;
}

export const TILL_NAV: TillNavItem[] = [
  { name: "Products", icon: "grid", activeIcon: "grid-outline", route: "/(till)/till/products/products", permissions: ["sales.create"] },
  { name: "Tables", icon: "restaurant", activeIcon: "restaurant-outline", route: "/(till)/till/tables", permissions: ["tables.manage"] },
  { name: "Services", icon: "settings", activeIcon: "settings-outline", route: "/(till)/till/Services", permissions: ["services.manage"] },
  { name: "Deliveries", icon: "bicycle", activeIcon: "bicycle-outline", route: "/(till)/till/deliveries", permissions: ["deliveries.ride", "deliveries.manage", "sales.create"], delivery: true },
  { name: "Orders", icon: "receipt", activeIcon: "receipt-outline", route: "/(till)/till/orders/orders", permissions: ["orders.view_own"] },
  { name: "Inventory", icon: "cube", activeIcon: "cube-outline", route: "/(till)/till/inventory", permissions: ["inventory.view"] },
  { name: "Expenses", icon: "wallet", activeIcon: "wallet-outline", route: "/(till)/till/expenses", permissions: ["expenses.submit"] },
  { name: "Profile", icon: "person-circle", activeIcon: "person-circle-outline", route: "/(till)/till/profile/profile", match: "/(till)/till/profile" },
];
