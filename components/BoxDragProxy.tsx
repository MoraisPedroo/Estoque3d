'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PivotControls } from '@react-three/drei';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { getBoxTexture } from '@/lib/boxTexture';
import { cameraRef } from '@/lib/cameraRef';
import { Box, Shelf } from '@/lib/data';

interface ProxyItem {
  id: string;
  box: Box;
  shelf: Shelf;
  worldStart: THREE.Vector3;
  offsetFromCentroid: THREE.Vector3;
}

function shelfToWorld(shelf: Shelf, local: [number, number, number]): THREE.Vector3 {
  const cos = Math.cos(shelf.rotation[1]);
  const sin = Math.sin(shelf.rotation[1]);
  const [lx, ly, lz] = local;
  return new THREE.Vector3(
    shelf.position[0] + cos * lx + sin * lz,
    shelf.position[1] + ly,
    shelf.position[2] - sin * lx + cos * lz
  );
}

function worldToShelfLocal(shelf: Shelf, world: THREE.Vector3): [number, number, number] {
  const cos = Math.cos(shelf.rotation[1]);
  const sin = Math.sin(shelf.rotation[1]);
  const dx = world.x - shelf.position[0];
  const dy = world.y - shelf.position[1];
  const dz = world.z - shelf.position[2];
  return [cos * dx - sin * dz, dy, sin * dx + cos * dz];
}

export function BoxDragProxy() {
  const draggingBoxIds = useWarehouseStore((s) => s.draggingBoxIds);
  const boxes = useWarehouseStore((s) => s.boxes);
  const shelves = useWarehouseStore((s) => s.shelves);
  const updateBox = useWarehouseStore((s) => s.updateBox);
  const stopDragging = useWarehouseStore((s) => s.stopDragging);

  const boxMap = useMemo(() => getBoxTexture('zd230'), []);

  // Freeze the proxy snapshot at the moment dragging starts so the gizmo math
  // stays consistent throughout the drag (even if the store changes meanwhile).
  const snapshotRef = useRef<{
    items: ProxyItem[];
    centroid: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    if (draggingBoxIds.length === 0) {
      snapshotRef.current = null;
      return;
    }
    const ids = new Set(draggingBoxIds);
    const items: ProxyItem[] = [];
    for (const b of boxes) {
      if (!ids.has(b.id)) continue;
      const sh = shelves.find((s) => s.id === b.shelfId);
      if (!sh) continue;
      items.push({
        id: b.id,
        box: b,
        shelf: sh,
        worldStart: shelfToWorld(sh, b.position),
        offsetFromCentroid: new THREE.Vector3(),
      });
    }
    if (items.length === 0) {
      snapshotRef.current = null;
      return;
    }
    const centroid = new THREE.Vector3();
    items.forEach((it) => centroid.add(it.worldStart));
    centroid.divideScalar(items.length);
    items.forEach((it) => it.offsetFromCentroid.copy(it.worldStart).sub(centroid));
    snapshotRef.current = { items, centroid };
    // Intentionally only re-snapshot when the SET of dragging ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingBoxIds.join('|')]);

  const dragDelta = useRef(new THREE.Vector3());

  if (draggingBoxIds.length === 0 || !snapshotRef.current) return null;
  const { items, centroid } = snapshotRef.current;

  const handleDragStart = () => {
    if (cameraRef.current) cameraRef.current.enabled = false;
    dragDelta.current.set(0, 0, 0);
  };

  const handleDrag = (
    _local: THREE.Matrix4,
    _deltaLocal: THREE.Matrix4,
    _world: THREE.Matrix4,
    deltaWorld: THREE.Matrix4
  ) => {
    // deltaWorld carries the cumulative translation since drag start.
    dragDelta.current.setFromMatrixPosition(deltaWorld);
  };

  const handleDragEnd = () => {
    if (cameraRef.current) cameraRef.current.enabled = true;
    // Snap the commit to 0.5 m blocks so boxes stay grid-aligned on shelves.
    const SNAP = 0.5;
    const raw = dragDelta.current;
    const snapped = new THREE.Vector3(
      Math.round(raw.x / SNAP) * SNAP,
      Math.round(raw.y / SNAP) * SNAP,
      Math.round(raw.z / SNAP) * SNAP
    );
    items.forEach((it) => {
      const newWorld = it.worldStart.clone().add(snapped);
      const localPos = worldToShelfLocal(it.shelf, newWorld);
      updateBox(it.id, { position: localPos });
    });
    stopDragging();
  };

  return (
    <PivotControls
      anchor={[0, 0, 0]}
      offset={[centroid.x, centroid.y, centroid.z]}
      scale={1.4}
      lineWidth={3}
      depthTest={false}
      disableRotations
      disableSliders
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <group position={[centroid.x, centroid.y, centroid.z]}>
        {items.map((it) => (
          <mesh
            key={it.id}
            position={it.offsetFromCentroid.toArray()}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[it.box.size[0], it.box.size[1], it.box.size[2]]} />
            <meshStandardMaterial
              map={boxMap}
              color={it.box.color}
              transparent
              opacity={0.92}
              emissive="#38bdf8"
              emissiveIntensity={0.18}
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>
        ))}
      </group>
    </PivotControls>
  );
}
