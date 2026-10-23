import { PageHeader, initials } from "@/app/components/ownerComponents/FormKit";
import { brand } from "@/config/theme";
import { users } from "@/seed/users";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Platform, ScrollView, Text, useWindowDimensions, View } from "react-native";

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
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

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
const capitalize = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

const maxSales = Math.max(...workerPerformance.map((item) => item.sales));
const maxTransactions = Math.max(...workerPerformance.map((item) => item.transactions));

// Score weights (out of 100). Shown on the page so the result is explainable.
const WEIGHTS = [
  { key: "sales", label: "Sales", max: 35 },
  { key: "transactions", label: "Customers served", max: 20 },
  { key: "attendance", label: "Attendance", max: 20 },
  { key: "quality", label: "Customer rating", max: 15 },
  { key: "teamwork", label: "Teamwork", max: 10 },
] as const;

const ranking = workerPerformance
  .map((item) => {
    const parts = {
      sales: (item.sales / maxSales) * 35,
      transactions: (item.transactions / maxTransactions) * 20,
      attendance: (item.attendance / 100) * 20,
      quality: (item.customerRating / 5) * 15,
      teamwork: (item.teamwork / 100) * 10,
    };
    const penalty = item.errors * 2;
    const raw = Object.values(parts).reduce((a, b) => a + b, 0) - penalty;
    const score = Math.max(0, Math.min(100, raw));
    const worker = users.find((user) => user.id === item.workerId);

    return { ...item, parts, penalty, score: Math.round(score), worker };
  })
  // Everyone on staff competes; only the owner is excluded.
  .filter((item) => item.worker && item.worker.role !== "owner")
  .sort((a, b) => b.score - a.score);

const winner = ranking[0];

// Reasons come from the numbers: anything the winner leads (or is perfect at).
const whyWon = (() => {
  if (!winner) return [];
  const others = ranking.slice(1);
  const best = (pick: (r: (typeof ranking)[number]) => number, higherIsBetter = true) =>
    others.every((o) => (higherIsBetter ? pick(winner) >= pick(o) : pick(winner) <= pick(o)));
  const reasons: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [];
  if (best((r) => r.sales)) reasons.push({ icon: "trending-up", text: `Highest sales this month — ${formatRwf(winner.sales)}` });
  if (best((r) => r.transactions)) reasons.push({ icon: "people", text: `Served the most customers — ${winner.transactions}` });
  if (winner.attendance === 100) reasons.push({ icon: "calendar", text: "Perfect attendance — never missed a shift" });
  else if (best((r) => r.attendance)) reasons.push({ icon: "calendar", text: `Best attendance — ${winner.attendance}%` });
  if (winner.errors === 0) reasons.push({ icon: "shield-checkmark", text: "Zero POS errors all month" });
  if (best((r) => r.customerRating)) reasons.push({ icon: "star", text: `Top customer rating — ${winner.customerRating} / 5` });
  if (best((r) => r.teamwork)) reasons.push({ icon: "hand-left", text: `Strongest teamwork score — ${winner.teamwork}%` });
  return reasons;
})();

const hallOfFame = [
  { month: "January 2026", name: "christian ngwino" },
  { month: "February 2026", name: "sando mugwa" },
  { month: currentMonth, name: winner?.worker?.name ?? "TBD" },
];

const rewards: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "cash", text: "Bonus: 50,000 RWF" },
  { icon: "ribbon", text: "Certificate of Excellence" },
  { icon: "calendar", text: "Priority shift selection" },
  { icon: "megaphone", text: "Manager recognition in dashboard" },
];

