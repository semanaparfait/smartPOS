import { View, Text } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import ServiceNavbar from '@/app/(tabs)/Services/ServiceNavbar'
import Services from '@/app/(tabs)/Services/Services'

export default function index() {
  return (
    <SafeAreaView>
        <ServiceNavbar />
        <Services />
    </SafeAreaView>
  )
}