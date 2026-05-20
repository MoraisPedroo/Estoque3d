import { create } from 'zustand';
import {
  Box,
  Furniture,
  FurnitureType,
  ItemType,
  SelectedItem,
  Shelf,
  TransformMode,
  Wall,
  defaultShelves,
  generateBoxesForShelf,
  generateInitialBoxes,
  uid,
} from '@/lib/data';

export type ViewMode = 'floor' | 'rack';

interface WarehouseState {
  warehouseSize: { width: number; depth: number };
  shelves: Shelf[];
  boxes: Box[];
  walls: Wall[];
  furniture: Furniture[];

  view: ViewMode;
  selectedShelfId: string | null;
  selectedRow: number | null;
  selectedItem: SelectedItem | null;
  hoveredBoxId: string | null;
  transformMode: TransformMode;

  setWarehouseSize: (width: number, depth: number) => void;

  zoomToShelf: (id: string) => void;
  backToFloor: () => void;
  selectRow: (row: number | null) => void;

  selectItem: (item: SelectedItem | null) => void;
  setHoveredBoxId: (id: string | null) => void;
  setTransformMode: (m: TransformMode) => void;

  updateBox: (id: string, patch: Partial<Box>) => void;
  updateShelf: (id: string, patch: Partial<Shelf>) => void;
  updateWall: (id: string, patch: Partial<Wall>) => void;
  updateFurniture: (id: string, patch: Partial<Furniture>) => void;

  addShelf: () => void;
  addWall: () => void;
  addFurniture: (type: FurnitureType) => void;

  removeItem: (id: string, type: ItemType) => void;
}

const initialShelves = defaultShelves();
const initialBoxes = generateInitialBoxes(initialShelves);

const DIM_KEYS: Array<keyof Shelf> = ['rows', 'columns', 'boxSize'];
const shouldRegenBoxes = (patch: Partial<Shelf>) =>
  DIM_KEYS.some((k) => k in patch);

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  warehouseSize: { width: 40, depth: 40 },
  shelves: initialShelves,
  boxes: initialBoxes,
  walls: [],
  furniture: [],

  view: 'floor',
  selectedShelfId: null,
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

  zoomToShelf: (id) =>
    set({
      selectedShelfId: id,
      view: 'rack',
      selectedRow: null,
      selectedItem: { id, type: 'shelf' },
    }),

  backToFloor: () =>
    set({
      selectedShelfId: null,
      selectedRow: null,
      view: 'floor',
      hoveredBoxId: null,
      selectedItem: null,
    }),

  selectRow: (row) => set({ selectedRow: row }),

  selectItem: (item) => set({ selectedItem: item }),
  setHoveredBoxId: (id) => set({ hoveredBoxId: id }),
  setTransformMode: (m) => set({ transformMode: m }),

  updateBox: (id, patch) =>
    set((s) => ({ boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

  updateShelf: (id, patch) =>
    set((s) => {
      const idx = s.shelves.findIndex((sh) => sh.id === id);
      if (idx < 0) return s;
      const next: Shelf = {
        ...s.shelves[idx],
        ...patch,
        rows: patch.rows !== undefined ? Math.max(1, Math.min(10, Math.floor(patch.rows))) : s.shelves[idx].rows,
        columns:
          patch.columns !== undefined
            ? Math.max(1, Math.min(40, Math.floor(patch.columns)))
            : s.shelves[idx].columns,
        boxSize: patch.boxSize
          ? [
              Math.max(0.1, patch.boxSize[0]),
              Math.max(0.1, patch.boxSize[1]),
              Math.max(0.1, patch.boxSize[2]),
            ]
          : s.shelves[idx].boxSize,
      };
      const shelves = s.shelves.map((sh, i) => (i === idx ? next : sh));
      let boxes = s.boxes;
      if (shouldRegenBoxes(patch)) {
        const otherBoxes = boxes.filter((b) => b.shelfId !== id);
        const shelfBoxes = boxes.filter((b) => b.shelfId === id);
        const fresh = generateBoxesForShelf(next, idx, shelfBoxes);
        boxes = [...otherBoxes, ...fresh];
      }
      return { shelves, boxes };
    }),

  updateWall: (id, patch) =>
    set((s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
  updateFurniture: (id, patch) =>
    set((s) => ({
      furniture: s.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  addShelf: () => {
    const id = uid('shelf');
    set((s) => {
      const newShelf: Shelf = {
        id,
        label: `S${s.shelves.length + 1}`,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        rows: 3,
        columns: 6,
        boxSize: [0.9, 0.55, 0.7],
      };
      const shelves = [...s.shelves, newShelf];
      const fresh = generateBoxesForShelf(newShelf, shelves.length - 1);
      return { shelves, boxes: [...s.boxes, ...fresh], selectedItem: { id, type: 'shelf' } };
    });
  },

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
      furniture: [...s.furniture, { id, type, position: [0, 0, 0], rotation: [0, 0, 0] }],
      selectedItem: { id, type: 'furniture' },
    }));
  },

  removeItem: (id, type) =>
    set((s) => {
      const clearSel = s.selectedItem?.id === id ? null : s.selectedItem;
      if (type === 'shelf') {
        return {
          shelves: s.shelves.filter((sh) => sh.id !== id),
          boxes: s.boxes.filter((b) => b.shelfId !== id),
          selectedItem: clearSel,
          selectedShelfId: s.selectedShelfId === id ? null : s.selectedShelfId,
          view: s.selectedShelfId === id ? 'floor' : s.view,
          selectedRow: s.selectedShelfId === id ? null : s.selectedRow,
        };
      }
      if (type === 'wall') {
        return { walls: s.walls.filter((w) => w.id !== id), selectedItem: clearSel };
      }
      if (type === 'furniture') {
        return { furniture: s.furniture.filter((f) => f.id !== id), selectedItem: clearSel };
      }
      if (type === 'box') {
        return { boxes: s.boxes.filter((b) => b.id !== id), selectedItem: clearSel };
      }
      return s;
    }),
}));
