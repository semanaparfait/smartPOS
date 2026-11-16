// Kitchen stations on an order: each station (Kitchen, Bar, Grill) makes its
// own part, and the order is ready when every part is.
import type { OrderItemType, OrderType, StationPartStatus } from "@/store/Order/OrderType";
import type { Station } from "@/store/Station/useStations";

export const hasStations = (order: Pick<OrderType, "stationStatus">) =>
  !!order.stationStatus && Object.keys(order.stationStatus).length > 0;

// The items one station makes on this order. After its part was served and
// more was ordered, only the new items.
export function partItems(order: OrderType, stationId: string): OrderItemType[] {
  const part = order.stationStatus?.[stationId];
  if (!part) return [];
  return (order.items ?? []).filter(
    (item) => item.stationId === stationId && (!part.items || part.items.includes(item.id)),
  );
}

// Where a station's part sits on its kitchen screen. Paid orders with nothing
// left for the kitchen count as served, like before stations.
export function partColumn(order: OrderType, stationId: string): StationPartStatus | null {
  const part = order.stationStatus?.[stationId];
  if (!part) return null;
  if (order.status === "COMPLETED" && !order.kitchenStatus) return "SERVED";
  return part.status;
}

// Who prepared an order: each station's cook ("Eric · Grill"), or the one
// cook of an order without stations. Kept after it is paid, for history.
export function preparers(order: OrderType, stations: Station[]): { name: string; station: string | null }[] {
  if (hasStations(order)) {
    const parts = order.stationStatus!;
    return Object.entries(parts)
      .filter(([, part]) => part.preparedBy?.name)
      .map(([id, part]) => ({
        name: part.preparedBy!.name,
        station: stations.find((s) => s.id === id)?.name ?? null,
      }));
  }
  return order.preparedBy?.name ? [{ name: order.preparedBy.name, station: null }] : [];
}

export const preparedByText = (order: OrderType, stations: Station[]) =>
  preparers(order, stations)
    .map((p) => (p.station ? `${p.name} (${p.station})` : p.name))
    .join(", ");

export interface PartProgress {
  id: string;
  name: string;
  status: StationPartStatus;
  // The cook who started it.
  preparedBy?: string | null;
}

// Each station's part, in the stations' own order: "Bar ✓ · Grill cooking".
export function stationProgress(order: OrderType, stations: Station[]): PartProgress[] {
  if (!hasStations(order)) return [];
  const parts = order.stationStatus!;
  return stations
    .filter((s) => parts[s.id])
    .map((s) => ({
      id: s.id,
      name: s.name,
      status: parts[s.id].status,
      preparedBy: parts[s.id].preparedBy?.name ?? null,
    }));
}
