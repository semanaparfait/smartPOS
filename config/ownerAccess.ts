// Which switch opens which owner page for a worker. Owners see every page.
// Matched by URL prefix (route groups like "(owner)" are not in the URL), most
// specific first; a worker needs at least one of the listed permissions.
// Pages not listed here stay owner-only.
const OWNER_AREAS: { prefix: string; permissions: string[] }[] = [
  { prefix: "/dashboard", permissions: ["reports.view"] },
  { prefix: "/winner", permissions: ["reports.view"] },
  { prefix: "/inventory/Orders", permissions: ["orders.view_all"] },
  { prefix: "/inventory", permissions: ["inventory.view"] },
  { prefix: "/categories", permissions: ["products.manage"] },
  { prefix: "/products", permissions: ["products.manage"] },
  { prefix: "/Products", permissions: ["products.manage"] },
  { prefix: "/workers/roles", permissions: ["roles.manage"] },
  { prefix: "/workers/employees", permissions: ["employees.manage"] },
  { prefix: "/workers", permissions: ["employees.manage", "roles.manage"] },
  { prefix: "/finance/verification", permissions: ["finance.verify"] },
  { prefix: "/finance/credits", permissions: ["credits.view"] },
  { prefix: "/finance", permissions: ["reports.view"] },
  { prefix: "/Settings/Devices", permissions: ["devices.manage"] },
  { prefix: "/Settings/EditProfile", permissions: ["settings.manage"] },
  { prefix: "/Settings/CompanyProfile", permissions: ["settings.manage"] },
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
  icon: "speedometer" | "pricetags" | "people" | "phone-portrait" | "wallet" | "business";
  routes: string[];
}[] = [
  { name: "Dashboard", icon: "speedometer", routes: ["/(owner)/dashboard"] },
  { name: "Catalog", icon: "pricetags", routes: ["/(owner)/products", "/(owner)/categories"] },
  { name: "Team", icon: "people", routes: ["/(owner)/workers/workers"] },
  { name: "Devices", icon: "phone-portrait", routes: ["/(owner)/Settings/Devices/DeviceInformation"] },
  { name: "Finance", icon: "wallet", routes: ["/(owner)/finance", "/(owner)/finance/verification", "/(owner)/finance/credits"] },
  { name: "Company", icon: "business", routes: ["/(owner)/Settings/EditProfile"] },
];
