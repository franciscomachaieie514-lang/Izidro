import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title:'Izitrader', description:'Izidro trading platform' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt"><body>{children}</body></html>;
}
