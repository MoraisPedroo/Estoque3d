'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, SoftShadows, ContactShadows, CameraControls, Grid } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import type CameraControlsImpl from 'camera-controls';
import { Warehouse } from './Warehouse';
import { InstancedBoxes } from './InstancedBoxes';
import { Walls } from './Walls';
import { Furniture } from './Furniture';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { cameraRef } from '@/lib/cameraRef';

function CameraDirector() {
  const localRef = useRef<CameraControlsImpl | null>(null);

  const view = useWarehouseStore((s) => s.view);
  const selectedRackId = useWarehouseStore((s) => s.selectedRackId);
  const racks = useWarehouseStore((s) => s.racks);
  const warehouseSize = useWarehouseStore((s) => s.warehouseSize);

  useEffect(() => {
    const controls = localRef.current;
    if (!controls) return;
    cameraRef.current = controls;

    if (view === 'floor' || !selectedRackId) {
      const maxDim = Math.max(warehouseSize.width, warehouseSize.depth);
      const camY = Math.max(maxDim * 0.7, 16);
      const camZ = Math.max(maxDim * 0.5, 14);
      controls.smoothTime = 0.6;
      controls.setLookAt(0, camY, camZ, 0, 0, 0, true);
      return;
    }

    const rack = racks.find((r) => r.id === selectedRackId);
    if (!rack) return;

    const [rx, , rz] = rack.position;
    const rackWidth = rack.columns * 0.95;
    const distance = Math.max(rackWidth * 0.9, 5);

    const forwardX = Math.sin(rack.rotationY);
    const forwardZ = Math.cos(rack.rotationY);

    controls.smoothTime = 0.7;
    controls.setLookAt(
      rx + forwardX * distance,
      1.6,
      rz + forwardZ * distance,
      rx,
      0.9,
      rz,
      true
    );
  }, [view, selectedRackId, racks, warehouseSize]);

  return (
    <CameraControls
      ref={localRef as unknown as React.RefObject<CameraControlsImpl>}
      makeDefault
      minDistance={2}
      maxDistance={120}
      dollySpeed={0.6}
      truckSpeed={1.2}
    />
  );
}

function Floor() {
  const warehouseSize = useWarehouseStore((s) => s.warehouseSize);
  const { width, depth } = warehouseSize;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#11151d" roughness={0.95} metalness={0.05} />
      </mesh>
      <Grid
        position={[0, 0.005, 0]}
        args={[width, depth]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#1f2937"
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor="#334155"
        fadeDistance={Math.max(width, depth) * 1.2}
        fadeStrength={1}
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
      <color attach="background" args={['#0b0f17']} />
      <fog attach="fog" args={['#0b0f17', 40, 140]} />

      <Suspense fallback={null}>
        <Environment preset="warehouse" />
      </Suspense>

      <SoftShadows size={28} samples={12} focus={0.7} />

      <ambientLight intensity={0.25} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0005}
      />

      <Floor />
      <Warehouse />
      <InstancedBoxes />
      <Walls />
      <Furniture />

      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={80} blur={2.4} far={8} />

      <CameraDirector />
    </Canvas>
  );
}
