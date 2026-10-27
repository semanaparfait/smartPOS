// Real-scale 3D furniture built from shared primitives (metres, y up).
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
// Loads the <mesh>/<group> JSX types.
import type {} from "@react-three/fiber";
import { CATALOG } from "../catalog";
import { PX_PER_M, type Item } from "../types";

export const WALL_HEIGHT = 1.35; // cut-away height so rooms stay visible

/* ---------- shared geometry + materials ---------- */

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 28),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 12),
  sphere: new THREE.IcosahedronGeometry(1, 2),
};

const matCache = new Map<string, THREE.Material>();
export function mat(color: string, opts: { rough?: number; metal?: number; opacity?: number; emissive?: string; emissiveIntensity?: number } = {}) {
  const key = `${color}|${opts.rough ?? 0.7}|${opts.metal ?? 0}|${opts.opacity ?? 1}|${opts.emissive ?? ""}|${opts.emissiveIntensity ?? 0}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.7,
      metalness: opts.metal ?? 0,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      ...(opts.emissive ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: opts.emissiveIntensity ?? 0 } : {}),
    });
    matCache.set(key, m);
  }
  return m;
}

export const M = {
  wood: () => mat("#9A6B43", { rough: 0.55 }),
  woodLight: () => mat("#C9A57C", { rough: 0.55 }),
  woodDark: () => mat("#5B3D28", { rough: 0.5 }),
  tableTop: () => mat("#F4F1EA", { rough: 0.35 }),
  fabric: () => mat("#3A4560", { rough: 0.95 }),
  fabricLight: () => mat("#6D7A99", { rough: 0.95 }),
  leather: () => mat("#2B2F3A", { rough: 0.5 }),
  steel: () => mat("#C8CDD3", { rough: 0.28, metal: 0.85 }),
  chrome: () => mat("#E2E5E8", { rough: 0.18, metal: 1 }),
  black: () => mat("#1E2129", { rough: 0.45 }),
  white: () => mat("#F7F7F4", { rough: 0.4 }),
  ceramic: () => mat("#FFFFFF", { rough: 0.15 }),
  stone: () => mat("#E7E3DA", { rough: 0.3 }),
  glass: () => mat("#BFE3F5", { rough: 0.05, metal: 0.1, opacity: 0.35 }),
  plant: () => mat("#4F8A3A", { rough: 0.85 }),
  plantDark: () => mat("#3B6E2B", { rough: 0.85 }),
  terracotta: () => mat("#B5643C", { rough: 0.8 }),
  lime: () => mat("#D0E66B", { rough: 0.5, emissive: "#D0E66B", emissiveIntensity: 0.35 }),
  exit: () => mat("#16A34A", { rough: 0.4, emissive: "#16A34A", emissiveIntensity: 0.6 }),
  ink: () => mat("#20283B", { rough: 0.5 }),
  linen: () => mat("#FFFFFF", { rough: 0.9 }),
  duvet: () => mat("#C9CFDF", { rough: 0.95 }),
  water: () => mat("#4FB3E0", { rough: 0.05, metal: 0.2, opacity: 0.8 }),
};

type V3 = [number, number, number];

// Box from its base-centre position (y = bottom), size in metres.
export function B({ p, s, m, r = 0 }: { p: V3; s: V3; m: THREE.Material; r?: number }) {
  return (
    <mesh geometry={GEO.box} material={m} position={[p[0], p[1] + s[1] / 2, p[2]]} scale={s} rotation={[0, r, 0]} castShadow receiveShadow />
  );
}

// Cylinder from its base-centre position, radius rx/rz (elliptic allowed), height h.
export function Cy({ p, r, h, m, rz, low }: { p: V3; r: number; h: number; m: THREE.Material; rz?: number; low?: boolean }) {
  return (
    <mesh
      geometry={low ? GEO.cylLow : GEO.cyl}
      material={m}
      position={[p[0], p[1] + h / 2, p[2]]}
      scale={[r, h, rz ?? r]}
      castShadow
      receiveShadow
    />
  );
}

function Ball({ p, r, m, sy = 1 }: { p: V3; r: number; m: THREE.Material; sy?: number }) {
  return <mesh geometry={GEO.sphere} material={m} position={p} scale={[r, r * sy, r]} castShadow receiveShadow />;
}

/* ---------- pieces ---------- */

// Chair whose back faces away from (dx, dz) direction origin, i.e. it faces the table.
function Chair({ x, z, dx, dz, fabric }: { x: number; z: number; dx: number; dz: number; fabric?: boolean }) {
  const yaw = Math.atan2(dx, dz);
  const seat = fabric ? M.fabric() : M.woodLight();
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      {[
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ].map(([lx, lz], i) => (
        <Cy key={i} p={[lx, 0, lz]} r={0.018} h={0.44} m={M.woodDark()} low />
      ))}
      <B p={[0, 0.44, 0]} s={[0.42, 0.05, 0.42]} m={seat} />
      <B p={[0, 0.49, 0.19]} s={[0.42, 0.42, 0.04]} m={seat} />
    </group>
  );
}

function Stool({ x, z, h = 0.75 }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <Cy p={[0, 0, 0]} r={0.16} h={0.02} m={M.chrome()} />
      <Cy p={[0, 0, 0]} r={0.025} h={h} m={M.chrome()} />
      <Cy p={[0, h, 0]} r={0.18} h={0.06} m={M.leather()} />
    </group>
  );
}

function Products({ length, depth, levels, height, seed }: { length: number; depth: number; levels: number; height: number; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const per = Math.max(1, Math.floor(length / 0.16));
  const count = per * levels * 2;
  const colors = ["#E63946", "#F4A261", "#2A9D8F", "#E9C46A", "#457B9D", "#F1FAEE", "#8D99AE", "#FFB703"];
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let s = seed;
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let i = 0;
    for (let side = 0; side < 2; side++)
      for (let lv = 0; lv < levels; lv++)
        for (let k = 0; k < per; k++) {
          const h = 0.12 + r() * 0.14;
          const x = -length / 2 + 0.08 + k * 0.16;
          const y = 0.12 + (lv * (height - 0.2)) / levels + h / 2;
          const z = (side ? 1 : -1) * (depth / 2 - 0.07);
          m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(0.12, h, 0.12));
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, c.set(colors[Math.floor(r() * colors.length)]));
          i++;
        }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [length, depth, levels, height, seed, per]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.6 }), []);
  return <instancedMesh ref={ref} args={[GEO.box, material, count]} castShadow />;
}

/* ---------- item models ---------- */

const m = (u: number) => u / PX_PER_M;

export function ItemModel({ item }: { item: Item }) {
  const W = m(item.w);
  const D = m(item.h);
  const seats = item.seats ?? CATALOG[item.type].seats ?? 0;
  const seed = item.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);

  switch (item.type) {
    case "table-round": {
      const R = Math.max(0.25, Math.min(W, D) / 2 - 0.33);
      return (
        <group>
          {Array.from({ length: seats }).map((_, i) => {
            const a = (i / seats) * Math.PI * 2 - Math.PI / 2;
            const dx = Math.cos(a);
            const dz = Math.sin(a);
            return <Chair key={i} x={dx * (R + 0.18)} z={dz * (R + 0.18)} dx={dx} dz={dz} />;
          })}
          <Cy p={[0, 0, 0]} r={0.24} h={0.03} m={M.black()} />
          <Cy p={[0, 0, 0]} r={0.05} h={0.72} m={M.black()} />
          <Cy p={[0, 0.72, 0]} r={R} h={0.04} m={M.tableTop()} />
        </group>
      );
    }
    case "table-square":
    case "table-rect": {
      const inset = 0.33;
      const tw = item.type === "table-square" ? W - inset * 2 : W - 0.1;
      const td = D - inset * 2;
      const chairs: { x: number; z: number; dx: number; dz: number }[] = [];
      if (item.type === "table-square") {
        [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ]
          .slice(0, Math.min(4, seats))
          .forEach(([dx, dz]) => chairs.push({ x: dx * (tw / 2 + 0.15), z: dz * (td / 2 + 0.15), dx, dz }));
      } else {
        const top = Math.ceil(seats / 2);
        const bottom = seats - top;
        for (let i = 0; i < top; i++) chairs.push({ x: -W / 2 + (W / (top + 1)) * (i + 1), z: -td / 2 - 0.15, dx: 0, dz: -1 });
        for (let i = 0; i < bottom; i++) chairs.push({ x: -W / 2 + (W / (bottom + 1)) * (i + 1), z: td / 2 + 0.15, dx: 0, dz: 1 });
      }
      const legX = tw / 2 - 0.05;
      const legZ = td / 2 - 0.05;
      return (
        <group>
          {chairs.map((c, i) => (
            <Chair key={i} {...c} />
          ))}
          {[
            [-legX, -legZ],
            [legX, -legZ],
            [-legX, legZ],
            [legX, legZ],
          ].map(([x, z], i) => (
            <B key={i} p={[x, 0, z]} s={[0.05, 0.72, 0.05]} m={M.woodDark()} />
          ))}
          <B p={[0, 0.72, 0]} s={[tw, 0.04, td]} m={M.wood()} />
        </group>
      );
    }
    case "high-table":
      return (
        <group>
          <Stool x={0} z={-D / 2 + 0.15} />
          <Stool x={0} z={D / 2 - 0.15} />
          <Cy p={[0, 0, 0]} r={0.22} h={0.03} m={M.black()} />
          <Cy p={[0, 0, 0]} r={0.04} h={1.04} m={M.black()} />
          <Cy p={[0, 1.04, 0]} r={Math.max(0.25, Math.min(W, D) / 2 - 0.25)} h={0.04} m={M.wood()} />
        </group>
      );
    case "booth": {
      const t = 0.14;
      return (
        <group>
          <B p={[0, 0, -D / 2 + t / 2]} s={[W, 1.1, t]} m={M.fabric()} />
          <B p={[-W / 2 + t / 2, 0, 0]} s={[t, 1.1, D]} m={M.fabric()} />
          <B p={[W / 2 - t / 2, 0, 0]} s={[t, 1.1, D]} m={M.fabric()} />
          <B p={[0, 0, -D / 2 + t + 0.22]} s={[W - 2 * t, 0.45, 0.44]} m={M.fabricLight()} />
          <B p={[-W / 2 + t + 0.22, 0, 0.1]} s={[0.44, 0.45, D - 0.5]} m={M.fabricLight()} />
          <B p={[W / 2 - t - 0.22, 0, 0.1]} s={[0.44, 0.45, D - 0.5]} m={M.fabricLight()} />
          <Cy p={[0, 0, 0.15]} r={0.05} h={0.72} m={M.black()} />
          <B p={[0, 0.72, 0.15]} s={[W - 1.2, 0.04, D - 0.9]} m={M.wood()} />
        </group>
      );
    }
    case "sofa":
    case "armchair": {
      const arm = item.type === "sofa" ? 0.18 : 0.14;
      return (
        <group>
          <B p={[0, 0.05, 0.05]} s={[W, 0.35, D - 0.1]} m={M.fabric()} />
          <B p={[0, 0.05, -D / 2 + 0.12]} s={[W, 0.75, 0.24]} m={M.fabric()} />
          <B p={[-W / 2 + arm / 2, 0.05, 0.05]} s={[arm, 0.6, D - 0.1]} m={M.fabric()} />
          <B p={[W / 2 - arm / 2, 0.05, 0.05]} s={[arm, 0.6, D - 0.1]} m={M.fabric()} />
          <B p={[0, 0.4, 0.1]} s={[W - arm * 2 - 0.04, 0.12, D - 0.35]} m={M.fabricLight()} />
          <B p={[0, 0, 0]} s={[W - 0.1, 0.05, D - 0.15]} m={M.woodDark()} />
        </group>
      );
    }
    case "bar-stool":
      return <Stool x={0} z={0} />;

    case "bar-counter": {
      const backD = D * 0.2;
      const counterD = D * 0.38;
      const counterZ = -D / 2 + backD + 0.25 + counterD / 2;
      const stools = Math.max(2, Math.floor(W / 0.75));
      const bottles = Math.floor(W / 0.12);
      return (
        <group>
          {/* back bar shelving with bottles */}
          <B p={[0, 0, -D / 2 + backD / 2]} s={[W, 1.25, backD]} m={M.woodDark()} />
          {Array.from({ length: bottles }).map((_, i) => (
            <Cy
              key={i}
              p={[-W / 2 + 0.08 + i * 0.12, 1.25, -D / 2 + backD / 2]}
              r={0.035}
              h={0.24 + ((i * 7) % 5) * 0.02}
              m={mat(["#2F6B3A", "#7A2E2E", "#C9A227", "#3E5C8A", "#E8E2D0"][(i + seed) % 5], { rough: 0.15, opacity: 0.85 })}
              low
            />
          ))}
          {/* counter */}
          <B p={[0, 0, counterZ]} s={[W, 1.05, counterD]} m={M.woodDark()} />
          <B p={[0, 1.05, counterZ + 0.04]} s={[W + 0.06, 0.05, counterD + 0.14]} m={M.stone()} />
          {Array.from({ length: stools }).map((_, i) => (
            <Stool key={i} x={-W / 2 + (W / stools) * (i + 0.5)} z={counterZ + counterD / 2 + 0.38} />
          ))}
        </group>
      );
    }
    case "cashier":
      return (
        <group>
          <B p={[0, 0, -D * 0.2]} s={[W, 1.0, D * 0.55]} m={M.woodLight()} />
          <B p={[0, 1.0, -D * 0.2]} s={[W + 0.04, 0.04, D * 0.55 + 0.04]} m={M.stone()} />
          <B p={[0, 1.04, -D * 0.25]} s={[0.36, 0.26, 0.04]} m={M.black()} />
          <B p={[0.3, 1.04, -D * 0.12]} s={[0.25, 0.08, 0.2]} m={M.black()} />
          <Stool x={0} z={D / 2 - 0.2} h={0.65} />
        </group>
      );
    case "checkout":
      return (
        <group>
          <B p={[0, 0, -D * 0.2]} s={[W, 0.86, D * 0.55]} m={M.steel()} />
          <B p={[-W * 0.12, 0.86, -D * 0.2]} s={[W * 0.7, 0.02, D * 0.45]} m={M.black()} />
          <B p={[W * 0.3, 0.86, -D * 0.2]} s={[0.4, 0.18, 0.35]} m={M.ink()} />
          <B p={[W * 0.3, 1.04, -D * 0.28]} s={[0.3, 0.22, 0.03]} m={M.black()} />
          <Stool x={W * 0.25} z={D / 2 - 0.2} h={0.65} />
        </group>
      );
    case "reception":
      return (
        <group>
          <B p={[0, 0, -D * 0.15]} s={[W, 1.1, D * 0.45]} m={M.white()} />
          <B p={[0, 1.1, -D * 0.15]} s={[W + 0.06, 0.05, D * 0.45 + 0.06]} m={M.woodDark()} />
          <B p={[0, 0.1, -D * 0.15 + D * 0.23]} s={[W - 0.2, 0.08, 0.02]} m={M.lime()} />
          <Chair x={-W * 0.2} z={D / 2 - 0.25} dx={0} dz={1} fabric />
          <Chair x={W * 0.2} z={D / 2 - 0.25} dx={0} dz={1} fabric />
        </group>
      );
    case "kitchen-line": {
      const burners = Math.max(2, Math.floor((W * 0.6) / 0.6));
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, 0.9, D]} m={M.steel()} />
          {Array.from({ length: burners }).map((_, i) => (
            <group key={i}>
              <Cy p={[-W / 2 + 0.4 + i * 0.6, 0.9, 0]} r={0.2} h={0.02} m={M.black()} />
              <Cy p={[-W / 2 + 0.4 + i * 0.6, 0.92, 0]} r={0.08} h={0.02} m={M.chrome()} />
            </group>
          ))}
          <B p={[W / 2 - 0.55, 0.85, 0]} s={[0.7, 0.06, D - 0.2]} m={M.chrome()} />
        </group>
      );
    }
    case "fridge":
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, 1.9, D]} m={M.steel()} />
          <B p={[0, 0.9, D / 2]} s={[0.04, 0.6, 0.04]} m={M.black()} />
        </group>
      );
    case "dj-booth":
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, 1.05, D]} m={M.black()} />
          <Cy p={[-W * 0.22, 1.05, 0]} r={Math.min(W, D) * 0.22} h={0.03} m={M.ink()} />
          <Cy p={[W * 0.22, 1.05, 0]} r={Math.min(W, D) * 0.22} h={0.03} m={M.ink()} />
          <B p={[0, 0.1, D / 2]} s={[W - 0.1, 0.06, 0.02]} m={M.lime()} />
        </group>
      );
    case "stage":
      return <B p={[0, 0, 0]} s={[W, 0.45, D]} m={M.woodDark()} />;
    case "dance-floor": {
      const n = Math.max(2, Math.round(W / 0.5));
      const k = Math.max(2, Math.round(D / 0.5));
      const glow = ["#D0E66B", "#2563EB", "#E879F9", "#3A4560"];
      return (
        <group>
          {Array.from({ length: n * k }).map((_, i) => {
            const cx = i % n;
            const cz = Math.floor(i / n);
            const c = (cx + cz * 3 + seed) % 7 === 0 ? glow[(cx + cz) % 3] : (cx + cz) % 2 ? "#20283B" : "#2E3850";
            return (
              <mesh
                key={i}
                geometry={GEO.box}
                material={mat(c, { rough: 0.2, metal: 0.3, emissive: c, emissiveIntensity: c.startsWith("#2") ? 0 : 0.7 })}
                position={[-W / 2 + (W / n) * (cx + 0.5), 0.01, -D / 2 + (D / k) * (cz + 0.5)]}
                scale={[W / n - 0.02, 0.02, D / k - 0.02]}
                receiveShadow
              />
            );
          })}
        </group>
      );
    }

    case "shelf":
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, 1.6, D]} m={M.white()} />
          <Products length={W - 0.1} depth={D * 2.2} levels={4} height={1.5} seed={seed} />
        </group>
      );
    case "gondola":
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, 1.45, D * 0.25]} m={M.white()} />
          {[0.1, 0.5, 0.9].map((y) => (
            <B key={y} p={[0, y, 0]} s={[W, 0.02, D]} m={M.white()} />
          ))}
          <Products length={W - 0.1} depth={D} levels={3} height={1.3} seed={seed} />
        </group>
      );
    case "fridge-row":
      return (
        <group>
          <B p={[0, 0, -D * 0.1]} s={[W, 1.95, D * 0.8]} m={M.steel()} />
          <B p={[0, 0.1, D / 2 - 0.06]} s={[W - 0.06, 1.75, 0.03]} m={M.glass()} />
          <Products length={W - 0.2} depth={D * 0.55} levels={4} height={1.8} seed={seed} />
        </group>
      );
    case "display-table":
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, 0.75, D]} m={M.woodLight()} />
          {[-0.25, 0, 0.25].flatMap((fx) =>
            [-0.2, 0.2].map((fz) => (
              <B key={`${fx}${fz}`} p={[fx * W, 0.75, fz * D]} s={[0.22, 0.12 + Math.abs(fx) * 0.2, 0.18]} m={mat(["#E63946", "#2A9D8F", "#E9C46A"][Math.round((fx + fz) * 10 + 9) % 3])} />
            )),
          )}
        </group>
      );

    case "bed-single":
    case "bed-double": {
      const double = item.type === "bed-double";
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, 0.3, D]} m={M.woodDark()} />
          <B p={[0, 0, -D / 2 + 0.04]} s={[W, 1.0, 0.08]} m={M.woodDark()} />
          <B p={[0, 0.3, 0.02]} s={[W - 0.06, 0.2, D - 0.1]} m={M.linen()} />
          <B p={[0, 0.5, D * 0.12]} s={[W - 0.02, 0.06, D * 0.68]} m={M.duvet()} />
          {(double ? [-W / 4, W / 4] : [0]).map((x) => (
            <B key={x} p={[x, 0.5, -D / 2 + 0.3]} s={[double ? W / 2 - 0.12 : W - 0.16, 0.12, 0.32]} m={M.linen()} />
          ))}
        </group>
      );
    }
    case "desk":
      return (
        <group>
          <B p={[-W / 2 + 0.04, 0, -D * 0.2]} s={[0.04, 0.74, D * 0.55]} m={M.woodDark()} />
          <B p={[W / 2 - 0.04, 0, -D * 0.2]} s={[0.04, 0.74, D * 0.55]} m={M.woodDark()} />
          <B p={[0, 0.74, -D * 0.2]} s={[W, 0.04, D * 0.6]} m={M.wood()} />
          <Chair x={0} z={D / 2 - 0.25} dx={0} dz={1} fabric />
        </group>
      );
    case "pool":
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, 0.06, D]} m={M.white()} />
          <B p={[0, 0.06, 0]} s={[W - 0.3, 0.005, D - 0.3]} m={M.water()} />
        </group>
      );
    case "sunbed":
      return (
        <group>
          <B p={[0, 0.2, 0.15]} s={[W, 0.08, D - 0.3]} m={M.white()} />
          <mesh geometry={GEO.box} material={M.white()} position={[0, 0.45, -D / 2 + 0.25]} scale={[W, 0.08, 0.6]} rotation={[-0.7, 0, 0]} castShadow />
          <B p={[0, 0, 0]} s={[W - 0.1, 0.2, 0.06]} m={M.chrome()} />
        </group>
      );

    case "restroom":
      return (
        <group>
          <Cy p={[0, 0, 0]} r={0.03} h={1.6} m={M.ink()} />
          <B p={[0, 1.6, 0]} s={[0.5, 0.35, 0.05]} m={mat("#2563EB", { emissive: "#2563EB", emissiveIntensity: 0.25 })} />
        </group>
      );
    case "wc":
      return (
        <group>
          <B p={[0, 0, -D / 2 + 0.1]} s={[W * 0.8, 0.8, 0.18]} m={M.ceramic()} />
          <Cy p={[0, 0, 0.08]} r={W * 0.38} rz={D * 0.38} h={0.42} m={M.ceramic()} />
        </group>
      );
    case "sink":
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, 0.85, D]} m={M.woodLight()} />
          <Cy p={[0, 0.85, 0.02]} r={W * 0.3} rz={D * 0.3} h={0.03} m={M.ceramic()} />
          <Cy p={[0, 0.85, -D / 2 + 0.06]} r={0.02} h={0.25} m={M.chrome()} />
        </group>
      );

    case "door":
      return <B p={[-W / 2 + 0.02, 0, 0]} s={[0.04, 1.2, D]} m={M.woodLight()} />;
    case "door-double":
      return (
        <group>
          <B p={[-W / 2 + 0.02, 0, -D / 2 + W / 4]} s={[0.04, 1.2, W / 2]} m={M.glass()} />
          <B p={[W / 2 - 0.02, 0, -D / 2 + W / 4]} s={[0.04, 1.2, W / 2]} m={M.glass()} />
        </group>
      );
    case "stairs": {
      const steps = Math.max(5, Math.round(D / 0.28));
      const rise = WALL_HEIGHT / steps;
      return (
        <group>
          {Array.from({ length: steps }).map((_, i) => (
            <B key={i} p={[0, 0, D / 2 - (D / steps) * (i + 0.5)]} s={[W, rise * (i + 1), D / steps]} m={i % 2 ? M.stone() : M.white()} />
          ))}
          <B p={[-W / 2, rise * steps, 0]} s={[0.04, 0.04, D]} m={M.chrome()} />
        </group>
      );
    }
    case "elevator":
      return (
        <group>
          <B p={[0, 0, 0]} s={[W, WALL_HEIGHT, D]} m={M.steel()} />
          <B p={[0, 0, D / 2]} s={[W * 0.7, WALL_HEIGHT - 0.1, 0.02]} m={M.chrome()} />
          <B p={[0, 0, D / 2 + 0.01]} s={[0.01, WALL_HEIGHT - 0.1, 0.02]} m={M.black()} />
        </group>
      );
    case "pillar":
      return <B p={[0, 0, 0]} s={[W, WALL_HEIGHT + 0.2, D]} m={M.stone()} />;
    case "plant": {
      const r = Math.min(W, D) / 2;
      return (
        <group>
          <Cy p={[0, 0, 0]} r={r * 0.55} h={0.4} m={M.terracotta()} />
          <Ball p={[0, 0.75, 0]} r={r * 0.95} m={M.plant()} sy={1.1} />
          <Ball p={[r * 0.35, 1.0, r * 0.2]} r={r * 0.6} m={M.plantDark()} />
          <Ball p={[-r * 0.3, 0.95, -r * 0.25]} r={r * 0.55} m={M.plant()} />
        </group>
      );
    }
    case "entrance":
      return <B p={[0, 0, 0]} s={[W * 0.9, 0.015, D * 0.8]} m={mat("#2B2F3A", { rough: 1 })} />;
    case "exit":
      return (
        <group>
          <Cy p={[0, 0, 0]} r={0.03} h={1.7} m={M.ink()} />
          <B p={[0, 1.7, 0]} s={[W * 0.9, 0.25, 0.05]} m={M.exit()} />
        </group>
      );
    case "info":
      return (
        <group>
          <B p={[0, 0, 0]} s={[0.4, 1.2, 0.3]} m={M.ink()} />
          <B p={[0, 1.2, 0.05]} s={[0.5, 0.35, 0.05]} m={M.lime()} />
        </group>
      );
    default:
      return null; // labels and "you are here" are drawn by the scene
  }
}
