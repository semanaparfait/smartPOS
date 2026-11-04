import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Slot, useRouter, usePathname } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AreaGate from "@/components/AreaGate";
import { BrandMark } from "@/components/brand";
import { homeFor } from "@/utils/home";
import { MANAGE_SHORTCUTS, ownerPageAccess } from "@/config/ownerAccess";
import { TILL_NAV as NAV_ITEMS, type TillNavItem as NavItemProps } from "@/config/tillNav";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import usePermissions from "@/store/Authentication/usePermissions";
import { tr, useLanguage } from "@/i18n";
import HoldReminder from "@/components/hold/HoldReminder";


// The URL never contains route groups like "(till)", so strip them before matching.
const stripGroups = (route: string) => route.replace(/\/\([^)]+\)/g, "") || "/";

// Screens outside the sidebar that still need a permission.
const EXTRA_GUARDS: { prefix: string; permissions: string[] }[] = [
  { prefix: "/till/checkout", permissions: ["sales.checkout"] },
];

function TillShell() {
  // Open pages redraw in the new language.
  const language = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { canAny } = usePermissions();
  const allowed = (perms?: string[]) => !perms || canAny(...perms);
  const deliveryOn = useAuth((s) => !!s.profile?.company?.deliveryEnabled);
  const navItems = NAV_ITEMS.filter((item) => allowed(item.permissions) && (!item.delivery || deliveryOn));

  // Owner pages this worker was given (Team, Catalog, ...), each opening the first
  // page of it they can use. Owners reach them from their own sidebar instead.
  const { isOwner } = usePermissions();
  const manageItems: NavItemProps[] = isOwner
    ? []
    : MANAGE_SHORTCUTS.flatMap((shortcut) => {
        const route = shortcut.routes.find((r) => {
          const needs = ownerPageAccess(r);
          return !!needs && canAny(...needs);
        });
        return route
          ? [{ name: shortcut.name, icon: shortcut.icon, activeIcon: `${shortcut.icon}-outline` as const, route }]
          : [];
      });

  // The permission the current screen needs, if any.
  const guard =
    NAV_ITEMS.find((item) => {
      const target = stripGroups(item.match ?? item.route);
      return pathname === target || pathname.startsWith(target + "/");
    })?.permissions ?? EXTRA_GUARDS.find((g) => pathname.startsWith(g.prefix))?.permissions;
  const blocked = !allowed(guard);

  // Products is the old default start; anyone who can't open it goes to their own home.
  const profile = useAuth((s) => s.profile);
  useEffect(() => {
    if (blocked && pathname === "/till/products/products") router.replace(homeFor(profile) as any);
  }, [blocked, pathname, profile, router]);

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

  const NavItem = ({ name, icon, activeIcon, route, match }: NavItemProps) => {
    const target = stripGroups(match ?? route);
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
          {tr(name)}
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
          accessibilityLabel={tr("SmartPOS home")}
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
          {manageItems.length > 0 && (
            <>
              <View className="h-px bg-white/10 mx-3 my-1.5" />
              <Text className="text-white/30 text-[9px] font-semibold uppercase tracking-[1.5px] text-center">{tr("Manage")}</Text>
              {manageItems.map((item) => (
                <NavItem key={item.route} {...item} />
              ))}
            </>
          )}
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
              <Text className="text-ink text-[16px] font-bold">{tr("No access")}</Text>
              <Text className="text-ink/50 text-[13px] text-center mt-1">{tr("Your role does not allow this screen. Ask the owner if you need it.")}</Text>
              {navItems[0] && (
                <Pressable
                  onPress={() => router.replace(navItems[0].route as any)}
                  className="mt-5 h-10 px-5 rounded-xl bg-ink items-center justify-center active:bg-ink-soft"
                >
                  <Text className="text-white text-[13px] font-semibold">{tr("Go to")} {tr(navItems[0].name)}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <Slot key={language} />
        )}
        {/* Held sales ask "still waiting?" on whichever screen is open. */}
        {canAny("sales.create") && <HoldReminder />}
      </View>
    </View>
  );
}

export default function SidebarLayout() {
  return (
    <AreaGate area="till">
      <TillShell />
    </AreaGate>
  );
}
