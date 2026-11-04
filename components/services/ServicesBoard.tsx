// The services desk: what is in use right now, what is booked, and what is owed.
// Used by the till's Services tab and the owner's Bookings page.
import { DateField, EmptyState, Tabs } from "@/components/inventory/stockKit";
import BookingSheet, { useNow } from "@/components/services/BookingSheet";
import NewBookingModal, { type BookingStart } from "@/components/services/NewBookingModal";
import { Pill, ServiceThumb } from "@/components/services/servicesKit";
import { PageHeader } from "@/components/forms/FormKit";
import {
  BOOKING_STATUS,
  UNIT_STATUS,
  dateKey,
  elapsed,
  kindMeta,
  priceMeta,
  runningTotal,
  rwf,
  sameDay,
  timeOf,
} from "@/config/services";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import usePermissions from "@/store/Authentication/usePermissions";
import type { Booking, Service, ServiceUnit, Takings } from "@/store/Services/serviceTypes";
import useServices from "@/store/Services/useServices";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

const REFRESH_MS = 60_000;
const BOOKING_FILTERS = [
  { value: "all", label: "All" },
  { value: "RESERVED", label: "Reserved" },
  { value: "ACTIVE", label: "In use" },
  { value: "COMPLETED", label: "Done" },
  { value: "owing", label: "Still owed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const dayRange = (day: string) => {
  const from = new Date(`${day}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-ink/5 p-4" style={{ minWidth: 150 }}>
      <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-2xl font-semibold mt-1" style={{ color: tone ?? brand.ink }}>
        {value}
      </Text>
    </View>
  );
}

function UnitTile({
  unit,
  active,
  next,
  now,
  onOpen,
  onBook,
  onStatus,
}: {
  unit: ServiceUnit;
  active?: Booking;
  next?: Booking;
  now: Date;
  onOpen: (booking: Booking) => void;
  onBook: () => void;
  onStatus: (status: ServiceUnit["status"]) => void;
}) {
  const status = UNIT_STATUS[unit.status];
  const inUse = unit.status === "OCCUPIED" && active;
  const press = () => (active ? onOpen(active) : unit.status === "AVAILABLE" ? onBook() : next && onOpen(next));

  return (
    <Pressable
      onPress={press}
      className={`rounded-2xl border p-3.5 ${inUse ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
      style={{ width: 196, minHeight: 124, gap: 6 }}
    >
      <View className="flex-row items-center justify-between">
        <Text numberOfLines={1} className={`text-[15px] font-semibold flex-1 ${inUse ? "text-white" : "text-ink"}`}>
          {unit.name}
        </Text>
        <Pill {...status} />
      </View>

      {inUse ? (
        <>
          <Text numberOfLines={1} className="text-white/70 text-[13px]">{active.customerName}</Text>
          <View className="flex-row items-end justify-between mt-auto">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color={brand.lime} />
              <Text className="text-lime text-[15px] font-semibold ml-1">{elapsed(active.checkedInAt ?? active.startAt, now)}</Text>
            </View>
            <Text className="text-white text-[13px] font-semibold">{rwf(runningTotal(active, now).total)}</Text>
          </View>
        </>
      ) : (
        <>
          {next ? (
            <Text numberOfLines={2} className="text-ink/60 text-[12px]">
              {tr("Next")}: {sameDay(next.startAt, now) ? timeOf(next.startAt) : dateKey(next.startAt)} · {next.customerName}
            </Text>
          ) : (
            <Text className="text-ink/40 text-[12px]">{tr(unit.status === "AVAILABLE" ? "Tap to start or book" : "Not ready")}</Text>
          )}
          <View className="flex-row mt-auto" style={{ gap: 6 }}>
            {unit.status === "AVAILABLE" ? (
              <Pressable
                onPress={() => onStatus("MAINTENANCE")}
                accessibilityLabel={`${tr("Maintenance")} ${unit.name}`}
                hitSlop={6}
                className="h-8 px-2.5 rounded-lg border border-ink/10 flex-row items-center active:bg-ivory"
              >
                <Ionicons name="construct-outline" size={13} color={brand.inkMuted} />
              </Pressable>
            ) : (
              unit.status !== "OCCUPIED" && (
                <Pressable
                  onPress={() => onStatus("AVAILABLE")}
                  className="h-8 px-3 rounded-lg bg-lime flex-row items-center active:bg-lime-dark"
                >
                  <Ionicons name="checkmark" size={14} color={brand.ink} />
                  <Text className="text-ink text-xs font-semibold ml-1">{tr("Mark ready")}</Text>
                </Pressable>
              )
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

function ServiceCard({
  service,
  bookings,
  now,
  onOpen,
  onBook,
  onStatus,
}: {
  service: Service;
  bookings: Booking[];
  now: Date;
  onOpen: (booking: Booking) => void;
  onBook: (start: BookingStart) => void;
  onStatus: (unit: ServiceUnit, status: ServiceUnit["status"]) => void;
}) {
  const kind = kindMeta(service.kind);
  const mine = bookings.filter((b) => b.service.id === service.id);
  const running = mine.filter((b) => b.status === "ACTIVE");
  const upcoming = mine
    .filter((b) => b.status === "RESERVED")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const free = service.units.filter((u) => u.status === "AVAILABLE").length;

  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-4" style={{ gap: 14 }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <ServiceThumb uri={service.imageUrl} icon={kind.icon} />
        <View className="flex-1">
          <Text numberOfLines={1} className="text-ink text-[15px] font-semibold">{service.name}</Text>
          <Text className="text-ink/50 text-xs mt-0.5">
            {rwf(service.price)} {tr(priceMeta(service.priceUnit).per)}
            {service.units.length ? ` · ${free}/${service.units.length} ${tr("free")}` : ""}
            {running.length ? ` · ${running.length} ${tr("in use")}` : ""}
          </Text>
        </View>
        <Pressable
          onPress={() => onBook({ service })}
          className="h-9 px-3.5 rounded-xl bg-ink flex-row items-center active:bg-ink-soft"
        >
          <Ionicons name={service.kind === "TICKET" ? "ticket-outline" : "add"} size={16} color={brand.lime} />
          <Text className="text-white text-[13px] font-semibold ml-1">{tr(service.kind === "TICKET" ? "Sell" : "Book")}</Text>
        </Pressable>
      </View>

      {service.units.length > 0 ? (
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {service.units.map((unit) => (
            <UnitTile
              key={unit.id}
              unit={unit}
              active={running.find((b) => b.unit?.id === unit.id)}
              next={upcoming.find((b) => b.unit?.id === unit.id)}
              now={now}
              onOpen={onOpen}
              onBook={() => onBook({ service, unitId: unit.id })}
              onStatus={(status) => onStatus(unit, status)}
            />
          ))}
        </View>
      ) : (
        [...running, ...upcoming.filter((b) => sameDay(b.startAt, now))].length > 0 && (
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {[...running, ...upcoming.filter((b) => sameDay(b.startAt, now))].map((b) => (
              <Pressable
                key={b.id}
                onPress={() => onOpen(b)}
                className={`rounded-xl border px-3 py-2.5 ${b.status === "ACTIVE" ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
                style={{ width: 196 }}
              >
                <Text numberOfLines={1} className={`text-[13px] font-semibold ${b.status === "ACTIVE" ? "text-white" : "text-ink"}`}>
                  {b.customerName}
                </Text>
                <Text className={`text-xs mt-0.5 ${b.status === "ACTIVE" ? "text-lime" : "text-ink/50"}`}>
                  {b.status === "ACTIVE" ? elapsed(b.checkedInAt ?? b.startAt, now) : `${tr("At")} ${timeOf(b.startAt)}`} · {b.people} {tr("people")}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      )}
    </View>
  );
}

function BookingRow({ booking, now, onOpen, first }: { booking: Booking; now: Date; onOpen: () => void; first: boolean }) {
  const total = runningTotal(booking, now).total;
  const owed = booking.status === "CANCELLED" ? 0 : Math.round((total - booking.paid) * 100) / 100;
  return (
    <Pressable onPress={onOpen} className={`flex-row items-center px-4 py-3 active:bg-ivory ${first ? "" : "border-t border-ink/5"}`}>
      <View style={{ width: 70 }}>
        <Text className="text-ink text-[13px] font-semibold">{timeOf(booking.checkedInAt ?? booking.startAt)}</Text>
        <Text className="text-ink/40 text-[11px] tracking-wider">{booking.code}</Text>
      </View>
      <View className="flex-1 pr-3">
        <Text numberOfLines={1} className="text-ink text-[13px] font-semibold">{booking.customerName}</Text>
        <Text numberOfLines={1} className="text-ink/50 text-xs">
          {booking.service.name}
          {booking.unit ? ` · ${booking.unit.name}` : ""} · {booking.people} {tr("people")}
        </Text>
      </View>
      <View style={{ width: 96 }}>
        <Pill {...BOOKING_STATUS[booking.status]} />
      </View>
      <View style={{ width: 120 }} className="items-end">
        <Text className="text-ink text-[13px] font-semibold">{booking.status === "CANCELLED" ? "—" : rwf(total)}</Text>
        {owed > 0 && (
          <Text className="text-[11px]" style={{ color: brand.danger }}>
            {tr("Owes")} {rwf(owed)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function ServicesBoard() {
  const router = useRouter();
  // Set when opened from a booking alert: that booking's sheet opens.
  const { booking: askedFor } = useLocalSearchParams<{ booking?: string }>();
  const { can } = usePermissions();
  const services = useServices((s) => s.services);
  const bookings = useServices((s) => s.bookings);
  const loaded = useServices((s) => s.loaded);
  const getServices = useServices((s) => s.getServices);
  const getBookings = useServices((s) => s.getBookings);
  const getTakings = useServices((s) => s.getTakings);
  const setUnitStatus = useServices((s) => s.setUnitStatus);
  const now = useNow();

  const [tab, setTab] = useState("now");
  const [day, setDay] = useState(dateKey(new Date()));
  const [filter, setFilter] = useState("all");
  const [starting, setStarting] = useState<BookingStart | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [takings, setTakings] = useState<Takings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const canSetup = can("services.setup");

  const load = useCallback(async () => {
    const { from, to } = dayRange(day);
    const today = dayRange(dateKey(new Date()));
    try {
      await Promise.all([
        getServices(),
        getBookings(from, to),
        getTakings(today.from, today.to).then(setTakings),
      ]);
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not load services"), text2: (error as Error).message });
    }
  }, [day, getServices, getBookings, getTakings]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (askedFor && bookings.some((b) => b.id === askedFor)) {
      setOpenId(askedFor);
      router.setParams({ booking: undefined });
    }
  }, [askedFor, bookings, router]);

  // Money changes after every booking action, so takings follow the bookings.
  useEffect(() => {
    const today = dayRange(dateKey(new Date()));
    getTakings(today.from, today.to).then(setTakings).catch(() => {});
  }, [bookings, getTakings]);

  const offered = useMemo(() => services.filter((s) => s.active), [services]);
  const units = offered.flatMap((s) => s.units);
  const inUse = bookings.filter((b) => b.status === "ACTIVE");
  const reservedToday = bookings.filter((b) => b.status === "RESERVED" && sameDay(b.startAt, now));
  const owing = bookings
    .filter((b) => b.status === "COMPLETED" && b.balance > 0)
    .reduce((sum, b) => sum + b.balance, 0);

  const listed = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "ACTIVE" || sameDay(b.checkedInAt ?? b.startAt, `${day}T12:00:00`))
        .filter((b) =>
          filter === "all"
            ? true
            : filter === "owing"
              ? b.status !== "CANCELLED" && runningTotal(b, now).total - b.paid > 0
              : b.status === filter,
        )
        .sort(
          (a, b) =>
            new Date(a.checkedInAt ?? a.startAt).getTime() - new Date(b.checkedInAt ?? b.startAt).getTime(),
        ),
    [bookings, day, filter, now],
  );

  const changeStatus = async (unit: ServiceUnit, status: ServiceUnit["status"]) => {
    try {
      await setUnitStatus(unit.id, status);
      Toast.show({ type: "success", text1: `${unit.name}: ${tr(UNIT_STATUS[status].label)}` });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-ivory w-full"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow={tr("Services")}
          title={tr("Services & bookings")}
          subtitle={tr("Who is using what, what is booked, and what is still owed.")}
          right={
            <View className="flex-row" style={{ gap: 8 }}>
              {canSetup && (
                <Pressable
                  onPress={() => router.push("/(owner)/owner/services")}
                  className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory"
                >
                  <Ionicons name="options-outline" size={16} color={brand.ink} />
                  <Text className="text-ink text-sm font-semibold ml-1.5">{tr("Set up")}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setStarting({})}
                disabled={!offered.length}
                className={`flex-row items-center h-10 px-4 rounded-xl bg-lime active:bg-lime-dark ${offered.length ? "" : "opacity-50"}`}
              >
                <Ionicons name="add" size={18} color={brand.ink} />
                <Text className="text-ink text-sm font-semibold ml-1">{tr("New booking")}</Text>
              </Pressable>
            </View>
          }
        />

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <Stat label={tr("In use now")} value={inUse.length.toLocaleString()} />
          <Stat
            label={tr("Free now")}
            value={units.length ? `${units.filter((u) => u.status === "AVAILABLE").length}/${units.length}` : "—"}
          />
          <Stat label={tr("Booked for today")} value={reservedToday.length.toLocaleString()} />
          <Stat label={tr("Taken today")} value={takings ? rwf(takings.total) : "—"} />
          <Stat label={tr("Still owed")} value={rwf(owing)} tone={owing > 0 ? brand.danger : undefined} />
        </View>

        <Tabs
          options={[
            { value: "now", label: "Right now" },
            { value: "bookings", label: "Bookings" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {!loaded ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={brand.ink} />
          </View>
        ) : tab === "now" ? (
          offered.length ? (
            offered.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                bookings={bookings}
                now={now}
                onOpen={(b) => setOpenId(b.id)}
                onBook={setStarting}
                onStatus={changeStatus}
              />
            ))
          ) : (
            <View className="bg-white rounded-2xl border border-ink/5">
              <EmptyState
                icon="bed-outline"
                title={tr("No services yet")}
                hint={tr(
                  canSetup
                    ? "Add your rooms, halls, games, tickets or rentals to start taking bookings."
                    : "Ask the owner to add the services you offer.",
                )}
              />
              {canSetup && (
                <Pressable
                  onPress={() => router.push("/(owner)/owner/services/edit")}
                  className="self-center mb-8 h-10 px-4 rounded-xl bg-lime flex-row items-center active:bg-lime-dark"
                >
                  <Ionicons name="add" size={18} color={brand.ink} />
                  <Text className="text-ink text-sm font-semibold ml-1">{tr("Add a service")}</Text>
                </Pressable>
              )}
            </View>
          )
        ) : (
          <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
            <View className="p-4 border-b border-ink/5 flex-row flex-wrap items-center" style={{ gap: 12 }}>
              <View style={{ width: 220 }}>
                <DateField value={day} placeholder={tr("Date")} onChange={(value) => setDay(value || dateKey(new Date()))} />
              </View>
              <Tabs options={BOOKING_FILTERS} value={filter} onChange={setFilter} />
            </View>
            {listed.length ? (
              listed.map((b, i) => <BookingRow key={b.id} booking={b} now={now} first={i === 0} onOpen={() => setOpenId(b.id)} />)
            ) : (
              <EmptyState icon="calendar-outline" title={tr("No bookings")} hint={tr("Try another day or filter.")} />
            )}
          </View>
        )}
      </View>

      <NewBookingModal start={starting} onClose={() => setStarting(null)} />
      <BookingSheet bookingId={openId} onClose={() => setOpenId(null)} />
    </ScrollView>
  );
}
