import { create } from 'zustand';
import { buildWarehouse, RackData } from '@/lib/data';

export type ViewMode = 'floor' | 'rack';

interface WarehouseState {
  racks: RackData[];
  view: ViewMode;
  selectedRackId: string | null;
  selectedRow: number | null;
  hoveredBox: { rackId: string; slotIndex: number } | null;
  setView: (v: ViewMode) => void;
  selectRack: (id: string | null) => void;
  selectRow: (row: number | null) => void;
  setHoveredBox: (h: { rackId: string; slotIndex: number } | null) => void;
  backToFloor: () => void;
}

export const useWarehouseStore = create<WarehouseState>((set) => ({
  racks: buildWarehouse(),
  view: 'floor',
  selectedRackId: null,
  selectedRow: null,
  hoveredBox: null,
  setView: (view) => set({ view }),
  selectRack: (id) => set({ selectedRackId: id, view: id ? 'rack' : 'floor', selectedRow: null }),
  selectRow: (row) => set({ selectedRow: row }),
  setHoveredBox: (h) => set({ hoveredBox: h }),
  backToFloor: () => set({ selectedRackId: null, selectedRow: null, view: 'floor', hoveredBox: null }),
}));
