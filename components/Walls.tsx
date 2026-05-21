'use client';

import { useMemo } from 'react';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { EditableObject } from './EditableObject';
import { Door, Wall as WallT } from '@/lib/data';

/**
 * Convert a door's world position to the host wall's local UNIT coordinates
 * (wall.scale = [length, height, thickness]; local box geometry is 1×1×1).
 *  - localX_unit ∈ [-0.5, +0.5] along wall length
 *  - localY_unit ∈ [-0.5, +0.5] along wall height
 *  - localZ_unit = 0 (door centered through wall thickness)
 */
function doorLocalUnit(door: Door, wall: WallT) {
  const cos = Math.cos(wall.rotation[1]);
  const sin = Math.sin(wall.rotation[1]);
  const dx = door.position[0] - wall.position[0];
  const dy = door.position[1] - wall.position[1];
  const dz = door.position[2] - wall.position[2];
  const localX = cos * dx - sin * dz;
  const localY = dy;
  return {
    position: [
      localX / wall.scale[0],
      localY / wall.scale[1],
      0,
    ] as [number, number, number],
    size: [
      door.scale[0] / wall.scale[0],
      door.scale[1] / wall.scale[1],
      1.6, // overshoot wall thickness so the hole goes all the way through
    ] as [number, number, number],
  };
}

export function Walls() {
  const walls = useWarehouseStore((s) => s.walls);
  const doors = useWarehouseStore((s) => s.doors);
  const updateWall = useWarehouseStore((s) => s.updateWall);
  const selectedItems = useWarehouseStore((s) => s.selectedItems);

  return (
    <group>
      {walls.map((w) => {
        const isSelected = selectedItems.some(
          (it) => it.type === 'wall' && it.id === w.id
        );
        const wallDoors = doors.filter((d) => d.wallId === w.id);
        return (
          <EditableObject
            key={w.id}
            id={w.id}
            type="wall"
            position={w.position}
            rotation={w.rotation}
            scale={w.scale}
            onCommit={(next) =>
              updateWall(w.id, {
                position: next.position,
                rotation: next.rotation,
                scale: next.scale,
              })
            }
          >
            <CsgWall wall={w} doors={wallDoors} isSelected={isSelected} />
          </EditableObject>
        );
      })}
    </group>
  );
}

function CsgWall({
  wall,
  doors,
  isSelected,
}: {
  wall: WallT;
  doors: Door[];
  isSelected: boolean;
}) {
  // Memoise the cutout coords so CSG only recomputes when doors actually move.
  const cutouts = useMemo(
    () => doors.map((d) => ({ id: d.id, ...doorLocalUnit(d, wall) })),
    [doors, wall.position, wall.rotation, wall.scale]
  );

  return (
    <mesh castShadow receiveShadow>
      <Geometry useGroups>
        <Base>
          <boxGeometry args={[1, 1, 1]} />
        </Base>
        {cutouts.map((c) => (
          <Subtraction key={c.id} position={c.position}>
            <boxGeometry args={c.size} />
          </Subtraction>
        ))}
      </Geometry>
      <meshStandardMaterial
        color={wall.color}
        roughness={0.85}
        metalness={0.05}
        emissive={isSelected ? '#0ea5e9' : '#000000'}
        emissiveIntensity={isSelected ? 0.18 : 0}
      />
    </mesh>
  );
}
