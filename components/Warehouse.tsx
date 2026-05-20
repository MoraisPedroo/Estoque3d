'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { Rack } from './Rack';
import { Text } from '@react-three/drei';

export function Warehouse() {
  const racks = useWarehouseStore((s) => s.racks);

  return (
    <group>
      {racks.map((rack) => (
        <Rack key={rack.id} rack={rack} />
      ))}

      <Text
        position={[0, 0.02, -11]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.1}
        color="#1f2937"
        anchorX="center"
        anchorY="middle"
      >
        ARMAZÉM DE IMPRESSORAS
      </Text>
    </group>
  );
}
