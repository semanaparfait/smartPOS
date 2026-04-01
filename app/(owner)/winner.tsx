import { users } from "@/seed/users";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, ScrollView, Text, View } from "react-native";

type WorkerPerformance = {
  workerId: number;
  month: string;
  sales: number;
  transactions: number;
  attendance: number;
  errors: number;
  customerRating: number;
  teamwork: number;
  checkoutSpeed: number;
};

const currentMonth = "March 2026";
const storeName = "SmartPOS Kigali Store";

const workerPerformance: WorkerPerformance[] = [
  {
    workerId: 1,
    month: currentMonth,
    sales: 1250000,
    transactions: 320,
    attendance: 100,
    errors: 0,
    customerRating: 4.9,
    teamwork: 96,
    checkoutSpeed: 93,
  },
  {
    workerId: 3,
    month: currentMonth,
    sales: 1130000,
    transactions: 296,
    attendance: 96,
    errors: 1,
    customerRating: 4.7,
    teamwork: 92,
    checkoutSpeed: 90,
  },
  {
    workerId: 4,
    month: currentMonth,
    sales: 1040000,
    transactions: 271,
    attendance: 94,
    errors: 2,
    customerRating: 4.5,
    teamwork: 88,
    checkoutSpeed: 87,
  },
];

const formatRwf = (value: number) => `${value.toLocaleString()} RWF`;

const maxSales = Math.max(...workerPerformance.map((item) => item.sales));
const maxTransactions = Math.max(
  ...workerPerformance.map((item) => item.transactions),
);

const ranking = workerPerformance
  .map((item) => {
    const salesScore = (item.sales / maxSales) * 35;
    const transactionsScore = (item.transactions / maxTransactions) * 20;
    const attendanceScore = (item.attendance / 100) * 20;
    const qualityScore = (item.customerRating / 5) * 15;
    const teamworkScore = (item.teamwork / 100) * 10;
    const errorPenalty = item.errors * 2;

    const score = Math.max(
      0,
      Math.min(
        100,
        salesScore +
          transactionsScore +
          attendanceScore +
          qualityScore +
          teamworkScore -
          errorPenalty,
      ),
    );

    const worker = users.find((user) => user.id === item.workerId);

    return {
      ...item,
      score: Math.round(score),
      worker,
    };
  })
  .filter((item) => item.worker?.role === "worker")
  .sort((a, b) => b.score - a.score);

const winner = ranking[0];

const hallOfFame = [
  { month: "January 2026", name: "christian ngwino" },
  { month: "February 2026", name: "sando mugwa" },
  { month: currentMonth, name: winner?.worker?.name ?? "TBD" },
];

const whyWon = [
  "Highest monthly sales performance",
  "Excellent attendance discipline",
  "Strong customer satisfaction rating",
  "Very low operational errors",
  "Reliable teamwork and shift support",
];

export default function Winner() {
  if (!winner || !winner.worker) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Ionicons name="trophy-outline" size={36} color="#94a3b8" />
        <Text className="text-slate-600 font-semibold mt-3 text-center">
          Winner data is not available yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-6">
        <View className="rounded-3xl border border-slate-100 bg-white px-5 py-6">
          <View className="items-center">
            <View className="w-12 h-12 rounded-2xl bg-emerald-100 items-center justify-center mb-3">
              <Ionicons name="trophy" size={24} color="#059669" />
            </View>
            <Text className="text-emerald-700 text-xs font-bold tracking-widest uppercase">
              Best Worker Of The Month
            </Text>
            <Text className="text-slate-900 text-2xl font-black mt-1">
              {currentMonth}
            </Text>
            <Text className="text-slate-500 mt-1">{storeName}</Text>
          </View>

          <View className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 items-center">
            <Image
              source={{ uri: winner.worker.profilePicture }}
              className="w-24 h-24 rounded-full bg-slate-600"
            />
            <Text className="text-slate-900 text-2xl font-black mt-3">
              {winner.worker.name}
            </Text>
            <Text className="text-emerald-700 font-semibold">
              Senior Cashier
            </Text>
            <View className="mt-3 px-4 py-2 rounded-full bg-emerald-600">
              <Text className="text-white font-bold">
                Performance Score: {winner.score}%
              </Text>
            </View>
          </View>

          <View className="mt-4 bg-white rounded-2xl border border-slate-200 p-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-600">Sales handled</Text>
              <Text className="text-slate-900 font-bold">
                {formatRwf(winner.sales)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-600">Customers served</Text>
              <Text className="text-slate-900 font-bold">
                {winner.transactions}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-600">Attendance</Text>
              <Text className="text-slate-900 font-bold">
                {winner.attendance}%
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-600">POS errors</Text>
              <Text className="text-slate-900 font-bold">{winner.errors}</Text>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-3xl bg-white p-5 border border-slate-100">
          <Text className="text-slate-900 text-lg font-black mb-3">
            Why {winner.worker.name} Won
          </Text>
          {whyWon.map((reason) => (
            <View key={reason} className="flex-row items-start mb-2.5">
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text className="ml-2 text-slate-700 flex-1">{reason}</Text>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-3xl bg-white p-5 border border-slate-100">
          <Text className="text-slate-900 text-lg font-black mb-3">
            Top Workers Ranking
          </Text>
          {ranking.map((item, index) => (
            <View
              key={item.workerId}
              className="flex-row items-center justify-between py-3 border-b border-slate-100"
            >
              <View className="flex-row items-center">
                <Text className="text-slate-500 w-7">{index + 1}.</Text>
                <Text className="text-slate-800 font-semibold">
                  {item.worker?.name ?? "Unknown Worker"}
                </Text>
              </View>
              <Text className="text-emerald-700 font-bold">{item.score}%</Text>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-3xl bg-emerald-50 p-5 border border-emerald-200">
          <Text className="text-emerald-900 text-lg font-black mb-3">
            Reward
          </Text>
          <Text className="text-emerald-900 mb-1">Bonus: 50,000 RWF</Text>
          <Text className="text-emerald-900 mb-1">
            Certificate of Excellence
          </Text>
          <Text className="text-emerald-900 mb-1">
            Priority shift selection
          </Text>
          <Text className="text-emerald-900">
            Manager recognition in dashboard
          </Text>
        </View>

        <View className="mt-5 rounded-3xl bg-white p-5 border border-slate-100">
          <Text className="text-slate-900 text-lg font-black mb-2">
            Manager Message
          </Text>
          <Text className="text-slate-700 leading-6">
            Thank you {winner.worker.name} for your dedication, discipline, and
            teamwork. Your effort helps {storeName} grow every day.
          </Text>
        </View>

        <View className="mt-5 rounded-3xl bg-white p-5 border border-slate-100">
          <Text className="text-slate-900 text-lg font-black mb-3">
            Hall Of Fame 2026
          </Text>
          {hallOfFame.map((entry) => (
            <View
              key={entry.month}
              className="flex-row items-center justify-between py-2 border-b border-slate-100"
            >
              <Text className="text-slate-600">{entry.month}</Text>
              <Text className="text-slate-900 font-semibold">{entry.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
