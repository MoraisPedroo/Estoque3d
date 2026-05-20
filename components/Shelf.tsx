'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Text, Bvh, TransformControls } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three-stdlib';
import {
  RACK_FRAME_THICKNESS,
  Shelf as ShelfType,
  rackDepthOf,
  rackHeightOf,
  rackWidthOf,
} from '@/lib/data';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { cameraRef } from '@/lib/cameraRef';

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const posV = new THREE.Vector3();
const sclV = new THREE.Vector3();
const color = new THREE.Color();
const HIGHLIGHT = new THREE.Color('#ffffff');

const TRANSLATION_SNAP = 0.5;
const ROTATION_SNAP = Math.PI / 2;

export function Shelf({ shelf }: { shelf: ShelfType }) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const [groupReady, setGroupReady] = useState(false);

  const view = useWarehouseStore((s) => s.view);
  const selectedShelfId = useWarehouseStore((s) => s.selectedShelfId);
  const selectedRow = useWarehouseStore((s) => s.selectedRow);
  const selectedItem = useWarehouseStore((s) => s.selectedItem);
  const hoveredBoxId = useWarehouseStore((s) => s.hoveredBoxId);
  const transformMode = useWarehouseStore((s) => s.transformMode);

  const zoomToShelf = useWarehouseStore((s) => s.zoomToShelf);
  const selectItem = useWarehouseStore((s) => s.selectItem);
  const setHoveredBoxId = useWarehouseStore((s) => s.setHoveredBoxId);
  const updateShelf = useWarehouseStore((s) => s.updateShelf);

  const boxes = useWarehouseStore((s) =>
    s.boxes.filter((b) => b.shelfId === shelf.id)
  );

  const isSelected =
    selectedItem?.type === 'shelf' && selectedItem.id === shelf.id;
  const isFocused = selectedShelfId === shelf.id && view === 'rack';
  const showGizmo = isSelected && view === 'floor';

  const rackWidth = rackWidthOf(shelf);
  const rackHeight = rackHeightOf(shelf);
  const rackDepth = rackDepthOf(shelf);

  const [bw, bh, bd] = shelf.boxSize;

  const geometry = useMemo(() => {
    const radius = Math.min(bw, bh, bd) * 0.08;
    return new RoundedBoxGeometry(bw, bh, bd, 3, radius);
  }, [bw, bh, bd]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    setGroupReady(true);
  }, []);

  // Sync group from store (when inspector edits numerically or position/rotation changes externally)
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(...shelf.position);
    g.rotation.set(...shelf.rotation);
  }, [shelf.position, shelf.rotation]);

  // Write matrices when boxes change
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    quat.identity();
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      posV.set(b.position[0], b.position[1], b.position[2]);
      sclV.set(b.size[0] / bw, b.size[1] / bh, b.size[2] / bd);
      matrix.compose(posV, quat, sclV);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.count = boxes.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes, bw, bh, bd]);

  // Write colors on hover / selection / row focus
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      color.set(b.color);

      const isBoxHover = hoveredBoxId === b.id;
      const isBoxSelected =
        selectedItem?.type === 'box' && selectedItem.id === b.id;
      const rowFocused = isFocused && selectedRow !== null && b.rowIndex === selectedRow;
      const rowDimmed = isFocused && selectedRow !== null && b.rowIndex !== selectedRow;

      if (rowDimmed) color.multiplyScalar(0.35);

      if (isBoxSelected) color.lerp(HIGHLIGHT, 0.55);
      else if (isBoxHover) color.lerp(HIGHLIGHT, 0.35);
      else if (rowFocused) color.lerp(HIGHLIGHT, 0.18);

      mesh.setColorAt(i, color);
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boxes, hoveredBoxId, selectedItem, isFocused, selectedRow]);

  // ---- Pointer handlers ----

  const handleBoxOver = (e: ThreeEvent<PointerEvent>) => {
    if (!isFocused) return;
    if (e.instanceId == null) return;
    e.stopPropagation();
    setHoveredBoxId(boxes[e.instanceId]?.id ?? null);
    document.body.style.cursor = 'pointer';
  };

  const handleBoxOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredBoxId(null);
    document.body.style.cursor = 'auto';
  };

  const handleBoxClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isFocused) return;
    if (e.instanceId == null) return;
    e.stopPropagation();
    const b = boxes[e.instanceId];
    if (b) selectItem({ id: b.id, type: 'box' });
  };

  const handleShelfClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectItem({ id: shelf.id, type: 'shelf' });
  };

  const handleShelfDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (view === 'floor') zoomToShelf(shelf.id);
  };

  const handleShelfOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handleShelfOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
  };

  // ---- Gizmo commit ----

  const handleGizmoMouseDown = () => {
    if (cameraRef.current) cameraRef.current.enabled = false;
  };
  const handleGizmoMouseUp = () => {
    if (cameraRef.current) cameraRef.current.enabled = true;
    const g = groupRef.current;
    if (!g) return;
    updateShelf(shelf.id, {
      position: [g.position.x, g.position.y, g.position.z],
      rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
    });
  };

  return (
    <>
      <group ref={groupRef}>
        <group
          onClick={handleShelfClick}
          onDoubleClick={handleShelfDoubleClick}
          onPointerOver={handleShelfOver}
          onPointerOut={handleShelfOut}
        >
          <RackFrame
            width={rackWidth}
            height={rackHeight}
            depth={rackDepth}
            rows={shelf.rows}
            boxHeight={bh}
            highlighted={isSelected || isFocused}
          />
        </group>

        <Bvh firstHitOnly>
          <instancedMesh
            key={`${shelf.id}-${boxes.length}-${bw.toFixed(3)}-${bh.toFixed(3)}-${bd.toFixed(3)}`}
            ref={meshRef}
            args={[geometry, undefined, Math.max(boxes.length, 1)]}
            castShadow
            receiveShadow
            onPointerOver={handleBoxOver}
            onPointerOut={handleBoxOut}
            onClick={handleBoxClick}
          >
            <meshStandardMaterial roughness={0.55} metalness={0.1} />
          </instancedMesh>
        </Bvh>

        <Text
          position={[0, rackHeight + 0.15, 0]}
          fontSize={0.32}
          color={isSelected || isFocused ? '#38bdf8' : '#94a3b8'}
          anchorX="center"
          anchorY="middle"
        >
          {`Estante ${shelf.label}`}
        </Text>
      </group>

      {groupReady && showGizmo && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          translationSnap={TRANSLATION_SNAP}
          rotationSnap={ROTATION_SNAP}
          showY={transformMode !== 'translate'}
          onMouseDown={handleGizmoMouseDown}
          onMouseUp={handleGizmoMouseUp}
          size={0.85}
        />
      )}
    </>
  );
}

function RackFrame({
  width,
  height,
  depth,
  rows,
  boxHeight,
  highlighted,
}: {
  width: number;
  height: number;
  depth: number;
  rows: number;
  boxHeight: number;
  highlighted: boolean;
}) {
  const t = RACK_FRAME_THICKNESS;
  const shelfThickness = 0.03;

  const shelves = [];
  for (let r = 0; r <= rows; r++) {
    const y = r * (boxHeight + 0.05) + 0.025;
    shelves.push(
      <mesh key={`shelf-${r}`} position={[0, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, shelfThickness, depth]} />
        <meshStandardMaterial
          color={highlighted ? '#334155' : '#1f2937'}
          roughness={0.7}
          metalness={0.4}
        />
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
