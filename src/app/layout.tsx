import type { Metadata } from 'next';
import './style.css';

export const metadata: Metadata = { title: 'Resume Studio', description: 'Local-first resume and CV editor with local pdflatex exports.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
