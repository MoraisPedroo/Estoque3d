'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { EditableObject } from './EditableObject';

export function Doors() {
  const doors = useWarehouseStore((s) => s.doors);
  const updateDoor = useWarehouseStore((s) => s.updateDoor);
  const selectedItems = useWarehouseStore((s) => s.selectedItems);

  return (
    <group>
      {doors.map((d) => {
        const isSelected = selectedItems.some(
          (it) => it.type === 'door' && it.id === d.id
        );
        // Principal door gets a warm gold accent so users can spot the route entry point.
        const accent = d.isPrincipal ? '#fbbf24' : '#0ea5e9';
        return (
          <EditableObject
            key={d.id}
            id={d.id}
            type="door"
            position={d.position}
            rotation={d.rotation}
            scale={d.scale}
            // updateDoor internally re-snaps the door to the nearest wall, so the
            // gizmo's free motion ends up locked to wall rotation + plane.
            onCommit={(next) =>
              updateDoor(d.id, {
                position: next.position,
                rotation: next.rotation,
                scale: next.scale,
              })
            }
          >
            <group>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                  color={d.isPrincipal ? '#a47148' : d.color}
                  roughness={0.5}
                  metalness={0.15}
                  emissive={isSelected ? accent : d.isPrincipal ? '#7c4a13' : '#000000'}
                  emissiveIntensity={isSelected ? 0.22 : d.isPrincipal ? 0.18 : 0}
                />
              </mesh>
              {/* Handle dot — a tiny ball on the door surface */}
              <mesh position={[0.36, 0, 0.55]} castShadow>
                <sphereGeometry args={[0.04, 12, 12]} />
                <meshStandardMaterial
                  color={d.isPrincipal ? '#fde68a' : '#fcd34d'}
                  metalness={0.85}
                  roughness={0.2}
                />
              </mesh>
            </group>
          </EditableObject>
        );
      })}
    </group>
  );
}
