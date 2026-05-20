import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prateleira — Gêmeo Digital do Estoque',
  description: 'Visualização 3D do estoque de impressoras',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
