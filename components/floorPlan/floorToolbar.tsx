import { View, Text } from 'react-native'
import React from 'react'
import { tr } from "@/i18n";

export default function floorToolbar() {
  return (
    <View>
      <Text>{tr("floorToolbar")}</Text>
    </View>
  )
}