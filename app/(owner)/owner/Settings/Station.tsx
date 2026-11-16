import { Input, Label, PageHeader, PrimaryButton, Section } from "@/components/forms/FormKit";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useCategory from "@/store/category/useCategory";
import useEmployee from "@/store/Employee/UseEmploye";
import { isKitchenRole } from "@/components/forms/StationField";
import useStations from "@/store/Station/useStations";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

// One kitchen station (Kitchen, Bar, Grill): its name and the categories it
// makes. Opened from Kitchen settings; without an id it adds a new station.
export default function StationForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const stations = useStations((s) => s.stations);
  const categories = useCategory((s) => s.categoriesResponse);
  // Workers whose role prepares orders.
  const cooks = useEmployee((s) => s.employeeResponses ?? []).filter((e) => isKitchenRole(e) && e.user?.active !== false);
  const existing = stations.find((s) => s.id === id) ?? null;
  const first = stations[0] ?? null;

  const [name, setName] = useState(existing?.name ?? "");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [staff, setStaff] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      useStations.getState().load(),
      useCategory.getState().getCategories(),
      useEmployee.getState().getEmployees(),
    ])
      .catch(() => Toast.show({ type: "error", text1: tr("Could not load stations") }))
      .finally(() => setReady(true));
  }, []);

  // Once loaded: the name, and the categories already made here.
  useEffect(() => {
    if (!ready) return;
    if (existing) setName(existing.name);
    setChosen(new Set(categories.filter((c) => existing && c.stationId === existing.id).map((c) => c.id)));
    setStaff(new Set(cooks.filter((e) => existing && e.stationId === existing.id).map((e) => e.id)));
  }, [ready, existing?.id]);

  // Categories without a station go to the first one.
  const stationOf = useMemo(
    () => (stationId?: string | null) =>
      stations.find((s) => s.id === stationId)?.name ?? (first ? `${first.name} (${tr("first station")})` : null),
    [stations, first],
  );

  const toggle = (categoryId: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });

  const toggleCook = (employeeId: string) =>
    setStaff((current) => {
      const next = new Set(current);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });

  const save = async () => {
    if (!name.trim()) {
      Toast.show({ type: "error", text1: tr("Give the station a name"), text2: tr("For example Bar or Grill.") });
      return;
    }
    setSaving(true);
    try {
      const station = await useStations.getState().save(existing?.id ?? null, name);
      // Ticked categories move here; unticked ones that were here go back to the first station.
      const changes = categories.filter((c) => {
        const here = c.stationId === station.id;
        return chosen.has(c.id) ? !here : here;
      });
      await Promise.all(
        changes.map((c) => useStations.getState().setCategoryStation(c.id, chosen.has(c.id) ? station.id : null)),
      );
      // Ticked cooks work here only; unticked ones that were here can work anywhere.
      const moves = cooks.filter((e) => {
        const here = e.stationId === station.id;
        return staff.has(e.id) ? !here : here;
      });
      await Promise.all(
        moves.map((e) => useStations.getState().setEmployeeStation(e.id, staff.has(e.id) ? station.id : null)),
      );
      await Promise.all([useCategory.getState().getCategories(), useEmployee.getState().getEmployees()]);
      Toast.show({ type: "success", text1: existing ? tr("Station saved") : tr("Station added"), text2: station.name });
      router.back();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not save"), text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setDeleting(true);
    try {
      await useStations.getState().remove(existing.id);
      await useCategory.getState().getCategories().catch(() => {});
      Toast.show({ type: "success", text1: tr("Station deleted"), text2: existing.name });
      router.back();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not delete"), text2: (error as Error).message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-ivory" contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16, maxWidth: 820 }}>
      <PageHeader
        eyebrow={tr("Kitchen")}
        title={existing ? existing.name : tr("Add station")}
        subtitle={tr("A place that makes part of each order, with its own kitchen screen.")}
        onBack={() => router.back()}
      />

      {!ready ? (
        <View className="py-16 items-center">
          <ActivityIndicator color={brand.ink} />
        </View>
      ) : (
        <>
          <Section icon="restaurant-outline" title={tr("Name")}>
            <Label required>{tr("Station name")}</Label>
            <Input value={name} onChangeText={setName} placeholder={tr("For example Bar or Grill")} maxLength={40} icon="flame-outline" />
          </Section>

          <Section
            icon="pricetags-outline"
            title={tr("What it makes")}
            subtitle={tr("Tick the categories made here. Their kitchen items go to this screen.")}
          >
            {categories.length === 0 ? (
              <Text className="text-ink/50 text-[13px]">{tr("No categories yet. Add categories in Inventory first.")}</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {categories.map((category) => {
                  const on = chosen.has(category.id);
                  const elsewhere = !on && existing?.id !== category.stationId ? stationOf(category.stationId) : null;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => toggle(category.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      className={`flex-row items-center rounded-xl border px-3.5 min-h-[52px] ${
                        on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                      }`}
                    >
                      <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={on ? brand.lime : brand.inkDisabled} />
                      <View className="flex-1 ml-3 py-2">
                        <Text className={`text-[14px] font-semibold ${on ? "text-white" : "text-ink"}`}>{category.name}</Text>
                        {!!elsewhere && <Text className="text-ink/40 text-[11px] mt-0.5">{`${tr("Now at")} ${elsewhere}`}</Text>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Text className="text-ink/40 text-[11px] mt-3">
              {tr("Only products with \"Send to kitchen\" on go to a screen. One product can also choose its own station.")}
            </Text>
          </Section>

          <Section
            icon="people-outline"
            title={tr("Kitchen staff here")}
            subtitle={tr("Ticked cooks sign in only on this station's screen and start only its orders.")}
          >
            {cooks.length === 0 ? (
              <Text className="text-ink/50 text-[13px]">{tr("No kitchen staff yet. Add workers with the Kitchen staff role.")}</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {cooks.map((cook) => {
                  const on = staff.has(cook.id);
                  const elsewhere = !on && cook.stationId && cook.stationId !== existing?.id ? stationOf(cook.stationId) : null;
                  return (
                    <Pressable
                      key={cook.id}
                      onPress={() => toggleCook(cook.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      className={`flex-row items-center rounded-xl border px-3.5 min-h-[52px] ${
                        on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                      }`}
                    >
                      <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={on ? brand.lime : brand.inkDisabled} />
                      <View className="flex-1 ml-3 py-2">
                        <Text className={`text-[14px] font-semibold ${on ? "text-white" : "text-ink"}`}>{cook.name}</Text>
                        <Text className={`text-[11px] mt-0.5 ${on ? "text-white/50" : "text-ink/40"}`}>
                          {elsewhere ? `${tr("Now at")} ${elsewhere}` : on ? cook.role?.name : tr("Any station")}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Section>

          <View className="flex-row" style={{ gap: 12 }}>
            <PrimaryButton label={tr("Save")} busyLabel={tr("Saving...")} icon="checkmark-circle-outline" busy={saving} onPress={save} />
          </View>

          {existing && (
            <Pressable
              onPress={remove}
              disabled={deleting}
              className="self-start flex-row items-center h-11 px-4 rounded-xl border border-danger/30 bg-danger/10 active:bg-danger/20"
              style={{ gap: 8 }}
            >
              {deleting ? (
                <ActivityIndicator color={brand.danger} />
              ) : (
                <Ionicons name="trash-outline" size={16} color={brand.danger} />
              )}
              <Text className="text-danger text-[13px] font-semibold">{tr("Delete station")}</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}
