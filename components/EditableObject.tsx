'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { ItemType } from '@/lib/data';
import { cameraRef } from '@/lib/cameraRef';

const TRANSLATION_SNAP = 0.5;
const ROTATION_SNAP = Math.PI / 2;

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

export function EditableObject({
  id,
  type,
  position,
  rotation,
  scale,
  onCommit,
  children,
}: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  const [ready, setReady] = useState(false);

  const selectedItems = useWarehouseStore((s) => s.selectedItems);
  const transformMode = useWarehouseStore((s) => s.transformMode);
  const selectItem = useWarehouseStore((s) => s.selectItem);
  const toggleSelection = useWarehouseStore((s) => s.toggleSelection);
  const appMode = useWarehouseStore((s) => s.appMode);

  const isInSelection = selectedItems.some((it) => it.id === id && it.type === type);
  // Gizmo only in edit mode + exactly one matching item selected.
  const showGizmo = appMode === 'edit' && isInSelection && selectedItems.length === 1;

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(position[0], position[1], position[2]);
    g.rotation.set(rotation[0], rotation[1], rotation[2]);
    if (scale) g.scale.set(scale[0], scale[1], scale[2]);
  }, [position, rotation, scale]);

  const handleMouseDown = () => {
    if (cameraRef.current) cameraRef.current.enabled = false;
  };

  const handleMouseUp = () => {
    if (cameraRef.current) cameraRef.current.enabled = true;
    const g = groupRef.current;
    if (!g) return;
    onCommit({
      position: [g.position.x, g.position.y, g.position.z],
      rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
      scale: [g.scale.x, g.scale.y, g.scale.z],
    });
  };

  return (
    <>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          const shift = (e.nativeEvent as MouseEvent).shiftKey;
          if (shift) toggleSelection({ id, type });
          else selectItem({ id, type });
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
      {ready && showGizmo && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          translationSnap={TRANSLATION_SNAP}
          rotationSnap={ROTATION_SNAP}
          showY={transformMode !== 'translate'}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          size={0.7}
        />
      )}
    </>
  );
}
