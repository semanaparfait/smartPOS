// Realistic 3D venue: perspective camera, sunlight + shadows, textured floors,
// real-scale furniture, status rings, "You are here" pin and walking route.
import { useFrame, useThree } from "@react-three/fiber";
import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, Text, View } from "react-native";
import * as THREE from "three";
import { CATALOG, isTable, showsLabel } from "../catalog";
import { PX_PER_M, type Floor, type Item, type Point } from "../types";
import { Canvas } from "./canvas";
import { B, Cy, ItemModel, M, mat, WALL_HEIGHT } from "./models";
import { floorTexture } from "./textures";

const m = (u: number) => u / PX_PER_M;
const TORUS = new THREE.TorusGeometry(1, 0.035, 8, 48);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const PLANE = new THREE.PlaneGeometry(1, 1);
const SPHERE = new THREE.SphereGeometry(1, 24, 16);

export type Venue3DProps = {
  floor: Floor;
  width: number;
  height: number;
  view: number; // quarter turns
  zoom: number;
  focusPoint: Point | null;
  tagColors: Record<string, { bg: string; fg: string }>;
  selectedId: string | null;
  focusIds: Set<string> | null;
  here: Point | null;
  route: Point[] | null;
  picking: boolean;
  onTapPoint: (p: Point) => void;
  onSelectItem: (item: Item) => void;
  onFail: () => void;
};

// Web needs a real WebGL context; native uses expo-gl.
export function canUse3D() {
  if (Platform.OS !== "web") return true;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class GLBoundary extends Component<{ onFail: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[Venue3D] falling back:", error);
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* ---------- scene parts ---------- */

function Floors({ floor }: { floor: Floor }) {
  const rooms = useMemo(
    () =>
      floor.rooms.map((room) => {
        const { tex, metres } = floorTexture(room.material);
        const t = tex.clone();
        t.repeat.set(m(room.w) / metres, m(room.h) / metres);
        t.needsUpdate = true;
        return { room, material: new THREE.MeshStandardMaterial({ map: t, roughness: room.material === "marble" || room.material === "tile" ? 0.35 : 0.8 }) };
      }),
    [floor.rooms],
  );
  const W = m(floor.w);
  const D = m(floor.h);
  return (
    <group>
      {/* surroundings */}
      <mesh geometry={PLANE} material={mat("#D9DAD2", { rough: 1 })} rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, -0.16, D / 2]} scale={[W * 4, D * 4, 1]} receiveShadow />
      {/* building slab */}
      <mesh geometry={BOX} material={mat("#CFCFC7", { rough: 1 })} position={[W / 2, -0.08, D / 2]} scale={[W, 0.16, D]} receiveShadow />
      <mesh geometry={PLANE} material={mat("#E4E4DE", { rough: 0.9 })} rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, 0.001, D / 2]} scale={[W, D, 1]} receiveShadow />
      {rooms.map(({ room, material }) => (
        <mesh
          key={room.id}
          geometry={PLANE}
          material={material}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[m(room.x + room.w / 2), 0.004, m(room.y + room.h / 2)]}
          scale={[m(room.w), m(room.h), 1]}
          receiveShadow
        />
      ))}
    </group>
  );
}

