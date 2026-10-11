import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The English Project',
  description: 'Clases de inglés 1-on-1 con metas reales.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
