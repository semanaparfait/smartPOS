import ImageSearch from "@/components/inventory/ImageSearch";
import {
  ChoiceChips,
  Input,
  Label,
  PageHeader,
  PrimaryButton,
  Section,
  SecondaryButton,
  TextArea,
  pickSquarePhoto,
} from "@/components/forms/FormKit";
import { Row } from "@/components/services/servicesKit";
import { PRICE_UNITS, SERVICE_KINDS, kindMeta, priceMeta, rwf } from "@/config/services";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import type { PriceUnit, ServiceKind } from "@/store/Services/serviceTypes";
import useServices from "@/store/Services/useServices";
import { secureUrl } from "@/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Toast from "react-native-toast-message";

const LIST_ROUTE = "/(owner)/owner/services";
const text = (value: number | string | null | undefined) =>
  value === null || value === undefined || Number(value) === 0 ? "" : String(Number(value));

// "Room 101" -> next is "Room 102"; anything without a number gets " 2".
const nextName = (names: string[], word: string) => {
  const last = names[names.length - 1];
  const match = last?.match(/^(.*?)(\d+)$/);
  if (match) return `${match[1]}${Number(match[2]) + 1}`;
  return `${word} ${names.length + 1}`;
};

export default function EditService() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const services = useServices((s) => s.services);
  const getServices = useServices((s) => s.getServices);
  const addService = useServices((s) => s.addService);
  const updateService = useServices((s) => s.updateService);
  const addUnit = useServices((s) => s.addUnit);
  const removeUnit = useServices((s) => s.removeUnit);
  const searchImages = useServices((s) => s.searchImages);
  const existing = services.find((s) => s.id === id);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<ServiceKind | "">("");
  const [priceUnit, setPriceUnit] = useState<PriceUnit | "">("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<{ uri: string; file: Blob | null } | null>(null);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  // New services keep their units here until saved; existing ones save each change.
  const [draftUnits, setDraftUnits] = useState<string[]>([]);
  const [unitName, setUnitName] = useState("");
  const [many, setMany] = useState("");
  const [saving, setSaving] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (id && !existing) getServices().catch(() => {});
  }, [id, existing, getServices]);

  useEffect(() => {
    if (!existing || filled) return;
    setName(existing.name);
    setKind(existing.kind);
    setPriceUnit(existing.priceUnit);
    setPrice(text(existing.price));
    setDeposit(text(existing.deposit));
    setCapacity(text(existing.capacity));
    setDescription(existing.description ?? "");
    setFilled(true);
  }, [existing, filled]);

  const meta = kind ? kindMeta(kind) : null;
  const units = existing ? existing.units.map((u) => u.name) : draftUnits;
  const imageUri = pictureUrl ?? photo?.uri ?? secureUrl(existing?.imageUrl);

  const chooseKind = (value: ServiceKind) => {
    setKind(value);
    // The usual price unit, unless the owner already picked one.
    if (!priceUnit) setPriceUnit(kindMeta(value).priceUnit);
  };

  const add = async (names: string[]) => {
    const fresh = names.map((n) => n.trim()).filter((n) => n && !units.some((u) => u.toLowerCase() === n.toLowerCase()));
    if (!fresh.length) {
      Toast.show({ type: "error", text1: tr("That name is already in the list") });
      return;
    }
    if (!existing) {
      setDraftUnits((list) => [...list, ...fresh]);
      return;
    }
    try {
      for (const unit of fresh) await addUnit(existing.id, unit);
      Toast.show({ type: "success", text1: tr("Added"), text2: fresh.join(", ") });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not add"), text2: (error as Error).message });
    }
  };

  const addOne = () => {
    const value = unitName.trim() || nextName(units, tr(meta?.unitWord ?? "Unit"));
    add([value]);
    setUnitName("");
  };

  const addMany = () => {
    const count = Math.min(50, Math.max(1, Number(many) || 0));
    if (!Number(many)) return;
    const list = [...units];
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const next = nextName(list, tr(meta?.unitWord ?? "Unit"));
      list.push(next);
      names.push(next);
    }
    add(names);
    setMany("");
  };

  const drop = async (unit: string) => {
    if (!existing) {
      setDraftUnits((list) => list.filter((u) => u !== unit));
      return;
    }
    const saved = existing.units.find((u) => u.name === unit);
    if (!saved) return;
    try {
      await removeUnit(saved.id);
      Toast.show({ type: "success", text1: tr("Removed"), text2: unit });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not remove"), text2: (error as Error).message });
    }
  };

  const save = async () => {
    if (!name.trim() || !kind || !priceUnit || !(Number(price) > 0)) {
      Toast.show({ type: "error", text1: tr("Enter a name, a kind and a price") });
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("kind", kind);
      form.append("priceUnit", priceUnit);
      form.append("price", price);
      form.append("deposit", deposit || "0");
      // Blank clears these on the server.
      form.append("capacity", capacity);
      form.append("description", description.trim());
      if (!existing) form.append("units", JSON.stringify(draftUnits));
      if (pictureUrl) {
        form.append("pictureUrl", pictureUrl);
      } else if (photo) {
        if (Platform.OS === "web") {
          const picture = photo.file ?? (await fetch(photo.uri).then((r) => r.blob()));
          form.append("picture", picture as Blob, "service.jpg");
        } else {
          form.append("picture", { uri: photo.uri, name: "service.jpg", type: "image/jpeg" } as any);
        }
      }

      if (existing) await updateService(existing.id, form);
      else await addService(form);

      Toast.show({ type: "success", text1: tr(existing ? "Service saved" : "Service added"), text2: name.trim() });
      router.replace(LIST_ROUTE);
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not save the service"), text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const wide = width >= 1100;
  const per = priceUnit ? priceMeta(priceUnit) : null;

  const summary = (
    <Section icon="eye-outline" title={tr("How it looks")}>
      <View className="items-center mb-3">
        <Pressable
          onPress={async () => {
            const picked = await pickSquarePhoto();
            if (!picked) return;
            setPhoto(picked);
            setPictureUrl(null);
          }}
          accessibilityLabel={tr(imageUri ? "Change photo" : "Add photo")}
          className="w-24 h-24 rounded-2xl bg-ivory border border-ink/10 items-center justify-center overflow-hidden active:opacity-80"
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 96, height: 96 }} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={22} color={brand.inkDisabled} />
              <Text className="text-ink/40 text-[11px] mt-1">{tr("Add photo")}</Text>
            </>
          )}
        </Pressable>
        <Text numberOfLines={1} className="text-ink text-base font-semibold mt-3">
          {name.trim() || tr("New service")}
        </Text>
        {meta && <Text className="text-ink/50 text-xs mt-0.5">{tr(meta.label)}</Text>}
      </View>
      <Row label={tr("Price")} value={Number(price) > 0 && per ? `${rwf(price)} ${tr(per.per)}` : "—"} strong />
      <Row label={tr("Units")} value={units.length ? String(units.length) : tr("None")} />
      {Number(deposit) > 0 && <Row label={tr("Deposit")} value={rwf(deposit)} />}
      {Number(capacity) > 0 && <Row label={tr("Up to")} value={`${capacity} ${tr("people")}`} />}
      {per && ["HOUR", "NIGHT", "DAY"].includes(per.value) && (
        <Text className="text-ink/40 text-[11px] mt-2 leading-4">
          {tr(
            per.value === "HOUR"
              ? "Charged by the quarter hour. 1 h 10 min is 1.25 hours."
              : per.value === "NIGHT"
                ? "Arriving at 14:00 and leaving at 11:00 the next day is one night."
                : "Charged by the started 24 hours, with one hour of grace.",
          )}
        </Text>
      )}
    </Section>
  );

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow={tr("Services")}
          title={existing ? existing.name : tr("Add a service")}
          subtitle={tr("Something you sell by time or by booking, not off a shelf.")}
          onBack={() => router.replace(LIST_ROUTE)}
        />

        <View className={wide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
          <View className={wide ? "flex-1" : ""} style={{ gap: 16 }}>
            <Section icon="sparkles-outline" title={tr("What is it")}>
              <View style={{ gap: 16 }}>
                <View>
                  <Label required>{tr("Name")}</Label>
                  <Input icon="pricetag-outline" value={name} onChangeText={setName} maxLength={120} placeholder={tr("e.g. Deluxe room, Pool table, Swimming pool entry")} />
                </View>
                <View>
                  <Label required>{tr("Kind")}</Label>
                  <ChoiceChips
                    options={SERVICE_KINDS.map((k) => ({ value: k.value, label: k.label, icon: k.icon }))}
                    value={kind}
                    onChange={chooseKind}
                  />
                  {meta && <Text className="text-ink/40 text-xs mt-1.5">{tr(meta.hint)}</Text>}
                </View>
                <View>
                  <Label>{tr("Description")}</Label>
                  <TextArea value={description} onChangeText={setDescription} placeholder={tr("e.g. Double bed, breakfast included, sea view")} />
                </View>
              </View>
            </Section>

            <Section icon="cash-outline" title={tr("Price")} subtitle={tr("What one hour, night, day, session or person costs")}>
              <View style={{ gap: 16 }}>
                <View>
                  <Label required>{tr("Charged")}</Label>
                  <ChoiceChips
                    options={PRICE_UNITS.map((p) => ({ value: p.value, label: p.label, icon: p.icon }))}
                    value={priceUnit}
                    onChange={setPriceUnit}
                  />
                </View>
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  <View style={{ flexGrow: 1, minWidth: 180 }}>
                    <Label required>{tr("Price")}</Label>
                    <Input value={price} onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" suffix={per ? `RWF ${tr(per.per)}` : "RWF"} />
                  </View>
                  <View style={{ flexGrow: 1, minWidth: 180 }}>
                    <Label>{tr("Deposit when booking ahead")}</Label>
                    <Input value={deposit} onChangeText={(v) => setDeposit(v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder={tr("Optional")} suffix="RWF" />
                  </View>
                  <View style={{ flexGrow: 1, minWidth: 180 }}>
                    <Label>{tr("Most people at once")}</Label>
                    <Input value={capacity} onChangeText={(v) => setCapacity(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={tr("No limit")} suffix={tr("people")} />
                  </View>
                </View>
              </View>
            </Section>

            <Section
              icon="grid-outline"
              title={tr("What can be booked")}
              subtitle={tr("Each room, table, hall or item, so two customers never get the same one. Leave empty for tickets.")}
            >
              <View style={{ gap: 12 }}>
                {units.length > 0 && (
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {units.map((unit) => (
                      <View key={unit} className="flex-row items-center bg-ivory border border-ink/10 rounded-xl pl-3 pr-1 h-10">
                        <Text className="text-ink text-[13px] font-semibold">{unit}</Text>
                        <Pressable onPress={() => drop(unit)} accessibilityLabel={`${tr("Remove")} ${unit}`} hitSlop={6} className="w-8 h-8 items-center justify-center">
                          <Ionicons name="close" size={15} color={brand.inkMuted} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
                <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
                  <View style={{ flexGrow: 1, minWidth: 200 }}>
                    <Input
                      value={unitName}
                      onChangeText={setUnitName}
                      maxLength={60}
                      onSubmitEditing={addOne}
                      placeholder={units.length ? nextName(units, tr(meta?.unitWord ?? "Unit")) : tr(meta?.unitExample ?? "Room 101")}
                    />
                  </View>
                  <SecondaryButton label={tr("Add")} icon="add" onPress={addOne} />
                </View>
                <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
                  <Text className="text-ink/50 text-[13px]">{tr("Or add several at once:")}</Text>
                  <View style={{ width: 110 }}>
                    <Input value={many} onChangeText={(v) => setMany(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="10" />
                  </View>
                  <SecondaryButton label={tr("Add numbered")} icon="list-outline" onPress={addMany} />
                </View>
              </View>
            </Section>

            <Section icon="image-outline" title={tr("Picture")} subtitle={tr("Search, paste a link, or tap the photo to upload")}>
              <ImageSearch name={name} selected={pictureUrl} onPick={setPictureUrl} searchWith={searchImages} />
            </Section>

            <View className="flex-row" style={{ gap: 10 }}>
              <SecondaryButton label={tr("Cancel")} icon="close" onPress={() => router.replace(LIST_ROUTE)} />
              <PrimaryButton label={tr(existing ? "Save changes" : "Add service")} busyLabel={tr("Saving...")} icon="checkmark" busy={saving} onPress={save} />
            </View>
          </View>

          <View style={wide ? { width: 340 } : undefined}>{summary}</View>
        </View>
      </View>
    </ScrollView>
  );
}
