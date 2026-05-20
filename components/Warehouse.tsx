'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { Shelf } from './Shelf';
import { Text } from '@react-three/drei';

export function Warehouse() {
  const shelves = useWarehouseStore((s) => s.shelves);

  return (
    <group>
      {shelves.map((shelf) => (
        <Shelf key={shelf.id} shelf={shelf} />
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
