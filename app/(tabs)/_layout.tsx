import { Feather, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";

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
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={26}
              color={color}
            />
          ),
          headerShown: false,
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="relative">
              <Feather
                name={focused ? "shopping-cart" : "shopping-cart"}
                size={26}
                color={color}
              />
            </View>
          ),
          headerShown: false,
          title: "Cart",
        }}
      />

      <Tabs.Screen
        name="favorities"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={26}
              color={color}
            />
          ),
          headerShown: false,
          title: "Favorities",
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
