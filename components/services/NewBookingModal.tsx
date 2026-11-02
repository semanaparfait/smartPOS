// Book a service: start it now, reserve it ahead, or sell a ticket on the spot.
import { DateField, Tabs } from "@/components/inventory/stockKit";
import {
  ActionButton,
  FieldLabel,
  MethodChips,
  MoneyInput,
  Row,
  Stepper,
  TimeField,
  atTime,
  webNoOutline,
} from "@/components/services/servicesKit";
import {
  DEFAULT_HOLD_MS,
  UNIT_STATUS,
  bookedQuantity,
  dateKey,
  isTimed,
  kindMeta,
  priceMeta,
  rwf,
  timeOf,
} from "@/config/services";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import type {
  Booking,
  BookingMode,
  BookingPaymentMethod,
  Service,
} from "@/store/Services/serviceTypes";
import useServices from "@/store/Services/useServices";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

const HOUR_MS = 3_600_000;
// Rooms: arrive in the afternoon, leave the next late morning.
const CHECK_IN_TIME = "14:00";
const CHECK_OUT_HOURS_EARLY = 3;

export interface BookingStart {
  service?: Service;
  unitId?: string;
}

// Unfinished bookings of this unit that overlap the chosen time.
function clashFor(bookings: Booking[], unitId: string, start: Date, end: Date | null, now: boolean) {
  const until = (b: { start: number; end: number | null; active: boolean }) =>
    b.end ?? (b.active ? Infinity : b.start + DEFAULT_HOLD_MS);
  const mine = { start: start.getTime(), end: until({ start: start.getTime(), end: end?.getTime() ?? null, active: now }) };
  return bookings.find(
    (b) =>
      b.unit?.id === unitId &&
      (b.status === "RESERVED" || b.status === "ACTIVE") &&
      new Date(b.startAt).getTime() < mine.end &&
      until({
        start: new Date(b.startAt).getTime(),
        end: b.endAt ? new Date(b.endAt).getTime() : null,
        active: b.status === "ACTIVE",
      }) > mine.start,
  );
}

