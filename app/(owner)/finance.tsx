import { users } from "@/seed/users";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

type FinanceStatus = "pending" | "approved" | "rejected";

interface WorkerDailyFinance {
  workerId: number;
  date: string;
  ordersTotal: number;
  refunds: number;
  cancelled: number;
  submittedCash: number;
  submittedLate: boolean;
  status: FinanceStatus;
  approvedBy?: number;
}

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  addedBy: number;
}

const today = "2026-04-01";

const initialWorkerFinance: WorkerDailyFinance[] = [
  {
    workerId: 1,
    date: today,
    ordersTotal: 320000,
    refunds: 10000,
    cancelled: 5000,
    submittedCash: 300000,
    submittedLate: false,
    status: "pending",
  },
  {
    workerId: 3,
    date: today,
    ordersTotal: 210000,
    refunds: 0,
    cancelled: 0,
    submittedCash: 210000,
    submittedLate: false,
    status: "approved",
    approvedBy: 2,
  },
  {
    workerId: 4,
    date: today,
    ordersTotal: 300000,
    refunds: 20000,
    cancelled: 5000,
    submittedCash: 270000,
    submittedLate: true,
    status: "pending",
  },
];

const initialExpenses: Expense[] = [
  { id: 1, title: "Transport", amount: 20000, category: "Logistics", date: today, addedBy: 2 },
  { id: 2, title: "Electricity", amount: 35000, category: "Utilities", date: today, addedBy: 2 },
  { id: 3, title: "Supplies", amount: 40000, category: "Operations", date: today, addedBy: 2 },
  { id: 4, title: "Maintenance", amount: 25000, category: "Maintenance", date: today, addedBy: 2 },
];