function Walls({ floor }: { floor: Floor }) {
  const plaster = mat("#EEEDE6", { rough: 0.92 });
  const cap = mat("#2A3245", { rough: 0.6 });
  return (
    <group>
      {floor.walls.map((w) => {
        const dx = m(w.end.x - w.start.x);
        const dz = m(w.end.y - w.start.y);
        const L = Math.hypot(dx, dz);
        if (L < 0.02) return null;
        const t = Math.max(0.06, m(w.thickness));
        const cx = m((w.start.x + w.end.x) / 2);
        const cz = m((w.start.y + w.end.y) / 2);
        const yaw = Math.atan2(dx, dz);
        const len = L + (w.kind === "wall" ? t : 0); // overlap corners
        const seg = (y0: number, h: number, material: THREE.Material, thick = t, key = "") => (
          <mesh key={key} geometry={BOX} material={material} position={[cx, y0 + h / 2, cz]} rotation={[0, yaw, 0]} scale={[thick, h, len]} castShadow receiveShadow />
        );
        if (w.kind === "window")
          return (
            <group key={w.id}>
              {seg(0, 0.5, plaster, t, "sill")}
              {seg(0.5, WALL_HEIGHT - 0.55, M.glass(), t * 0.3, "glass")}
              {seg(WALL_HEIGHT - 0.05, 0.05, cap, t, "top")}
              {seg(0.5, 0.03, cap, t + 0.02, "ledge")}
            </group>
          );
        if (w.kind === "glass")
          return (
            <group key={w.id}>
              {seg(0, WALL_HEIGHT, M.glass(), Math.max(0.03, t * 0.3), "glass")}
              {seg(WALL_HEIGHT - 0.04, 0.04, M.chrome(), 0.05, "frame")}
            </group>
          );
        if (w.kind === "railing") {
          const posts = Math.max(2, Math.round(L / 1));
          return (
            <group key={w.id}>
              {seg(0.95, 0.05, M.chrome(), 0.05, "rail")}
              {Array.from({ length: posts + 1 }).map((_, i) => (
                <Cy key={i} p={[m(w.start.x) + (dx * i) / posts, 0, m(w.start.y) + (dz * i) / posts]} r={0.025} h={0.95} m={M.chrome()} low />
              ))}
            </group>
          );
        }
        return (
          <group key={w.id}>
            {seg(0, WALL_HEIGHT, plaster)}
            {seg(WALL_HEIGHT, 0.03, cap, t + 0.01, "cap")}
            {seg(0, 0.08, mat("#D8D6CC"), t + 0.015, "skirting")}
          </group>
        );
      })}
    </group>
  );
}

function Furniture({ floor }: { floor: Floor }) {
  return (
    <group>
      {floor.items.map((item) => (
        <group
          key={item.id}
          position={[m(item.x + item.w / 2), 0, m(item.y + item.h / 2)]}
          rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
        >
          <ItemModel item={item} />
        </group>
      ))}
    </group>
  );
}

function Ring({ x, z, r, color, pulse, y = 0.02 }: { x: number; z: number; r: number; color: string; pulse?: boolean; y?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, transparent: true }), [color]);
  useFrame(({ clock }) => {
    if (!pulse || !ref.current) return;
    const t = (clock.getElapsedTime() % 1.4) / 1.4;
    const s = r * (1 + t * 0.8);
    ref.current.scale.set(s, s, s * 3);
    material.opacity = 1 - t;
  });
  return <mesh ref={ref} geometry={TORUS} material={material} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[r, r, r * 3]} />;
}

function HerePin({ p }: { p: Point }) {
  const x = m(p.x);
  const z = m(p.y);
  const head = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (head.current) head.current.position.y = 1.65 + Math.sin(clock.getElapsedTime() * 3) * 0.06;
  });
  return (
    <group>
      <Cy p={[x, 0, z]} r={0.03} h={1.55} m={M.ink()} />
      <mesh ref={head} geometry={SPHERE} material={M.lime()} position={[x, 1.65, z]} scale={0.16} castShadow />
      <Ring x={x} z={z} r={0.45} color="#BFD655" pulse />
      <Ring x={x} z={z} r={0.25} color="#20283B" />
    </group>
  );
}

function RouteRibbon({ points }: { points: Point[] }) {
  const pts = points.map((p) => new THREE.Vector3(m(p.x), 0.03, m(p.y)));
  const puck = useRef<THREE.Mesh>(null);
  const lengths = pts.slice(1).map((p, i) => p.distanceTo(pts[i]));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  useFrame(({ clock }) => {
    if (!puck.current) return;
    let d = ((clock.getElapsedTime() * 1.4) % total + total) % total;
    for (let i = 0; i < lengths.length; i++) {
      if (d <= lengths[i]) {
        puck.current.position.lerpVectors(pts[i], pts[i + 1], d / lengths[i]).setY(0.12);
        return;
      }
      d -= lengths[i];
    }
  });
  const lime = mat("#C6E03A", { emissive: "#C6E03A", emissiveIntensity: 1.1, rough: 0.4 });
  const edge = mat("#20283B", { rough: 0.6 });
  return (
    <group>
      {pts.slice(1).map((b, i) => {
        const a = pts[i];
        const L = a.distanceTo(b);
        const yaw = Math.atan2(b.x - a.x, b.z - a.z);
        const mid: [number, number, number] = [(a.x + b.x) / 2, 0.02, (a.z + b.z) / 2];
        return (
          <group key={i}>
            <mesh geometry={BOX} material={edge} position={mid} rotation={[0, yaw, 0]} scale={[0.5, 0.03, L + 0.5]} />
            <mesh geometry={BOX} material={lime} position={[mid[0], 0.045, mid[2]]} rotation={[0, yaw, 0]} scale={[0.3, 0.03, L + 0.3]} />
          </group>
        );
      })}
      <mesh ref={puck} geometry={SPHERE} material={lime} scale={0.18} position={pts[0]} castShadow />
      <Ring x={pts[pts.length - 1].x} z={pts[pts.length - 1].z} r={0.4} color="#D0E66B" pulse />
    </group>
  );
}

