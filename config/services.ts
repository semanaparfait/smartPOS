// What a company can offer as a service, how each is priced, and the price rules.
// The rules match pos-backend src/modules/service/pricing.ts, so the price shown
// while booking is the price charged.
import type { Ionicons } from "@expo/vector-icons";
import type {
  Booking,
  BookingStatus,
  PriceUnit,
  ServiceKind,
  UnitStatus,
} from "@/store/Services/serviceTypes";

type Icon = keyof typeof Ionicons.glyphMap;

export const SERVICE_KINDS: {
  value: ServiceKind;
  label: string;
  icon: Icon;
  hint: string;
  // Usual price unit, picked for the owner when they choose the kind.
  priceUnit: PriceUnit;
  // What one bookable thing is called, for the units list.
  unitWord: string;
  unitExample: string;
}[] = [
  { value: "ROOM", label: "Rooms", icon: "bed-outline", hint: "Hotel and guest rooms", priceUnit: "NIGHT", unitWord: "Room", unitExample: "Room 101" },
  { value: "SPACE", label: "Halls & spaces", icon: "business-outline", hint: "Conference halls, meeting rooms, VIP areas, gardens", priceUnit: "HOUR", unitWord: "Space", unitExample: "Main hall" },
  { value: "ACTIVITY", label: "Activities", icon: "game-controller-outline", hint: "Pool table, gym, karaoke, car wash, salon chair", priceUnit: "HOUR", unitWord: "Station", unitExample: "Table 1" },
  { value: "TICKET", label: "Tickets & entry", icon: "ticket-outline", hint: "Swimming pool entry, event tickets, entrance fees", priceUnit: "PERSON", unitWord: "Gate", unitExample: "Gate A" },
  { value: "RENTAL", label: "Rentals", icon: "bicycle-outline", hint: "Bikes, cars, tents, sound system, equipment", priceUnit: "DAY", unitWord: "Item", unitExample: "Bike 1" },
  { value: "OTHER", label: "Other", icon: "sparkles-outline", hint: "Laundry, massage, tours, anything else", priceUnit: "SESSION", unitWord: "Unit", unitExample: "Chair 1" },
];

export const PRICE_UNITS: {
  value: PriceUnit;
  label: string;
  // "per night" after a price.
  per: string;
  // Singular and plural for "2 nights".
  one: string;
  many: string;
  icon: Icon;
}[] = [
  { value: "HOUR", label: "Per hour", per: "per hour", one: "hour", many: "hours", icon: "time-outline" },
  { value: "NIGHT", label: "Per night", per: "per night", one: "night", many: "nights", icon: "moon-outline" },
  { value: "DAY", label: "Per day", per: "per day", one: "day", many: "days", icon: "sunny-outline" },
  { value: "SESSION", label: "Per session", per: "per session", one: "session", many: "sessions", icon: "repeat-outline" },
  { value: "PERSON", label: "Per person", per: "per person", one: "person", many: "people", icon: "person-outline" },
  { value: "FIXED", label: "Fixed price", per: "each", one: "time", many: "times", icon: "pricetag-outline" },
];

export const kindMeta = (kind: ServiceKind) =>
  SERVICE_KINDS.find((k) => k.value === kind) ?? SERVICE_KINDS[SERVICE_KINDS.length - 1];

export const priceMeta = (unit: PriceUnit) =>
  PRICE_UNITS.find((p) => p.value === unit) ?? PRICE_UNITS[PRICE_UNITS.length - 1];

// Priced by how long it is used.
export const isTimed = (unit: PriceUnit) => unit === "HOUR" || unit === "NIGHT" || unit === "DAY";

export const UNIT_STATUS: Record<UnitStatus, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: "Free", color: "#16A34A", bg: "#16A34A1A" },
  OCCUPIED: { label: "In use", color: "#20283B", bg: "#D0E66B" },
  CLEANING: { label: "Cleaning", color: "#6B7690", bg: "#6B76901A" },
  MAINTENANCE: { label: "Maintenance", color: "#DC2626", bg: "#DC26261A" },
};

export const BOOKING_STATUS: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  RESERVED: { label: "Reserved", color: "#20283B", bg: "#20283B14" },
  ACTIVE: { label: "In use", color: "#20283B", bg: "#D0E66B" },
  COMPLETED: { label: "Done", color: "#16A34A", bg: "#16A34A1A" },
  CANCELLED: { label: "Cancelled", color: "#6B7690", bg: "#6B76901A" },
};

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
// A booking ahead with no end holds its unit for an hour (as on the server).
export const DEFAULT_HOLD_MS = HOUR_MS;

// Hours by the started quarter hour; nights rounded to the nearest; days by the
// started 24 hours with an hour of grace. Never less than one.
export function measuredQuantity(unit: PriceUnit, from: Date, to: Date) {
  const span = Math.max(0, to.getTime() - from.getTime());
  if (unit === "HOUR") return Math.max(1, Math.ceil(span / (HOUR_MS / 4))) / 4;
  if (unit === "NIGHT") return Math.max(1, Math.round(span / DAY_MS));
  if (unit === "DAY") return Math.max(1, Math.ceil((span - HOUR_MS) / DAY_MS));
  return 1;
}

// What a new booking is charged for before checkout (0 = by time used).
export function bookedQuantity(
  unit: PriceUnit,
  start: Date,
  end: Date | null,
  people: number,
  sessions = 1,
) {
  if (isTimed(unit)) return end ? measuredQuantity(unit, start, end) : 0;
  if (unit === "PERSON") return people;
  if (unit === "SESSION") return sessions;
  return 1;
}

// What a booking in use would cost if they checked out now.
export function runningTotal(booking: Booking, now = new Date()) {
  const booked = Number(booking.quantity);
  const quantity =
    booking.status === "ACTIVE" && isTimed(booking.priceUnit)
      ? Math.max(
          booked,
          measuredQuantity(booking.priceUnit, new Date(booking.checkedInAt ?? booking.startAt), now),
        )
      : booked;
  const total = Math.round(quantity * Number(booking.unitPrice) * 100) / 100;
  return { quantity, total: booking.status === "ACTIVE" ? total : Number(booking.total) };
}

export const rwf = (amount: number | string) =>
  `${Math.round(Number(amount)).toLocaleString()} RWF`;

// "1:05" for a running timer, "2 d 3 h" when long.
export function elapsed(from: string | Date, now = new Date()) {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(from).getTime()) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days} d ${hours} h`;
  return `${hours}:${String(mins).padStart(2, "0")}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const timeOf = (value: string | Date) => {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const dateKey = (value: string | Date) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const sameDay = (a: string | Date, b: string | Date) => dateKey(a) === dateKey(b);
