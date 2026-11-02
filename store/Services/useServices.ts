import { API_URL } from "@/config/api";
import type {
  Booking,
  BookingPaymentMethod,
  NewBooking,
  Service,
  ServiceUnit,
  Takings,
  UnitStatus,
} from "@/store/Services/serviceTypes";
import type { ImageResult } from "@/store/products/productsType";
import { getAuthToken } from "@/utils/authToken";
import { create } from "zustand";

interface ServicesStore {
  services: Service[];
  bookings: Booking[];
  loaded: boolean;
  getServices: () => Promise<void>;
  addService: (form: FormData) => Promise<Service>;
  updateService: (id: string, form: FormData) => Promise<Service>;
  setServiceActive: (id: string, active: boolean) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  addUnit: (serviceId: string, name: string) => Promise<void>;
  renameUnit: (unitId: string, name: string) => Promise<void>;
  setUnitStatus: (unitId: string, status: UnitStatus) => Promise<void>;
  removeUnit: (unitId: string) => Promise<void>;
  // Bookings starting in the range, plus all reserved and in use.
  getBookings: (from: Date, to: Date) => Promise<void>;
  // Everything in use right now, without touching the list on screen.
  getActiveBookings: () => Promise<Booking[]>;
  createBooking: (booking: NewBooking) => Promise<Booking>;
  checkIn: (id: string) => Promise<Booking>;
  checkOut: (
    id: string,
    discount?: number,
    payment?: { method: BookingPaymentMethod; amount: number },
  ) => Promise<Booking>;
  cancelBooking: (id: string, reason: string) => Promise<Booking>;
  refundBooking: (id: string, method: BookingPaymentMethod, amount: number, reason: string) => Promise<Booking>;
  addPayment: (id: string, method: BookingPaymentMethod, amount: number) => Promise<Booking>;
  getTakings: (from: Date, to: Date) => Promise<Takings>;
  searchImages: (query: string) => Promise<ImageResult[]>;
}

// Throws the server's own message, e.g. "Room 101 is being cleaned".
const request = async (path: string, init: RequestInit = {}) => {
  if (!API_URL) throw new Error("API_URL is not configured");
  const token = await getAuthToken();
  if (!token) throw new Error("You are signed out. Please sign in again.");

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error([data?.message].flat().join("\n") || "Something went wrong");
  }
  return data;
};

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

const useServices = create<ServicesStore>((set, get) => {
  const putService = (service: Service) =>
    set((state) => ({
      services: state.services.some((s) => s.id === service.id)
        ? state.services.map((s) => (s.id === service.id ? service : s))
        : [...state.services, service].sort((a, b) => a.name.localeCompare(b.name)),
    }));

  const putUnit = (unit: ServiceUnit) =>
    set((state) => ({
      services: state.services.map((s) => ({
        ...s,
        units: s.units.map((u) => (u.id === unit.id ? { ...u, ...unit } : u)),
      })),
    }));

  // A booking changes its unit too (check-in/out), so the services are refreshed.
  const putBooking = (booking: Booking) => {
    set((state) => ({
      bookings: state.bookings.some((b) => b.id === booking.id)
        ? state.bookings.map((b) => (b.id === booking.id ? booking : b))
        : [...state.bookings, booking],
    }));
    get().getServices().catch(() => {});
    return booking;
  };

  return {
    services: [],
    bookings: [],
    loaded: false,
    getServices: async () => {
      set({ services: await request("/services"), loaded: true });
    },
    addService: async (form) => {
      const service = await request("/services", { method: "POST", body: form });
      putService(service);
      return service;
    },
    updateService: async (id, form) => {
      const service = await request(`/services/${id}`, { method: "PATCH", body: form });
      putService(service);
      return service;
    },
    setServiceActive: async (id, active) => {
      const form = new FormData();
      form.append("active", String(active));
      putService(await request(`/services/${id}`, { method: "PATCH", body: form }));
    },
    deleteService: async (id) => {
      await request(`/services/${id}`, { method: "DELETE" });
      set((state) => ({ services: state.services.filter((s) => s.id !== id) }));
    },
    addUnit: async (serviceId, name) => {
      const unit = await request(`/services/${serviceId}/units`, json("POST", { name }));
      set((state) => ({
        services: state.services.map((s) =>
          s.id === serviceId ? { ...s, units: [...s.units, unit] } : s,
        ),
      }));
    },
    renameUnit: async (unitId, name) => {
      putUnit(await request(`/service-units/${unitId}`, json("PATCH", { name })));
    },
    setUnitStatus: async (unitId, status) => {
      putUnit(await request(`/service-units/${unitId}`, json("PATCH", { status })));
    },
    removeUnit: async (unitId) => {
      await request(`/service-units/${unitId}`, { method: "DELETE" });
      set((state) => ({
        services: state.services.map((s) => ({
          ...s,
          units: s.units.filter((u) => u.id !== unitId),
        })),
      }));
    },
    getBookings: async (from, to) => {
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      set({ bookings: await request(`/bookings?${query}`) });
    },
    getActiveBookings: () => request("/bookings?status=ACTIVE"),
    createBooking: async (booking) => putBooking(await request("/bookings", json("POST", booking))),
    checkIn: async (id) => putBooking(await request(`/bookings/${id}/check-in`, { method: "PATCH" })),
    checkOut: async (id, discount, payment) =>
      putBooking(
        await request(
          `/bookings/${id}/check-out`,
          json("PATCH", { ...(discount ? { discount } : {}), ...(payment ? { payment } : {}) }),
        ),
      ),
    cancelBooking: async (id, reason) =>
      putBooking(await request(`/bookings/${id}/cancel`, json("PATCH", { reason }))),
    refundBooking: async (id, method, amount, reason) =>
      putBooking(await request(`/bookings/${id}/refunds`, json("POST", { method, amount, reason }))),
    addPayment: async (id, method, amount) =>
      putBooking(await request(`/bookings/${id}/payments`, json("POST", { method, amount }))),
    getTakings: (from, to) => {
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      return request(`/bookings/takings?${query}`);
    },
    searchImages: (query) => request(`/services/image-search?q=${encodeURIComponent(query)}`),
  };
});

export default useServices;
