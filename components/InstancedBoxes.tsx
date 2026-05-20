'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Bvh } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three-stdlib';
import { useWarehouseStore } from '@/store/useWarehouseStore';

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const color = new THREE.Color();
const HIGHLIGHT = new THREE.Color('#ffffff');

export function InstancedBoxes() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const boxes = useWarehouseStore((s) => s.boxes);
  const view = useWarehouseStore((s) => s.view);
  const selectedRackId = useWarehouseStore((s) => s.selectedRackId);
  const selectedRow = useWarehouseStore((s) => s.selectedRow);
  const selectedItem = useWarehouseStore((s) => s.selectedItem);
  const hoveredBoxId = useWarehouseStore((s) => s.hoveredBoxId);

  const selectItem = useWarehouseStore((s) => s.selectItem);
  const setHoveredBoxId = useWarehouseStore((s) => s.setHoveredBoxId);

  // Unit geometry: per-instance scale matrix encodes real size.
  const geometry = useMemo(
    () => new RoundedBoxGeometry(1, 1, 1, 3, 0.06),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Re-write matrices when boxes change (position OR size edits).
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    quat.identity();
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      pos.set(b.position[0], b.position[1], b.position[2]);
      scl.set(b.size[0], b.size[1], b.size[2]);
      matrix.compose(pos, quat, scl);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.count = boxes.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);

  // Re-write colors whenever boxes/hover/selection state changes.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const inRackView = view === 'rack' && !!selectedRackId;

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      color.set(b.color);

      const isHovered = hoveredBoxId === b.id;
      const isSelected = selectedItem?.type === 'box' && selectedItem.id === b.id;
      const rowFocused =
        inRackView && selectedRow !== null && b.rackId === selectedRackId && b.rowIndex === selectedRow;
      const rowDimmed =
        inRackView && selectedRow !== null && b.rackId === selectedRackId && b.rowIndex !== selectedRow;
      const rackDimmed = inRackView && b.rackId !== selectedRackId;

      if (rackDimmed) color.multiplyScalar(0.18);
      else if (rowDimmed) color.multiplyScalar(0.35);

      if (isSelected) color.lerp(HIGHLIGHT, 0.55);
      else if (isHovered) color.lerp(HIGHLIGHT, 0.35);
      else if (rowFocused) color.lerp(HIGHLIGHT, 0.18);

      mesh.setColorAt(i, color);
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boxes, hoveredBoxId, selectedItem, selectedRackId, selectedRow, view]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId == null) return;
    e.stopPropagation();
    const b = boxes[e.instanceId];
    if (!b) return;
    if (view === 'floor') return; // only interact with boxes after zooming in
    setHoveredBoxId(b.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredBoxId(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId == null) return;
    if (view === 'floor') return;
    e.stopPropagation();
    const b = boxes[e.instanceId];
    if (!b) return;
    selectItem({ id: b.id, type: 'box' });
  };

  return (
    <Bvh firstHitOnly>
      <instancedMesh
        ref={meshRef}
        args={[geometry, undefined, Math.max(boxes.length, 1)]}
        castShadow
        receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshStandardMaterial roughness={0.55} metalness={0.1} />
      </instancedMesh>
    </Bvh>
  );
}
