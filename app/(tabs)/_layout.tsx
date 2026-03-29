import { Ionicons } from "@expo/vector-icons";
import { Slot, useRouter, usePathname } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";

export default function SidebarLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // Helper function to render Sidebar Buttons
  const NavItem = ({ name, icon, activeIcon, route }: { name: string; icon: string; activeIcon: string; route: string }) => {
    const isActive = pathname.includes(route);
    return (
      <TouchableOpacity 
        style={[styles.navItem, isActive && styles.activeNavItem]} 
        onPress={() => router.push(route)}
      >
        <Ionicons 
          name={isActive ? icon : activeIcon} 
          size={26} 
          color={isActive ? "green" : "#9CA3AF"} 
        />
        <Text style={[styles.navText, { color: isActive ? "green" : "#9CA3AF" }]}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sidebar}>
        {/* LOGO AREA */}
        <View style={styles.logoContainer}>
          <Ionicons name="cart" size={32} color="green" />
        </View>

        {/* NAVIGATION LINKS */}
        <NavItem name="Products" icon="grid" activeIcon="grid-outline" route="/products" />
        <NavItem name="Orders" icon="receipt" activeIcon="receipt-outline" route="/orders" />
        <NavItem name="Inventory" icon="cube" activeIcon="cube-outline" route="/inventory" />
        <NavItem name="Profile" icon="person-circle" activeIcon="person-circle-outline" route="/profile" />
        
        {/* PUSH REMAINING CONTENT TO TOP */}
        <View style={{ flex: 1 }} />
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={styles.content}>
        <Slot /> 
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row', // This places sidebar and content side-by-side
    backgroundColor: '#fff',
  },
  sidebar: {
    width: 100, // Narrow sidebar for icons + labels
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
    alignItems: 'center',
    paddingTop: 20,
  },
  logoContainer: {
    marginBottom: 40,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 15,
    marginBottom: 10,
  },
  activeNavItem: {
    borderRightWidth: 3,
    borderRightColor: 'green',
    backgroundColor: '#F0FFF0', // Very light green background for active
  },
  navText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});