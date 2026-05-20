'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { EditableObject } from './EditableObject';
import { FurnitureType } from '@/lib/data';

// To load real GLB models, replace the procedural primitives below with:
//   const { scene } = useGLTF('/models/desk.glb');
//   return <primitive object={scene.clone()} />
// (drop GLBs into /public/models and useGLTF.preload('/models/desk.glb') in module scope)

function DeskModel({ selected }: { selected: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.04, 0.8]} />
        <meshStandardMaterial color={selected ? '#a78bfa' : '#92633a'} roughness={0.55} />
      </mesh>
      {[
        [-0.75, 0.37, -0.35],
        [ 0.75, 0.37, -0.35],
        [-0.75, 0.37,  0.35],
        [ 0.75, 0.37,  0.35],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.05, 0.74, 0.05]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function ChairModel({ selected }: { selected: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color={selected ? '#a78bfa' : '#1e293b'} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.8, -0.22]} castShadow>
        <boxGeometry args={[0.5, 0.65, 0.06]} />
        <meshStandardMaterial color={selected ? '#a78bfa' : '#1e293b'} roughness={0.5} />
      </mesh>
      {[
        [-0.21, 0.22, -0.21],
        [ 0.21, 0.22, -0.21],
        [-0.21, 0.22,  0.21],
        [ 0.21, 0.22,  0.21],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.04, 0.45, 0.04]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function TableModel({ selected }: { selected: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.05, 32]} />
        <meshStandardMaterial color={selected ? '#a78bfa' : '#cfa97e'} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.72, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.04, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  );
}

function FurnitureModel({ type, selected }: { type: FurnitureType; selected: boolean }) {
  if (type === 'desk') return <DeskModel selected={selected} />;
  if (type === 'chair') return <ChairModel selected={selected} />;
  return <TableModel selected={selected} />;
}

export function Furniture() {
  const furniture = useWarehouseStore((s) => s.furniture);
  const updateFurniture = useWarehouseStore((s) => s.updateFurniture);
  const selectedItems = useWarehouseStore((s) => s.selectedItems);

  return (
    <group>
      {furniture.map((f) => {
        const isSelected = selectedItems.some(
          (it) => it.type === 'furniture' && it.id === f.id
        );
        return (
          <EditableObject
            key={f.id}
            id={f.id}
            type="furniture"
            position={f.position}
            rotation={f.rotation}
            onCommit={(next) =>
              updateFurniture(f.id, {
                position: next.position,
                rotation: next.rotation,
              })
            }
          >
            <FurnitureModel type={f.type} selected={isSelected} />
          </EditableObject>
        );
      })}
    </group>
  );
}
