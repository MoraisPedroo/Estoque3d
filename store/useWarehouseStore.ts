import { create } from 'zustand';
import {
  Box,
  Furniture,
  FurnitureType,
  Rack,
  SelectedItem,
  TransformMode,
  Wall,
  defaultRacks,
  generateInitialBoxes,
  uid,
} from '@/lib/data';

export type ViewMode = 'floor' | 'rack';

interface WarehouseState {
  warehouseSize: { width: number; depth: number };
  racks: Rack[];
  boxes: Box[];
  walls: Wall[];
  furniture: Furniture[];

  view: ViewMode;
  selectedRackId: string | null;
  selectedRow: number | null;
  selectedItem: SelectedItem | null;
  hoveredBoxId: string | null;
  transformMode: TransformMode;

  setWarehouseSize: (width: number, depth: number) => void;

  setView: (v: ViewMode) => void;
  selectRack: (id: string | null) => void;
  selectRow: (row: number | null) => void;
  backToFloor: () => void;

  selectItem: (item: SelectedItem | null) => void;
  setHoveredBoxId: (id: string | null) => void;
  setTransformMode: (m: TransformMode) => void;

  updateBox: (id: string, patch: Partial<Box>) => void;
  updateWall: (id: string, patch: Partial<Wall>) => void;
  updateFurniture: (id: string, patch: Partial<Furniture>) => void;

  addWall: () => void;
  addFurniture: (type: FurnitureType) => void;
  removeSelected: () => void;
}

const racks = defaultRacks();
const boxes = generateInitialBoxes(racks);

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  warehouseSize: { width: 40, depth: 40 },
  racks,
  boxes,
  walls: [],
  furniture: [],

  view: 'floor',
  selectedRackId: null,
  selectedRow: null,
  selectedItem: null,
  hoveredBoxId: null,
  transformMode: 'translate',

  setWarehouseSize: (width, depth) =>
    set({
      warehouseSize: {
        width: Math.max(5, Math.min(200, width)),
        depth: Math.max(5, Math.min(200, depth)),
      },
    }),

  setView: (view) => set({ view }),
  selectRack: (id) =>
    set({
      selectedRackId: id,
      view: id ? 'rack' : 'floor',
      selectedRow: null,
      selectedItem: id ? { id, type: 'rack' } : null,
    }),
  selectRow: (row) => set({ selectedRow: row }),
  backToFloor: () =>
    set({
      selectedRackId: null,
      selectedRow: null,
      view: 'floor',
      hoveredBoxId: null,
      selectedItem: null,
    }),

  selectItem: (item) => set({ selectedItem: item }),
  setHoveredBoxId: (id) => set({ hoveredBoxId: id }),
  setTransformMode: (m) => set({ transformMode: m }),

  updateBox: (id, patch) =>
    set((s) => ({
      boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),
  updateWall: (id, patch) =>
    set((s) => ({
      walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    })),
  updateFurniture: (id, patch) =>
    set((s) => ({
      furniture: s.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  addWall: () => {
    const id = uid('wall');
    set((s) => ({
      walls: [
        ...s.walls,
        {
          id,
          position: [0, 1.25, 0],
          rotation: [0, 0, 0],
          scale: [4, 2.5, 0.15],
          color: '#cbd5e1',
        },
      ],
      selectedItem: { id, type: 'wall' },
    }));
  },

  addFurniture: (type) => {
    const id = uid('fur');
    set((s) => ({
      furniture: [
        ...s.furniture,
        {
          id,
          type,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        },
      ],
      selectedItem: { id, type: 'furniture' },
    }));
  },

  removeSelected: () => {
    const sel = get().selectedItem;
    if (!sel) return;
    if (sel.type === 'wall') {
      set((s) => ({
        walls: s.walls.filter((w) => w.id !== sel.id),
        selectedItem: null,
      }));
    } else if (sel.type === 'furniture') {
      set((s) => ({
        furniture: s.furniture.filter((f) => f.id !== sel.id),
        selectedItem: null,
      }));
    }
  },
}));
