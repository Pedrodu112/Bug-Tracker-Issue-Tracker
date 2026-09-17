'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { IssueProvider } from '@/components/issues/issue-provider';

const navigation = [
  { href: '/', label: 'Dashboard', icon: '▦' },
  { href: '/issues', label: 'Issues', icon: '◈' },
  { href: '/projetos', label: 'Projetos', icon: '□' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return <IssueProvider><div className="app-frame"><aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">◈</span>BUG TRACKER</Link><nav className="nav-links" aria-label="Navegação principal">{navigation.map((item) => {
    const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
    return <Link className={`nav-link ${active ? 'active' : ''}`} href={item.href} key={item.href}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</Link>;
  })}</nav><p className="sidebar-footer">Workspace · desenvolvimento</p></aside><main className="main-content"><div className="shell">{children}</div></main></div></IssueProvider>;
}
