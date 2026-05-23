import AsyncStorage from "@react-native-async-storage/async-storage";

export type FloorPlanKind =
  | "table"
  | "bar"
  | "restroom"
  | "kitchen"
  | "singledoor"
  | "doubledoor";

export type FloorPlanItem = {
  id: string;
  kind: FloorPlanKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type FloorPlanPoint = {
  x: number;
  y: number;
};

export type FloorPlanWall = {
  id: string;
  start: FloorPlanPoint;
  end: FloorPlanPoint;
  thickness: number;
};

export type FloorPlanSnapshot = {
  items: FloorPlanItem[];
  walls: FloorPlanWall[];
};

const FLOOR_PLAN_STORAGE_KEY = "smartpos.floorPlan.v1";

export async function loadFloorPlan(): Promise<FloorPlanSnapshot> {
  const rawValue = await AsyncStorage.getItem(FLOOR_PLAN_STORAGE_KEY);

  console.log(
    "[floorPlanStorage] loadFloorPlan rawValue exists:",
    Boolean(rawValue),
  );

  if (!rawValue) {
    console.log("[floorPlanStorage] loadFloorPlan -> empty snapshot");
    return { items: [], walls: [] };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<FloorPlanSnapshot>;

    console.log("[floorPlanStorage] loadFloorPlan parsed counts:", {
      items: Array.isArray(parsed.items) ? parsed.items.length : 0,
      walls: Array.isArray(parsed.walls) ? parsed.walls.length : 0,
    });

    return {
      items: Array.isArray(parsed.items)
        ? (parsed.items as FloorPlanItem[])
        : [],
      walls: Array.isArray(parsed.walls)
        ? (parsed.walls as FloorPlanWall[])
        : [],
    };
  } catch {
    console.log(
      "[floorPlanStorage] loadFloorPlan -> parse failed, returning empty snapshot",
    );
    return { items: [], walls: [] };
  }
}

export async function saveFloorPlan(
  snapshot: FloorPlanSnapshot,
): Promise<void> {
  console.log("[floorPlanStorage] saveFloorPlan counts:", {
    items: snapshot.items.length,
    walls: snapshot.walls.length,
  });

  await AsyncStorage.setItem(FLOOR_PLAN_STORAGE_KEY, JSON.stringify(snapshot));
  console.log("[floorPlanStorage] saveFloorPlan -> stored");
}
