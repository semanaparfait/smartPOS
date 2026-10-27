import OwnerTopNavbar from "@/app/components/ownerComponents/owner-top-navbar";
import { BrandMark } from "@/components/brand";
import { brand } from "@/config/theme";
import { users } from "@/seed/users";
import useAuth from "@/store/Authentication/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { Href, Slot, usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  { label: "Device Information", route: "/(owner)/Settings/Devices/DeviceInformation" },
  { label: "Users & Invites", route: "/(owner)/Settings/users" },
  { label: "Roles & Permissions", route: "/(owner)/Settings/roles" },
  { label: "Company Settings", route: "/(owner)/Settings/company" },
  { label: "Profile", route: "/(owner)/Settings/CompanyProfile" },
  { label: "Change Password", route: "/(owner)/Settings/password" },
];
const INVENTORY_SUB_ITEMS: SubItem[] = [
  { label: "Inventory", route: "/(owner)/inventory" },
  { label: "Orders", route: "/(owner)/inventory/Orders/orders" },
  { label: "Categories", route: "/(owner)/categories" },
  { label: "Products", route: "/(owner)/products/" },
  { label: "Stock Levels", route: "/(owner)/inventory/stockLevel" },
  { label: "Inventory Audit", route: "/(owner)/inventory/InventoryAudit" },
  { label: "Stock Adjustments", route: "/(owner)/inventory/StockAdjustments" },
  { label: "Low Stock Alerts", route: "/(owner)/inventory/LowStock" },
  { label: "Activity Logs", route: "/(owner)/inventory/ActivityLogs" },
];

const FINANCE_SUB_ITEMS: SubItem[] = [
  { label: "Overview", route: "/(owner)/finance" },
  { label: "Verification", route: "/(owner)/finance/verification" },
  { label: "Credits", route: "/(owner)/finance/credits" },
];

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", route: "/(owner)/dashboard", icon: "speedometer", activeIcon: "speedometer-outline" },
      { key: "map", label: "Map", route: "/(owner)/map/map", icon: "map", activeIcon: "map-outline" },
      { key: "winner", label: "Winner", route: "/(owner)/winner/winner", icon: "trophy", activeIcon: "trophy-outline" },
    ],
  },
  {
    title: "Management",
    items: [
      { key: "inventory", label: "Inventory", children: INVENTORY_SUB_ITEMS, icon: "cube", activeIcon: "cube-outline" },
      { key: "workers", label: "Workers", route: "/(owner)/workers/workers", icon: "people", activeIcon: "people-outline" },
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

// The URL never contains route groups like "(owner)", so strip them before matching.
const toPublicPath = (route: string) =>
  route.replace(/\/\([^)]+\)/g, "").replace(/\/$/, "") || "/";

const matches = (pathname: string, route: string) => {
  const target = toPublicPath(route);
  return pathname === target || pathname.startsWith(`${target}/`);
};

// The most specific sub-item for the path, so "/finance/verification" picks
// Verification rather than its parent "/finance".
const activeSub = (pathname: string, subs?: SubItem[]) =>
  subs
    ?.filter((s) => matches(pathname, s.route))
    .sort((a, b) => toPublicPath(b.route).length - toPublicPath(a.route).length)[0];

const SIDEBAR_WIDTH = 96;

export default function OwnerLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const profile = useAuth((state) => state.profile);

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
  const showTopNavbar = !pathname.startsWith("/map/map");

  // Page title + breadcrumb for the top bar, derived from the active nav entry.
  let pageTitle = "Dashboard";
  let pageSection: string | undefined;
  for (const section of NAV_SECTIONS) {
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
            {entry.label}
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
          onPress={() => router.push("/(tabs)/products/products" as Href)}
          accessibilityLabel="Open point of sale"
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
          {NAV_SECTIONS.map((section, i) => (
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
            title={pageTitle}
            section={pageSection}
            email={ownerEmail}
            avatarInitial={ownerInitial}
          />
        )}

        <View className="flex-1 min-h-0">
          <Slot />
        </View>

        {/* FLYOUT — sub-pages of the tapped group */}
        {openGroup && (
          <>
            <Pressable
              onPress={() => setOpenGroup(null)}
              accessibilityLabel="Close menu"
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
                    {openGroup.label}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setOpenGroup(null)}
                  accessibilityLabel="Close menu"
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
                          {sub.label}
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
