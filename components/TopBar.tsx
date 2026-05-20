'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { MODEL_COLORS, MODEL_LABELS, PrinterModel } from '@/lib/data';

export function TopBar() {
  const view = useWarehouseStore((s) => s.view);
  const selectedRackId = useWarehouseStore((s) => s.selectedRackId);
  const racks = useWarehouseStore((s) => s.racks);
  const backToFloor = useWarehouseStore((s) => s.backToFloor);

  const rack = racks.find((r) => r.id === selectedRackId);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5">
      <div className="glass pointer-events-auto rounded-2xl px-5 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Gêmeo Digital
        </div>
        <div className="text-lg font-semibold text-slate-100">
          Estoque de Impressoras
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {view === 'floor'
            ? 'Clique em uma estante para inspecionar'
            : rack
            ? `Estante ${rack.label} — clique em uma fileira para destacá-la`
            : ''}
        </div>
      </div>

      <div className="glass pointer-events-auto flex flex-col gap-2 rounded-2xl px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Legenda</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {(['laser', 'jato', 'multifuncional', 'industrial', 'vazio'] as PrinterModel[]).map(
            (m) => (
              <div key={m} className="flex items-center gap-2 text-xs text-slate-200">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: MODEL_COLORS[m] }}
                />
                {MODEL_LABELS[m]}
              </div>
            )
          )}
        </div>
      </div>

      {view === 'rack' && (
        <button
          onClick={backToFloor}
          className="glass pointer-events-auto rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800/70"
        >
          ← Voltar à planta
        </button>
      )}
    </div>
  );
}
