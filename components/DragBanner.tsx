'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';

export function DragBanner() {
  const draggingBoxIds = useWarehouseStore((s) => s.draggingBoxIds);
  const stopDragging = useWarehouseStore((s) => s.stopDragging);

  if (draggingBoxIds.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-5 z-20 -translate-x-1/2">
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-400" />
        <span className="text-slate-100">
          {draggingBoxIds.length === 1
            ? 'Arraste a caixa para a nova posição'
            : `Arrastando ${draggingBoxIds.length} caixas em conjunto`}
        </span>
        <span className="text-[11px] text-slate-400">snap 0,5 m</span>
        <button
          onClick={stopDragging}
          className="rounded-md border border-slate-700/70 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700/70"
        >
          Sair do modo arrastar
        </button>
      </div>
    </div>
  );
}
