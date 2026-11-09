import { API_URL } from "@/config/api";
import { getAuthToken } from "@/utils/authToken";
import type { Venue } from "@/components/venueMap/types";
import type { OrderType } from "@/store/Order/OrderType";

// The floor map and table states on the server (/venue).

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

export interface TableBooking {
  name: string;
  phone?: string | null;
  at: string;
  guests?: number | null;
  note?: string | null;
}

export interface ServerTable {
  tableId: string;
  status: TableStatus;
  since: string;
  orderId: string | null;
  order: { id: string; status: string; total: number; createdAt: string } | null;
  booking: TableBooking | null;
  servedByName: string | null;
}

export interface ServerLayout {
  layout: Venue | null;
  version: number;
  savedAt: string | null;
  savedByName: string | null;
}

export class VenueError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  if (!API_URL) throw new VenueError("API URL not configured", 0);
  const token = await getAuthToken();
  if (!token) throw new VenueError("Please sign in again", 401);
  const response = await fetch(`${API_URL}/api/v1/venue${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(". ") : data?.message;
    throw new VenueError(message || "Something went wrong", response.status);
  }
  return (data?.data ?? data) as T;
};

export const fetchLayout = () => request<ServerLayout>("");
export const putLayout = (layout: Venue, version?: number) =>
  request<ServerLayout>("", { method: "PUT", body: JSON.stringify({ layout, version }) });

// Fewer of one item on a table's unpaid order (0 removes it). Returns the order.
export async function changeOrderItem(orderId: string, itemId: string, quantity: number) {
  const token = await getAuthToken();
  if (!token) throw new VenueError("Please sign in again", 401);
  const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/items/${itemId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(". ") : data?.message;
    throw new VenueError(message || "Could not change the order", response.status);
  }
  return (data?.data ?? data) as OrderType;
}

export const fetchTables =() => request<ServerTable[]>("/tables");
export const patchTable = (
  tableId: string,
  body: { status?: TableStatus; orderId?: string | null; booking?: TableBooking | null },
) => request<ServerTable>(`/tables/${encodeURIComponent(tableId)}`, { method: "PATCH", body: JSON.stringify(body) });
