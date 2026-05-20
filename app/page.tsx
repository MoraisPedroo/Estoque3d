'use client';

import dynamic from 'next/dynamic';
import { TopBar } from '@/components/TopBar';
import { Toolbar } from '@/components/Toolbar';
import { Inspector } from '@/components/Inspector';
import { InfoPanel } from '@/components/InfoPanel';
import { BoxDetailsModal } from '@/components/BoxDetailsModal';
import { DragBanner } from '@/components/DragBanner';
import { RelocateBanner } from '@/components/RelocateBanner';
import { ShelfGridModal } from '@/components/ShelfGridModal';

const Scene = dynamic(() => import('@/components/Scene').then((m) => m.Scene), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-slate-300">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-500 border-t-sky-400" />
        <p className="text-sm tracking-wide">Carregando armazém 3D…</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0b0f17]">
      <Scene />
      {/* UI overlay: container itself ignores pointer events so 3D stays clickable;
          each child opts back in via the ui-layer CSS rule. */}
      <div className="ui-layer">
        <TopBar />
        <Toolbar />
        <Inspector />
        <InfoPanel />
        <DragBanner />
        <RelocateBanner />
        <BoxDetailsModal />
        <ShelfGridModal />
      </div>
    </main>
  );
}
