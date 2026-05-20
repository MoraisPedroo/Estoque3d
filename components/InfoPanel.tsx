'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { ROWS } from '@/lib/data';

export function InfoPanel() {
  const view = useWarehouseStore((s) => s.view);
  const racks = useWarehouseStore((s) => s.racks);
  const boxes = useWarehouseStore((s) => s.boxes);
  const selectedRackId = useWarehouseStore((s) => s.selectedRackId);
  const selectedRow = useWarehouseStore((s) => s.selectedRow);
  const selectRow = useWarehouseStore((s) => s.selectRow);

  if (view === 'floor') {
    const filled = boxes.filter((b) => b.model !== 'vazio').length;
    return (
      <div className="pointer-events-none absolute bottom-5 left-5 z-10">
        <div className="glass rounded-2xl px-5 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Planta Baixa</div>
          <div className="mt-1 text-sm text-slate-200">
            {racks.length} estantes • {filled} caixas em estoque
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Clique em uma estante para inspecionar
          </div>
        </div>
      </div>
    );
  }

  const rack = racks.find((r) => r.id === selectedRackId);
  if (!rack) return null;

  const rackBoxes = boxes.filter((b) => b.rackId === rack.id);
  const totalSlots = rackBoxes.length;
  const filled = rackBoxes.filter((b) => b.model !== 'vazio').length;
  const occupancy = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;

  return (
    <div className="pointer-events-auto absolute bottom-5 left-5 z-10 w-[300px]">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Estante</div>
            <div className="text-2xl font-semibold text-slate-100">{rack.label}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Ocupação</div>
            <div className="text-xl font-semibold text-sky-300">{occupancy}%</div>
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all"
            style={{ width: `${occupancy}%` }}
          />
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Fileiras</div>
          <div className="flex gap-2">
            {Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i).map((row) => {
              const active = selectedRow === row;
              return (
                <button
                  key={row}
                  onClick={() => selectRow(active ? null : row)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                    active
                      ? 'border-sky-400/60 bg-sky-400/15 text-sky-200'
                      : 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:bg-slate-700/40'
                  }`}
                >
                  Fileira {row + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Clique numa caixa para abrir o inspetor de propriedades.
        </div>
      </div>
    </div>
  );
}