type Anchor = { id: string; x: number; y: number; z: number };
type LabelPos = { id: string; x: number; y: number; on: boolean };

// Projects 3D anchors to screen positions for the HTML-free label overlay.
function LabelTracker({ anchors, sink }: { anchors: Anchor[]; sink: React.MutableRefObject<((l: LabelPos[]) => void) | null> }) {
  const { camera, size } = useThree();
  const last = useRef(0);
  const prev = useRef("");
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    // Wait until the label layer is listening, otherwise the first update is lost.
    if (!sink.current || now - last.current < 0.06) return;
    last.current = now;
    const out = anchors.map((a) => {
      v.set(a.x, a.y, a.z).project(camera);
      return { id: a.id, x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, on: v.z < 1 };
    });
    const key = out.map((o) => `${o.x | 0},${o.y | 0}`).join("|");
    if (key !== prev.current) {
      prev.current = key;
      sink.current?.(out);
    }
  });
  return null;
}

type Rig = { az: number; el: number; pinch: number };

function CameraRig({ rig, fit, zoom, view, target, camRef }: { rig: React.MutableRefObject<Rig>; fit: number; zoom: number; view: number; target: THREE.Vector3; camRef: React.MutableRefObject<THREE.Camera | null> }) {
  const { camera } = useThree();
  const cur = useRef({ az: rig.current.az + (view * Math.PI) / 2, el: rig.current.el, dist: fit / zoom, tx: target.x, tz: target.z });
  useEffect(() => {
    camRef.current = camera;
  }, [camera]);
  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.0015, dt); // smooth, frame-rate independent
    const want = { az: rig.current.az + (view * Math.PI) / 2, el: rig.current.el, dist: fit / (zoom * rig.current.pinch) };
    const c = cur.current;
    c.az += (want.az - c.az) * k;
    c.el += (want.el - c.el) * k;
    c.dist += (want.dist - c.dist) * k;
    c.tx += (target.x - c.tx) * k;
    c.tz += (target.z - c.tz) * k;
    camera.position.set(c.tx + Math.sin(c.az) * Math.cos(c.el) * c.dist, Math.sin(c.el) * c.dist, c.tz + Math.cos(c.az) * Math.cos(c.el) * c.dist);
    camera.lookAt(c.tx, 0, c.tz);
  });
  return null;
}

const Scene = React.memo(function Scene({ floor, tagColors, selectedId, focusIds, here, route }: Pick<Venue3DProps, "floor" | "tagColors" | "selectedId" | "focusIds" | "here" | "route">) {
  const W = m(floor.w);
  const D = m(floor.h);
  const half = Math.max(W, D) / 2 + 3;
  const sun = useMemo(() => {
    const l = new THREE.DirectionalLight("#FFF6E8", 2.4);
    l.position.set(W / 2 - 10, 22, D / 2 + 8);
    l.target.position.set(W / 2, 0, D / 2);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.camera.left = -half;
    l.shadow.camera.right = half;
    l.shadow.camera.top = half;
    l.shadow.camera.bottom = -half;
    l.shadow.camera.near = 1;
    l.shadow.camera.far = 80;
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    return l;
  }, [W, D, half]);
  return (
    <>
      <color attach="background" args={["#EEEFE8"]} />
      <fog attach="fog" args={["#EEEFE8", Math.max(W, D) * 1.6, Math.max(W, D) * 3.2]} />
      <hemisphereLight args={["#FFFFFF", "#BDB8AA", 0.75]} />
      <ambientLight intensity={0.2} />
      <primitive object={sun} />
      <primitive object={sun.target} />
      <Floors floor={floor} />
      <Walls floor={floor} />
      <Furniture floor={floor} />
      {floor.items
        .filter((i) => isTable(i.type) && tagColors[i.id])
        .map((i) => (
          <Ring key={`st-${i.id}`} x={m(i.x + i.w / 2)} z={m(i.y + i.h / 2)} r={Math.max(m(i.w), m(i.h)) / 2 + 0.05} color={tagColors[i.id].bg} />
        ))}
      {floor.items
        .filter((i) => i.id === selectedId || focusIds?.has(i.id))
        .map((i) => (
          <Ring key={`sel-${i.id}`} x={m(i.x + i.w / 2)} z={m(i.y + i.h / 2)} r={Math.max(m(i.w), m(i.h)) / 2 + 0.2} color={i.id === selectedId ? "#D0E66B" : "#20283B"} pulse />
        ))}
      {here && <HerePin p={here} />}
      {route && route.length > 1 && <RouteRibbon points={route} />}
    </>
  );
});