const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`;

export default function Finance() {
  const [activeSection, setActiveSection] = useState<
    "overview" | "worker" | "expenses" | "profit" | "rankings" | "reports"
  >("overview");
  const [workerFinance, setWorkerFinance] = useState(initialWorkerFinance);
  const [expenses] = useState(initialExpenses);

  const rows = useMemo(() => {
    return workerFinance.map((row) => {
      const worker = users.find((u) => u.id === row.workerId);
      const expectedCash = row.ordersTotal - row.refunds - row.cancelled;
      const difference = row.submittedCash - expectedCash;
      return {
        ...row,
        worker,
        expectedCash,
        difference,
      };
    });
  }, [workerFinance]);

  const totalRevenue = rows.reduce((sum, row) => sum + row.expectedCash, 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + row.amount, 0);
  const profit = totalRevenue - totalExpenses;
  const pendingWorkerPayments = rows
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + Math.max(0, row.expectedCash - row.submittedCash), 0);
  const confirmedCash = rows
    .filter((row) => row.status === "approved")
    .reduce((sum, row) => sum + row.submittedCash, 0);

  const ranking = useMemo(() => {
    const maxSales = Math.max(...rows.map((r) => r.expectedCash), 1);
    const maxTransactions = Math.max(...rows.map((r) => Math.floor(r.ordersTotal / 1000)), 1);

    return rows
      .map((row) => {
        const salesScore = (row.expectedCash / maxSales) * 40;
        const accuracyRatio =
          row.expectedCash === 0
            ? 1
            : Math.max(0, 1 - Math.abs(row.difference) / row.expectedCash);
        const accuracyScore = accuracyRatio * 30;
        const refundRatio = row.ordersTotal === 0 ? 0 : row.refunds / row.ordersTotal;
        const refundScore = Math.max(0, (1 - refundRatio) * 15);
        const transactions = Math.floor(row.ordersTotal / 1000);
        const transactionScore = (transactions / maxTransactions) * 15;
        const score = Math.round(
          salesScore + accuracyScore + refundScore + transactionScore,
        );

        return {
          workerId: row.workerId,
          name: row.worker?.name ?? "Unknown",
          score,
          discipline: Math.round(accuracyRatio * 100),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [rows]);

  const alerts = rows.flatMap((row) => {
    const workerName = row.worker?.name ?? "Worker";
    const generated: string[] = [];

    if (row.difference < 0) {
      generated.push(`${workerName} missing ${formatRwf(Math.abs(row.difference))}`);
    }
    if (row.submittedLate) {
      generated.push(`${workerName} submitted late`);
    }
    if (row.ordersTotal > 0 && row.refunds / row.ordersTotal > 0.08) {
      generated.push(`${workerName} refund rate is high`);
    }
    return generated;
  });

  const handleStatus = (workerId: number, status: FinanceStatus) => {
    setWorkerFinance((prev) =>
      prev.map((row) =>
        row.workerId === workerId ? { ...row, status, approvedBy: 2 } : row,
      ),
    );
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="p-6">
        <Text className="text-3xl font-black text-slate-900">Finance</Text>
        <Text className="text-slate-500 mt-1 mb-4">Daily control for cash, expenses, and accountability.</Text>

        <View className="flex-row flex-wrap mb-5">
          {[
            ["overview", "Overview"],
            ["worker", "Worker Cash"],
            ["expenses", "Expenses"],
            ["profit", "Profit & Loss"],
            ["rankings", "Rankings"],
            ["reports", "Reports"],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveSection(key as typeof activeSection)}
              className={`mr-2 mb-2 px-3 py-2 rounded-xl border ${
                activeSection === key
                  ? "bg-emerald-600 border-emerald-600"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text className={activeSection === key ? "text-white font-semibold" : "text-slate-700 font-semibold"}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(activeSection === "overview" || activeSection === "profit") && (
          <View className="bg-white border border-slate-100 rounded-3xl p-4 mb-5">
            <Text className="text-slate-900 font-black text-lg mb-3">Finance Overview (Today)</Text>
            <View className="flex-row flex-wrap -mx-1">
              {[
                ["Total Revenue", formatRwf(totalRevenue), "text-emerald-700"],
                ["Total Expenses", formatRwf(totalExpenses), "text-rose-600"],
                ["Profit", formatRwf(profit), profit >= 0 ? "text-emerald-700" : "text-rose-600"],
                ["Pending Worker Payments", formatRwf(pendingWorkerPayments), "text-amber-700"],
                ["Confirmed Cash", formatRwf(confirmedCash), "text-slate-900"],
              ].map(([label, value, color]) => (
                <View key={label} className="w-1/2 px-1 mb-2">
                  <View className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <Text className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">{label}</Text>
                    <Text className={`${color} text-base font-black mt-1`}>{value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {(activeSection === "worker" || activeSection === "overview") && (
          <View className="bg-white border border-slate-100 rounded-3xl p-4 mb-5">
            <Text className="text-slate-900 font-black text-lg mb-3">Pending Financial Verifications</Text>
            {rows.map((row) => (
              <View key={row.workerId} className="mb-3 p-3 rounded-2xl border border-slate-200 bg-slate-50">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-slate-900 font-bold">{row.worker?.name ?? "Unknown Worker"}</Text>
                  <Text
                    className={`font-bold ${
                      row.status === "approved"
                        ? "text-emerald-700"
                        : row.status === "rejected"
                          ? "text-rose-600"
                          : "text-amber-700"
                    }`}
                  >
                    {row.status.toUpperCase()}
                  </Text>
                </View>
                <Text className="text-slate-600 text-sm">Orders: {formatRwf(row.ordersTotal)}</Text>
                <Text className="text-slate-600 text-sm">Expected: {formatRwf(row.expectedCash)}</Text>
                <Text className="text-slate-600 text-sm">Submitted: {formatRwf(row.submittedCash)}</Text>
                <Text className={`text-sm font-semibold ${row.difference === 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  Difference: {formatRwf(row.difference)}
                </Text>

                <View className="flex-row mt-3">
                  <TouchableOpacity
                    onPress={() => handleStatus(row.workerId, "approved")}
                    className="bg-emerald-600 px-3 py-2 rounded-xl mr-2"
                  >
                    <Text className="text-white font-semibold">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStatus(row.workerId, "rejected")}
                    className="bg-rose-600 px-3 py-2 rounded-xl mr-2"
                  >
                    <Text className="text-white font-semibold">Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStatus(row.workerId, "pending")}
                    className="bg-slate-700 px-3 py-2 rounded-xl"
                  >
                    <Text className="text-white font-semibold">Investigate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {(activeSection === "expenses" || activeSection === "overview") && (
          <View className="bg-white border border-slate-100 rounded-3xl p-4 mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-slate-900 font-black text-lg">Expenses Today</Text>
              <TouchableOpacity className="bg-emerald-600 rounded-xl px-3 py-2">
                <Text className="text-white font-semibold">Add Expense</Text>
              </TouchableOpacity>
            </View>
            {expenses.map((expense) => (
              <View key={expense.id} className="flex-row justify-between py-2 border-b border-slate-100">
                <View>
                  <Text className="text-slate-800 font-semibold">{expense.title}</Text>
                  <Text className="text-slate-500 text-xs">{expense.category}</Text>
                </View>
                <Text className="text-rose-600 font-bold">{formatRwf(expense.amount)}</Text>
              </View>
            ))}
            <View className="flex-row justify-between pt-3">
              <Text className="text-slate-900 font-black">Total</Text>
              <Text className="text-rose-600 font-black">{formatRwf(totalExpenses)}</Text>
            </View>
          </View>
        )}

        {(activeSection === "rankings" || activeSection === "overview") && (
          <View className="bg-white border border-slate-100 rounded-3xl p-4 mb-5">
            <Text className="text-slate-900 font-black text-lg mb-3">Best Financial Worker Ranking</Text>
            {ranking.map((item, index) => (
              <View key={item.workerId} className="flex-row items-center justify-between py-2 border-b border-slate-100">
                <View className="flex-row items-center">
                  <Text className="w-7 text-slate-500">{index + 1}.</Text>
                  <View>
                    <Text className="text-slate-900 font-semibold">{item.name}</Text>
                    <Text className="text-slate-500 text-xs">Discipline: {item.discipline}%</Text>
                  </View>
                </View>
                <Text className="text-emerald-700 font-black">{item.score}</Text>
              </View>
            ))}
            <Text className="text-slate-500 text-xs mt-2">
              Score formula: Sales 40% + Accuracy 30% + Refund Control 15% + Transactions 15%
            </Text>
          </View>
        )}

        {(activeSection === "reports" || activeSection === "overview") && (
          <View className="bg-white border border-slate-100 rounded-3xl p-4">
            <Text className="text-slate-900 font-black text-lg mb-3">Smart Alerts</Text>
            {alerts.length === 0 ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text className="ml-2 text-slate-700">No risk alerts for today.</Text>
              </View>
            ) : (
              alerts.map((alert) => (
                <View key={alert} className="flex-row items-center mb-2">
                  <Ionicons name="warning" size={18} color="#d97706" />
                  <Text className="ml-2 text-slate-700">{alert}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}