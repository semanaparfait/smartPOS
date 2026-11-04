// Which switch opens which owner page for a worker. Owners see every page.
// Matched by URL prefix (route groups like "(owner)" are not in the URL), most
// specific first; a worker needs at least one of the listed permissions.
// Pages not listed here stay owner-only.
const OWNER_AREAS: { prefix: string; permissions: string[] }[] = [
  { prefix: "/owner/dashboard", permissions: ["reports.view"] },
  { prefix: "/owner/winner", permissions: ["reports.view"] },
  { prefix: "/owner/inventory/Orders", permissions: ["orders.view_all"] },
  { prefix: "/owner/inventory/ActivityLogs", permissions: ["reports.view"] },
  { prefix: "/owner/inventory/AddIngredient", permissions: ["products.manage"] },
  // Saves through the product route, so it also takes products.manage on the server.
  { prefix: "/owner/inventory/StockCount", permissions: ["inventory.adjust"] },
  { prefix: "/owner/inventory", permissions: ["inventory.view"] },
  { prefix: "/owner/services/bookings", permissions: ["services.manage"] },
  { prefix: "/owner/services", permissions: ["services.setup"] },
  { prefix: "/owner/categories", permissions: ["products.manage"] },
  { prefix: "/owner/products", permissions: ["products.manage"] },
  { prefix: "/owner/Products", permissions: ["products.manage"] },
  { prefix: "/owner/workers/roles", permissions: ["roles.manage"] },
  { prefix: "/owner/workers/employees", permissions: ["employees.manage"] },
  { prefix: "/owner/workers", permissions: ["employees.manage", "roles.manage"] },
  { prefix: "/owner/deliveries", permissions: ["deliveries.manage", "reports.view"] },
  { prefix: "/owner/riders", permissions: ["deliveries.manage", "reports.view"] },
  { prefix: "/owner/finance/verification", permissions: ["finance.verify"] },
  { prefix: "/owner/finance/money-summary", permissions: ["finance.verify"] },
  { prefix: "/owner/finance/service-money", permissions: ["finance.verify"] },
  { prefix: "/owner/finance/expenses", permissions: ["reports.view"] },
  { prefix: "/owner/finance/payroll", permissions: ["payroll.manage"] },
  { prefix: "/owner/finance/credits", permissions: ["credits.view"] },
  { prefix: "/owner/finance", permissions: ["reports.view"] },
  { prefix: "/owner/Settings/Devices", permissions: ["devices.manage"] },
  { prefix: "/owner/Settings/EditProfile", permissions: ["settings.manage"] },
  { prefix: "/owner/Settings/Delivery", permissions: ["settings.manage"] },
  { prefix: "/owner/Settings/Kitchen", permissions: ["settings.manage"] },
  { prefix: "/owner/Settings/CompanyProfile", permissions: ["settings.manage"] },
];

// The URL never contains route groups like "(owner)", so strip them before matching.
export const toPublicPath = (route: string) =>
  route.replace(/\/\([^)]+\)/g, "").replace(/\/$/, "") || "/";

// Permissions that open this owner page for a worker; null = owner only.
export const ownerPageAccess = (route: string): string[] | null => {
  const path = toPublicPath(route);
  const area = OWNER_AREAS.find((a) => path === a.prefix || path.startsWith(`${a.prefix}/`));
  return area?.permissions ?? null;
};

// Owner pages a worker can be given, as shortcuts in the worker's sidebar.
// A worker sees an entry when they can open at least one of its routes; it opens the first.
export const MANAGE_SHORTCUTS: {
  name: string;
  icon: "speedometer" | "pricetags" | "bed" | "people" | "phone-portrait" | "wallet" | "business" | "bicycle";
  routes: string[];
}[] = [
  { name: "Dashboard", icon: "speedometer", routes: ["/(owner)/owner/dashboard"] },
  { name: "Catalog", icon: "pricetags", routes: ["/(owner)/owner/products", "/(owner)/owner/categories"] },
  { name: "Services", icon: "bed", routes: ["/(owner)/owner/services"] },
  { name: "Team", icon: "people", routes: ["/(owner)/owner/workers/workers"] },
  { name: "Delivery report", icon: "bicycle", routes: ["/(owner)/owner/deliveries"] },
  { name: "Devices", icon: "phone-portrait", routes: ["/(owner)/owner/Settings/Devices/DeviceInformation"] },
  { name: "Finance", icon: "wallet", routes: ["/(owner)/owner/finance", "/(owner)/owner/finance/verification", "/(owner)/owner/finance/money-summary", "/(owner)/owner/finance/service-money", "/(owner)/owner/finance/expenses", "/(owner)/owner/finance/payroll", "/(owner)/owner/finance/credits"] },
  { name: "Company", icon: "business", routes: ["/(owner)/owner/Settings/EditProfile", "/(owner)/owner/Settings/Delivery"] },
];
