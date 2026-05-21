'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { rackDepthOf, rackWidthOf, Shelf, Wall } from '@/lib/data';

const EYE_HEIGHT = 1.7;
const SPEED = 4.2;
const SPRINT = 7.2;
const ACCEL = 14; // smoothing factor
const COLLISION_PAD = 0.4; // body radius

type CollisionRect = {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  cos: number;
  sin: number;
};

function rectFromShelf(s: Shelf): CollisionRect {
  return {
    cx: s.position[0],
    cz: s.position[2],
    halfW: rackWidthOf(s) / 2 + COLLISION_PAD,
    halfD: rackDepthOf(s) / 2 + COLLISION_PAD,
    cos: Math.cos(s.rotation[1]),
    sin: Math.sin(s.rotation[1]),
  };
}

function rectFromWall(w: Wall): CollisionRect {
  return {
    cx: w.position[0],
    cz: w.position[2],
    halfW: w.scale[0] / 2 + COLLISION_PAD,
    halfD: w.scale[2] / 2 + COLLISION_PAD,
    cos: Math.cos(w.rotation[1]),
    sin: Math.sin(w.rotation[1]),
  };
}

function collides(x: number, z: number, rects: CollisionRect[]) {
  for (const r of rects) {
    const dx = x - r.cx;
    const dz = z - r.cz;
    // Rotate the point into the rect's local frame
    const lx = r.cos * dx - r.sin * dz;
    const lz = r.sin * dx + r.cos * dz;
    if (Math.abs(lx) < r.halfW && Math.abs(lz) < r.halfD) return true;
  }
  return false;
}

export function WalkMode() {
  const appMode = useWarehouseStore((s) => s.appMode);
  const shelves = useWarehouseStore((s) => s.shelves);
  const walls = useWarehouseStore((s) => s.walls);
  const warehouseSize = useWarehouseStore((s) => s.warehouseSize);
  const setAppMode = useWarehouseStore((s) => s.setAppMode);
  const { camera } = useThree();

  // Snapshot collision geometry — refreshed every render but the per-frame loop
  // reads via ref for stable JS engine perf.
  const rectsRef = useRef<CollisionRect[]>([]);
  rectsRef.current = [
    ...shelves.map(rectFromShelf),
    ...walls.map(rectFromWall),
  ];

  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false });
  const velocity = useRef(new THREE.Vector3());
  const isWalking = appMode === 'walk';

  // Initial placement when entering walk mode.
  useEffect(() => {
    if (!isWalking) return;
    // Spawn in an aisle — try the warehouse centre, walk a step back if we land
    // inside an obstacle.
    let spawnX = 0;
    let spawnZ = Math.min(warehouseSize.depth / 2 - 2, 10);
    let safety = 0;
    while (collides(spawnX, spawnZ, rectsRef.current) && safety < 20) {
      spawnZ -= 1;
      safety++;
    }
    camera.position.set(spawnX, EYE_HEIGHT, spawnZ);
    camera.lookAt(0, EYE_HEIGHT, 0);
  }, [isWalking, camera, warehouseSize.depth]);

  // Keyboard listeners
  useEffect(() => {
    if (!isWalking) return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.current.w = true;
      else if (k === 's' || k === 'arrowdown') keys.current.s = true;
      else if (k === 'a' || k === 'arrowleft') keys.current.a = true;
      else if (k === 'd' || k === 'arrowright') keys.current.d = true;
      else if (k === 'shift') keys.current.shift = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.current.w = false;
      else if (k === 's' || k === 'arrowdown') keys.current.s = false;
      else if (k === 'a' || k === 'arrowleft') keys.current.a = false;
      else if (k === 'd' || k === 'arrowright') keys.current.d = false;
      else if (k === 'shift') keys.current.shift = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      keys.current = { w: false, a: false, s: false, d: false, shift: false };
      velocity.current.set(0, 0, 0);
    };
  }, [isWalking]);

  // Per-frame movement + collision
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    if (!isWalking) return;
    const k = keys.current;

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    if (forward.current.lengthSq() === 0) return;
    forward.current.normalize();
    right.current.set(forward.current.z, 0, -forward.current.x); // forward rotated -90° around Y

    desired.current.set(0, 0, 0);
    if (k.w) desired.current.add(forward.current);
    if (k.s) desired.current.sub(forward.current);
    if (k.d) desired.current.add(right.current);
    if (k.a) desired.current.sub(right.current);
    if (desired.current.lengthSq() > 0) {
      desired.current.normalize().multiplyScalar(k.shift ? SPRINT : SPEED);
    }

    // Smooth velocity towards desired
    velocity.current.lerp(desired.current, Math.min(1, ACCEL * dt));

    // Apply axis-by-axis so a wall on one axis doesn't block movement on the other.
    const stepX = velocity.current.x * dt;
    const stepZ = velocity.current.z * dt;
    const nextX = camera.position.x + stepX;
    if (!collides(nextX, camera.position.z, rectsRef.current)) {
      camera.position.x = nextX;
    } else {
      velocity.current.x = 0;
    }
    const nextZ = camera.position.z + stepZ;
    if (!collides(camera.position.x, nextZ, rectsRef.current)) {
      camera.position.z = nextZ;
    } else {
      velocity.current.z = 0;
    }

    // Soft warehouse boundary
    const halfW = warehouseSize.width / 2 - 0.5;
    const halfD = warehouseSize.depth / 2 - 0.5;
    if (camera.position.x > halfW) camera.position.x = halfW;
    if (camera.position.x < -halfW) camera.position.x = -halfW;
    if (camera.position.z > halfD) camera.position.z = halfD;
    if (camera.position.z < -halfD) camera.position.z = -halfD;

    camera.position.y = EYE_HEIGHT;
  });

  // Exit walk mode when pointer lock is released (Esc).
  useEffect(() => {
    if (!isWalking) return;
    const onLockChange = () => {
      if (!document.pointerLockElement) setAppMode('view');
    };
    document.addEventListener('pointerlockchange', onLockChange);
    return () => document.removeEventListener('pointerlockchange', onLockChange);
  }, [isWalking, setAppMode]);

  if (!isWalking) return null;
  return <PointerLockControls makeDefault />;
}
