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

  return (
    <IssueProvider>
      <div className="app-frame">
        <aside className="sidebar">
          <Link className="brand" href="/">
            <span className="brand-mark">◈</span>
            <span>BUG TRACKER</span>
          </Link>
          <p className="nav-caption">Workspace</p>
          <nav className="nav-links" aria-label="Navegação principal">
            {navigation.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return <Link className={`nav-link ${active ? 'active' : ''}`} href={item.href} key={item.href}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</Link>;
            })}
          </nav>
          <div className="sidebar-footer"><span className="status-dot" aria-hidden="true" />Sistema operacional</div>
        </aside>
        <main className="main-content">
          <div className="context-bar"><span className="context-label">Painel de desenvolvimento</span><span className="context-status"><span className="status-dot" aria-hidden="true" />Ambiente ativo</span></div>
          <div className="shell">{children}</div>
        </main>
      </div>
    </IssueProvider>
  );
}
