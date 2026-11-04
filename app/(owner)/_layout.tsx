import OwnerTopNavbar from "@/app/components/ownerComponents/owner-top-navbar";
import AreaGate from "@/components/AreaGate";
import { featureOffMessage, featureOfPage, pageFeatureOn } from "@/config/features";
import { BrandMark } from "@/components/brand";
import { ownerPageAccess, toPublicPath } from "@/config/ownerAccess";
import { brand } from "@/config/theme";
import { users } from "@/seed/users";
import useAuth from "@/store/Authentication/useAuth";
import usePermissions from "@/store/Authentication/usePermissions";
import { Ionicons } from "@expo/vector-icons";
import { Href, Slot, usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tr, useLanguage } from "@/i18n";

type SubItem = { label: string; route: string };

type NavEntry = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  // A link has a route; a group has children instead.
  route?: string;
  children?: SubItem[];
};

type NavSection = { title: string; items: NavEntry[] };

// Sub-menu settings config matching your requirement
const SETTINGS_SUB_ITEMS: SubItem[] = [
  { label: "Device Information", route: "/(owner)/owner/Settings/Devices/DeviceInformation" },
  { label: "Users & Invites", route: "/(owner)/owner/workers/workers" },
  { label: "Roles & Permissions", route: "/(owner)/owner/workers/workers" },
  { label: "Company Settings", route: "/(owner)/owner/Settings/EditProfile" },
  { label: "Delivery", route: "/(owner)/owner/Settings/Delivery" },
  { label: "Kitchen", route: "/(owner)/owner/Settings/Kitchen" },
  { label: "Profile", route: "/(owner)/owner/Settings/CompanyProfile" },
  { label: "Change Password", route: "/(owner)/owner/Settings/password" },
];
const INVENTORY_SUB_ITEMS: SubItem[] = [
  { label: "Stock Levels", route: "/(owner)/owner/inventory" },
  { label: "Ingredients", route: "/(owner)/owner/inventory/Ingredients" },
  { label: "Usage & Losses", route: "/(owner)/owner/inventory/IngredientUsage" },
  { label: "Stock Count", route: "/(owner)/owner/inventory/StockCount" },
  { label: "Orders", route: "/(owner)/owner/inventory/Orders/orders" },
  { label: "Categories", route: "/(owner)/owner/categories" },
  { label: "Products", route: "/(owner)/owner/products/" },
  { label: "Low Stock & Expiry", route: "/(owner)/owner/inventory/LowStock" },
  { label: "Activity Logs", route: "/(owner)/owner/inventory/ActivityLogs" },
];

const FINANCE_SUB_ITEMS: SubItem[] = [
  { label: "Overview", route: "/(owner)/owner/finance" },
  { label: "Verification", route: "/(owner)/owner/finance/verification" },
  { label: "Money summary", route: "/(owner)/owner/finance/money-summary" },
  { label: "Service money", route: "/(owner)/owner/finance/service-money" },
  { label: "Expenses", route: "/(owner)/owner/finance/expenses" },
  { label: "Salaries & debts", route: "/(owner)/owner/finance/payroll" },
  { label: "Credits", route: "/(owner)/owner/finance/credits" },
];

const SERVICES_SUB_ITEMS: SubItem[] = [
  { label: "Bookings", route: "/(owner)/owner/services/bookings" },
  { label: "What you offer", route: "/(owner)/owner/services" },
];

