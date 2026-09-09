import React from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import {
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  HelpCircle,
  User,
  Send,
  ArrowRight,
  Headphones,
  ArrowLeft,
} from 'lucide-react-native'
import { router } from "expo-router";
const contactCards = [
  {
    icon: <Phone size={18} color="#6366f1" />,
    iconBg: 'bg-indigo-50',
    title: 'Call Us',
    value: '0787845162',
    sub: 'Mon - Sat: 8:00 AM - 6:00 PM',
  },
  {
    icon: <MessageCircle size={18} color="#16a34a" />,
    iconBg: 'bg-emerald-50',
    title: 'WhatsApp Support',
    value: '0787845162',
    sub: 'Quick response on WhatsApp',
  },
  {
    icon: <Mail size={18} color="#6366f1" />,
    iconBg: 'bg-indigo-50',
    title: 'Email Us',
    value: 'support@smartpos.rw',
    sub: 'We reply within 24 hours',
  },
  {
    icon: <MapPin size={18} color="#6366f1" />,
    iconBg: 'bg-indigo-50',
    title: 'Visit Us',
    value: 'Kigali, Rwanda',
    sub: 'KN 5 Rd, Kigali City',
  },
]

const supportItems = [
  {
    icon: <Clock size={16} color="#ffffff" />,
    iconBg: 'bg-indigo-600',
    title: 'Business Hours',
    primary: 'Mon - Sat: 8:00 AM - 6:00 PM',
    secondary: 'We are closed on Sundays',
  },
  {
    icon: <MessageSquare size={16} color="#ffffff" />,
    iconBg: 'bg-indigo-600',
    title: 'Live Support',
    primary: 'Chat with us on WhatsApp for faster',
    secondary: 'assistance and quick answers.',
  },
  {
    icon: <HelpCircle size={16} color="#ffffff" />,
    iconBg: 'bg-indigo-600',
    title: 'Frequently Asked Questions',
    primary: 'Visit our Help Center to find answers',
    secondary: 'to common questions.',
  },
]

