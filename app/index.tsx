import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import ActivationKey from "./components/ActivationKey";
import DeviceVerification from "./components/DeviceVerification";
import LoginPage from "./components/LoginPage";

export default function Index() {
  const [screen, setScreen] = useState<"verifying" | "activation" | "login">(
    "verifying",
  );

  const handleVerificationComplete = ({
    registered,
    company,
  }: {
    registered: boolean;
    company: boolean;
  }) => {
    setScreen(registered && company ? "login" : "activation");
  };

  const handleActivated = async () => {
    try {
      await AsyncStorage.setItem("smartpos.deviceRegistered.v1", "true");
    } catch (error) {
      console.warn("Unable to persist device registration state.", error);
    }

    setScreen("login");
  };

  if (screen === "verifying") {
    return <DeviceVerification onComplete={handleVerificationComplete} />;
  }

  if (screen === "activation") {
    return <ActivationKey onActivated={handleActivated} />;
  }

  return <LoginPage />;
}
