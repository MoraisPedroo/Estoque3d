'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, SoftShadows, ContactShadows, CameraControls, Grid } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type CameraControlsImpl from 'camera-controls';
import { Warehouse } from './Warehouse';
import { Walls } from './Walls';
import { Furniture } from './Furniture';
import { Doors } from './Doors';
import { BoxDragProxy } from './BoxDragProxy';
import { RouteLine } from './RouteLine';
import { WalkMode } from './WalkMode';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { cameraRef } from '@/lib/cameraRef';

function CameraDirector() {
  const localRef = useRef<CameraControlsImpl | null>(null);

  const view = useWarehouseStore((s) => s.view);
  const appMode = useWarehouseStore((s) => s.appMode);
  const selectedShelfId = useWarehouseStore((s) => s.selectedShelfId);
  const shelves = useWarehouseStore((s) => s.shelves);
  const warehouseSize = useWarehouseStore((s) => s.warehouseSize);

  useEffect(() => {
    const controls = localRef.current;
    if (!controls) return;
    if (appMode === 'walk') return; // walk mode owns the camera
    cameraRef.current = controls;

    if (view === 'floor' || !selectedShelfId) {
      const maxDim = Math.max(warehouseSize.width, warehouseSize.depth);
      const camY = Math.max(maxDim * 0.7, 16);
      const camZ = Math.max(maxDim * 0.5, 14);
      controls.smoothTime = 0.6;
      controls.setLookAt(0, camY, camZ, 0, 0, 0, true);
      return;
    }

    const shelf = shelves.find((s) => s.id === selectedShelfId);
    if (!shelf) return;

    const [sx, , sz] = shelf.position;
    const shelfWidth = shelf.columns * 0.95;
    const distance = Math.max(shelfWidth * 0.9, 5);
    const rotY = shelf.rotation[1];
    const forwardX = Math.sin(rotY);
    const forwardZ = Math.cos(rotY);

    controls.smoothTime = 0.7;
    controls.setLookAt(
      sx + forwardX * distance,
      1.6,
      sz + forwardZ * distance,
      sx,
      0.9,
      sz,
      true
    );
  }, [view, selectedShelfId, shelves, warehouseSize, appMode]);

  if (appMode === 'walk') return null;

  return (
    <CameraControls
      ref={localRef as unknown as React.RefObject<CameraControlsImpl>}
      makeDefault
      // Floor lock — the camera cannot dip below ground level (creates a virtual glass floor).
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2 - 0.01}
      // Keep the user inside the warehouse — no infinite drift outside.
      minDistance={3}
      maxDistance={80}
      dollySpeed={0.6}
      truckSpeed={1.2}
    />
  );
}

function useConcreteTexture() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#b5b5b1';
    ctx.fillRect(0, 0, size, size);

    // grain
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() - 0.5) * 32;
      img.data[i] = Math.max(0, Math.min(255, img.data[i] + v));
      img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + v));
      img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + v));
    }
    ctx.putImageData(img, 0, 0);

    // pores / stains
    for (let n = 0; n < 220; n++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 4 + 1;
      ctx.fillStyle = `rgba(60,60,55,${Math.random() * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // larger discolorations
    for (let n = 0; n < 18; n++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 60 + 20;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(120,110,100,0.06)');
      grad.addColorStop(1, 'rgba(120,110,100,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, []);
}

function Floor() {
  const warehouseSize = useWarehouseStore((s) => s.warehouseSize);
  const selectItem = useWarehouseStore((s) => s.selectItem);
  const setRelocatingBox = useWarehouseStore((s) => s.setRelocatingBox);
  const concrete = useConcreteTexture();
  const { width, depth } = warehouseSize;

  // Repeat texture every ~2 meters
  if (concrete) concrete.repeat.set(width / 2, depth / 2);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={(e) => {
          if (e.delta > 5) return;
          // Clicking empty floor cancels relocate flow and clears selection.
          setRelocatingBox(null);
          selectItem(null);
        }}
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          map={concrete ?? undefined}
          color={concrete ? '#ffffff' : '#b8b8b4'}
          roughness={0.92}
          metalness={0.04}
        />
      </mesh>
      <Grid
        position={[0, 0.005, 0]}
        args={[width, depth]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#7d7d78"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#5b5b56"
        fadeDistance={Math.max(width, depth) * 1.2}
        fadeStrength={1.1}
        infiniteGrid={false}
        followCamera={false}
      />
    </group>
  );
}

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 35, position: [0, 22, 18], near: 0.1, far: 300 }}
    >
      <fog attach="fog" args={['#cbd0d6', 90, 220]} />

      <Suspense fallback={null}>
        <Environment preset="warehouse" background backgroundBlurriness={0.35} />
      </Suspense>

      <SoftShadows size={28} samples={14} focus={0.8} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[14, 22, 10]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0005}
      />

      <Floor />
      <Warehouse />
      <Walls />
      <Doors />
      <Furniture />
      <BoxDragProxy />
      <RouteLine />

      <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={80} blur={2.2} far={8} />

      <CameraDirector />
      <WalkMode />
    </Canvas>
  );
}
