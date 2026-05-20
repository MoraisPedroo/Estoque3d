'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Text, Bvh } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three-stdlib';
import {
  BOX,
  GAP,
  ROWS,
  RACK_FRAME_THICKNESS,
  RACK_DEPTH,
  RackData,
  MODEL_COLORS,
} from '@/lib/data';
import { useWarehouseStore } from '@/store/useWarehouseStore';

const dummy = new THREE.Object3D();
const color = new THREE.Color();

export function Rack({ rack }: { rack: RackData }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const view = useWarehouseStore((s) => s.view);
  const selectedRackId = useWarehouseStore((s) => s.selectedRackId);
  const selectedRow = useWarehouseStore((s) => s.selectedRow);
  const hoveredBox = useWarehouseStore((s) => s.hoveredBox);
  const selectRack = useWarehouseStore((s) => s.selectRack);
  const selectRow = useWarehouseStore((s) => s.selectRow);
  const setHoveredBox = useWarehouseStore((s) => s.setHoveredBox);

  const isSelected = selectedRackId === rack.id;
  const isInRackView = view === 'rack' && isSelected;

  const total = ROWS * rack.columns;

  const rackWidth = rack.columns * (BOX.w + GAP) + GAP;
  const rackHeight = ROWS * (BOX.h + GAP) + GAP + 0.1;

  const geometry = useMemo(
    () => new RoundedBoxGeometry(BOX.w, BOX.h, BOX.d, 3, 0.05),
    []
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / rack.columns);
      const col = i % rack.columns;

      const localX = -rackWidth / 2 + GAP + BOX.w / 2 + col * (BOX.w + GAP);
      const localY = BOX.h / 2 + GAP + row * (BOX.h + GAP);
      const localZ = 0;

      dummy.position.set(localX, localY, localZ);
      dummy.rotation.set(0, 0, 0);

      const slot = rack.slots[i];
      const hoverActive =
        hoveredBox && hoveredBox.rackId === rack.id && hoveredBox.slotIndex === i;
      const rowActive = isInRackView && selectedRow !== null && selectedRow === row;
      const rowDim = isInRackView && selectedRow !== null && selectedRow !== row;

      const baseScale = slot ? 1 : 0.92;
      const scale = hoverActive ? baseScale * 1.06 : baseScale;
      dummy.scale.setScalar(scale);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const baseColor = slot ? MODEL_COLORS[slot.model] : MODEL_COLORS.vazio;
      color.set(baseColor);

      if (rowDim) color.multiplyScalar(0.35);
      if (hoverActive) color.lerp(new THREE.Color('#ffffff'), 0.35);
      else if (rowActive) color.lerp(new THREE.Color('#ffffff'), 0.18);

      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [rack, total, rackWidth, isInRackView, selectedRow, hoveredBox]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!isInRackView) return;
    e.stopPropagation();
    if (e.instanceId == null) return;
    setHoveredBox({ rackId: rack.id, slotIndex: e.instanceId });
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredBox(null);
    document.body.style.cursor = 'auto';
  };

  const handleBoxClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isInRackView) return;
    e.stopPropagation();
    if (e.instanceId == null) return;
    const row = Math.floor(e.instanceId / rack.columns);
    selectRow(row);
  };

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

      <Bvh firstHitOnly>
        <instancedMesh
          ref={meshRef}
          args={[geometry, undefined, total]}
          castShadow
          receiveShadow
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleBoxClick}
        >
          <meshStandardMaterial roughness={0.55} metalness={0.1} />
        </instancedMesh>
      </Bvh>

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
