'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { EditableObject } from './EditableObject';

export function Walls() {
  const walls = useWarehouseStore((s) => s.walls);
  const updateWall = useWarehouseStore((s) => s.updateWall);
  const selectedItem = useWarehouseStore((s) => s.selectedItem);

  return (
    <group>
      {walls.map((w) => {
        const isSelected = selectedItem?.type === 'wall' && selectedItem.id === w.id;
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
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial
                color={w.color}
                roughness={0.85}
                metalness={0.05}
                emissive={isSelected ? '#0ea5e9' : '#000000'}
                emissiveIntensity={isSelected ? 0.18 : 0}
              />
            </mesh>
          </EditableObject>
        );
      })}
    </group>
  );
}
