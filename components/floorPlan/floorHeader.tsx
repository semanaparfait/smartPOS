import { View, Text } from 'react-native'
import React from 'react'
import { tr } from "@/i18n";

export default function floorHeader() {
  return (
    <View>
      <Text>{tr("floorHeader")}</Text>
    </View>
  )
}