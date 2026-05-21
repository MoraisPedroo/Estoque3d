import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from './firebase';
import { Box, Door, Furniture, Shelf, Wall } from './data';

const LAYOUT_COLLECTION = 'layouts';
const LAYOUT_DOC_ID = 'main';
const SNAPSHOT_VERSION = 1 as const;

export interface LayoutSnapshot {
  version: typeof SNAPSHOT_VERSION;
  warehouseSize: { width: number; depth: number };
  shelves: Shelf[];
  boxes: Box[];
  walls: Wall[];
  furniture: Furniture[];
  doors: Door[];
}

/**
 * Firestore can't serialise `undefined` values — strip them before writing so
 * boxes whose `serial` field is unset don't blow up the save.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

export async function saveLayout(snap: LayoutSnapshot): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firestore indisponível (executando no servidor?)');
  const ref = doc(db, LAYOUT_COLLECTION, LAYOUT_DOC_ID);
  await setDoc(ref, {
    ...stripUndefined(snap),
    updatedAt: serverTimestamp(),
  });
}

export async function loadLayout(): Promise<LayoutSnapshot | null> {
  const db = getDb();
  if (!db) return null;
  const ref = doc(db, LAYOUT_COLLECTION, LAYOUT_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<LayoutSnapshot> & { version?: number };
  if (data.version !== SNAPSHOT_VERSION) {
    // Future-proofing — migrate if/when the snapshot schema bumps.
    console.warn('LayoutSnapshot version mismatch', data.version);
  }
  return {
    version: SNAPSHOT_VERSION,
    warehouseSize: data.warehouseSize ?? { width: 40, depth: 40 },
    shelves: data.shelves ?? [],
    boxes: data.boxes ?? [],
    walls: data.walls ?? [],
    furniture: data.furniture ?? [],
    doors: data.doors ?? [],
  };
}
