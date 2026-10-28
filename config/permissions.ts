import type { Ionicons } from "@expo/vector-icons";

// Every permission a role can grant. The keys are the contract with the
// backend: roles store them in `permissions: string[]`, GET /auth/me returns
// the signed-in user's list, and the API must refuse calls the role lacks.
// Add new keys here; never rename an existing one (saved roles reference it).

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
  // Turning this on also turns these on; turning one of them off turns this off.
  requires?: string[];
  // Gives access to money or other people's work; shown with a "Sensitive" tag.
  sensitive?: boolean;
}

export interface PermissionGroup {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "sales",
    title: "Selling",
    icon: "cart-outline",
    permissions: [
      { key: "sales.create", label: "Make sales", description: "Add products to the cart and place orders." },
      {
        key: "sales.checkout",
        label: "Take payments",
        description: "Complete orders at checkout with cash, MoMo or card.",
        requires: ["sales.create"],
      },
      {
        key: "sales.split_payment",
        label: "Split payments",
        description: "Let a customer pay one order with two methods.",
        requires: ["sales.checkout"],
      },
      {
        key: "sales.credit",
        label: "Sell on credit",
        description: "Let customers take goods now and pay later.",
        requires: ["sales.checkout"],
        sensitive: true,
      },
      {
        key: "sales.cancel",
        label: "Cancel orders",
        description: "Cancel orders that have not been paid.",
        requires: ["sales.create"],
        sensitive: true,
      },
    ],
  },
  {
    key: "orders",
    title: "Orders",
    icon: "receipt-outline",
    permissions: [
      { key: "orders.view_own", label: "See own orders", description: "Open the Orders tab and see orders they made." },
      {
        key: "orders.view_all",
        label: "See everyone's orders",
        description: "See orders made by all staff, not only their own.",
        requires: ["orders.view_own"],
      },
    ],
  },
  {
    key: "service",
    title: "Tables & services",
    icon: "restaurant-outline",
    permissions: [
      { key: "tables.manage", label: "Tables", description: "Open the Tables tab, seat guests and serve tables." },
      { key: "services.manage", label: "Services & bookings", description: "Open the Services tab and manage bookings." },
    ],
  },
  {
    key: "stock",
    title: "Products & stock",
    icon: "cube-outline",
    permissions: [
      { key: "inventory.view", label: "See stock", description: "Open the Inventory tab and see stock levels." },
      {
        key: "inventory.adjust",
        label: "Adjust stock",
        description: "Record stock received, damaged or counted.",
        requires: ["inventory.view"],
        sensitive: true,
      },
      {
        key: "products.manage",
        label: "Manage products",
        description: "Add products, change prices and edit categories.",
        sensitive: true,
      },
    ],
  },
  {
    key: "finance",
    title: "Money & reports",
    icon: "wallet-outline",
    permissions: [
      { key: "reports.view", label: "See sales reports", description: "See the dashboard, sales totals and best sellers.", sensitive: true },
      {
        key: "finance.verify",
        label: "Verify takings",
        description: "Count each worker's money and verify or flag it.",
        requires: ["reports.view"],
        sensitive: true,
      },
      { key: "credits.view", label: "See credits", description: "See customers who owe money and who served them.", sensitive: true },
    ],
  },
  {
    key: "admin",
    title: "Team & settings",
    icon: "settings-outline",
    permissions: [
      { key: "employees.manage", label: "Manage employees", description: "Add, edit and deactivate employees.", sensitive: true },
      {
        key: "roles.manage",
        label: "Manage roles",
        description: "Create roles and change what they can do.",
        sensitive: true,
      },
      { key: "devices.manage", label: "Manage devices", description: "Approve, disable and remove POS devices.", sensitive: true },
      { key: "settings.manage", label: "Company settings", description: "Change the company profile and settings.", sensitive: true },
    ],
  },
];

export const ALL_PERMISSIONS: PermissionDef[] = PERMISSION_GROUPS.flatMap((g) => g.permissions);
export const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map((p) => p.key);
const BY_KEY = new Map(ALL_PERMISSIONS.map((p) => [p.key, p]));

export const permissionLabel = (key: string) => BY_KEY.get(key)?.label ?? key;

// One-tap starting points in the role editor; the owner can still change any switch.
export const ROLE_PRESETS: { name: string; description: string; permissions: string[] }[] = [
  {
    name: "Cashier",
    description: "Sells and takes payments.",
    permissions: ["sales.create", "sales.checkout", "sales.split_payment", "orders.view_own"],
  },
  {
    name: "Waiter",
    description: "Serves tables and places orders.",
    permissions: ["sales.create", "orders.view_own", "tables.manage"],
  },
  {
    name: "Stock keeper",
    description: "Looks after products and stock.",
    permissions: ["inventory.view", "inventory.adjust", "products.manage"],
  },
  {
    name: "Manager",
    description: "Runs the shop day to day.",
    permissions: ALL_PERMISSION_KEYS.filter((k) => !["roles.manage", "settings.manage"].includes(k)),
  },
];

// Turning a permission on also turns on what it requires.
export const withRequirements = (keys: Iterable<string>): Set<string> => {
  const out = new Set<string>();
  const add = (k: string) => {
    if (out.has(k) || !BY_KEY.has(k)) return;
    out.add(k);
    BY_KEY.get(k)!.requires?.forEach(add);
  };
  for (const k of keys) add(k);
  return out;
};

// Turning a permission off also turns off everything that depends on it.
export const withoutDependents = (keys: Set<string>, removed: string): Set<string> => {
  const out = new Set(keys);
  const drop = (k: string) => {
    if (!out.delete(k)) return;
    for (const p of ALL_PERMISSIONS) if (p.requires?.includes(k)) drop(p.key);
  };
  drop(removed);
  return out;
};
