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
import { getBoxTexture } from '@/lib/boxTexture';

// Reusable matrix helpers (mutated each frame — no allocation hotspots)
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const HIGHLIGHT = new THREE.Color('#ffffff');

const TRANSLATION_SNAP = 0.5;
const ROTATION_SNAP = Math.PI / 2;

export function Shelf({ shelf }: { shelf: ShelfType }) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const [groupReady, setGroupReady] = useState(false);

  const view = useWarehouseStore((s) => s.view);
  const appMode = useWarehouseStore((s) => s.appMode);
  const selectedShelfId = useWarehouseStore((s) => s.selectedShelfId);
  const selectedRow = useWarehouseStore((s) => s.selectedRow);
  const selectedItems = useWarehouseStore((s) => s.selectedItems);
  const hoveredBoxId = useWarehouseStore((s) => s.hoveredBoxId);
  const transformMode = useWarehouseStore((s) => s.transformMode);

  const zoomToShelf = useWarehouseStore((s) => s.zoomToShelf);
  const selectItem = useWarehouseStore((s) => s.selectItem);
  const toggleSelection = useWarehouseStore((s) => s.toggleSelection);
  const setHoveredBoxId = useWarehouseStore((s) => s.setHoveredBoxId);
  const updateShelf = useWarehouseStore((s) => s.updateShelf);

  const boxes = useWarehouseStore((s) =>
    s.boxes.filter((b) => b.shelfId === shelf.id)
  );
  const draggingBoxIds = useWarehouseStore((s) => s.draggingBoxIds);
  const draggingSet = useMemo(() => new Set(draggingBoxIds), [draggingBoxIds]);

  const isShelfSelected = selectedItems.some(
    (it) => it.type === 'shelf' && it.id === shelf.id
  );
  const onlyShelfSelected = isShelfSelected && selectedItems.length === 1;
  const isFocused = selectedShelfId === shelf.id && view === 'rack';
  const showGizmo = appMode === 'edit' && onlyShelfSelected && view === 'floor';

  // Set of currently selected box ids (for color highlight)
  const selectedBoxIds = useMemo(() => {
    const s = new Set<string>();
    for (const it of selectedItems) if (it.type === 'box') s.add(it.id);
    return s;
  }, [selectedItems]);

  const rackWidth = rackWidthOf(shelf);
  const rackHeight = rackHeightOf(shelf);
  const rackDepth = rackDepthOf(shelf);
  const shelfCapacity = shelf.rows * shelf.columns * shelf.depthLayers;

  // Unit geometry — per-instance dummy.scale encodes the real box size.
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.06), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Single shared Zebra/zd230 CanvasTexture for all boxes (instance color tints).
  const boxMap = useMemo(() => getBoxTexture('zd230'), []);

  useEffect(() => {
    setGroupReady(true);
  }, []);

  // Sync group transform from store (numeric edits / regen / external update)
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(...shelf.position);
    g.rotation.set(...shelf.rotation);
  }, [shelf.position, shelf.rotation]);

  // Matrices: write scale + position per instance via dummy. Boxes being dragged
  // get a zero-scale matrix so they vanish from the InstancedMesh while the
  // proxy meshes carry them visually.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const isDragging = draggingSet.has(b.id);
      dummy.position.set(b.position[0], b.position[1], b.position[2]);
      dummy.rotation.set(0, 0, 0);
      if (isDragging) dummy.scale.set(0, 0, 0);
      else dummy.scale.set(b.size[0], b.size[1], b.size[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = boxes.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes, draggingSet]);

  // Colors: hover / selection (single + multi) / row focus
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      color.set(b.color);

      const isBoxHover = hoveredBoxId === b.id;
      const isBoxSelected = selectedBoxIds.has(b.id);
      const rowFocused =
        isFocused && selectedRow !== null && b.rowIndex === selectedRow;
      const rowDimmed =
        isFocused && selectedRow !== null && b.rowIndex !== selectedRow;

      if (rowDimmed) color.multiplyScalar(0.35);

      if (isBoxSelected) color.lerp(HIGHLIGHT, 0.55);
      else if (isBoxHover) color.lerp(HIGHLIGHT, 0.35);
      else if (rowFocused) color.lerp(HIGHLIGHT, 0.18);

      mesh.setColorAt(i, color);
    }

    // Imperative signal to the GPU — buffer is dirty.
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boxes, hoveredBoxId, selectedBoxIds, isFocused, selectedRow]);

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
    if (!b) return;
    if (appMode === 'view') {
      // View mode: clicking a box opens the details modal
      selectItem({ id: b.id, type: 'box' });
      return;
    }
    const shift = (e.nativeEvent as MouseEvent).shiftKey;
    if (shift) toggleSelection({ id: b.id, type: 'box' });
    else selectItem({ id: b.id, type: 'box' });
  };

  const handleShelfClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (appMode === 'view') {
      // View mode: clicking a shelf in floor view zooms in; nothing else.
      if (view === 'floor') zoomToShelf(shelf.id);
      return;
    }
    const shift = (e.nativeEvent as MouseEvent).shiftKey;
    if (shift) toggleSelection({ id: shelf.id, type: 'shelf' });
    else selectItem({ id: shelf.id, type: 'shelf' });
  };

  const handleShelfDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (appMode === 'edit' && view === 'floor') zoomToShelf(shelf.id);
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
            boxHeight={shelf.boxSize[1]}
            highlighted={isShelfSelected || isFocused}
          />
        </group>

        <Bvh firstHitOnly>
          <instancedMesh
            // Buffer key is the shelf's MAX capacity so the buffer stays stable
            // across relocations (boxes added/removed don't trigger remount).
            key={`${shelf.id}-${shelfCapacity}`}
            ref={meshRef}
            args={[geometry, undefined, Math.max(shelfCapacity, 1)]}
            castShadow
            receiveShadow
            onPointerOver={handleBoxOver}
            onPointerOut={handleBoxOut}
            onClick={handleBoxClick}
          >
            <meshStandardMaterial
              map={boxMap}
              roughness={0.7}
              metalness={0.05}
              color="#ffffff"
            />
          </instancedMesh>
        </Bvh>

        <Text
          position={[0, rackHeight + 0.15, 0]}
          fontSize={0.32}
          color={isShelfSelected || isFocused ? '#38bdf8' : '#94a3b8'}
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
