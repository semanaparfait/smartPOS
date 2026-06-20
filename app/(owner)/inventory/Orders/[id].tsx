import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from "expo-router";
import useOrder from "@/store/Order/Order";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SingleOrder() {
    const { id } = useLocalSearchParams();
    const { fetchOrderById, orders } = useOrder();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const result = await fetchOrderById(id as string);
                if (result) {
                    setOrder(result);
                } else {
                    console.error(`Order with ID ${id} not found`);
                }
            } catch (error) {
                console.error(`Error fetching order with ID ${id}:`, error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id, fetchOrderById]);

    // Active dataset layer linking runtime state storage directly to your store array
    const activeOrder = order || orders?.find((o: any) => o.id === id);

    if (loading && !activeOrder) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <ActivityIndicator size="large" color="#0F172A" />
                <Text className="text-slate-500 font-medium text-xs mt-4">Loading order details...</Text>
            </View>
        );
    }

    if (!activeOrder) {
        return (
            <View className="flex-1 justify-center items-center p-6 bg-slate-50">
                <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
                <Text className="text-slate-700 font-bold mt-4 text-base">Record Not Found</Text>
                <Text className="text-slate-400 text-xs text-center mt-1 max-w-[240px]">
                    Unable to find an order record matching ID: {id || "Missing Route ID"}
                </Text>
                <TouchableOpacity 
                    onPress={() => router.replace("/")} 
                    className="mt-6 bg-slate-900 px-6 py-3 rounded-xl active:scale-95"
                >
                    <Text className="text-white font-bold text-sm">Return Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    
    const subtotalVal = parseFloat(String(activeOrder.subtotal || "0"));
    const taxVal = parseFloat(String(activeOrder.tax || "0"));
    const totalVal = parseFloat(String(activeOrder.total || "0"));

    const formattedDate = activeOrder.createdAt
        ? new Date(activeOrder.createdAt).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
        : "N/A";

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
           
            <View className="px-6 py-4  border-b border-slate-100 flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        className="p-2 bg-slate-50 rounded-xl border border-slate-100 active:scale-95"
                    >
                        <Ionicons name="arrow-back" size={20} color="#1E293B" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-lg font-black text-slate-900">
                            Order #{activeOrder.id?.split("-")[0].toUpperCase()}
                        </Text>
                        <Text className="text-xs text-slate-400 font-medium">{formattedDate}</Text>
                    </View>
                </View>
                <View >
                <Text
                  className={`font-bold text-xs uppercase ${
                    activeOrder.status === "COMPLETED"
                      ? "text-emerald-700"
                      : activeOrder.status === "PENDING"
                        ? "text-yellow-500"
                        : "text-rose-600"
                  }`}
                >
                  {activeOrder.status}
                </Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-5" showsVerticalScrollIndicator={false}>
                
                <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3 px-1">
                    Items Purchased
                </Text>
                <View className="mb-6" style={{ gap: 10 }}>
                    {activeOrder.items?.map((item: any) => {
                        const rawImg = item.product?.images?.[0]?.url;
                        const secureImg = rawImg ? rawImg.replace("http://", "https://") : null;

                        return (
                            <View 
                                key={item.id} 
                                className="flex-row items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl "
                            >
                                <View className="flex-row items-center gap-4 flex-1">
                                    <View className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden items-center justify-center">
                                        {secureImg ? (
                                            <Image source={{ uri: secureImg }} className="w-14 h-14" resizeMode="cover" />
                                        ) : (
                                            <Ionicons name="fast-food-outline" size={20} color="#94A3B8" />
                                        )}
                                    </View>
                                    <View className="flex-1 pr-2">
                                        <Text className="text-slate-800 font-bold text-base" numberOfLines={1}>
                                            {item.product?.name || "Stock Item"}
                                        </Text>
                                        <Text className="text-slate-400 text-xs font-semibold mt-0.5">
                                            {item.quantity}x • {parseFloat(item.product?.sellingPrice || "0").toLocaleString()} RWF
                                        </Text>
                                    </View>
                                </View>
                                <Text className="text-slate-900 font-black text-base">
                                    {parseFloat(item.totalPrice || "0").toLocaleString()} RWF
                                </Text>
                            </View>
                        );
                    })}
                </View>


                <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3 px-1">
                    Billing Breakdown
                </Text>
                <View className="bg-white mb-5 border border-slate-100 p-5 rounded-2xl " style={{ gap: 12 }}>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-sm font-medium text-slate-500">Subtotal</Text>
                        <Text className="text-sm font-bold text-slate-800">
                            {subtotalVal.toLocaleString()} RWF
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-sm font-medium text-slate-500">VAT Tax (18% inclusive)</Text>
                        <Text className="text-sm font-bold text-slate-800">
                            {taxVal > 0 ? taxVal.toLocaleString() : Math.round(subtotalVal * 0.18).toLocaleString()} RWF
                        </Text>
                    </View>
                    <View className="border-b border-dashed border-slate-100 my-1" />
                    <View className="flex-row justify-between items-center">
                        <Text className="text-base font-black text-slate-900">Total Amount Paid</Text>
                        <Text className="text-xl font-black text-emerald-700">
                            {totalVal.toLocaleString()} RWF
                        </Text>
                    </View>
                </View>


                <View className="my-8 items-center bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                    <View className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-3">
                        <Ionicons name="qr-code-outline" size={64} color="#0F172A" />
                    </View>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                        Transaction Audit Verification Link
                    </Text>
                    <Text className="text-[9px] text-slate-300 font-mono mt-1 text-center" numberOfLines={1}>
                        {activeOrder.id}
                    </Text>
                </View>
            </ScrollView>

            <View className="p-4 mt-2 flex-row gap-3">
                <TouchableOpacity className="flex-1 bg-slate-100 py-3.5 rounded-xl flex-row justify-center items-center active:scale-95">
                    <Ionicons name="print-outline" size={18} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text className="text-slate-900 font-bold text-sm">Reprint Receipt</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => router.replace("/")} 
                    className="flex-1 bg-emerald-700 py-3.5 rounded-xl flex-row justify-center items-center active:scale-95"
                >
                    <Ionicons name="home-outline" size={18} color="white" style={{ marginRight: 6 }} />
                    <Text className="text-white font-bold text-sm">Dashboard</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}