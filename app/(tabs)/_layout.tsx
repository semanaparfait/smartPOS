import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Slot, useRouter, usePathname } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/brand";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";

interface NavItemProps {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const NAV_ITEMS: NavItemProps[] = [
  { name: "Products", icon: "grid", activeIcon: "grid-outline", route: "/(tabs)/products/products" },
  { name: "Tables", icon: "restaurant", activeIcon: "restaurant-outline", route: "/tables" },
  { name: "Services", icon: "settings", activeIcon: "settings-outline", route: "/Services" },
  { name: "Orders", icon: "receipt", activeIcon: "receipt-outline", route: "/(tabs)/orders/orders" },
  { name: "Inventory", icon: "cube", activeIcon: "cube-outline", route: "/inventory" },
  { name: "Profile", icon: "person-circle", activeIcon: "person-circle-outline", route: "/profile" },
];

// The URL never contains route groups like "(tabs)", so strip them before matching.
const stripGroups = (route: string) => route.replace(/\/\([^)]+\)/g, "") || "/";

export default function SidebarLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

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
          {NAV_ITEMS.map((item) => (
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
        <Slot />
      </View>
    </View>
  );
}