const DELIVERY_SUB_ITEMS: SubItem[] = [
  { label: "All deliveries", route: "/(owner)/owner/deliveries" },
  { label: "Riders", route: "/(owner)/owner/riders" },
];

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", route: "/(owner)/owner/dashboard", icon: "speedometer", activeIcon: "speedometer-outline" },
      { key: "map", label: "Map", route: "/(owner)/owner/map/map", icon: "map", activeIcon: "map-outline" },
      { key: "winner", label: "Winner", route: "/(owner)/owner/winner/winner", icon: "trophy", activeIcon: "trophy-outline" },
    ],
  },
  {
    title: "Management",
    items: [
      { key: "inventory", label: "Inventory", children: INVENTORY_SUB_ITEMS, icon: "cube", activeIcon: "cube-outline" },
      { key: "services", label: "Services", children: SERVICES_SUB_ITEMS, icon: "bed", activeIcon: "bed-outline" },
      { key: "deliveries", label: "Deliveries", route: "/(owner)/owner/deliveries", icon: "bicycle", activeIcon: "bicycle-outline" },
      { key: "workers", label: "Workers", route: "/(owner)/owner/workers/workers", icon: "people", activeIcon: "people-outline" },
      { key: "finance", label: "Finance", children: FINANCE_SUB_ITEMS, icon: "wallet", activeIcon: "wallet-outline" },
    ],
  },
  {
    title: "System",
    items: [
      { key: "settings", label: "Settings", children: SETTINGS_SUB_ITEMS, icon: "settings", activeIcon: "settings-outline" },
    ],
  },
];

const matches = (pathname: string, route: string) => {
  const target = toPublicPath(route);
  return pathname === target || pathname.startsWith(`${target}/`);
};

// The most specific sub-item for the path, so "/owner/finance/verification" picks
// Verification rather than its parent "/owner/finance".
const activeSub = (pathname: string, subs?: SubItem[]) =>
  subs
    ?.filter((s) => matches(pathname, s.route))
    .sort((a, b) => toPublicPath(b.route).length - toPublicPath(a.route).length)[0];

const SIDEBAR_WIDTH = 96;

