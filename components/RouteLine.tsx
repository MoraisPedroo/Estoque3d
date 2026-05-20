'use client';

import { useMemo } from 'react';
import { QuadraticBezierLine } from '@react-three/drei';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { rackHeightOf } from '@/lib/data';

export function RouteLine() {
  const searchSelectedBoxId = useWarehouseStore((s) => s.searchSelectedBoxId);
  const boxes = useWarehouseStore((s) => s.boxes);
  const shelves = useWarehouseStore((s) => s.shelves);
  const doors = useWarehouseStore((s) => s.doors);

  const route = useMemo(() => {
    if (!searchSelectedBoxId) return null;
    const box = boxes.find((b) => b.id === searchSelectedBoxId);
    if (!box) return null;
    const shelf = shelves.find((sh) => sh.id === box.shelfId);
    const principal = doors.find((d) => d.isPrincipal);
    if (!shelf || !principal) return null;

    // Start at the principal door position, slightly above the floor for visibility.
    const start: [number, number, number] = [
      principal.position[0],
      0.05,
      principal.position[2],
    ];
    // End at the shelf barycentre (centre of the shelf body).
    const halfHeight = rackHeightOf(shelf) / 2;
    const end: [number, number, number] = [
      shelf.position[0],
      shelf.position[1] + halfHeight,
      shelf.position[2],
    ];
    // Midpoint: between the two on XZ, arched upward so the curve clears furniture.
    const mid: [number, number, number] = [
      (start[0] + end[0]) / 2,
      Math.max(start[1], end[1]) + 1.4,
      (start[2] + end[2]) / 2,
    ];
    return { start, mid, end };
  }, [searchSelectedBoxId, boxes, shelves, doors]);

  if (!route) return null;

  return (
    <group>
      {/* Glowing route */}
      <QuadraticBezierLine
        start={route.start}
        mid={route.mid}
        end={route.end}
        color="#fbbf24"
        lineWidth={5}
        transparent
        opacity={0.9}
      />
      {/* Soft halo behind it */}
      <QuadraticBezierLine
        start={route.start}
        mid={route.mid}
        end={route.end}
        color="#fbbf24"
        lineWidth={12}
        transparent
        opacity={0.18}
      />
      {/* Origin marker — pulsing disc on the floor next to the principal door */}
      <mesh position={[route.start[0], 0.02, route.start[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.55, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} />
      </mesh>
      {/* Destination marker — column of light on the shelf */}
      <mesh position={[route.end[0], route.end[1], route.end[2]]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
