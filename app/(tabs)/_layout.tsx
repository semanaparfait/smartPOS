import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Slot, useRouter, usePathname } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";


interface NavItemProps {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
}

export default function SidebarLayout() {
  const router = useRouter();
  const pathname = usePathname();


  const NavItem = ({ name, icon, activeIcon, route }: NavItemProps) => {
    
    const isActive = pathname === route || pathname.startsWith(route + "/");

    return (
      <TouchableOpacity
        style={[styles.navItem, isActive && styles.activeNavItem]}
        onPress={() => router.push(route as any)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isActive ? icon : activeIcon}
          size={24}
          color={isActive ? "#00875A" : "#9CA3AF"} 
        />
        <Text style={[styles.navText, { color: isActive ? "#00875A" : "#9CA3AF" }]}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
  
    <View style={styles.container}>
      <SafeAreaView style={styles.safeContainer}>
        
        {/* SIDEBAR BLOCK */}
        <View style={styles.sidebar}>
          {/* LOGO BOX */}
          <TouchableOpacity 
            onPress={() => router.push("/")} 
            style={styles.logoContainer}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={32} color="#00875A" />
          </TouchableOpacity>

          {/* DASHBOARD LINKS */}
          <NavItem name="Products" icon="grid" activeIcon="grid-outline" route="/products" />
          <NavItem name="Tables" icon="restaurant" activeIcon="restaurant-outline" route="/tables" />
          <NavItem name="Services" icon="settings-outline" activeIcon="settings-outline" route="/Services" />
          <NavItem name="Orders" icon="receipt" activeIcon="receipt-outline" route="/orders" />
          <NavItem name="Inventory" icon="cube" activeIcon="cube-outline" route="/inventory" />
          <NavItem name="Profile" icon="person-circle" activeIcon="person-circle-outline" route="/profile" />

          {/* PUSHES NAVIGATION BLOCKS UPWARD */}
          <View style={{ flex: 1 }} />
        </View>

        {/* WORKSPACE MAIN VIEWPORT */}
        <View style={styles.content}>
          <Slot />
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeContainer: {
    flex: 1,
    flexDirection: "row", // Layouts the sidebar and standard content screens horizontally
  },
  sidebar: {
    width: 100,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#F3F4F6", // Neutral slate boundary line
    alignItems: "center",
    paddingTop: 24,
  },
  logoContainer: {
    marginBottom: 36,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    marginBottom: 8,
  },
  activeNavItem: {
    borderRightWidth: 3,
    borderRightColor: "#00875A",
    backgroundColor: "#F0FDF4", // Smooth subtle green accent fill for web/mobile
  },
  navText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Subtle tint contrast behind working child context screens
  },
});