function OwnerShell() {
  // Open pages redraw in the new language.
  const language = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const profile = useAuth((state) => state.profile);
  const { isOwner, canAny } = usePermissions();

  // Workers given owner pages (see config/ownerAccess) see only those, plus a way
  // back to the till; owners see everything.
  const canOpen = (route: string) => {
    // An extra the super admin switched off is closed to everyone.
    if (!pageFeatureOn(profile, route)) return false;
    if (isOwner) return true;
    const needs = ownerPageAccess(route);
    return !!needs && canAny(...needs);
  };
  // Deliveries shows only for shops that deliver.
  const deliveryOn = !!profile?.company?.deliveryEnabled;
  // Shops with their own riders also get the Riders page under Deliveries.
  const ridersOn = deliveryOn && !!profile?.company?.deliveryRiders;
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((entry) => entry.key !== "deliveries" || deliveryOn)
      .filter((entry) => !entry.route || pageFeatureOn(profile, entry.route))
      .map((entry) =>
        entry.children ? { ...entry, children: entry.children.filter((sub) => pageFeatureOn(profile, sub.route)) } : entry,
      )
      .filter((entry) => !entry.children || entry.children.length > 0)
      .map((entry) =>
        entry.key === "deliveries" && ridersOn
          ? { ...entry, route: undefined, children: DELIVERY_SUB_ITEMS }
          : entry,
      ),
  }));
  const navSections: NavSection[] = isOwner
    ? sections
    : [
        {
          title: tr("Till"),
          items: [
            { key: "till", label: tr("Till"), route: "/(till)/till/products/products", icon: "storefront", activeIcon: "storefront-outline" },
          ],
        },
        ...sections.map((section) => ({
          ...section,
          items: section.items
            .map((entry) =>
              entry.children ? { ...entry, children: entry.children.filter((sub) => canOpen(sub.route)) } : entry,
            )
            .filter((entry) => (entry.children ? entry.children.length > 0 : canOpen(entry.route!))),
        })).filter((section) => section.items.length > 0),
      ];
  const blocked = !canOpen(pathname);
  const offFeature = pageFeatureOn(profile, pathname) ? null : featureOfPage(pathname);
  const firstAllowed = navSections.flatMap((s) => s.items).find((e) => e.key !== "till");
  const firstAllowedRoute = firstAllowed?.route ?? firstAllowed?.children?.[0]?.route;

  // Which group's flyout menu is open next to the rail.
  const [openGroup, setOpenGroup] = useState<NavEntry | null>(null);

  // Two-tap logout: first tap arms it for 3s, second tap signs out.
  const [confirmLogout, setConfirmLogout] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  // Close the flyout whenever navigation happens.
  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  const ownerUser = users.find((user) => user.role === "owner");
  const ownerName = profile?.name ?? ownerUser?.name ?? "Owner";
  const ownerEmail = profile?.email ?? ownerUser?.email ?? "admin@smartpos.local";
  const ownerInitial = ownerName.trim().charAt(0).toUpperCase() || "A";
  const showTopNavbar = !pathname.startsWith("/owner/map/map");

  // Page title + breadcrumb for the top bar, derived from the active nav entry.
  let pageTitle = "Dashboard";
  let pageSection: string | undefined;
  for (const section of navSections) {
    for (const entry of section.items) {
      if (entry.route && matches(pathname, entry.route)) {
        pageTitle = entry.label;
        pageSection = section.title;
      }
      const sub = activeSub(pathname, entry.children);
      if (sub) {
        pageTitle = sub.label;
        pageSection = entry.label;
      }
    }
  }

  const handleLogout = async () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      resetTimer.current = setTimeout(() => setConfirmLogout(false), 3000);
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setConfirmLogout(false);
    await logout();
    router.replace("/");
  };

  const NavItem = ({ entry }: { entry: NavEntry }) => {
    const isGroup = !!entry.children;
    const isActive = isGroup
      ? entry.children!.some((sub) => matches(pathname, sub.route))
      : !!entry.route && matches(pathname, entry.route);
    const isOpen = openGroup?.key === entry.key;

    const onPress = () => {
      if (isGroup) {
        setOpenGroup(isOpen ? null : entry);
      } else {
        setOpenGroup(null);
        router.push(entry.route as Href);
      }
    };

    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive, expanded: isGroup ? isOpen : undefined }}
        className={`w-full items-center rounded-2xl py-3 ${
          isActive ? "bg-lime" : isOpen ? "bg-white/10" : "active:bg-white/10"
        }`}
      >
        <Ionicons
          name={isActive ? entry.icon : entry.activeIcon}
          size={22}
          color={isActive ? brand.ink : isOpen ? brand.white : "rgba(255,255,255,0.55)"}
        />
        <View className="flex-row items-center mt-1.5">
          <Text
            numberOfLines={1}
            className={`text-[11px] font-semibold ${
              isActive ? "text-ink" : isOpen ? "text-white" : "text-white/55"
            }`}
          >
            {tr(entry.label)}
          </Text>
          {isGroup && (
            <Ionicons
              name="chevron-forward"
              size={10}
              color={isActive ? brand.ink : "rgba(255,255,255,0.4)"}
              style={{ marginLeft: 1 }}
            />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 flex-row bg-ivory">
      {/* SIDEBAR */}
      <View
        className="bg-ink z-20"
        style={{
          width: SIDEBAR_WIDTH + insets.left,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 12,
          paddingLeft: insets.left,
        }}
      >
        {/* LOGO — fixed */}
        <Pressable
          onPress={() => router.push("/(till)/till/products/products" as Href)}
          accessibilityLabel={tr("Open point of sale")}
          className="self-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 items-center justify-center mb-4 active:bg-white/10"
        >
          <BrandMark size={34} receipt={brand.lime} check={brand.ink} />
        </Pressable>

        {/* LINKS — scroll if they don't fit */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-2.5 py-2"
          showsVerticalScrollIndicator={false}
        >
          {navSections.map((section, i) => (
            <View key={section.title}>
              {i > 0 && <View className="h-px bg-white/10 mx-3 my-2.5" />}
              <View style={{ gap: 6 }}>
                {section.items.map((entry) => (
                  <NavItem key={entry.key} entry={entry} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* LOGOUT — fixed */}
        <View className="px-2.5 pt-3 border-t border-white/10">
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel={confirmLogout ? "Tap again to log out" : "Log out"}
            className={`w-full items-center rounded-2xl py-3 ${
              confirmLogout ? "bg-red-500" : "active:bg-white/10"
            }`}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={confirmLogout ? brand.white : "rgba(255,255,255,0.55)"}
            />
            <Text
              numberOfLines={1}
              className={`text-[11px] font-semibold mt-1.5 ${
                confirmLogout ? "text-white" : "text-white/55"
              }`}
            >
              {confirmLogout ? "Tap again" : "Log out"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* WORKSPACE */}
      <View className="flex-1 bg-ivory">
        {showTopNavbar && (
          <OwnerTopNavbar
            title={tr(pageTitle)}
            section={pageSection && tr(pageSection)}
            email={ownerEmail}
            avatarInitial={ownerInitial}
          />
        )}

        <View className="flex-1 min-h-0">
          {blocked ? (
            <View className="flex-1 items-center justify-center p-6">
              <View className="bg-white rounded-2xl border border-ink/5 p-8 items-center max-w-[380px] w-full">
                <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
                  <Ionicons name="lock-closed-outline" size={24} color={brand.ink} />
                </View>
                <Text className="text-ink text-[16px] font-bold">{offFeature ? tr("Not turned on") : tr("No access")}</Text>
                <Text className="text-ink/50 text-[13px] text-center mt-1">
                  {offFeature ? featureOffMessage(offFeature) : tr("Your role does not allow this screen. Ask the owner if you need it.")}
                </Text>
                <Pressable
                  onPress={() => router.replace((firstAllowedRoute ?? "/(till)/till/products/products") as Href)}
                  className="mt-5 h-10 px-5 rounded-xl bg-ink items-center justify-center active:bg-ink-soft"
                >
                  <Text className="text-white text-[13px] font-semibold">{tr("Go to")} {firstAllowedRoute ? tr(firstAllowed!.label) : tr("the till")}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Slot key={language} />
          )}
        </View>

        {/* FLYOUT — sub-pages of the tapped group */}
        {openGroup && (
          <>
            <Pressable
              onPress={() => setOpenGroup(null)}
              accessibilityLabel={tr("Close menu")}
              className="absolute inset-0 bg-ink/20"
            />
            <View
              className="absolute left-0 w-[240px] bg-ink rounded-r-2xl border-l border-white/10 py-4 px-3"
              style={{
                top: insets.top + 12,
                maxHeight: "90%",
                shadowColor: brand.ink,
                shadowOpacity: 0.3,
                shadowRadius: 20,
                shadowOffset: { width: 8, height: 8 },
                elevation: 12,
              }}
            >
              <View className="flex-row items-center justify-between px-2 mb-3">
                <View className="flex-row items-center">
                  <Ionicons name={openGroup.icon} size={16} color={brand.lime} />
                  <Text className="text-white text-sm font-extrabold ml-2">
                    {tr(openGroup.label)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setOpenGroup(null)}
                  accessibilityLabel={tr("Close menu")}
                  className="w-7 h-7 rounded-lg items-center justify-center active:bg-white/10"
                >
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 2 }}>
                  {openGroup.children!.map((sub) => {
                    const isSubActive = activeSub(pathname, openGroup.children) === sub;
                    return (
                      <Pressable
                        key={sub.route}
                        onPress={() => {
                          setOpenGroup(null);
                          router.push(sub.route as Href);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSubActive }}
                        className={`flex-row items-center rounded-xl px-3 py-2.5 ${
                          isSubActive ? "bg-lime" : "active:bg-white/10"
                        }`}
                      >
                        <Text
                          numberOfLines={1}
                          className={`flex-1 text-[13px] ${
                            isSubActive ? "text-ink font-bold" : "text-white/70 font-medium"
                          }`}
                        >
                          {tr(sub.label)}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={12}
                          color={isSubActive ? brand.ink : "rgba(255,255,255,0.3)"}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default function OwnerLayout() {
  return (
    <AreaGate area="owner">
      <OwnerShell />
    </AreaGate>
  );
}
