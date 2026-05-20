import { create } from 'zustand';
import {
  Box,
  Door,
  Furniture,
  FurnitureType,
  ItemType,
  MODEL_COLORS,
  SelectedItem,
  Shelf,
  TransformMode,
  Wall,
  defaultShelves,
  generateBoxesForShelf,
  generateInitialBoxes,
  localBoxPosition,
  uid,
} from '@/lib/data';
import { snapDoorToWall } from '@/lib/snap';

export type ViewMode = 'floor' | 'rack';
export type AppMode = 'view' | 'edit';

interface WarehouseState {
  appMode: AppMode;
  warehouseSize: { width: number; depth: number };
  shelves: Shelf[];
  boxes: Box[];
  walls: Wall[];
  furniture: Furniture[];
  doors: Door[];

  /** Box currently in "relocate by clicking another slot" mode (view-mode flow). */
  relocatingBoxId: string | null;
  /** Shelf opened in 2D grid inspection mode. */
  inspectingShelf: { id: string; layer: number | null } | null;
  /** Box pinpointed by the search panel — drives the route line + shelf highlight. */
  searchSelectedBoxId: string | null;
  /** Friendly alert shown by SearchPanel when route can't be drawn (e.g. no principal door). */
  routeAlert: string | null;

  view: ViewMode;
  selectedShelfId: string | null;
  selectedRow: number | null;
  selectedItems: SelectedItem[];
  hoveredBoxId: string | null;
  transformMode: TransformMode;
  /** IDs of boxes currently in the drag-proxy mode (hidden from InstancedMesh). */
  draggingBoxIds: string[];

  setAppMode: (mode: AppMode) => void;
  setWarehouseSize: (width: number, depth: number) => void;

  zoomToShelf: (id: string) => void;
  backToFloor: () => void;
  selectRow: (row: number | null) => void;

  selectItem: (item: SelectedItem | null) => void;
  toggleSelection: (item: SelectedItem) => void;
  clearSelection: () => void;
  setHoveredBoxId: (id: string | null) => void;
  setTransformMode: (m: TransformMode) => void;

  updateBox: (id: string, patch: Partial<Box>) => void;
  bulkUpdateBoxes: (ids: string[], patch: Partial<Box>) => void;
  updateShelf: (id: string, patch: Partial<Shelf>) => void;
  updateWall: (id: string, patch: Partial<Wall>) => void;
  updateFurniture: (id: string, patch: Partial<Furniture>) => void;

  addShelf: () => void;
  addWall: () => void;
  addFurniture: (type: FurnitureType) => void;
  addDoor: () => void;
  updateDoor: (id: string, patch: Partial<Door>) => void;
  setDoorPrincipal: (id: string, principal: boolean) => void;

  setRelocatingBox: (id: string | null) => void;
  relocateToBox: (sourceId: string, destBoxId: string) => void;
  clearBox: (id: string) => void;

  openShelfInspection: (id: string, layer: number | null) => void;
  setInspectionLayer: (layer: number) => void;
  closeShelfInspection: () => void;

  searchSelectBox: (boxId: string | null) => void;
  dismissRouteAlert: () => void;

  removeItem: (id: string, type: ItemType) => void;
  removeSelectedItems: () => void;

  relocateBox: (boxId: string, newShelfId: string, layer: number, row: number, col: number) => void;

  startDraggingSelected: () => void;
  stopDragging: () => void;
}

const initialShelves = defaultShelves();
const initialBoxes = generateInitialBoxes(initialShelves);

const DIM_KEYS: Array<keyof Shelf> = ['rows', 'columns', 'depthLayers', 'boxSize'];
const shouldRegenBoxes = (patch: Partial<Shelf>) => DIM_KEYS.some((k) => k in patch);

