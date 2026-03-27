import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { users } from '@/seed/users'; // Importing your seed data

export default function WorkerLogin() {
  const [pin, setPin] = useState('');
  const router = useRouter();
  const MAX_PIN = 6;

  // Verify the PIN against the seed data
  const verifyPin = (submittedPin: string) => {
    const foundUser = users.find((u) => u.pin === parseInt(submittedPin));

    if (foundUser) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate based on role
      if (foundUser.role === 'owner') {
        router.replace('/(owner)/dashboard');
      } else {
        router.replace('/(tabs)/products');
      }
    } else {
      // Failed login
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Access Denied", "Incorrect PIN. Please try again.");
      setPin(''); // Reset the slots
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
    setPin('');
  };

  useEffect(() => {
    if (pin.length === MAX_PIN) {
      // Small delay so the user sees the last dot light up before navigating
      const timer = setTimeout(() => {
        verifyPin(pin);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  const NumberButton = ({ val }: { val: string }) => (
    <TouchableOpacity 
      onPress={() => handlePress(val)}
      className="w-20 h-20 m-3 rounded-full bg-navy-800 justify-center items-center shadow-lg border-b-4 border-navy-950 active:border-b-0 active:translate-y-1"
      style={styles.neumorphicButton}
    >
      <Text className="text-white text-3xl font-bold">{val}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-navy-900 justify-center items-center px-6">
      
      {/* 1. Header & Branding */}
      <View className="items-center mb-12">
        <View className="w-16 h-16 bg-gold-500 rounded-2xl justify-center items-center mb-4 shadow-xl">
          <Ionicons name="shield-checkmark" size={40} color="#001F3F" />
        </View>
        <Text className="text-gold-500 text-3xl font-serif font-bold">SmartPOS</Text>
        <Text className="text-white/50 tracking-widest uppercase text-xs mt-1">Kigali General Store</Text>
      </View>

      {/* 2. PIN Display Slots */}
      <View className="flex-row mb-12 space-x-6">
        {[...Array(MAX_PIN)].map((_, i) => (
          <View 
            key={i} 
            className={`w-4 h-4 rounded-full border border-gold-500/30 ${pin.length > i ? 'bg-gold-500 shadow-[0_0_10px_#D4AF37]' : 'bg-transparent'}`}
            style={pin.length > i ? styles.activeDot : null}
          />
        ))}
      </View>

      {/* 3. The Keypad */}
      <View className="flex-row flex-wrap justify-center w-80">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => <NumberButton key={n} val={n} />)}
        
        <TouchableOpacity onPress={handleClear} className="w-20 h-20 m-3 justify-center items-center">
          <Text className="text-red-400 font-bold">CLEAR</Text>
        </TouchableOpacity>
        
        <NumberButton val="0" />
        
        <TouchableOpacity 
          className="w-20 h-20 m-3 justify-center items-center"
          onPress={() => Alert.alert("Biometrics", "FaceID/Fingerprint scanning initiated...")}
        >
          <Ionicons name="finger-print" size={32} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      <Text className="text-white/30 mt-12 text-sm italic">Secure Worker Access Only</Text>
    </SafeAreaView>
  );
}

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
  }
});