export default function NewBookingModal({
  start,
  onClose,
  onCreated,
}: {
  // null = hidden.
  start: BookingStart | null;
  onClose: () => void;
  onCreated?: (booking: Booking) => void;
}) {
  const services = useServices((s) => s.services);
  const bookings = useServices((s) => s.bookings);
  const createBooking = useServices((s) => s.createBooking);
  const offered = useMemo(() => services.filter((s) => s.active), [services]);

  const [serviceId, setServiceId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [mode, setMode] = useState<BookingMode>("START");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState(1);
  const [sessions, setSessions] = useState(1);
  // Length in the service's own unit; 0 = open, charged by time used.
  const [length, setLength] = useState(1);
  const [day, setDay] = useState(dateKey(new Date()));
  const [time, setTime] = useState(timeOf(new Date()));
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<BookingPaymentMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const service = offered.find((s) => s.id === serviceId);
  const unitPrice = Number(service?.price ?? 0);
  const price = service ? priceMeta(service.priceUnit) : null;
  const timed = !!service && isTimed(service.priceUnit);
  const isTicket = service?.kind === "TICKET";

  // A fresh form each time it opens.
  useEffect(() => {
    if (!start) return;
    const first = start.service ?? (offered.length === 1 ? offered[0] : undefined);
    setServiceId(first?.id ?? "");
    setUnitId(start.unitId ?? "");
    setCustomer("");
    setPhone("");
    setPeople(1);
    setSessions(1);
    setNote("");
    setMethod(null);
    setAmount("");
    setDay(dateKey(new Date()));
    setTime(timeOf(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  // Sensible defaults for the chosen service.
  useEffect(() => {
    if (!service) return;
    setMode(service.kind === "TICKET" ? "SELL" : "START");
    setLength(service.priceUnit === "HOUR" ? 0 : 1);
    if (!service.units.some((u) => u.id === unitId)) setUnitId(service.units.length === 1 ? service.units[0].id : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  useEffect(() => {
    if (mode === "BOOK" && service?.priceUnit === "NIGHT") setTime(CHECK_IN_TIME);
    if (mode !== "BOOK") {
      setDay(dateKey(new Date()));
      setTime(timeOf(new Date()));
    }
  }, [mode, service?.priceUnit]);

  const startAt = mode === "BOOK" ? atTime(day, time) : new Date();
  const endAt = useMemo(() => {
    if (!service || !startAt || !timed || length === 0) return null;
    const unit = service.priceUnit;
    if (unit === "HOUR") return new Date(startAt.getTime() + length * HOUR_MS);
    if (unit === "DAY") return new Date(startAt.getTime() + length * 24 * HOUR_MS);
    return new Date(startAt.getTime() + (length * 24 - CHECK_OUT_HOURS_EARLY) * HOUR_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, startAt?.getTime(), timed, length]);

  const quantity = service && startAt ? bookedQuantity(service.priceUnit, startAt, endAt, people, sessions) : 0;
  const total = Math.round(quantity * unitPrice * 100) / 100;
  const openEnded = timed && length === 0;
  const clash = service && unitId && startAt ? clashFor(bookings, unitId, startAt, endAt, mode !== "BOOK") : undefined;
  const suggested = mode === "BOOK" ? Number(service?.deposit ?? 0) : openEnded ? 0 : total;

  useEffect(() => {
    setAmount(suggested > 0 ? String(suggested) : "");
  }, [suggested]);

  const save = async () => {
    if (!service) return Toast.show({ type: "error", text1: tr("Choose a service") });
    if (service.units.length && !unitId)
      return Toast.show({ type: "error", text1: tr("Choose which one") });
    if (!startAt) return Toast.show({ type: "error", text1: tr("Enter a time like 14:30") });
    if (mode === "BOOK" && startAt.getTime() < Date.now() - 10 * 60_000)
      return Toast.show({ type: "error", text1: tr("That time has passed. Use Start now instead") });
    if (clash)
      return Toast.show({ type: "error", text1: tr("Already booked at that time"), text2: `${clash.customerName} · ${clash.code}` });
    const paying = method && Number(amount) > 0 ? { method, amount: Number(amount) } : undefined;
    if (mode === "SELL" && !paying) return Toast.show({ type: "error", text1: tr("Choose how they pay") });

    setSaving(true);
    try {
      const booking = await createBooking({
        serviceId: service.id,
        ...(unitId ? { unitId } : {}),
        mode,
        ...(customer.trim() ? { customerName: customer.trim() } : {}),
        ...(phone.trim() ? { customerPhone: phone.trim() } : {}),
        people,
        ...(service.priceUnit === "SESSION" ? { sessions } : {}),
        ...(mode === "BOOK" ? { startAt: startAt.toISOString() } : {}),
        ...(endAt ? { endAt: endAt.toISOString() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(paying ? { payment: paying } : {}),
      });
      Toast.show({
        type: "success",
        text1: tr(mode === "BOOK" ? "Booked" : mode === "SELL" ? "Sold" : "Started"),
        text2: `${booking.service.name}${booking.unit ? ` · ${booking.unit.name}` : ""} · ${booking.code}`,
      });
      onCreated?.(booking);
      onClose();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not save the booking"), text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const modes: { value: BookingMode; label: string }[] = isTicket
    ? [{ value: "SELL", label: "Sell now" }, { value: "BOOK", label: "Book ahead" }]
    : [
        { value: "START", label: "Start now" },
        { value: "BOOK", label: "Book ahead" },
        ...(!timed ? [{ value: "SELL" as BookingMode, label: "Paid and done" }] : []),
      ];

  return (
    <Modal visible={!!start} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink/50 items-center justify-center p-4">
        <View className="bg-white rounded-2xl w-full overflow-hidden" style={{ maxWidth: 560, maxHeight: "94%" }}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-ink/5">
            <View>
              <Text className="text-ink text-lg font-bold">{tr("New booking")}</Text>
              <Text className="text-ink/50 text-[13px] mt-0.5">
                {service ? `${service.name} · ${rwf(unitPrice)} ${tr(price!.per)}` : tr("Choose what they want")}
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel={tr("Close")} className="w-9 h-9 rounded-lg items-center justify-center active:bg-ivory">
              <Ionicons name="close" size={20} color={brand.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {!start?.service && (
              <View>
                <FieldLabel>{tr("Service")}</FieldLabel>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {offered.map((s) => {
                    const active = s.id === serviceId;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setServiceId(s.id)}
                        className={`flex-row items-center px-3.5 h-10 rounded-xl border ${
                          active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                        }`}
                      >
                        <Ionicons name={kindMeta(s.kind).icon} size={15} color={active ? brand.lime : brand.inkMuted} />
                        <Text className={`text-[13px] font-semibold ml-1.5 ${active ? "text-white" : "text-ink"}`}>{s.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!offered.length && (
                  <Text className="text-ink/50 text-[13px]">{tr("No services yet. The owner adds them under Services.")}</Text>
                )}
              </View>
            )}

            {service && service.units.length > 0 && (
              <View>
                <FieldLabel>{tr(kindMeta(service.kind).unitWord)}</FieldLabel>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {service.units.map((u) => {
                    const active = u.id === unitId;
                    const status = UNIT_STATUS[u.status];
                    const blocked = mode !== "BOOK" && u.status !== "AVAILABLE";
                    return (
                      <Pressable
                        key={u.id}
                        onPress={() => setUnitId(u.id)}
                        disabled={blocked}
                        className={`px-3.5 h-11 rounded-xl border justify-center ${
                          active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                        } ${blocked ? "opacity-40" : ""}`}
                      >
                        <Text className={`text-[13px] font-semibold ${active ? "text-white" : "text-ink"}`}>{u.name}</Text>
                        {u.status !== "AVAILABLE" && (
                          <Text className="text-[10px]" style={{ color: active ? brand.lime : status.color }}>
                            {tr(status.label)}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {service && (
              <>
                <Tabs options={modes} value={mode} onChange={(value) => setMode(value as BookingMode)} />

                {mode === "BOOK" && (
                  <View className="flex-row" style={{ gap: 10 }}>
                    <View className="flex-1">
                      <FieldLabel>{tr(service.priceUnit === "NIGHT" ? "Arrival date" : "Date")}</FieldLabel>
                      <DateField value={day} placeholder={tr("Date")} onChange={(value) => setDay(value || dateKey(new Date()))} />
                    </View>
                    <View style={{ width: 130 }}>
                      <FieldLabel>{tr("Time")}</FieldLabel>
                      <TimeField value={time} onChange={setTime} />
                    </View>
                  </View>
                )}

                {timed && (
                  <View>
                    <FieldLabel>{tr(`How many ${price!.many}`)}</FieldLabel>
                    <View className="flex-row flex-wrap items-center" style={{ gap: 10 }}>
                      <Stepper
                        value={length}
                        min={service.priceUnit === "HOUR" ? 0 : 1}
                        onChange={setLength}
                        suffix={tr(length === 1 ? price!.one : price!.many)}
                      />
                      {service.priceUnit === "HOUR" && (
                        <Pressable
                          onPress={() => setLength(0)}
                          className={`px-3.5 h-10 rounded-xl border justify-center ${
                            length === 0 ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                          }`}
                        >
                          <Text className={`text-[13px] font-semibold ${length === 0 ? "text-white" : "text-ink"}`}>
                            {tr("Until they stop")}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    {openEnded ? (
                      <Text className="text-ink/50 text-xs mt-1.5">{tr("Charged by the time used, counted by the quarter hour, when they check out.")}</Text>
                    ) : (
                      endAt && (
                        <Text className="text-ink/50 text-xs mt-1.5">
                          {tr("Until")} {dateKey(endAt) === dateKey(startAt ?? new Date()) ? timeOf(endAt) : `${dateKey(endAt)} ${timeOf(endAt)}`}
                        </Text>
                      )
                    )}
                  </View>
                )}

                <View className="flex-row flex-wrap" style={{ gap: 16 }}>
                  <View>
                    <FieldLabel>{tr("People")}</FieldLabel>
                    <Stepper value={people} max={service.capacity ?? undefined} onChange={setPeople} />
                  </View>
                  {service.priceUnit === "SESSION" && (
                    <View>
                      <FieldLabel>{tr("Sessions")}</FieldLabel>
                      <Stepper value={sessions} onChange={setSessions} />
                    </View>
                  )}
                </View>
                {!!service.capacity && (
                  <Text className="text-ink/40 text-xs -mt-2">{tr("Takes up to")} {service.capacity} {tr("people")}</Text>
                )}

                <View className="flex-row" style={{ gap: 10 }}>
                  <View className="flex-1">
                    <FieldLabel>{tr("Customer")}</FieldLabel>
                    <View className="bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px] justify-center">
                      <TextInput
                        value={customer}
                        onChangeText={setCustomer}
                        maxLength={120}
                        placeholder={tr(mode === "BOOK" ? "Name" : "Name (optional)")}
                        placeholderTextColor={brand.inkDisabled}
                        className="py-3 text-[15px] text-ink"
                        style={webNoOutline}
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <FieldLabel>{tr("Phone")}</FieldLabel>
                    <View className="bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px] justify-center">
                      <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        maxLength={30}
                        keyboardType="phone-pad"
                        placeholder={tr("Optional")}
                        placeholderTextColor={brand.inkDisabled}
                        className="py-3 text-[15px] text-ink"
                        style={webNoOutline}
                      />
                    </View>
                  </View>
                </View>

                <View className="bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px] justify-center">
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    maxLength={1000}
                    placeholder={tr("Note, e.g. Late arrival, extra bed")}
                    placeholderTextColor={brand.inkDisabled}
                    className="py-3 text-[15px] text-ink"
                    style={webNoOutline}
                  />
                </View>

                <View className="bg-ivory rounded-xl px-4 py-3">
                  {openEnded ? (
                    <Row label={tr("Price")} value={`${rwf(unitPrice)} ${tr(price!.per)}`} strong />
                  ) : (
                    <>
                      <Row
                        label={`${quantity} ${tr(quantity === 1 ? price!.one : price!.many)} × ${rwf(unitPrice)}`}
                        value={rwf(total)}
                        strong
                      />
                      {mode === "BOOK" && Number(service.deposit) > 0 && (
                        <Row label={tr("Usual deposit")} value={rwf(service.deposit)} />
                      )}
                    </>
                  )}
                </View>

                <View style={{ gap: 10 }}>
                  <FieldLabel>{tr(mode === "SELL" ? "Payment" : "Payment now")}</FieldLabel>
                  <MethodChips value={method} onChange={setMethod} allowNone={mode !== "SELL"} />
                  {method && (
                    <MoneyInput value={amount} placeholder={tr("Amount")} onChange={setAmount} />
                  )}
                </View>

                {clash && (
                  <View className="flex-row items-center rounded-xl px-3 py-2.5" style={{ backgroundColor: "#DC26261A" }}>
                    <Ionicons name="alert-circle-outline" size={16} color={brand.danger} />
                    <Text className="text-[13px] ml-2 flex-1" style={{ color: brand.danger }}>
                      {tr("Already booked at that time")}: {clash.customerName} · {timeOf(clash.startAt)} · {clash.code}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View className="flex-row px-5 pb-5 pt-3 border-t border-ink/5" style={{ gap: 10 }}>
            <ActionButton label={tr("Cancel")} icon="close" tone="plain" onPress={onClose} />
            <ActionButton
              label={tr(mode === "BOOK" ? "Book" : mode === "SELL" ? "Sell" : "Start")}
              icon={mode === "BOOK" ? "calendar-outline" : mode === "SELL" ? "ticket-outline" : "play"}
              busy={saving}
              onPress={save}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
