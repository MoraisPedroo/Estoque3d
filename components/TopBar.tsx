'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { MODEL_COLORS, MODEL_LABELS, PrinterModel } from '@/lib/data';
import type { AppMode } from '@/store/useWarehouseStore';

const MODE_ITEMS: Array<{ id: AppMode; label: string; icon: string }> = [
  { id: 'view', label: 'Visualizar', icon: '👁' },
  { id: 'edit', label: 'Editar', icon: '✎' },
  { id: 'walk', label: 'Caminhar', icon: '🚶' },
];

export function TopBar() {
  const view = useWarehouseStore((s) => s.view);
  const appMode = useWarehouseStore((s) => s.appMode);
  const setAppMode = useWarehouseStore((s) => s.setAppMode);
  const selectedShelfId = useWarehouseStore((s) => s.selectedShelfId);
  const shelves = useWarehouseStore((s) => s.shelves);
  const backToFloor = useWarehouseStore((s) => s.backToFloor);

  const shelf = shelves.find((sh) => sh.id === selectedShelfId);

  // In walk mode, hide the whole top bar (a separate WalkOverlay handles the hint).
  if (appMode === 'walk') return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-center p-5">
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

      <div className="pointer-events-auto absolute right-5 top-5 flex flex-col items-end gap-2">
        {/* Segmented mode switcher */}
        <div className="glass flex items-center gap-1 rounded-2xl p-1">
          {MODE_ITEMS.map((m) => {
            const active = appMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setAppMode(m.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
                title={m.label}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
        {view === 'rack' && (
          <button
            onClick={backToFloor}
            className="glass rounded-2xl px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800/70"
          >
            ← Voltar à planta
          </button>
        )}
        {shelf && view === 'rack' && (
          <div className="glass rounded-2xl px-4 py-2 text-xs text-slate-300">
            Estante <span className="font-semibold text-slate-100">{shelf.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
