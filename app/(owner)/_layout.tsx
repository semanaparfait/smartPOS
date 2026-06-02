import OwnerTopNavbar from "@/app/components/ownerComponents/owner-top-navbar";
import { users } from "@/seed/users";
import { Ionicons } from "@expo/vector-icons";
import { Href, Slot, usePathname, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

// Enable LayoutAnimation for smooth accordion expansion on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavItemConfig = {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

// Sub-menu settings config matching your requirement
const SETTINGS_SUB_ITEMS = [
  { label: "Device Information", route: "/(owner)/Settings/DeviceInformation" },
  { label: "Users & Invites", route: "/(owner)/Settings/users" },
  { label: "Roles & Permissions", route: "/(owner)/Settings/roles" },
  { label: "Company Settings", route: "/(owner)/Settings/company" },
  { label: "Profile", route: "/(owner)/Settings/profile" },
  { label: "Change Password", route: "/(owner)/Settings/password" },
];
const INVENTORY_SUB_ITEMS = [
  { label: "Inventory", route: "/(owner)/inventory" },
  { label: "Orders", route: "/(owner)/orders" },
  { label: "Categories", route: "/(owner)/categories" },
  { label: "Products", route: "/(owner)/products" },
  {label: "Stock Levels", route: "/(owner)/inventory/stockLevel" },
  {label: "Inventory Audit", route: "/(owner)/inventory/InventoryAudit" },
  {label: "Stock Adjustments", route: "/(owner)/inventory/StockAdjustments" },
  {label: "Low Stock Alerts", route: "/(owner)/inventory/LowStock" },
  {label: "Activity Logs", route: "/(owner)/inventory/ActivityLogs" },
];

const WORKERS_SUB_ITEMS = [
  { label: "Workers List", route: "/(owner)/workers/workers" },
  { label: "Add Worker", route: "/(owner)/workers/addWorker" },
  {label: "Attendance", route: "/(owner)/workers/attendance" },
  {label: "Payroll", route: "/(owner)/workers/Payroll" },
  {label: "Roles & Permissions", route: "/(owner)/workersPermissions" },
];

const FINANCE_SUB_ITEMS = [
  { label: "Sales Overview", route: "/(owner)/finance/sales" },
  { label: "Expenses", route: "/(owner)/finance/expenses" },
  { label: "Profit & Loss", route: "/(owner)/finance/profitLoss" },
  { label: "Financial Reports", route: "/(owner)/finance/reports" },
  { label: "Tax Management", route: "/(owner)/finance/tax" },
  { label: "Payment Methods", route: "/(owner)/finance/payments" },
  { label: "Financial Settings", route: "/(owner)/finance/settings" },
];
const OWNER_NAV_ITEMS: NavItemConfig[] = [
  {
    label: "Dashboard",
    route: "/(owner)/dashboard",
    icon: "speedometer",
    activeIcon: "speedometer-outline",
  },

  {
    label: "Map",
    route: "/(owner)/map/map",
    icon: "map",
    activeIcon: "map-outline",
  },
  {
    label: "Workers",
    route: "/(owner)/workers/workers",
    icon: "people",
    activeIcon: "people-outline",
  },
  {
    label: "Finance",
    route: "/(owner)/finance",
    icon: "wallet",
    activeIcon: "wallet-outline",
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  const ownerUser = users.find((user) => user.role === "owner");
  const ownerEmail = ownerUser?.email ?? "admin@smartpos.local";
  const ownerInitial = ownerUser?.name?.trim()?.charAt(0)?.toUpperCase() ?? "A";
  const showTopNavbar = !pathname.startsWith("/map/map");

  const toPublicPath = (groupedRoute: string) =>
    groupedRoute.replace("/(owner)", "");

  const handleLogout = () => {
    router.replace("/");
  };

  const toggleSettings = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSettingsOpen(!isSettingsOpen);
  };

  // Check if any sub-settings path is currently focused to color the main settings icon green
  const isAnySettingsSubRouteActive = pathname.includes("/Settings");

  const toggleInventory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsInventoryOpen(!isInventoryOpen);
  };

  const isAnyInventorySubRouteActive = INVENTORY_SUB_ITEMS.some((subItem) => {
    const publicSubRoute = toPublicPath(subItem.route);
    return (
      pathname === publicSubRoute || pathname.startsWith(`${publicSubRoute}/`)
    );
  });

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 flex-row items-stretch">
        {/* Sidebar Navigation */}
        <View className="w-[124px] bg-slate-50 border-r border-slate-200 pt-2 pb-2.5">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/products")}
            className="items-center mb-2"
          >
            <View className="bg-emerald-600 p-2 rounded-2xl shadow-sm">
              <Ionicons name="infinite" size={24} color="white" />
            </View>
          </TouchableOpacity>

          <ScrollView
            className="flex-1"
            contentContainerClassName="px-2 pb-2.5"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Render Normal Nav Items before Inventory and Settings */}
            {OWNER_NAV_ITEMS.slice(0, 1).map((item) => {
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

            {/* 2. Inventory accordion groups inventory, orders, categories, and products */}
            <View className="mb-2">
              <TouchableOpacity
                className={`min-h-14 items-center justify-center rounded-xl py-2 px-1 ${
                  isAnyInventorySubRouteActive
                    ? "bg-green-50 border border-green-200"
                    : ""
                }`}
                onPress={toggleInventory}
              >
                <Ionicons
                  name={isAnyInventorySubRouteActive ? "cube" : "cube-outline"}
                  size={22}
                  color={isAnyInventorySubRouteActive ? "#14532d" : "#64748b"}
                />
                <View className="flex-row items-center justify-center mt-1">
                  <Text
                    className={`text-[11px] font-semibold text-center ${
                      isAnyInventorySubRouteActive
                        ? "text-green-900"
                        : "text-slate-500"
                    }`}
                  >
                    Inventory
                  </Text>
                  <Ionicons
                    name={isInventoryOpen ? "chevron-up" : "chevron-down"}
                    size={12}
                    color={isAnyInventorySubRouteActive ? "#14532d" : "#64748b"}
                    style={{ marginLeft: 2, marginTop: 1 }}
                  />
                </View>
              </TouchableOpacity>

              {isInventoryOpen && (
                <View className="bg-slate-100/60 rounded-xl mt-1 p-1 border border-slate-200/50">
                  {INVENTORY_SUB_ITEMS.map((subItem) => {
                    const publicSubRoute = toPublicPath(subItem.route);
                    const isSubActive =
                      pathname === publicSubRoute ||
                      pathname.startsWith(`${publicSubRoute}/`);

                    return (
                      <TouchableOpacity
                        key={subItem.route}
                        onPress={() => router.push(subItem.route as Href)}
                        className={`flex-row items-center justify-between py-2 px-2 rounded-lg mb-0.5 ${
                          isSubActive ? "bg-white border border-slate-200" : ""
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-medium flex-1 pr-1 ${
                            isSubActive
                              ? "text-emerald-700 font-bold"
                              : "text-slate-600"
                          }`}
                          numberOfLines={2}
                        >
                          {subItem.label}
                        </Text>
                        <Ionicons
                          name="add"
                          size={12}
                          color={isSubActive ? "#047857" : "#94a3b8"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 3. Custom Expandable Settings Accordion Accordance */}
            <View className="mb-2">
              <TouchableOpacity
                className={`min-h-14 items-center justify-center rounded-xl py-2 px-1 ${
                  isAnySettingsSubRouteActive
                    ? "bg-green-50 border border-green-200"
                    : ""
                }`}
                onPress={toggleSettings}
              >
                <Ionicons
                  name={isAnySettingsSubRouteActive ? "cog" : "cog-outline"}
                  size={22}
                  color={isAnySettingsSubRouteActive ? "#14532d" : "#64748b"}
                />
                <View className="flex-row items-center justify-center mt-1">
                  <Text
                    className={`text-[11px] font-semibold text-center ${
                      isAnySettingsSubRouteActive
                        ? "text-green-900"
                        : "text-slate-500"
                    }`}
                  >
                    Settings
                  </Text>
                  <Ionicons
                    name={isSettingsOpen ? "chevron-up" : "chevron-down"}
                    size={12}
                    color={isAnySettingsSubRouteActive ? "#14532d" : "#64748b"}
                    style={{ marginLeft: 2, marginTop: 1 }}
                  />
                </View>
              </TouchableOpacity>

              {/* Collapsible Under-Menu List */}
              {isSettingsOpen && (
                <View className="bg-slate-100/60 rounded-xl mt-1 p-1 border border-slate-200/50">
                  {SETTINGS_SUB_ITEMS.map((subItem) => {
                    const publicSubRoute = toPublicPath(subItem.route);
                    const isSubActive = pathname === publicSubRoute;

                    return (
                      <TouchableOpacity
                        key={subItem.route}
                        onPress={() => router.push(subItem.route as Href)}
                        className={`flex-row items-center justify-between py-2 px-2 rounded-lg mb-0.5 ${
                          isSubActive ? "bg-white border border-slate-200" : ""
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-medium flex-1 pr-1 ${
                            isSubActive
                              ? "text-emerald-700 font-bold"
                              : "text-slate-600"
                          }`}
                          numberOfLines={2}
                        >
                          {subItem.label}
                        </Text>
                        <Ionicons
                          name="add"
                          size={12}
                          color={isSubActive ? "#047857" : "#94a3b8"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 4. Render Remaining Navigation Items */}
            {OWNER_NAV_ITEMS.slice(1).map((item) => {
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

          {/* Logout Button */}
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

        {/* Content Panel Area */}
        <View className="h-full flex-1 bg-slate-100">
          {showTopNavbar && (
            <OwnerTopNavbar email={ownerEmail} avatarInitial={ownerInitial} />
          )}

          <View className="flex-1 min-h-0">
            <Slot />
          </View>
        </View>
      </View>
    </View>
  );
}
