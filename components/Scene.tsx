'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, SoftShadows, ContactShadows, CameraControls } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Warehouse } from './Warehouse';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import type CameraControlsImpl from 'camera-controls';

function CameraDirector() {
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  const view = useWarehouseStore((s) => s.view);
  const selectedRackId = useWarehouseStore((s) => s.selectedRackId);
  const racks = useWarehouseStore((s) => s.racks);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (view === 'floor' || !selectedRackId) {
      controls.smoothTime = 0.6;
      controls.setLookAt(0, 22, 18, 0, 0, 0, true);
      return;
    }

    const rack = racks.find((r) => r.id === selectedRackId);
    if (!rack) return;

    const [rx, , rz] = rack.position;
    const rackWidth = rack.columns * 0.95;
    const distance = Math.max(rackWidth * 0.9, 5);

    const forwardX = Math.sin(rack.rotationY);
    const forwardZ = Math.cos(rack.rotationY);

    const camX = rx + forwardX * distance;
    const camZ = rz + forwardZ * distance;

    controls.smoothTime = 0.7;
    controls.setLookAt(camX, 1.6, camZ, rx, 0.9, rz, true);
  }, [view, selectedRackId, racks]);

  return (
    <CameraControls
      ref={controlsRef as unknown as React.RefObject<CameraControlsImpl>}
      makeDefault
      minDistance={2}
      maxDistance={60}
      dollySpeed={0.6}
      truckSpeed={1.2}
    />
  );
}

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 35, position: [0, 22, 18], near: 0.1, far: 200 }}
    >
      <color attach="background" args={['#0b0f17']} />
      <fog attach="fog" args={['#0b0f17', 30, 90]} />

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
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0005}
      />

      <Floor />

      <Warehouse />

      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={60} blur={2.4} far={8} />

      <CameraDirector />
    </Canvas>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#11151d" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}
