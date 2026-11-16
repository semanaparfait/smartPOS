import { API_URL } from "@/config/api";
import { getAuthToken } from "@/utils/authToken";
import { create } from "zustand";

// A place that makes part of an order, with its own kitchen screen: Kitchen,
// Bar, Grill. Without stations everything goes to one kitchen, as before.
export interface Station {
  id: string;
  name: string;
  sortOrder: number;
}

interface StationStore {
  stations: Station[];
  loaded: boolean;
  load: () => Promise<Station[]>;
  // Throw the server's own message.
  save: (id: string | null, name: string) => Promise<Station>;
  remove: (id: string) => Promise<void>;
  // Which station makes a category's kitchen items (null = the first station).
  setCategoryStation: (categoryId: string, stationId: string | null) => Promise<void>;
  // A cook's station (null = any station).
  setEmployeeStation: (employeeId: string, stationId: string | null) => Promise<void>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new Error("User not authenticated");
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(message || "Something went wrong");
  }
  return data as T;
}

const sorted = (list: Station[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder);

const useStations = create<StationStore>((set, get) => ({
  stations: [],
  loaded: false,

  load: async () => {
    const stations = sorted(await request<Station[]>("/stations"));
    set({ stations, loaded: true });
    return stations;
  },

  save: async (id, name) => {
    const station = await request<Station>(id ? `/stations/${id}` : "/stations", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({ name: name.trim() }),
    });
    set((state) => ({
      stations: sorted([...state.stations.filter((s) => s.id !== station.id), station]),
    }));
    return station;
  },

  remove: async (id) => {
    await request(`/stations/${id}`, { method: "DELETE" });
    set((state) => ({ stations: state.stations.filter((s) => s.id !== id) }));
  },

  // Categories are saved as form data (they can carry a picture).
  setCategoryStation: async (categoryId, stationId) => {
    const form = new FormData();
    form.append("stationId", stationId ?? "");
    await request(`/categories/${categoryId}`, { method: "PATCH", body: form });
  },

  setEmployeeStation: async (employeeId, stationId) => {
    await request(`/employees/${employeeId}`, { method: "PATCH", body: JSON.stringify({ stationId }) });
  },
}));

// The first station gets kitchen items whose category has none.
export const defaultStation = () => useStations.getState().stations[0] ?? null;

export const stationName = (id?: string | null) =>
  (id && useStations.getState().stations.find((s) => s.id === id)?.name) || null;

export default useStations;
