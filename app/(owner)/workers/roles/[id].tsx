import { View, Text } from 'react-native'
import React from 'react'
import { tr } from "@/i18n";

export default function id() {
  return (
    <View>
      <Text>{tr("[id]")}</Text>
    </View>
  )
}