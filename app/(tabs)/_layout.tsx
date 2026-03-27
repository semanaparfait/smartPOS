
import { Feather, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";

export default function TabsLayout() {

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#907764",
        tabBarInactiveTintColor: "",
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#F0F0F0",
          height: 56,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="products"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={26}
              color={color}
            />
          ),
          headerShown: false,
          title: "products",
        }}
      />



      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "cart" : "cart-outline"}
              size={26}
              color={color}
            />
          ),
          headerShown: false,
          title: "orders",
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={26}
              color={color}
            />
          ),
          headerShown: false,
          title: "inventory",
        }}
      />
            <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={26}
              color={color}
            />
          ),
          headerShown: false,
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
