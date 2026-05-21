'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Text, Bvh, TransformControls, Edges, Html } from '@react-three/drei';
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
  const [hovered, setHovered] = useState(false);

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
  const relocatingBoxId = useWarehouseStore((s) => s.relocatingBoxId);
  const relocateToBox = useWarehouseStore((s) => s.relocateToBox);
  const setRelocatingBox = useWarehouseStore((s) => s.setRelocatingBox);
  const openShelfInspection = useWarehouseStore((s) => s.openShelfInspection);

  const boxes = useWarehouseStore((s) =>
    s.boxes.filter((b) => b.shelfId === shelf.id)
  );
  const draggingBoxIds = useWarehouseStore((s) => s.draggingBoxIds);
  const draggingSet = useMemo(() => new Set(draggingBoxIds), [draggingBoxIds]);

  const searchSelectedBoxId = useWarehouseStore((s) => s.searchSelectedBoxId);
  const isSearchTarget = useWarehouseStore((s) => {
    if (!s.searchSelectedBoxId) return false;
    const b = s.boxes.find((x) => x.id === s.searchSelectedBoxId);
    return !!b && b.shelfId === shelf.id;
  });
  const isSearchActive = !!searchSelectedBoxId;
  // Dim non-target shelves to focus attention on the route.
  const dimAmount = isSearchActive && !isSearchTarget ? 0.45 : 0;

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
    if (e.instanceId == null) return;
    const b = boxes[e.instanceId];
    if (!b) return;

    // Relocate flow: click any box (across the warehouse) chooses it as destination.
    if (relocatingBoxId) {
      if (b.id === relocatingBoxId) return; // can't drop on itself
      e.stopPropagation();
      const isEmpty = b.model === 'vazio';
      if (isEmpty) {
        relocateToBox(relocatingBoxId, b.id);
      } else if (window.confirm('Deseja trocar os itens de posição?')) {
        relocateToBox(relocatingBoxId, b.id);
      }
      return;
    }

    // Normal interaction needs the shelf to be zoomed-in.
    if (!isFocused) return;
    e.stopPropagation();
    if (appMode === 'view') {
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
    if (appMode === 'edit' && view === 'floor') {
      zoomToShelf(shelf.id);
      return;
    }
    if (appMode === 'view') {
      // Open the 2D grid inspector. If shelf has only one layer, jump straight to it.
      openShelfInspection(shelf.id, shelf.depthLayers === 1 ? 0 : null);
    }
  };

  const handleShelfOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHovered(true);
  };
  const handleShelfOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    setHovered(false);
  };

  // ---- Gizmo commit ----

  const handleGizmoMouseDown = () => {
    if (cameraRef.current) cameraRef.current.enabled = false;
  };
  const handleGizmoMouseUp = () => {
    if (cameraRef.current) cameraRef.current.enabled = true;
    const g = groupRef.current;
    if (!g) return;

    // Y-snap: if there's another shelf right below at similar X/Z, snap to its top.
    const allShelves = useWarehouseStore.getState().shelves;
    const STACK_RADIUS = 1.5;
    const STACK_Y_TOL = 0.6;
    let snappedY = g.position.y;
    let bestDelta = Infinity;
    for (const other of allShelves) {
      if (other.id === shelf.id) continue;
      const dx = g.position.x - other.position[0];
      const dz = g.position.z - other.position[2];
      if (Math.hypot(dx, dz) > STACK_RADIUS) continue;
      const top = other.position[1] + rackHeightOf(other);
      const delta = Math.abs(top - g.position.y);
      if (delta < STACK_Y_TOL && delta < bestDelta) {
        bestDelta = delta;
        snappedY = top;
      }
    }

    updateShelf(shelf.id, {
      position: [g.position.x, snappedY, g.position.z],
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
            dim={dimAmount}
            hasMidCeiling={shelf.hasMidCeiling}
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
              transparent={dimAmount > 0}
              opacity={dimAmount > 0 ? 1 - dimAmount : 1}
            />
          </instancedMesh>
        </Bvh>

        <Text
          position={[0, rackHeight + 0.15, 0]}
          fontSize={0.32}
          color={isSearchTarget ? '#fbbf24' : isShelfSelected || isFocused ? '#38bdf8' : '#94a3b8'}
          anchorX="center"
          anchorY="middle"
        >
          {`Estante ${shelf.label}`}
        </Text>

        {appMode === 'view' && hovered && view === 'floor' && (
          <Html
            position={[0, rackHeight + 0.55, 0]}
            center
            distanceFactor={8}
            zIndexRange={[15, 0]}
          >
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                openShelfInspection(shelf.id, shelf.depthLayers === 1 ? 0 : null);
              }}
              className="whitespace-nowrap rounded-full border border-sky-400/40 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-sky-200 shadow-lg shadow-sky-500/20 backdrop-blur-md transition hover:border-sky-300 hover:bg-slate-800"
            >
              🔍 Ver Mapa 2D
            </button>
          </Html>
        )}

        {/* Neon outline when this shelf is the search target. */}
        {isSearchTarget && (
          <mesh position={[0, rackHeight / 2, 0]}>
            <boxGeometry args={[rackWidth + 0.1, rackHeight + 0.05, rackDepth + 0.1]} />
            <meshBasicMaterial visible={false} />
            <Edges color="#fbbf24" linewidth={2} threshold={1} />
          </mesh>
        )}
      </group>

      {groupReady && showGizmo && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          translationSnap={TRANSLATION_SNAP}
          rotationSnap={ROTATION_SNAP}
          // Shelves keep Y enabled (stacking); other types translate XZ only.
          showY
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
  dim,
  hasMidCeiling,
}: {
  width: number;
  height: number;
  depth: number;
  rows: number;
  boxHeight: number;
  highlighted: boolean;
  dim: number;
  hasMidCeiling: boolean;
}) {
  const useDim = dim > 0;
  const dimOpacity = 1 - dim;
  const midRow = Math.floor(rows / 2); // tier separator row
  const t = RACK_FRAME_THICKNESS;
  const shelfThickness = 0.03;

  // Open-top shelf: floors below the boxes only (no top cap).
  // r=0 is the bottom floor, r=1..rows-1 are the boards between rows.
  const shelves = [];
  for (let r = 0; r < rows; r++) {
    const y = r * (boxHeight + 0.05) + 0.025;
    const isMidCeiling = hasMidCeiling && r === midRow;
    const thickness = isMidCeiling ? shelfThickness * 4 : shelfThickness;
    shelves.push(
      <mesh key={`shelf-${r}`} position={[0, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial
          color={isMidCeiling ? '#0b1220' : highlighted ? '#334155' : '#1f2937'}
          roughness={0.7}
          metalness={isMidCeiling ? 0.55 : 0.4}
          transparent={useDim}
          opacity={useDim ? dimOpacity : 1}
        />
      </mesh>
    );
  }
  // Closed top cap when the shelf is a double-tier (so the upper module
  // actually has a real "ceiling" closing the lower one from above).
  if (hasMidCeiling) {
    const yTop = rows * (boxHeight + 0.05) + 0.025;
    shelves.push(
      <mesh key="shelf-top-cap" position={[0, yTop, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, shelfThickness * 3, depth]} />
        <meshStandardMaterial
          color="#0b1220"
          roughness={0.7}
          metalness={0.55}
          transparent={useDim}
          opacity={useDim ? dimOpacity : 1}
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
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.5}
            metalness={0.6}
            transparent={useDim}
            opacity={useDim ? dimOpacity : 1}
          />
        </mesh>
      ))}
    </group>
  );
}
