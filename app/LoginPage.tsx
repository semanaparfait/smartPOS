import { users } from "@/seed/users";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DeviceInfo from "react-native-device-info";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Toast from 'react-native-toast-message'
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import useAuth from '@/store/Authentication/useAuth'

const NumberButton = ({
  val,
  onPress,
}: {
  val: string;
  onPress: (v: string) => void;
}) => (
  <TouchableOpacity
    onPress={() => onPress(val)}
    className="w-20 h-20 m-3 rounded-full bg-navy-800 justify-center items-center shadow-lg border-b-4 border-navy-950 active:border-b-0 active:translate-y-1"
    style={styles.neumorphicButton}
  >
    <Text className="text-white text-3xl font-bold">{val}</Text>
  </TouchableOpacity>
);

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, pinLogin } = useAuth();


  const router = useRouter();
  const MAX_PIN = 6;
  const deviceId=  DeviceInfo.getUniqueIdSync();;

  // -------- PIN Verification -----------
  const verifyPin = (submittedPin: string) => {
    const foundUser = users.find(
      (u) => u.pin === parseInt(submittedPin) && u.status === "active",
    );
    if (foundUser) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // navigateByRole(foundUser);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Access Denied", "Incorrect PIN. Please try again.");
      setPin("");
    }
  };

  const handlePress = (val: string) => {
    if (pin.length < MAX_PIN) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPin((prev) => prev + val);
    }
  };

  const handleClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setPin("");
  };

  useEffect(() => {
    if (pin.length === MAX_PIN && !isEmailLogin) {
      const timer = setTimeout(() => verifyPin(pin), 150);
      return () => clearTimeout(timer);
    }
  }, [pin, isEmailLogin]);

  // -------- Email & Password Verification -----------
const handleEmailLogin = async () => {
  if (!email.trim() || !password.trim()) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Toast.show({
      type: "error",
      text1: "Login Failed",
      text2: "Invalid email or password combination.",
    });
    return;
  }

  const results = await login(deviceId, email, password);

  if (!results) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Toast.show({
      type: "error",
      text1: "Login Failed",
      text2: "Invalid email or password combination.",
    });
    return;
  }

  // Login succeeded! Get the fresh profile data directly from the Zustand store
  const userProfile = useAuth.getState().profile; 

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  Toast.show({
    type: "success",
    text1: "Login Successful",
    text2: "Welcome back!",
  });

  // ✅ ROLE-BASED NAVIGATION
  if (userProfile?.role === "admin" || userProfile?.role === "OWNER") {
    router.replace("/(owner)/dashboard");
  } else {
    router.replace("/(tabs)/products");
  }
};




  return (
    <SafeAreaView className="flex-1 bg-navy-900 justify-center items-center px-6">
      {/* Header */}
      <View className="items-center mb-12">
        <View className="w-16 h-16 bg-gold-500 rounded-2xl justify-center items-center mb-4 shadow-xl">
          <Ionicons name="shield-checkmark" size={40} color="#001F3F" />
        </View>
        <Text className="text-gold-500 text-3xl font-serif font-bold">
          Smart POS
        </Text>
        <Text className="text-white/50 tracking-widest uppercase text-xs mt-1">
          Kigali General Store
        </Text>
        {/* <Text className="text-white/30 text-xs italic mt-1">{deviceId}</Text> */}
        {/* <View className="flex-row gap-2">
          <Text>Device ID: {deviceInfo?.uniqueId} </Text>
          <Text>Device Name: {deviceInfo?.deviceName} </Text>
          <Text>System Name: {deviceInfo?.systemName} </Text>
          <Text>Brand: {deviceInfo?.brand} </Text>
          <Text>Android ID: {deviceInfo?.androidId} </Text>
        </View> */}
      </View>

      {isEmailLogin ? (
        <View className="w-80 space-y-4">
          <View>
            <Text className="text-gold-500 text-xs uppercase tracking-wider mb-1 font-semibold">
              Email Address
            </Text>
            <TextInput
              className="w-full bg-navy-800 text-white rounded-xl px-4 py-3 border border-navy-700 focus:border-gold-500"
              placeholder="worker@smartpos.rw"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="pt-2">
            <Text className="text-gold-500 text-xs uppercase tracking-wider mb-1 font-semibold">
              Password
            </Text>
            <TextInput
              className="w-full bg-navy-800 text-white rounded-xl px-4 py-3 border border-navy-700 focus:border-gold-500"
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.2)"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            onPress={handleEmailLogin}
            className="w-full bg-gold-500 py-4 rounded-xl items-center mt-6 shadow-md"
          >
            <Text className="text-navy-900 font-bold text-lg">Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsEmailLogin(false);
            }}
            className="w-full py-3 items-center"
          >
            <Text className="text-gold-500/70 text-sm">
              Switch back to PIN Access
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View className="flex-row mb-10 space-x-6">
            {[...Array(MAX_PIN)].map((_, i) => (
              <View
                key={i}
                className={`w-4 h-4 rounded-full border border-gold-500/30 ${pin.length > i ? "bg-gold-500" : "bg-transparent"}`}
                style={pin.length > i ? styles.activeDot : null}
              />
            ))}
          </View>

          {/* Keypad Layout */}
          <View className="flex-row flex-wrap justify-center w-80">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <NumberButton key={n} val={n} onPress={handlePress} />
            ))}

            <TouchableOpacity
              onPress={handleClear}
              className="w-20 h-20 m-3 justify-center items-center"
            >
              <Text className="text-red-400 font-bold">CLEAR</Text>
            </TouchableOpacity>

            <NumberButton val="0" onPress={handlePress} />

            <TouchableOpacity
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                setIsEmailLogin(true);
              }}
              className="w-20 h-20 m-3 justify-center items-center"
            >
              <MaterialCommunityIcons name="email" size={32} color="#D4AF37" />
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text className="text-white/30 mt-12 text-sm italic">
        Secure Worker Access Only
      </Text>
    </SafeAreaView>
  );
}

// Global scope styling definitions remain identical
const styles = StyleSheet.create({
  neumorphicButton: {
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  activeDot: {
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 15,
  },
});
