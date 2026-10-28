import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Slot, useRouter, usePathname } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/brand";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import usePermissions from "@/store/Authentication/usePermissions";

interface NavItemProps {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
  // Shown only if the user has at least one of these (none = everyone).
  permissions?: string[];
}

const NAV_ITEMS: NavItemProps[] = [
  { name: "Products", icon: "grid", activeIcon: "grid-outline", route: "/(tabs)/products/products", permissions: ["sales.create"] },
  { name: "Tables", icon: "restaurant", activeIcon: "restaurant-outline", route: "/tables", permissions: ["tables.manage"] },
  { name: "Services", icon: "settings", activeIcon: "settings-outline", route: "/Services", permissions: ["services.manage"] },
  { name: "Orders", icon: "receipt", activeIcon: "receipt-outline", route: "/(tabs)/orders/orders", permissions: ["orders.view_own"] },
  { name: "Inventory", icon: "cube", activeIcon: "cube-outline", route: "/inventory", permissions: ["inventory.view"] },
  { name: "Profile", icon: "person-circle", activeIcon: "person-circle-outline", route: "/profile" },
];

// The URL never contains route groups like "(tabs)", so strip them before matching.
const stripGroups = (route: string) => route.replace(/\/\([^)]+\)/g, "") || "/";

// Screens outside the sidebar that still need a permission.
const EXTRA_GUARDS: { prefix: string; permissions: string[] }[] = [
  { prefix: "/checkout", permissions: ["sales.checkout"] },
];

export default function SidebarLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { canAny } = usePermissions();
  const allowed = (perms?: string[]) => !perms || canAny(...perms);
  const navItems = NAV_ITEMS.filter((item) => allowed(item.permissions));

  // The permission the current screen needs, if any.
  const guard =
    NAV_ITEMS.find((item) => {
      const target = stripGroups(item.route);
      return pathname === target || pathname.startsWith(target + "/");
    })?.permissions ?? EXTRA_GUARDS.find((g) => pathname.startsWith(g.prefix))?.permissions;
  const blocked = !allowed(guard);

  // Two-tap logout: first tap arms it for 3s, second tap signs out.
  const [confirmLogout, setConfirmLogout] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

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

  const NavItem = ({ name, icon, activeIcon, route }: NavItemProps) => {
    const target = stripGroups(route);
    const isActive = pathname === target || pathname.startsWith(target + "/");

    return (
      <Pressable
        onPress={() => router.push(route as any)}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        className={`w-full items-center rounded-2xl py-3 ${
          isActive ? "bg-lime" : "active:bg-white/10"
        }`}
      >
        <Ionicons
          name={isActive ? icon : activeIcon}
          size={22}
          color={isActive ? brand.ink : "rgba(255,255,255,0.55)"}
        />
        <Text
          numberOfLines={1}
          className={`text-[11px] font-semibold mt-1.5 ${
            isActive ? "text-ink" : "text-white/55"
          }`}
        >
          {name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 flex-row bg-ivory">
      {/* SIDEBAR */}
      <View
        className="w-[96px] bg-ink"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 12,
          paddingLeft: insets.left,
        }}
      >
        {/* LOGO — fixed */}
        <Pressable
          onPress={() => router.push("/")}
          accessibilityLabel="SmartPOS home"
          className="self-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 items-center justify-center mb-4 active:bg-white/10"
        >
          <BrandMark size={34} receipt={brand.lime} check={brand.ink} />
        </Pressable>

        {/* LINKS — scroll if they don't fit */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-2.5 py-2 gap-1.5"
          showsVerticalScrollIndicator={false}
        >
          {navItems.map((item) => (
            <NavItem key={item.route} {...item} />
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
        {blocked ? (
          <View className="flex-1 items-center justify-center p-6">
            <View className="bg-white rounded-2xl border border-ink/5 p-8 items-center max-w-[380px] w-full">
              <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
                <Ionicons name="lock-closed-outline" size={24} color={brand.ink} />
              </View>
              <Text className="text-ink text-[16px] font-bold">No access</Text>
              <Text className="text-ink/50 text-[13px] text-center mt-1">
                Your role does not allow this screen. Ask the owner if you need it.
              </Text>
              {navItems[0] && (
                <Pressable
                  onPress={() => router.replace(navItems[0].route as any)}
                  className="mt-5 h-10 px-5 rounded-xl bg-ink items-center justify-center active:bg-ink-soft"
                >
                  <Text className="text-white text-[13px] font-semibold">Go to {navItems[0].name}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <Slot />
        )}
      </View>
    </View>
  );
}