const sameItem = (a: SelectedItem, b: SelectedItem) => a.id === b.id && a.type === b.type;

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  appMode: 'view',
  warehouseSize: { width: 40, depth: 40 },
  shelves: initialShelves,
  boxes: initialBoxes,
  walls: [],
  furniture: [],
  doors: [],
  relocatingBoxId: null,
  inspectingShelf: null,
  searchSelectedBoxId: null,
  routeAlert: null,

  view: 'floor',
  selectedShelfId: null,
  selectedRow: null,
  selectedItems: [],
  hoveredBoxId: null,
  transformMode: 'translate',
  draggingBoxIds: [],

  setAppMode: (mode) =>
    set((s) => ({
      appMode: mode,
      // leaving edit mode → drop architectural selection
      selectedItems:
        mode === 'view'
          ? s.selectedItems.filter((it) => it.type === 'box')
          : s.selectedItems,
    })),

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
      selectedItems: [{ id, type: 'shelf' }],
    }),

  backToFloor: () =>
    set({
      selectedShelfId: null,
      selectedRow: null,
      view: 'floor',
      hoveredBoxId: null,
      selectedItems: [],
    }),

  selectRow: (row) => set({ selectedRow: row }),

  selectItem: (item) => set({ selectedItems: item ? [item] : [] }),

  toggleSelection: (item) =>
    set((s) => {
      const idx = s.selectedItems.findIndex((it) => sameItem(it, item));
      if (idx >= 0) {
        const next = [...s.selectedItems];
        next.splice(idx, 1);
        return { selectedItems: next };
      }
      // Restrict multi-selection to homogeneous types (mainly boxes)
      const filtered = s.selectedItems.filter((it) => it.type === item.type);
      return { selectedItems: [...filtered, item] };
    }),

  clearSelection: () => set({ selectedItems: [] }),

  setHoveredBoxId: (id) => set({ hoveredBoxId: id }),
  setTransformMode: (m) => set({ transformMode: m }),

  updateBox: (id, patch) =>
    set((s) => ({ boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

  bulkUpdateBoxes: (ids, patch) =>
    set((s) => {
      const idSet = new Set(ids);
      return {
        boxes: s.boxes.map((b) => (idSet.has(b.id) ? { ...b, ...patch } : b)),
      };
    }),

  updateShelf: (id, patch) =>
    set((s) => {
      const idx = s.shelves.findIndex((sh) => sh.id === id);
      if (idx < 0) return s;
      const current = s.shelves[idx];
      const next: Shelf = {
        ...current,
        ...patch,
        rows:
          patch.rows !== undefined
            ? Math.max(1, Math.min(10, Math.floor(patch.rows)))
            : current.rows,
        columns:
          patch.columns !== undefined
            ? Math.max(1, Math.min(40, Math.floor(patch.columns)))
            : current.columns,
        depthLayers:
          patch.depthLayers !== undefined
            ? Math.max(1, Math.min(3, Math.floor(patch.depthLayers)))
            : current.depthLayers,
        boxSize: patch.boxSize
          ? [
              Math.max(0.1, patch.boxSize[0]),
              Math.max(0.1, patch.boxSize[1]),
              Math.max(0.1, patch.boxSize[2]),
            ]
          : current.boxSize,
      };
      next.capacityPerLayer = next.rows * next.columns;

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
        depthLayers: 1,
        capacityPerLayer: 3 * 6,
        boxSize: [0.9, 0.55, 0.7],
      };
      const shelves = [...s.shelves, newShelf];
      const fresh = generateBoxesForShelf(newShelf, shelves.length - 1);
      return {
        shelves,
        boxes: [...s.boxes, ...fresh],
        selectedItems: [{ id, type: 'shelf' }],
      };
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
      selectedItems: [{ id, type: 'wall' }],
    }));
  },

  addFurniture: (type) => {
    const id = uid('fur');
    set((s) => ({
      furniture: [...s.furniture, { id, type, position: [0, 0, 0], rotation: [0, 0, 0] }],
      selectedItems: [{ id, type: 'furniture' }],
    }));
  },

  addDoor: () => {
    const id = uid('door');
    set((s) => {
      const draft: Door = {
        id,
        position: [0, 1.05, 0],
        rotation: [0, 0, 0],
        scale: [1, 2.1, 0.06],
        color: '#8b5a2b',
        wallId: null,
        isPrincipal: s.doors.length === 0, // first door created is principal by default
      };
      const snapped = snapDoorToWall(draft, s.walls);
      return {
        doors: [...s.doors, snapped],
        selectedItems: [{ id, type: 'door' }],
      };
    });
  },

  updateDoor: (id, patch) =>
    set((s) => {
      const door = s.doors.find((d) => d.id === id);
      if (!door) return s;
      const merged: Door = { ...door, ...patch };
      const snapped =
        patch.position || patch.rotation || patch.scale
          ? snapDoorToWall(merged, s.walls)
          : merged;
      let doors = s.doors.map((d) => (d.id === id ? snapped : d));
      // If isPrincipal got promoted, demote all other doors.
      if (patch.isPrincipal === true) {
        doors = doors.map((d) => (d.id === id ? d : { ...d, isPrincipal: false }));
      }
      return { doors };
    }),

  setDoorPrincipal: (id, principal) =>
    set((s) => {
      if (!principal) {
        return { doors: s.doors.map((d) => (d.id === id ? { ...d, isPrincipal: false } : d)) };
      }
      // Promote one + demote all others — enforces the single-principal rule.
      return {
        doors: s.doors.map((d) => ({ ...d, isPrincipal: d.id === id })),
      };
    }),

  setRelocatingBox: (id) =>
    set((s) => ({
      relocatingBoxId: id,
      // Exit any zoom/selection so the user gets the panoramic view.
      selectedItems: id ? [] : s.selectedItems,
      view: id ? 'floor' : s.view,
      selectedShelfId: id ? null : s.selectedShelfId,
      selectedRow: id ? null : s.selectedRow,
    })),

  relocateToBox: (sourceId, destBoxId) =>
    set((state) => {
      if (sourceId === destBoxId) return state;
      const source = state.boxes.find((b) => b.id === sourceId);
      const dest = state.boxes.find((b) => b.id === destBoxId);
      if (!source || !dest) return state;
      const sourceShelf = state.shelves.find((sh) => sh.id === source.shelfId);
      const destShelf = state.shelves.find((sh) => sh.id === dest.shelfId);
      if (!sourceShelf || !destShelf) return state;

      const boxes = state.boxes.map((b) => {
        if (b.id === source.id) {
          return {
            ...b,
            shelfId: dest.shelfId,
            layerIndex: dest.layerIndex,
            rowIndex: dest.rowIndex,
            colIndex: dest.colIndex,
            position: dest.position,
            size: [...destShelf.boxSize] as [number, number, number],
          };
        }
        if (b.id === dest.id) {
          return {
            ...b,
            shelfId: source.shelfId,
            layerIndex: source.layerIndex,
            rowIndex: source.rowIndex,
            colIndex: source.colIndex,
            position: source.position,
            size: [...sourceShelf.boxSize] as [number, number, number],
          };
        }
        return b;
      });
      return { boxes, relocatingBoxId: null };
    }),

  clearBox: (id) =>
    set((s) => ({
      boxes: s.boxes.map((b) =>
        b.id === id
          ? {
              ...b,
              model: 'vazio',
              color: MODEL_COLORS.vazio,
              sku: 'VAZIO',
              serial: undefined,
            }
          : b
      ),
      selectedItems: s.selectedItems.filter((it) => it.id !== id),
    })),

  openShelfInspection: (id, layer) => set({ inspectingShelf: { id, layer } }),
  setInspectionLayer: (layer) =>
    set((s) => (s.inspectingShelf ? { inspectingShelf: { ...s.inspectingShelf, layer } } : s)),
  closeShelfInspection: () => set({ inspectingShelf: null }),

  searchSelectBox: (boxId) =>
    set((s) => {
      if (!boxId) return { searchSelectedBoxId: null, routeAlert: null };
      const principal = s.doors.find((d) => d.isPrincipal);
      if (!principal) {
        return {
          searchSelectedBoxId: null,
          routeAlert:
            'É necessário definir uma Porta Principal para traçar a rota. Crie ou marque uma porta como Principal no modo de edição.',
        };
      }
      return { searchSelectedBoxId: boxId, routeAlert: null };
    }),
  dismissRouteAlert: () => set({ routeAlert: null }),

  removeItem: (id, type) =>
    set((s) => {
      const selectedItems = s.selectedItems.filter((it) => it.id !== id);
      if (type === 'shelf') {
        return {
          shelves: s.shelves.filter((sh) => sh.id !== id),
          boxes: s.boxes.filter((b) => b.shelfId !== id),
          selectedItems,
          selectedShelfId: s.selectedShelfId === id ? null : s.selectedShelfId,
          view: s.selectedShelfId === id ? 'floor' : s.view,
          selectedRow: s.selectedShelfId === id ? null : s.selectedRow,
        };
      }
      if (type === 'wall') return { walls: s.walls.filter((w) => w.id !== id), selectedItems };
      if (type === 'furniture')
        return { furniture: s.furniture.filter((f) => f.id !== id), selectedItems };
      if (type === 'box') return { boxes: s.boxes.filter((b) => b.id !== id), selectedItems };
      if (type === 'door') return { doors: s.doors.filter((d) => d.id !== id), selectedItems };
      return s;
    }),

  removeSelectedItems: () => {
    const items = get().selectedItems;
    if (items.length === 0) return;
    items.forEach((it) => get().removeItem(it.id, it.type));
  },

  relocateBox: (boxId, newShelfId, layer, row, col) =>
    set((state) => {
      const box = state.boxes.find((b) => b.id === boxId);
      const destShelf = state.shelves.find((sh) => sh.id === newShelfId);
      if (!box || !destShelf) return state;

      const lyr = Math.max(0, Math.min(destShelf.depthLayers - 1, Math.floor(layer)));
      const r = Math.max(0, Math.min(destShelf.rows - 1, Math.floor(row)));
      const c = Math.max(0, Math.min(destShelf.columns - 1, Math.floor(col)));
      const newPos = localBoxPosition(destShelf, lyr, r, c);

      const occupant = state.boxes.find(
        (b) =>
          b.id !== boxId &&
          b.shelfId === newShelfId &&
          b.layerIndex === lyr &&
          b.rowIndex === r &&
          b.colIndex === c
      );

      const sourceShelf = state.shelves.find((sh) => sh.id === box.shelfId);
      const occupantOldPos =
        sourceShelf
          ? localBoxPosition(sourceShelf, box.layerIndex, box.rowIndex, box.colIndex)
          : box.position;

      const boxes = state.boxes.map((b) => {
        if (b.id === boxId) {
          return {
            ...b,
            shelfId: newShelfId,
            layerIndex: lyr,
            rowIndex: r,
            colIndex: c,
            position: newPos,
            size: [...destShelf.boxSize] as [number, number, number],
          };
        }
        if (occupant && b.id === occupant.id) {
          return {
            ...b,
            shelfId: box.shelfId,
            layerIndex: box.layerIndex,
            rowIndex: box.rowIndex,
            colIndex: box.colIndex,
            position: occupantOldPos,
            size: sourceShelf
              ? ([...sourceShelf.boxSize] as [number, number, number])
              : b.size,
          };
        }
        return b;
      });

      return { boxes };
    }),

  startDraggingSelected: () => {
    const items = get().selectedItems.filter((it) => it.type === 'box');
    if (items.length === 0) return;
    set({ draggingBoxIds: items.map((it) => it.id) });
  },

  stopDragging: () => set({ draggingBoxIds: [] }),
}));
