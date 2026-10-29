import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import useDeviceInfo, {
  type DeviceCheckResult,
  type PublicCompany,
} from "@/store/Device/useDeviceInfo";
import {
  connectDeviceSocket,
  useDeviceSocketState,
} from "@/store/Realtime/useDeviceSocket";
import ActivationKey from "./components/ActivationKey";
import CustomerDisplay from "./components/CustomerDisplay";
import DeviceVerification from "./components/DeviceVerification";
import LoginPage from "./components/LoginPage";

export default function Index() {
  const [screen, setScreen] = useState<
    "verifying" | "activation" | "login" | "customer-display"
  >("verifying");
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [momoCode, setMomoCode] = useState<string | null>(null);

  // The type saved from the last verify, in case this one can't reach the server.
  useEffect(() => {
    useDeviceInfo.getState().loadSavedDeviceType();
  }, []);

  // Tills and kitchen displays go to sign-in (LoginPage sends each to its own
  // screens); a customer display needs no one signed in.
  const handleVerificationComplete = useCallback(
    (result: DeviceCheckResult) => {
      setCompany(result.companyInfo ?? null);
      setMomoCode(result.momoCode ?? null);
      if (!result.registered || !result.company) {
        setScreen("activation");
        return;
      }
      connectDeviceSocket();
      setScreen(
        result.deviceType === "CUSTOMER_DISPLAY" ? "customer-display" : "login",
      );
    },
    [],
  );

  // The owner changed the type (sent on the device's connection): switch between
  // sign-in and the customer display without a restart.
  const deviceType = useDeviceInfo((s) => s.deviceType);
  useEffect(() => {
    setScreen((current) =>
      current === "login" && deviceType === "CUSTOMER_DISPLAY"
        ? "customer-display"
        : current === "customer-display" && deviceType !== "CUSTOMER_DISPLAY"
          ? "login"
          : current,
    );
  }, [deviceType]);

  // Disabled or removed while showing: check again (leads to activation).
  const status = useDeviceSocketState((s) => s.status);
  const known = useDeviceSocketState((s) => s.known);
  useEffect(() => {
    if (known && status !== "REGISTERED")
      setScreen((current) => (current === "verifying" ? current : "verifying"));
  }, [known, status]);

  const handleActivated = async () => {
    try {
      await AsyncStorage.setItem("smartpos.deviceRegistered.v1", "true");
    } catch (error) {
      console.warn("Unable to persist device registration state.", error);
    }

    connectDeviceSocket();
    setScreen("login");
  };

  if (screen === "verifying") {
    return <DeviceVerification onComplete={handleVerificationComplete} />;
  }

  if (screen === "activation") {
    return <ActivationKey onActivated={handleActivated} />;
  }

  if (screen === "customer-display") {
    return <CustomerDisplay company={company} momoCode={momoCode} />;
  }

  return <LoginPage />;
}
