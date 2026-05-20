'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';

export function RelocateBanner() {
  const relocatingBoxId = useWarehouseStore((s) => s.relocatingBoxId);
  const boxes = useWarehouseStore((s) => s.boxes);
  const shelves = useWarehouseStore((s) => s.shelves);
  const setRelocatingBox = useWarehouseStore((s) => s.setRelocatingBox);

  if (!relocatingBoxId) return null;
  const box = boxes.find((b) => b.id === relocatingBoxId);
  const shelf = box ? shelves.find((sh) => sh.id === box.shelfId) : null;
  if (!box) return null;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-5 z-20 -translate-x-1/2">
      <div className="glass flex items-center gap-4 rounded-2xl px-5 py-2.5 text-sm">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        <span className="text-slate-100">
          Selecione o novo local para a caixa{' '}
          <span className="font-semibold text-amber-300">{box.sku}</span>
          {shelf && (
            <span className="text-slate-400"> · origem: estante {shelf.label}</span>
          )}
        </span>
        <button
          onClick={() => setRelocatingBox(null)}
          className="rounded-md border border-slate-700/70 bg-slate-800/60 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-700/70"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
