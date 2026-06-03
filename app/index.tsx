import LoginPage from "@/app/LoginPage";
import ActivationKey from "@/app/components/ActivationKey";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

const DEVICE_REGISTERED_KEY = "smartpos.deviceRegistered.v1";

export default function index() {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    const loadRegistrationState = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(DEVICE_REGISTERED_KEY);
        setIsRegistered(storedValue === "true");
      } catch (error) {
        console.warn("Unable to load device registration state.", error);
        setIsRegistered(false);
      }
    };

    loadRegistrationState();
  }, []);

  const handleActivated = async () => {
    setIsRegistered(true);

    try {
      await AsyncStorage.setItem(DEVICE_REGISTERED_KEY, "true");
    } catch (error) {
      console.warn("Unable to persist device registration state.", error);
    }
  };

  if (isRegistered === null) {
    return <View className="flex-1 bg-slate-950" />;
  }

  return (
    <View className="flex-1">
      {isRegistered ? (
        <LoginPage />
      ) : (
        <ActivationKey onActivated={handleActivated} />
      )}
    </View>
  );
}