/* ---------- labels overlay ---------- */

function Labels({ floor, sink, tagColors, selectedId, here, onSelectItem, picking }: {
  floor: Floor;
  sink: React.MutableRefObject<((l: LabelPos[]) => void) | null>;
  tagColors: Venue3DProps["tagColors"];
  selectedId: string | null;
  here: Point | null;
  onSelectItem: (item: Item) => void;
  picking: boolean;
}) {
  const [pos, setPos] = useState<LabelPos[]>([]);
  useEffect(() => {
    sink.current = setPos;
    return () => {
      sink.current = null;
    };
  }, []);
  const byId = useMemo(() => new Map(pos.map((p) => [p.id, p])), [pos]);
  const items = floor.items.filter(showsLabel);
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      {floor.rooms.map((r) => {
        const p = byId.get(`room-${r.id}`);
        if (!p?.on || !r.name) return null;
        return (
          <View key={r.id} pointerEvents="none" style={{ position: "absolute", left: p.x - 70, top: p.y - 9, width: 140, alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 1.4, color: "rgba(32,40,59,0.75)", textShadowColor: "rgba(255,255,255,0.9)", textShadowRadius: 4 }}>
              {r.name.toUpperCase()}
            </Text>
          </View>
        );
      })}
      {items.map((i) => {
        const p = byId.get(i.id);
        if (!p?.on) return null;
        const tc = tagColors[i.id];
        const sel = selectedId === i.id;
        const table = isTable(i.type);
        return (
          <Pressable
            key={i.id}
            disabled={picking}
            onPress={() => onSelectItem(i)}
            accessibilityRole="button"
            accessibilityLabel={i.label || CATALOG[i.type].name}
            style={{ position: "absolute", left: p.x - 40, top: p.y - (sel ? 20 : 14), width: 80, alignItems: "center" }}
          >
            <View
              style={{
                paddingHorizontal: sel ? 12 : table ? 8 : 7,
                height: sel ? 30 : table ? 22 : 20,
                borderRadius: 15,
                justifyContent: "center",
                backgroundColor: tc?.bg ?? "#FFFFFF",
                borderWidth: sel ? 2 : 1,
                borderColor: sel ? "#20283B" : "rgba(32,40,59,0.2)",
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              <Text numberOfLines={1} style={{ fontSize: sel ? 14 : table ? 12 : 10, fontWeight: "800", color: tc?.fg ?? "#20283B" }}>
                {i.label}
              </Text>
            </View>
            <View style={{ width: 2, height: 6, backgroundColor: "rgba(32,40,59,0.45)" }} />
          </Pressable>
        );
      })}
      {here &&
        (() => {
          const p = byId.get("here");
          if (!p?.on) return null;
          return (
            <View pointerEvents="none" style={{ position: "absolute", left: p.x - 60, top: p.y - 34, width: 120, alignItems: "center" }}>
              <View style={{ backgroundColor: "#20283B", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: "#D0E66B", fontSize: 12, fontWeight: "800" }}>You are here</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#20283B" }} />
            </View>
          );
        })()}
    </View>
  );
}

/* ---------- main ---------- */

export default function Venue3D(props: Venue3DProps) {
  const { floor, width, height, view, zoom, focusPoint, picking, onTapPoint, onFail } = props;
  const W = m(floor.w);
  const D = m(floor.h);
  const fit = Math.max(W, D) * 1.05 + 4;
  const rig = useRef<Rig>({ az: 0.42, el: 0.92, pinch: 1 });
  const camRef = useRef<THREE.Camera | null>(null);
  const sink = useRef<((l: LabelPos[]) => void) | null>(null);
  const target = useMemo(() => (focusPoint ? new THREE.Vector3(m(focusPoint.x), 0, m(focusPoint.y)) : new THREE.Vector3(W / 2, 0, D / 2)), [focusPoint?.x, focusPoint?.y, W, D]);

  const anchors = useMemo<Anchor[]>(() => {
    const list: Anchor[] = floor.items.filter(showsLabel).map((i) => {
      const top = i.type === "bar-counter" || i.type === "fridge-row" || i.type === "shelf" ? 2.1 : isTable(i.type) ? 1.25 : 1.9;
      return { id: i.id, x: m(i.x + i.w / 2), y: top, z: m(i.y + i.h / 2) };
    });
    // Room names sit near the back wall, where the floor is usually free of furniture.
    floor.rooms.forEach((r) => list.push({ id: `room-${r.id}`, x: m(r.x + r.w / 2), y: 0.05, z: m(r.y) + Math.min(0.8, m(r.h) / 2) }));
    if (props.here) list.push({ id: "here", x: m(props.here.x), y: 1.9, z: m(props.here.y) });
    return list;
  }, [floor, props.here?.x, props.here?.y]);

  // Drag = orbit, pinch = zoom, tap = pick a point on the floor.
  const gesture = useRef({ x: 0, y: 0, moved: 0, pinch0: 0, pinchStart: 1 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          gesture.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, moved: 0, pinch0: 0, pinchStart: rig.current.pinch };
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            const d = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            if (!gesture.current.pinch0) gesture.current.pinch0 = d;
            rig.current.pinch = Math.min(4, Math.max(0.5, gesture.current.pinchStart * (d / gesture.current.pinch0)));
            gesture.current.moved = 99;
            return;
          }
          const dx = e.nativeEvent.pageX - gesture.current.x;
          const dy = e.nativeEvent.pageY - gesture.current.y;
          gesture.current.x = e.nativeEvent.pageX;
          gesture.current.y = e.nativeEvent.pageY;
          gesture.current.moved += Math.abs(dx) + Math.abs(dy);
          rig.current.az -= dx * 0.006;
          rig.current.el = Math.min(1.45, Math.max(0.38, rig.current.el + dy * 0.004));
        },
        onPanResponderRelease: (e) => {
          if (gesture.current.moved > 6 || !camRef.current) return;
          const ray = new THREE.Raycaster();
          ray.setFromCamera(new THREE.Vector2((e.nativeEvent.locationX / width) * 2 - 1, -(e.nativeEvent.locationY / height) * 2 + 1), camRef.current);
          const hit = new THREE.Vector3();
          if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) onTapPoint({ x: hit.x * PX_PER_M, y: hit.z * PX_PER_M });
        },
      }),
    [width, height, onTapPoint],
  );

  return (
    <GLBoundary onFail={onFail}>
      <View style={{ width, height }}>
        <View style={{ width, height }} {...responder.panHandlers}>
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ antialias: true }}
            camera={{ fov: 38, near: 0.1, far: 300, position: [W / 2, fit, D / 2 + fit] }}
            style={{ width, height }}
            onCreated={(state) => {
              state.gl.toneMapping = THREE.ACESFilmicToneMapping;
              state.gl.toneMappingExposure = 1.05;
            }}
          >
            <CameraRig rig={rig} fit={fit} zoom={zoom} view={view} target={target} camRef={camRef} />
            <Scene
              floor={floor}
              tagColors={props.tagColors}
              selectedId={props.selectedId}
              focusIds={props.focusIds}
              here={props.here}
              route={props.route}
            />
            <LabelTracker anchors={anchors} sink={sink} />
          </Canvas>
        </View>
        <Labels
          floor={floor}
          sink={sink}
          tagColors={props.tagColors}
          selectedId={props.selectedId}
          here={props.here}
          onSelectItem={props.onSelectItem}
          picking={picking}
        />
        {picking && <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(208,230,107,0.10)" }} />}
      </View>
    </GLBoundary>
  );
}
