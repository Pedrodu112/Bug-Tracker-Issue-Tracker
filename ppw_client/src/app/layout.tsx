import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
export const metadata: Metadata = { title: 'Bug Tracker', description: 'Plataforma acadêmica de issues' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><AppShell>{children}</AppShell></body></html>; }
