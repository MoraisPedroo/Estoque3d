'use client';

import { useEffect, useState } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';

export function WalkOverlay() {
  const appMode = useWarehouseStore((s) => s.appMode);
  const setAppMode = useWarehouseStore((s) => s.setAppMode);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (appMode !== 'walk') {
      setLocked(false);
      return;
    }
    const onChange = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [appMode]);

  if (appMode !== 'walk') return null;

  return (
    <>
      {/* Crosshair — sits in the centre while the pointer is locked */}
      {locked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="h-2.5 w-2.5 rounded-full border border-white/80 bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
        </div>
      )}

      {/* Tiny HUD pinned to the top while walking */}
      {locked && (
        <div className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2">
          <div className="glass rounded-full px-4 py-1.5 text-xs text-slate-200">
            <span className="font-mono uppercase tracking-[0.18em] text-sky-300">Modo Caminhada</span>
            <span className="mx-2 text-slate-500">·</span>
            <kbd className="rounded bg-slate-800 px-1 text-[10px]">W A S D</kbd>
            <span className="ml-1 text-slate-400">mover</span>
            <span className="mx-2 text-slate-500">·</span>
            <kbd className="rounded bg-slate-800 px-1 text-[10px]">Shift</kbd>
            <span className="ml-1 text-slate-400">correr</span>
            <span className="mx-2 text-slate-500">·</span>
            <kbd className="rounded bg-slate-800 px-1 text-[10px]">ESC</kbd>
            <span className="ml-1 text-slate-400">sair</span>
          </div>
        </div>
      )}

      {/* Click-to-engage splash while pointer lock isn't active yet */}
      {!locked && (
        <div className="ui-modal flex items-center justify-center">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />
          <div className="glass relative z-10 w-[420px] max-w-[92vw] rounded-2xl p-7 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300">
              Tour 3D do Armazém
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-100">
              Caminhe pelo estoque
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Mova-se com{' '}
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]">W A S D</kbd>{' '}
              ou setas, segure{' '}
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]">Shift</kbd>{' '}
              para correr, e use o mouse para olhar em volta. Pressione{' '}
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]">ESC</kbd>{' '}
              para sair.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => {
                  // Pointer lock is requested by the canvas element automatically
                  // once the user clicks anywhere in it; surface a hint here.
                  const canvas = document.querySelector('canvas');
                  canvas?.requestPointerLock?.();
                }}
                className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
              >
                ▶ Começar o tour
              </button>
              <button
                onClick={() => setAppMode('view')}
                className="rounded-xl border border-slate-700/70 bg-slate-800/60 px-4 py-2 text-xs text-slate-200 transition hover:bg-slate-700/70"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
