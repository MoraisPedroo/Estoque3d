'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { ItemType } from '@/lib/data';
import { cameraRef } from '@/lib/cameraRef';

interface Props {
  id: string;
  type: ItemType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: [number, number, number];
  onCommit: (next: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }) => void;
  children: ReactNode;
}

export function EditableObject({ id, type, position, rotation, scale, onCommit, children }: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  const [ready, setReady] = useState(false);

  const selectedItem = useWarehouseStore((s) => s.selectedItem);
  const transformMode = useWarehouseStore((s) => s.transformMode);
  const selectItem = useWarehouseStore((s) => s.selectItem);

  const isSelected = selectedItem?.id === id && selectedItem?.type === type;

  useEffect(() => {
    setReady(true);
  }, []);

  // Keep object synced with store (when inspector edits numerically).
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(position[0], position[1], position[2]);
    g.rotation.set(rotation[0], rotation[1], rotation[2]);
    if (scale) g.scale.set(scale[0], scale[1], scale[2]);
  }, [position, rotation, scale]);

  const handleMouseUp = () => {
    const g = groupRef.current;
    if (!g) return;
    if (cameraRef.current) cameraRef.current.enabled = true;
    onCommit({
      position: [g.position.x, g.position.y, g.position.z],
      rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
      scale: [g.scale.x, g.scale.y, g.scale.z],
    });
  };

  const handleMouseDown = () => {
    if (cameraRef.current) cameraRef.current.enabled = false;
  };

  return (
    <>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          selectItem({ id, type });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
      >
        {children}
      </group>
      {ready && isSelected && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          size={0.7}
        />
      )}
    </>
  );
}
