'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { MODEL_COLORS, MODEL_LABELS, ROWS } from '@/lib/data';

export function InfoPanel() {
  const view = useWarehouseStore((s) => s.view);
  const racks = useWarehouseStore((s) => s.racks);
  const selectedRackId = useWarehouseStore((s) => s.selectedRackId);
  const selectedRow = useWarehouseStore((s) => s.selectedRow);
  const hoveredBox = useWarehouseStore((s) => s.hoveredBox);
  const selectRow = useWarehouseStore((s) => s.selectRow);

  if (view === 'floor') {
    return (
      <div className="pointer-events-none absolute bottom-5 left-5 z-10">
        <div className="glass rounded-2xl px-5 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Planta Baixa</div>
          <div className="mt-1 text-sm text-slate-200">
            {racks.length} estantes •{' '}
            {racks.reduce((acc, r) => acc + r.slots.filter(Boolean).length, 0)} caixas em estoque
          </div>
        </div>
      </div>
    );
  }

  const rack = racks.find((r) => r.id === selectedRackId);
  if (!rack) return null;

  const totalSlots = rack.slots.length;
  const filled = rack.slots.filter(Boolean).length;
  const occupancy = Math.round((filled / totalSlots) * 100);

  const hoverSlot =
    hoveredBox && hoveredBox.rackId === rack.id ? rack.slots[hoveredBox.slotIndex] : null;
  const hoverRow =
    hoveredBox && hoveredBox.rackId === rack.id
      ? Math.floor(hoveredBox.slotIndex / rack.columns)
      : null;
  const hoverCol =
    hoveredBox && hoveredBox.rackId === rack.id ? (hoveredBox.slotIndex % rack.columns) + 1 : null;

  return (
    <div className="pointer-events-auto absolute bottom-5 left-5 z-10 w-[320px]">
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

        <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
          {hoverSlot ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: MODEL_COLORS[hoverSlot.model] }}
                />
                <span className="text-sm font-semibold text-slate-100">
                  {MODEL_LABELS[hoverSlot.model]}
                </span>
              </div>
              <div className="mt-1.5 text-xs text-slate-400">
                SKU <span className="text-slate-200">{hoverSlot.sku}</span>
                {hoverSlot.serial && (
                  <>
                    {' • '}
                    Série <span className="text-slate-200">{hoverSlot.serial}</span>
                  </>
                )}
              </div>
              <div className="text-xs text-slate-400">
                Posição: Fileira {(hoverRow ?? 0) + 1} · Coluna {hoverCol}
              </div>
            </>
          ) : hoveredBox ? (
            <div className="text-sm text-slate-400">Slot vazio</div>
          ) : (
            <div className="text-sm text-slate-500">
              Passe o mouse sobre uma caixa para ver detalhes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
