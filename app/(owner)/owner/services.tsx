import { EmptyState, Tabs } from "@/components/inventory/stockKit";
import { PageHeader } from "@/components/forms/FormKit";
import { Pill, ServiceThumb } from "@/components/services/servicesKit";
import { SERVICE_KINDS, kindMeta, priceMeta, rwf } from "@/config/services";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import type { Service } from "@/store/Services/serviceTypes";
import useServices from "@/store/Services/useServices";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

// Everything the company offers besides products: rooms, halls, games, tickets,
// rentals. Each has its price and the units that can be booked.
export default function ServicesSetup() {
  const router = useRouter();
  const services = useServices((s) => s.services);
  const getServices = useServices((s) => s.getServices);
  const setServiceActive = useServices((s) => s.setServiceActive);
  const deleteService = useServices((s) => s.deleteService);
  const [kind, setKind] = useState("all");

  useEffect(() => {
    getServices().catch((error) =>
      Toast.show({ type: "error", text1: tr("Could not load services"), text2: (error as Error).message }),
    );
  }, [getServices]);

  const kinds = useMemo(
    () => [
      { value: "all", label: "All" },
      ...SERVICE_KINDS.filter((k) => services.some((s) => s.kind === k.value)).map((k) => ({
        value: k.value,
        label: k.label,
      })),
    ],
    [services],
  );
  const shown = services.filter((s) => kind === "all" || s.kind === kind);

  const edit = (id?: string) =>
    router.push({ pathname: "/(owner)/owner/services/edit", params: id ? { id } : {} });

  const toggle = async (service: Service) => {
    try {
      await setServiceActive(service.id, !service.active);
      Toast.show({ type: "success", text1: tr(service.active ? "Service turned off" : "Service turned on"), text2: service.name });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    }
  };

  const remove = async (service: Service) => {
    try {
      await deleteService(service.id);
      Toast.show({ type: "success", text1: tr("Service deleted"), text2: service.name });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not delete"), text2: (error as Error).message });
    }
  };

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow={tr("Services")}
          title={tr("What you offer")}
          subtitle={tr("Rooms, halls, games, tickets and rentals: their prices and what can be booked.")}
          right={
            <View className="flex-row" style={{ gap: 8 }}>
              <Pressable
                onPress={() => router.push("/(owner)/owner/services/bookings")}
                className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory"
              >
                <Ionicons name="calendar-outline" size={16} color={brand.ink} />
                <Text className="text-ink text-sm font-semibold ml-1.5">{tr("Bookings")}</Text>
              </Pressable>
              <Pressable
                onPress={() => edit()}
                className="flex-row items-center h-10 px-4 rounded-xl bg-lime active:bg-lime-dark"
              >
                <Ionicons name="add" size={18} color={brand.ink} />
                <Text className="text-ink text-sm font-semibold ml-1">{tr("Add a service")}</Text>
              </Pressable>
            </View>
          }
        />

        {services.length > 0 && <Tabs options={kinds} value={kind} onChange={setKind} />}

        {shown.length === 0 ? (
          <View className="bg-white rounded-2xl border border-ink/5">
            <EmptyState
              icon="bed-outline"
              title={tr("No services yet")}
              hint={tr("Add your rooms, halls, games, tickets or rentals to start taking bookings.")}
            />
          </View>
        ) : (
          <View className="flex-row flex-wrap" style={{ gap: 14 }}>
            {shown.map((service) => {
              const meta = kindMeta(service.kind);
              return (
                <View
                  key={service.id}
                  className={`bg-white rounded-2xl border border-ink/5 p-4 ${service.active ? "" : "opacity-60"}`}
                  style={{ width: 320, gap: 12 }}
                >
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <ServiceThumb uri={service.imageUrl} icon={meta.icon} size={56} />
                    <View className="flex-1">
                      <Text numberOfLines={1} className="text-ink text-[15px] font-semibold">{service.name}</Text>
                      <Text className="text-ink/50 text-xs mt-0.5">{tr(meta.label)}</Text>
                      {!service.active && <View className="mt-1"><Pill label="Off" color={brand.inkMuted} bg="#6B76901A" /></View>}
                    </View>
                  </View>
                  <View className="bg-ivory rounded-xl px-3 py-2.5" style={{ gap: 4 }}>
                    <Text className="text-ink text-[15px] font-semibold">
                      {rwf(service.price)} <Text className="text-ink/50 text-xs font-normal">{tr(priceMeta(service.priceUnit).per)}</Text>
                    </Text>
                    <Text className="text-ink/50 text-xs">
                      {service.units.length
                        ? `${service.units.length} ${tr(service.units.length === 1 ? "unit" : "units")}: ${service.units
                            .slice(0, 4)
                            .map((u) => u.name)
                            .join(", ")}${service.units.length > 4 ? "…" : ""}`
                        : tr("No units: sold without choosing one")}
                    </Text>
                    {(!!service.capacity || Number(service.deposit) > 0) && (
                      <Text className="text-ink/50 text-xs">
                        {service.capacity ? `${tr("Up to")} ${service.capacity} ${tr("people")}` : ""}
                        {service.capacity && Number(service.deposit) > 0 ? " · " : ""}
                        {Number(service.deposit) > 0 ? `${tr("Deposit")} ${rwf(service.deposit)}` : ""}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row" style={{ gap: 8 }}>
                    <Pressable
                      onPress={() => edit(service.id)}
                      className="flex-1 h-9 rounded-lg bg-ink flex-row items-center justify-center active:bg-ink-soft"
                    >
                      <Ionicons name="create-outline" size={15} color={brand.lime} />
                      <Text className="text-white text-xs font-semibold ml-1.5">{tr("Edit")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggle(service)}
                      accessibilityLabel={`${tr(service.active ? "Turn off" : "Turn on")} ${service.name}`}
                      className="h-9 px-3 rounded-lg border border-ink/10 flex-row items-center active:bg-ivory"
                    >
                      <Ionicons name="power-outline" size={15} color={service.active ? brand.danger : brand.ink} />
                      <Text className="text-ink text-xs font-semibold ml-1.5">{tr(service.active ? "Turn off" : "Turn on")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => remove(service)}
                      accessibilityLabel={`${tr("Delete")} ${service.name}`}
                      className="w-9 h-9 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory"
                    >
                      <Ionicons name="trash-outline" size={15} color={brand.inkMuted} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