function Avatar({ uri, name, size }: { uri?: string; name?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View
      className="bg-ivory items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="text-ink font-extrabold" style={{ fontSize: size * 0.32 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

function Card({
  icon,
  title,
  right,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-xl bg-ivory items-center justify-center">
            <Ionicons name={icon} size={17} color={brand.ink} />
          </View>
          <Text className="text-ink text-[15px] font-extrabold tracking-tight ml-3">{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function HeroMetric({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View className="flex-1 min-w-[140px] bg-white/5 border border-white/10 rounded-2xl p-4">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={14} color={brand.lime} />
        <Text className="text-white/50 text-[11px] font-semibold ml-1.5">{label}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit className="text-white text-xl font-extrabold tracking-tight mt-2">
        {value}
      </Text>
    </View>
  );
}

export default function Winner() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1150;

  if (!winner || !winner.worker) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory px-6">
        <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-3">
          <Ionicons name="trophy-outline" size={26} color={brand.inkDisabled} />
        </View>
        <Text className="text-ink text-sm font-bold">No winner yet</Text>
        <Text className="text-ink/40 text-xs mt-1">Performance data for this month is not available.</Text>
      </View>
    );
  }

  const w = winner.worker;
  const runnerUpGap = ranking[1] ? winner.score - ranking[1].score : null;

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        eyebrow="Recognition"
        title="Employee of the month"
        subtitle={`${currentMonth} · ${storeName}`}
        right={
          <View className="flex-row items-center bg-white border border-ink/10 rounded-full px-3 py-1.5">
            <Ionicons name="flask-outline" size={13} color={brand.inkMuted} />
            <Text className="text-ink/60 text-[11px] font-bold ml-1.5">Sample data</Text>
          </View>
        }
      />

      {/* HERO */}
      <View className="bg-ink rounded-3xl p-6 overflow-hidden">
        <View className="absolute rounded-full bg-lime/10" style={{ width: 340, height: 340, right: -100, top: -170 }} />
        <View className="absolute rounded-full bg-lime/5" style={{ width: 200, height: 200, left: -60, bottom: -110 }} />

        <View className={isWide ? "flex-row items-center" : ""} style={{ gap: 28 }}>
          {/* Winner identity */}
          <View className="flex-row items-center" style={isWide ? { width: 420 } : undefined}>
            <View>
              <View className="rounded-full p-1 bg-lime">
                <Avatar uri={w.profilePicture} name={w.name} size={104} />
              </View>
              <View className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-lime border-4 border-ink items-center justify-center">
                <Ionicons name="trophy" size={16} color={brand.ink} />
              </View>
            </View>
            <View className="flex-1 ml-5">
              <View className="self-start flex-row items-center bg-lime rounded-full px-2.5 py-1">
               
                <Text className="text-ink text-[10px] font-extrabold uppercase tracking-wider ml-1">
                  Winner · {currentMonth}
                </Text>
              </View>
              <Text numberOfLines={2} className="text-white text-[26px] font-extrabold tracking-tight mt-2 capitalize">
                {w.name}
              </Text>
              <Text className="text-white/50 text-[13px] mt-0.5">{capitalize(w.role)}</Text>

              <View className="flex-row items-baseline mt-3">
                <Text className="text-lime text-[40px] font-extrabold tracking-tight">{winner.score}</Text>
                <Text className="text-white/40 text-sm font-bold ml-1">/ 100</Text>
                {runnerUpGap !== null && (
                  <Text className="text-white/50 text-xs ml-3">+{runnerUpGap} pts ahead</Text>
                )}
              </View>
              <View className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <View className="h-full rounded-full bg-lime" style={{ width: `${winner.score}%` }} />
              </View>
            </View>
          </View>

          {/* Metrics */}
          <View className="flex-1 flex-row flex-wrap" style={{ gap: 10 }}>
            <HeroMetric icon="cash-outline" label="Sales handled" value={formatRwf(winner.sales)} />
            <HeroMetric icon="people-outline" label="Customers served" value={winner.transactions.toLocaleString()} />
            <HeroMetric icon="calendar-outline" label="Attendance" value={`${winner.attendance}%`} />
            <HeroMetric icon="star-outline" label="Customer rating" value={`${winner.customerRating} / 5`} />
            <HeroMetric icon="alert-circle-outline" label="POS errors" value={String(winner.errors)} />
            <HeroMetric icon="speedometer-outline" label="Checkout speed" value={`${winner.checkoutSpeed}%`} />
          </View>
        </View>
      </View>

      {/* LEADERBOARD + WHY */}
      <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
        <View className="flex-1" style={{ gap: 16 }}>
          <Card icon="podium-outline" title="Leaderboard" right={<Text className="text-ink/40 text-xs">{ranking.length} staff</Text>}>
            <View style={{ gap: 4 }}>
              {ranking.map((item, index) => {
                const first = index === 0;
                return (
                  <View
                    key={item.workerId}
                    className={`flex-row items-center rounded-xl px-3 py-3 ${first ? "bg-lime/20" : ""}`}
                  >
                    <View
                      className={`w-8 h-8 rounded-lg items-center justify-center ${first ? "bg-ink" : "bg-ivory"}`}
                    >
                      <Text className={`text-[13px] font-extrabold ${first ? "text-lime" : "text-ink/60"}`}>
                        {index + 1}
                      </Text>
                    </View>
                    <View className="ml-3">
                      <Avatar uri={item.worker?.profilePicture} name={item.worker?.name} size={38} />
                    </View>
                    <View className="flex-1 ml-3 pr-4">
                      <Text numberOfLines={1} className="text-ink text-[14px] font-bold capitalize">
                        {item.worker?.name ?? "Unknown"}
                      </Text>
                      <Text className="text-ink/40 text-[11px]">
                        {capitalize(item.worker?.role)} · {formatRwf(item.sales)}
                      </Text>
                    </View>
                    <View className="w-[160px]">
                      <View className="flex-row justify-end items-baseline mb-1.5">
                        <Text className="text-ink text-base font-extrabold">{item.score}</Text>
                        <Text className="text-ink/40 text-[11px] ml-0.5">pts</Text>
                      </View>
                      <View className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                        <View className="h-full rounded-full bg-ink" style={{ width: `${item.score}%` }} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Score breakdown */}
          <Card icon="analytics-outline" title={`How ${w.name.split(" ")[0]} scored ${winner.score}`}>
            <View style={{ gap: 12 }}>
              {WEIGHTS.map((weight) => {
                const value = winner.parts[weight.key];
                return (
                  <View key={weight.key}>
                    <View className="flex-row justify-between mb-1.5">
                      <Text className="text-ink/60 text-[13px]">{weight.label}</Text>
                      <Text className="text-ink text-[13px] font-bold" style={{ fontFamily: MONO }}>
                        {value.toFixed(1)} / {weight.max}
                      </Text>
                    </View>
                    <View className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                      <View className="h-full rounded-full bg-ink" style={{ width: `${(value / weight.max) * 100}%` }} />
                    </View>
                  </View>
                );
              })}
              <View className="flex-row justify-between pt-3 border-t border-ink/5">
                <Text className="text-ink/60 text-[13px]">Error penalty (2 pts each)</Text>
                <Text
                  className="text-[13px] font-bold"
                  style={{ fontFamily: MONO, color: winner.penalty ? brand.danger : brand.ink }}
                >
                  −{winner.penalty}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={isWide ? { width: 380, gap: 16 } : { gap: 16 }}>
          <Card icon="checkmark-done-outline" title={`Why ${w.name.split(" ")[0]} won`}>
            <View style={{ gap: 10 }}>
              {whyWon.map((reason) => (
                <View key={reason.text} className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-lime items-center justify-center">
                    <Ionicons name={reason.icon} size={15} color={brand.ink} />
                  </View>
                  <Text className="flex-1 text-ink text-[13px] font-medium ml-3">{reason.text}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Reward */}
          <View className="bg-ink rounded-2xl p-5">
            <View className="flex-row items-center mb-4">
              <View className="w-9 h-9 rounded-xl bg-lime items-center justify-center">
                <Ionicons name="gift" size={17} color={brand.ink} />
              </View>
              <Text className="text-white text-[15px] font-extrabold tracking-tight ml-3">Reward</Text>
            </View>
            <View style={{ gap: 10 }}>
              {rewards.map((r) => (
                <View key={r.text} className="flex-row items-center">
                  <Ionicons name={r.icon} size={15} color={brand.lime} />
                  <Text className="text-white/80 text-[13px] ml-3">{r.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Manager message */}
          <Card icon="chatbox-ellipses-outline" title="Manager message">
            <View className="border-l-2 border-lime pl-4">
              <Text className="text-ink/70 text-[14px] leading-6 italic">
                “Thank you {w.name} for your dedication, discipline, and teamwork. Your effort helps{" "}
                {storeName} grow every day.”
              </Text>
            </View>
          </Card>

          {/* Hall of fame */}
          <Card icon="trophy-outline" title="Hall of fame 2026">
            <View>
              {hallOfFame.map((entry, i) => {
                const current = i === hallOfFame.length - 1;
                return (
                  <View key={entry.month} className="flex-row">
                    <View className="items-center mr-3" style={{ width: 16 }}>
                      <View
                        className={`w-3 h-3 rounded-full mt-1 ${current ? "bg-lime border-2 border-ink" : "bg-ink/20"}`}
                      />
                      {i < hallOfFame.length - 1 && <View className="flex-1 w-px bg-ink/10 my-1" />}
                    </View>
                    <View className="flex-1 pb-4">
                      <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-wider">
                        {entry.month}
                      </Text>
                      <Text className={`text-[14px] capitalize mt-0.5 ${current ? "text-ink font-extrabold" : "text-ink font-semibold"}`}>
                        {entry.name}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}
