import OwnerTopNavbar from "@/app/components/ownerComponents/owner-top-navbar";
import { users } from "@/seed/users";
import { Ionicons } from "@expo/vector-icons";
import { Href, Slot, usePathname, useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type NavItemConfig = {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const OWNER_NAV_ITEMS: NavItemConfig[] = [
  {
    label: "Dashboard",
    route: "/(owner)/dashboard",
    icon: "speedometer",
    activeIcon: "speedometer-outline",
  },
  {
    label: "Workers",
    route: "/(owner)/workers",
    icon: "people",
    activeIcon: "people-outline",
  },
  {
    label: "Categories",
    route: "/(owner)/categories",
    icon: "list",
    activeIcon: "list-outline",
  },
  {
    label: "Finance",
    route: "/(owner)/finance",
    icon: "wallet",
    activeIcon: "wallet-outline",
  },
  {
    label: "Inventory",
    route: "/(owner)/inventory",
    icon: "cube",
    activeIcon: "cube-outline",
  },
  {
    label: "Orders",
    route: "/(owner)/orders",
    icon: "receipt",
    activeIcon: "receipt-outline",
  },
  {
    label: "Products",
    route: "/(owner)/products",
    icon: "grid",
    activeIcon: "grid-outline",
  },
  {
    label: "Winner",
    route: "/(owner)/winner",
    icon: "trophy",
    activeIcon: "trophy-outline",
  },
];

function NavItem({
  label,
  route,
  icon,
  activeIcon,
  isActive,
  onPress,
}: NavItemConfig & { isActive: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      className={`min-h-14 items-center justify-center rounded-xl mb-2 py-2 px-1 ${
        isActive ? "bg-green-100 border border-green-300" : ""
      }`}
      onPress={onPress}
    >
      <Ionicons
        name={isActive ? icon : activeIcon}
        size={22}
        color={isActive ? "#14532d" : "#64748b"}
      />
      <Text
        className={`mt-1 text-[11px] font-semibold text-center ${
          isActive ? "text-green-900" : "text-slate-500"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function OwnerLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const ownerUser = users.find((user) => user.role === "owner");
  const ownerEmail = ownerUser?.email ?? "admin@smartpos.local";
  const ownerInitial = ownerUser?.name?.trim()?.charAt(0)?.toUpperCase() ?? "A";

  const toPublicPath = (groupedRoute: string) =>
    groupedRoute.replace("/(owner)", "");

  const handleLogout = () => {
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 flex-row items-stretch">
        <View className=" w-[124px] bg-slate-50 border-r border-slate-200 pt-2 pb-2.5">
            <View className="items-center mb-2">
              <View className="bg-emerald-600 p-2 rounded-2xl shadow-sm">
                <Ionicons name="infinite" size={24} color="white" />
              </View>
            </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="px-2 pb-2.5"
            showsVerticalScrollIndicator={false}
          >
            {OWNER_NAV_ITEMS.map((item) => {
              const publicRoute = toPublicPath(item.route);
              const isActive =
                pathname === publicRoute ||
                pathname.startsWith(`${publicRoute}/`);
              return (
                <NavItem
                  key={item.route}
                  label={item.label}
                  route={item.route}
                  icon={item.icon}
                  activeIcon={item.activeIcon}
                  isActive={isActive}
                  onPress={() => router.push(item.route as Href)}
                />
              );
            })}
          </ScrollView>

          <TouchableOpacity
            className="flex-row items-center justify-center mx-2 mt-2 rounded-[10px] border border-red-200 bg-red-50 py-2.5"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="text-red-500 font-bold text-xs ml-1.5">
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        <View className="h-full flex-1 bg-slate-100">
          <OwnerTopNavbar email={ownerEmail} avatarInitial={ownerInitial} />

<View className="flex-1 min-h-0">
  <Slot />
</View>
        </View>
      </View>
    </SafeAreaView>
  );
}
