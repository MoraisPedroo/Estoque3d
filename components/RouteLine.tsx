'use client';

import { useMemo } from 'react';
import { CatmullRomLine } from '@react-three/drei';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { rackHeightOf } from '@/lib/data';
import { astar, buildGrid, simplifyPath } from '@/lib/pathfinding';

const FLOOR_Y = 0.05;

export function RouteLine() {
  const searchSelectedBoxId = useWarehouseStore((s) => s.searchSelectedBoxId);
  const boxes = useWarehouseStore((s) => s.boxes);
  const shelves = useWarehouseStore((s) => s.shelves);
  const walls = useWarehouseStore((s) => s.walls);
  const doors = useWarehouseStore((s) => s.doors);
  const warehouseSize = useWarehouseStore((s) => s.warehouseSize);

  const route = useMemo(() => {
    if (!searchSelectedBoxId) return null;
    const box = boxes.find((b) => b.id === searchSelectedBoxId);
    if (!box) return null;
    const shelf = shelves.find((sh) => sh.id === box.shelfId);
    const principal = doors.find((d) => d.isPrincipal);
    if (!shelf || !principal) return null;

    const grid = buildGrid(warehouseSize, shelves, walls);
    const start: [number, number] = [principal.position[0], principal.position[2]];
    // Aim a metre in front of the shelf so the path stops at the aisle, not inside the rack.
    const cos = Math.cos(shelf.rotation[1]);
    const sin = Math.sin(shelf.rotation[1]);
    const standoff = 1.2;
    const end: [number, number] = [
      shelf.position[0] + sin * standoff,
      shelf.position[2] + cos * standoff,
    ];

    const path = astar(grid, start, end);
    if (!path || path.length < 2) return null;

    // Make the curve start exactly at the door and finish at the standoff point.
    const waypoints: Array<[number, number, number]> = [];
    waypoints.push([principal.position[0], FLOOR_Y, principal.position[2]]);
    for (const [x, z] of simplifyPath(path)) waypoints.push([x, FLOOR_Y, z]);
    waypoints.push([end[0], FLOOR_Y, end[1]]);

    const destination: [number, number, number] = [
      shelf.position[0],
      shelf.position[1] + rackHeightOf(shelf) / 2,
      shelf.position[2],
    ];

    return { waypoints, destination };
  }, [searchSelectedBoxId, boxes, shelves, walls, doors, warehouseSize]);

  if (!route) return null;

  return (
    <group>
      {/* Soft halo behind the route — wide, low opacity */}
      <CatmullRomLine
        points={route.waypoints}
        color="#fbbf24"
        lineWidth={14}
        curveType="catmullrom"
        tension={0.5}
        segments={64}
        {...({ transparent: true, opacity: 0.18 } as any)}
      />
      {/* Crisp guiding line on top */}
      <CatmullRomLine
        points={route.waypoints}
        color="#fde68a"
        lineWidth={4}
        curveType="catmullrom"
        tension={0.5}
        segments={64}
        {...({ transparent: true, opacity: 0.95 } as any)}
      />

      {/* Origin marker at the principal door */}
      <mesh
        position={[route.waypoints[0][0], 0.02, route.waypoints[0][2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.35, 0.55, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} />
      </mesh>

      {/* Destination marker — column rising from floor to shelf centre */}
      <mesh position={route.destination}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}
