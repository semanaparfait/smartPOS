import { View, Text } from 'react-native'
import React from 'react'
import { useLocalSearchParams, useRouter } from "expo-router";
import { tr } from "@/i18n";

export default function singleCategory() {
  return (
    <View>
      <Text>{tr("singleCategory")}</Text>
    </View>
  )
}