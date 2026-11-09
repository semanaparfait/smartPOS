// What a worker does with one table on the floor map: seat guests and take
// their order, book it, open the bill, print the receipt and free it again.
import { brand } from "@/config/theme";
import useOrder from "@/store/Order/Order";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { changeOrderItem } from "@/store/Venue/venueApi";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import useTableState, { TABLE_STATUS, tableStatusOf, type TableStatus } from "./tableState";
import type { Item } from "./types";
import { tr } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import { printReceipt } from "@/utils/printReceipt";
import Toast from "react-native-toast-message";

const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const shortId = (id: string) => `#${id.split("-")[0].toUpperCase()}`;
const rwf = (v: number) => `${Math.round(Number(v) || 0).toLocaleString()} RWF`;
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const duration = (iso: string) => {
  const m = minutesSince(iso);
  return m < 60 ? `${m} ${tr("min")}` : `${Math.floor(m / 60)} h ${m % 60} ${tr("min")}`;
};
const isPaid = (status?: string) => /complete|paid/i.test(status ?? "");
const isClosed = (status?: string) => /cancel/i.test(status ?? "") || isPaid(status);

function Action({
  icon,
  label,
  onPress,
  primary,
  busy,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      className={`flex-row items-center justify-center h-11 rounded-xl px-3 ${
        primary ? "bg-ink active:opacity-90" : "bg-white border border-ink/10 active:bg-ivory"
      } ${disabled ? "opacity-40" : ""}`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={primary ? "#fff" : brand.ink} />
      ) : (
        <Ionicons name={icon as any} size={15} color={primary ? brand.lime : brand.ink} />
      )}
      <Text className={`text-[13px] font-semibold ml-1.5 ${primary ? "text-white" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: "phone-pad" | "number-pad" | "numbers-and-punctuation";
}) {
  return (
    <View className="flex-1" style={{ minWidth: 110 }}>
      <Text className="text-ink/50 text-[11px] font-medium mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(32,40,59,0.35)"
        keyboardType={keyboard}
        className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-ink text-[13px]"
      />
    </View>
  );
}

// "19:30" today (or tomorrow when that time already passed more than an hour ago).
function timeToday(text: string): Date | null {
  const m = text.trim().match(/^(\d{1,2})[:.h]?(\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  if (d.getTime() < Date.now() - 60 * 60 * 1000) d.setDate(d.getDate() + 1);
  return d;
}

function BookingForm({ tableId, onDone }: { tableId: string; onDone: () => void }) {
  const { tables, book } = useTableState();
  const current = tables[tableId]?.booking;
  const [name, setName] = useState(current?.name ?? "");
  const [phone, setPhone] = useState(current?.phone ?? "");
  const [time, setTime] = useState(current ? clock(current.at) : "");
  const [guests, setGuests] = useState(current?.guests ? String(current.guests) : "");
  const [note, setNote] = useState(current?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const at = timeToday(time);
    if (!name.trim()) return setError(tr("Write who the table is for."));
    if (!at) return setError(tr("Write the time like 19:30."));
    setError(null);
    setBusy(true);
    const ok = await book(tableId, {
      name: name.trim(),
      phone: phone.trim() || null,
      at: at.toISOString(),
      guests: Number(guests) > 0 ? Number(guests) : null,
      note: note.trim() || null,
    });
    setBusy(false);
    if (ok) onDone();
  };

  return (
    <View className="bg-ivory rounded-xl p-3" style={{ gap: 10 }}>
      <Text className="text-ink text-[13px] font-semibold">{current ? tr("Change booking") : tr("Book this table")}</Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        <Field label={tr("Name")} value={name} onChange={setName} placeholder={tr("Guest name")} />
        <Field label={tr("Phone (optional)")} value={phone} onChange={setPhone} placeholder="078…" keyboard="phone-pad" />
      </View>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        <Field label={tr("Time")} value={time} onChange={setTime} placeholder="19:30" keyboard="numbers-and-punctuation" />
        <Field label={tr("Guests")} value={guests} onChange={(v) => setGuests(v.replace(/\D/g, ""))} placeholder="4" keyboard="number-pad" />
      </View>
      <Field label={tr("Note (optional)")} value={note} onChange={setNote} placeholder={tr("Birthday, window seat…")} />
      {error && <Text className="text-red-600 text-[12px]">{error}</Text>}
      <View className="flex-row" style={{ gap: 8 }}>
        <View className="flex-1">
          <Action icon="bookmark" label={tr("Save booking")} onPress={save} primary busy={busy} />
        </View>
        <Action icon="close" label={tr("Back")} onPress={onDone} />
      </View>
    </View>
  );
}

export default function TableActions({ table }: { table: Item }) {
  const { tables, setStatus, linkOrder, cancelBooking, startOrderFor } = useTableState();
  const orders = useOrder((s) => s.orders);
  const [mode, setMode] = useState<"main" | "book" | "link">("main");
  const [busy, setBusy] = useState<string | null>(null);

  const info = tables[table.id];
  const status = tableStatusOf(tables, table.id);
  const label = table.label || tr("Table");
  // The full order (items) when this device has it; the server's summary otherwise.
  const order = info?.orderId ? orders.find((o) => o.id === info.orderId) : undefined;
  const orderStatus = order?.status ?? info?.order?.status;
  const orderTotal = order ? Number(order.total) : info?.order?.total ?? 0;
  const paid = isPaid(orderStatus);
  // One worker serves a taken table: others (not owners) can only look.
  const me = useAuth((s) => s.profile);
  const notMine =
    status === "occupied" && !!info?.servedById && info.servedById !== me?.id && me?.role === "EMPLOYEE";

  const linkedElsewhere = useMemo(
    () => new Set(Object.entries(tables).filter(([id, t]) => t.orderId && id !== table.id).map(([, t]) => t.orderId)),
    [tables, table.id],
  );
  const openOrders = orders
    .filter((o) => !isClosed(o.status) && !linkedElsewhere.has(o.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    await fn();
    setBusy(null);
  };

  // Bill before paying, receipt after: always printed from the latest order.
  const print = () =>
    run("print", async () => {
      if (!info?.orderId) return;
      try {
        const full = (await useOrder.getState().fetchOrderById(info.orderId)) ?? order;
        if (!full) throw new Error(tr("Could not load the order"));
        await printReceipt(full, { table: label, printedBy: useAuth.getState().profile?.name });
      } catch (error) {
        Toast.show({ type: "error", text1: tr("Could not print"), text2: error instanceof Error ? error.message : undefined });
      }
    });

  // Seating new guests starts an order; at a table already eating, the products
  // are added to its open order (one bill at the end).
  const takeOrder = () => {
    startOrderFor({ id: table.id, label, orderId: info?.orderId && !paid ? info.orderId : undefined });
    router.push("/(till)/till/products/products");
  };

  // The full order with its items, so the worker can see and change it.
  useEffect(() => {
    if (!info?.orderId) return;
    useOrder
      .getState()
      .fetchOrderById(info.orderId)
      .then((o) => o && useOrder.getState().upsertOrder(o))
      .catch(() => {});
  }, [info?.orderId]);

  const lessOf = (itemId: string, quantity: number) =>
    run(`item:${itemId}`, async () => {
      if (!info?.orderId) return;
      try {
        useOrder.getState().upsertOrder(await changeOrderItem(info.orderId, itemId, quantity));
      } catch (error) {
        Toast.show({ type: "error", text1: error instanceof Error ? error.message : tr("Could not change the order") });
      }
    });
  const openBill = () => info?.orderId && router.push({ pathname: "/(till)/till/checkout/checkout", params: { orderId: info.orderId } });

  const header = (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center rounded-full px-2.5 h-7" style={{ backgroundColor: TABLE_STATUS[status].color }}>
        <Ionicons name={TABLE_STATUS[status].icon as any} size={13} color={TABLE_STATUS[status].text} />
        <Text className="text-[12px] font-semibold ml-1" style={{ color: TABLE_STATUS[status].text }}>
          {tr(TABLE_STATUS[status].label)}
        </Text>
      </View>
      {info && status !== "available" && <Text className="text-ink/45 text-[11px]">{duration(info.since)}</Text>}
    </View>
  );

  const server = status === "occupied" && info?.servedByName && (
    <View className="flex-row items-center bg-ivory rounded-xl px-3 py-2">
      <View className="w-7 h-7 rounded-full bg-ink items-center justify-center">
        <Text className="text-lime text-[12px] font-semibold">{info.servedByName.trim().charAt(0).toUpperCase()}</Text>
      </View>
      <Text className="text-ink/55 text-[12px] ml-2">{tr("Served by")}</Text>
      <Text className="text-ink text-[13px] font-semibold ml-1 flex-1" numberOfLines={1}>
        {info.servedByName.trim().split(/\s+/)[0]}
      </Text>
    </View>
  );

  if (mode === "book") return (
    <View style={{ gap: 12 }}>
      {header}
      <BookingForm tableId={table.id} onDone={() => setMode("main")} />
    </View>
  );

  if (mode === "link") return (
    <View style={{ gap: 12 }}>
      {header}
      <View className="bg-ivory rounded-xl overflow-hidden">
        {openOrders.length === 0 ? (
          <Text className="text-ink/45 text-xs p-3">{tr("No open orders right now.")}</Text>
        ) : (
          openOrders.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => run("link", async () => (await linkOrder(table.id, o.id)) && setMode("main"))}
              className="flex-row items-center justify-between px-3 py-2.5 border-b border-ink/5 active:bg-lime/30"
            >
              <View>
                <Text className="text-ink text-[12px] font-semibold">{shortId(o.id)}</Text>
                <Text className="text-ink/45 text-[11px]">
                  {minutesSince(o.createdAt)} {tr("min ago ·")} {o.status}
                </Text>
              </View>
              <Text className="text-ink text-[12px] font-semibold">{rwf(Number(o.total))}</Text>
            </Pressable>
          ))
        )}
      </View>
      <Action icon="arrow-back" label={tr("Back")} onPress={() => setMode("main")} />
    </View>
  );

  return (
    <View style={{ gap: 12 }}>
      {header}
      {server}

      {status === "reserved" && info?.booking && (
        <View className="bg-blue-50 rounded-xl p-3" style={{ gap: 3 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-ink text-[14px] font-semibold">{info.booking.name}</Text>
            <Text className="text-ink text-[13px] font-semibold">{clock(info.booking.at)}</Text>
          </View>
          <Text className="text-ink/55 text-[12px]">
            {[info.booking.guests ? `${info.booking.guests} ${tr("guests")}` : null, info.booking.phone].filter(Boolean).join(" · ") ||
              tr("No phone given")}
          </Text>
          {!!info.booking.note && <Text className="text-ink/70 text-[12px] mt-1">{info.booking.note}</Text>}
        </View>
      )}

      {status === "occupied" && (
        <View className="bg-ivory rounded-xl p-3">
          {info?.orderId ? (
            <>
              <View className="flex-row items-center justify-between">
                <Text className="text-ink text-[13px] font-semibold">
                  {tr("Order")} {shortId(info.orderId)}
                </Text>
                <Text className="text-ink text-[14px] font-bold">{rwf(orderTotal)}</Text>
              </View>
              <Text className={`text-[11px] mt-0.5 ${paid ? "text-emerald-700 font-semibold" : "text-ink/50"}`}>
                {paid
                  ? tr("Paid")
                  : `${order?.items?.reduce((n, it) => n + (it.quantity || 0), 0) ?? "…"} ${tr("items ·")} ${orderStatus ?? ""}`}
              </Text>
              {/* Every item; while unpaid, one less (−) or take it off (trash). */}
              {order?.items?.map((it) => {
                const changing = busy === `item:${it.id}`;
                return (
                  <View key={it.id} className="flex-row items-center mt-2">
                    <Text numberOfLines={1} className="flex-1 text-ink/80 text-[12px] pr-2">
                      {it.quantity} × {it.product?.name ?? tr("Item")}
                    </Text>
                    <Text className="text-ink/70 text-[12px] mr-1">{Number(it.totalPrice || 0).toLocaleString()}</Text>
                    {!paid && !notMine &&
                      (changing ? (
                        <ActivityIndicator size="small" color={brand.ink} style={{ width: 60 }} />
                      ) : (
                        <View className="flex-row" style={{ gap: 4 }}>
                          <Pressable
                            onPress={() => lessOf(it.id, it.quantity - 1)}
                            disabled={!!busy || it.quantity <= 1}
                            accessibilityLabel={tr("One less")}
                            className={`w-7 h-7 rounded-lg bg-white border border-ink/10 items-center justify-center ${it.quantity <= 1 ? "opacity-30" : "active:bg-ivory"}`}
                          >
                            <Ionicons name="remove" size={14} color={brand.ink} />
                          </Pressable>
                          <Pressable
                            onPress={() => lessOf(it.id, 0)}
                            disabled={!!busy}
                            accessibilityLabel={tr("Remove")}
                            className="w-7 h-7 rounded-lg bg-white border border-ink/10 items-center justify-center active:bg-red-50"
                          >
                            <Ionicons name="trash-outline" size={13} color="#DC2626" />
                          </Pressable>
                        </View>
                      ))}
                  </View>
                );
              })}
            </>
          ) : (
            <Text className="text-ink/55 text-[12px]">{tr("Guests are seated. No order yet.")}</Text>
          )}
        </View>
      )}

      {notMine && (
        <View className="flex-row items-center bg-amber-50 rounded-xl px-3 py-2.5">
          <Ionicons name="lock-closed-outline" size={15} color="#B45309" />
          <Text className="text-amber-900 text-[12px] ml-2 flex-1">
            {tr("Only")} {info?.servedByName?.trim().split(/\s+/)[0]} {tr("serves this table. Ask them or the owner.")}
          </Text>
        </View>
      )}

      {/* Main actions for each state */}
      {!notMine && <View style={{ gap: 8 }}>
        {status === "available" && (
          <>
            <Action icon="restaurant" label={tr("Seat guests and take order")} onPress={takeOrder} primary />
            <View className="flex-row" style={{ gap: 8 }}>
              <View className="flex-1">
                <Action icon="bookmark-outline" label={tr("Book")} onPress={() => setMode("book")} />
              </View>
              <View className="flex-1">
                <Action icon="link-outline" label={tr("Link order")} onPress={() => setMode("link")} />
              </View>
            </View>
          </>
        )}

        {status === "reserved" && (
          <>
            <Action icon="restaurant" label={tr("Guests arrived: take order")} onPress={takeOrder} primary />
            <View className="flex-row" style={{ gap: 8 }}>
              <View className="flex-1">
                <Action icon="create-outline" label={tr("Change")} onPress={() => setMode("book")} />
              </View>
              <View className="flex-1">
                <Action
                  icon="close-circle-outline"
                  label={tr("Cancel booking")}
                  busy={busy === "cancel"}
                  onPress={() => run("cancel", () => cancelBooking(table.id))}
                />
              </View>
            </View>
          </>
        )}

        {status === "occupied" && !info?.orderId && (
          <>
            <Action icon="restaurant" label={tr("Take order")} onPress={takeOrder} primary />
            <Action icon="link-outline" label={tr("Link an open order")} onPress={() => setMode("link")} />
          </>
        )}

        {status === "occupied" && info?.orderId && !paid && (
          <>
            <Action icon="add-circle" label={tr("Add products")} onPress={takeOrder} primary />
            <View className="flex-row" style={{ gap: 8 }}>
              <View className="flex-1">
                <Action icon="print-outline" label={tr("Print bill")} busy={busy === "print"} onPress={print} />
              </View>
              <View className="flex-1">
                <Action icon="card-outline" label={tr("Take payment")} onPress={openBill} />
              </View>
            </View>
            <Text className="text-ink/45 text-[11px] text-center">
              {tr("After payment the receipt prints and the table is free again.")}
            </Text>
          </>
        )}

        {status === "occupied" && info?.orderId && paid && (
          <>
            <Action
              icon="sparkles"
              label={tr("Guests left: clean table")}
              busy={busy === "clean"}
              onPress={() => run("clean", () => setStatus(table.id, "cleaning"))}
              primary
            />
            <Action icon="print-outline" label={tr("Print receipt")} busy={busy === "print"} onPress={print} />
          </>
        )}

        {status === "cleaning" && (
          <Action
            icon="checkmark-circle"
            label={tr("Table is clean")}
            busy={busy === "free"}
            onPress={() => run("free", () => setStatus(table.id, "available"))}
            primary
          />
        )}

        {/* Less common: free the table at any time, or put it back to cleaning. */}
        {(status === "occupied" || status === "reserved") && (
          <View className="flex-row justify-center pt-1" style={{ gap: 18 }}>
            {status === "occupied" && !!info?.orderId && (
              <Pressable onPress={() => run("unlink", () => linkOrder(table.id, undefined))}>
                <Text className="text-ink/50 text-[12px] underline">{tr("Unlink order")}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => run("free", () => setStatus(table.id, "available" as TableStatus))}>
              <Text className="text-ink/50 text-[12px] underline">{tr("Free the table")}</Text>
            </Pressable>
          </View>
        )}
      </View>}
    </View>
  );
}