export default function ContactUs() {
  return (
    <ScrollView className="flex-1 bg-slate-100" contentContainerStyle={{ padding: 24 }}>
 
      <View className="">
        <TouchableOpacity
        onPress={() => router.navigate('/')}
         className="flex-row items-center gap-2 ml-4"> 
         <ArrowLeft size={20} color="#6366f1" />
         <Text className="text-xl font-bold text-slate-900 py-5">
          Home
          </Text>
          </TouchableOpacity>
        <Text className="text-xs text-slate-500 mt-1 hidden">Home • Contact Us</Text>
      </View>


      <View className="relative overflow-hidden rounded-2xl bg-white  border-slate-200/70 p-8 mb-6 flex-row items-center justify-between">
        <View className="max-w-xl">
          <Text className="text-3xl font-extrabold text-slate-900 mb-2">
            How Can We <Text className="text-indigo-600">Help You?</Text>
          </Text>
          <Text className="text-slate-500 text-sm leading-5">
            Have questions about SmartPos? Our team is ready to help your business grow better.
          </Text>
        </View>

        <View className="hidden md:flex flex-row items-center gap-3 pr-4">
          <View className="w-12 h-12 rounded-full bg-indigo-600 items-center justify-center shadow-md">
            <MessageSquare size={22} color="#ffffff" />
          </View>
          <View className="w-20 h-20 rounded-full bg-indigo-500/10 items-center justify-center">
            <Headphones size={44} color="#4f46e5" />
          </View>
        </View>
      </View>

      {/* Top 4 Contact Info Cards */}
      <View className="flex-row flex-wrap gap-4 mb-6">
        {contactCards.map((item, index) => (
          <View
            key={index}
            className="flex-1 min-w-[240px] bg-white rounded-xl  border-slate-200/70 p-4 flex-row items-center gap-3.5 shadow-sm"
          >
            <View className={`w-11 h-11 rounded-xl ${item.iconBg} items-center justify-center`}>
              {item.icon}
            </View>
            <View className="flex-1">
              <Text className="text-xs font-medium text-slate-500">{item.title}</Text>
              <Text className="text-sm font-bold text-slate-900 mt-0.5">{item.value}</Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">{item.sub}</Text>
            </View>
          </View>
        ))}
      </View>

   
      <View className="flex-row gap-6 mb-6">
        {/* Contact Form */}
        <View className="flex-[2] bg-white rounded-2xl  border-slate-200/70 p-6 shadow-sm">
          <Text className="text-lg font-bold text-slate-900 mb-6">Send Us a Message</Text>

          <View className="flex-row flex-wrap gap-4 mb-4">
            <View className="flex-1 min-w-[220px]">
              <View className="flex-row items-center border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:border-indigo-500">
                <User size={16} color="#94a3b8" />
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor="#94a3b8"
                  className="ml-2 flex-1 text-sm text-slate-800 outline-none"
                />
              </View>
            </View>

            <View className="flex-1 min-w-[220px]">
              <View className="flex-row items-center border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:border-indigo-500">
                <Mail size={16} color="#94a3b8" />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#94a3b8"
                  className="ml-2 flex-1 text-sm text-slate-800 outline-none"
                  keyboardType="email-address"
                />
              </View>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-4 mb-4">
            <View className="flex-1 min-w-[220px]">
              <View className="flex-row items-center border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:border-indigo-500">
                <Phone size={16} color="#94a3b8" />
                <TextInput
                  placeholder="Phone Number"
                  placeholderTextColor="#94a3b8"
                  className="ml-2 flex-1 text-sm text-slate-800 outline-none"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View className="flex-1 min-w-[220px]">
              <View className="flex-row items-center border border-slate-200 rounded-lg px-3 py-2.5 bg-white">
                <HelpCircle size={16} color="#94a3b8" />
                <TextInput
                  placeholder="Subject"
                  placeholderTextColor="#94a3b8"
                  className="ml-2 flex-1 text-sm text-slate-800 outline-none"
                />
              </View>
            </View>
          </View>

          <View className="border border-slate-200 rounded-lg p-3 bg-white mb-6">
            <TextInput
              placeholder="Write your message here..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="text-sm text-slate-800 h-28 outline-none"
            />
          </View>

          <TouchableOpacity className="self-start flex-row items-center bg-indigo-600 px-5 py-3 rounded-lg shadow-sm active:bg-indigo-700">
            <Send size={15} color="#ffffff" />
            <Text className="text-white text-sm font-semibold ml-2">Send Message</Text>
          </TouchableOpacity>
        </View>

  
        <View className="flex-1 bg-white rounded-2xl  border-slate-200/70 p-6 flex-col justify-between shadow-sm">
          <View>
            <Text className="text-lg font-bold text-slate-900 mb-6">Support Information</Text>

            <View className="gap-6">
              {supportItems.map((item, index) => (
                <View key={index} className="flex-row items-center gap-3.5">
                  <View className={`w-8 h-8 p-2 rounded-full ${item.iconBg} items-center justify-center `}>
                    {item.icon}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-900 text-sm">{item.title}</Text>
                    <Text className="text-xs text-slate-500 mt-1 leading-4">{item.primary}</Text>
                    <Text className="text-xs text-slate-500 leading-4">{item.secondary}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity className="w-full flex-row items-center justify-center border border-indigo-200 py-3 rounded-xl mt-8 bg-indigo-50/50">
            <Text className="text-indigo-600 font-semibold text-xs mr-2">Go to Help Center</Text>
            <ArrowRight size={14} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>


      <View className="bg-indigo-600 rounded-2xl p-6 flex-row flex-wrap items-center justify-between gap-4">
        <View className="max-w-xl">
          <Text className="text-lg font-bold text-white mb-1">
            Ready to Simplify Your Business?
          </Text>
          <Text className="text-indigo-100 text-xs">
            Join thousands of businesses using SmartPos to manage sales, inventory, customers and reports with ease.
          </Text>
        </View>

        <TouchableOpacity className="flex-row items-center bg-white px-5 py-2.5 rounded-lg active:bg-indigo-50">
          <Text className="text-slate-900 font-semibold text-xs mr-2">Get Started Now</Text>
          <ArrowRight size={14} color="#0f172a" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}