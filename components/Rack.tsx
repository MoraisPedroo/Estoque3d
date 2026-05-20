'use client';

import { ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { BOX, GAP, ROWS, RACK_FRAME_THICKNESS, RACK_DEPTH, Rack as RackType, rackWidthOf } from '@/lib/data';
import { useWarehouseStore } from '@/store/useWarehouseStore';

export function Rack({ rack }: { rack: RackType }) {
  const view = useWarehouseStore((s) => s.view);
  const selectedRackId = useWarehouseStore((s) => s.selectedRackId);
  const selectRack = useWarehouseStore((s) => s.selectRack);

  const isSelected = selectedRackId === rack.id;
  const rackWidth = rackWidthOf(rack);
  const rackHeight = ROWS * (BOX.h + GAP) + GAP + 0.1;

  const handleRackClick = (e: ThreeEvent<MouseEvent>) => {
    if (view !== 'floor') return;
    e.stopPropagation();
    selectRack(rack.id);
  };

  const handleRackPointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (view !== 'floor') return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handleRackPointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (view !== 'floor') return;
    e.stopPropagation();
    document.body.style.cursor = 'auto';
  };

  return (
    <group position={rack.position} rotation={[0, rack.rotationY, 0]}>
      <RackFrame width={rackWidth} height={rackHeight} depth={RACK_DEPTH} />

      {view === 'floor' && (
        <mesh
          position={[0, rackHeight / 2, 0]}
          onClick={handleRackClick}
          onPointerOver={handleRackPointerOver}
          onPointerOut={handleRackPointerOut}
          visible={false}
        >
          <boxGeometry args={[rackWidth, rackHeight, RACK_DEPTH + 0.2]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      <Text
        position={[0, rackHeight + 0.15, 0]}
        fontSize={0.32}
        color={isSelected ? '#38bdf8' : '#94a3b8'}
        anchorX="center"
        anchorY="middle"
      >
        {`Estante ${rack.label}`}
      </Text>
    </group>
  );
}

function RackFrame({ width, height, depth }: { width: number; height: number; depth: number }) {
  const t = RACK_FRAME_THICKNESS;
  const shelfThickness = 0.03;

  const shelves = [];
  for (let r = 0; r <= ROWS; r++) {
    const y = r * (BOX.h + GAP) + GAP / 2;
    shelves.push(
      <mesh key={`shelf-${r}`} position={[0, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, shelfThickness, depth]} />
        <meshStandardMaterial color="#1f2937" roughness={0.7} metalness={0.4} />
      </mesh>
    );
  }

  const posts: [number, number, number][] = [
    [-width / 2 + t / 2, height / 2, -depth / 2 + t / 2],
    [ width / 2 - t / 2, height / 2, -depth / 2 + t / 2],
    [-width / 2 + t / 2, height / 2,  depth / 2 - t / 2],
    [ width / 2 - t / 2, height / 2,  depth / 2 - t / 2],
  ];

  return (
    <group>
      {shelves}
      {posts.map((p, i) => (
        <mesh key={`post-${i}`} position={p} castShadow receiveShadow>
          <boxGeometry args={[t, height, t]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
