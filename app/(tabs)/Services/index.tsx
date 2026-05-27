import { View, Text, ScrollView } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import ServiceNavbar from '@/app/(tabs)/Services/ServiceNavbar'
import Services from '@/app/(tabs)/Services/Services'
import Bookings from '@/app/(tabs)/Services/Bookings'
import Aside from '@/app/(tabs)/Services/Aside'

export default function index() {
  return (
    <ScrollView>
        <ServiceNavbar />
        <View className='flex-row'>
        <View className=' max-w-[70%] px-2 gap-2'>
        <Services />
        <Bookings />
        </View>
        <View className='w-[30%] px-2 '>
        <Aside />
        </View>
        </View>
    </ScrollView>
  )
}