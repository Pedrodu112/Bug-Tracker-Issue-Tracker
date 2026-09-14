'use client';
import Link from 'next/link';
import { ReactNode } from 'react';
import { IssueProvider } from '@/components/issues/issue-provider';
export function AppShell({ children }: { children: ReactNode }) { return <IssueProvider><nav className="nav"><Link className="brand" href="/">Bug Tracker</Link><Link href="/">Dashboard</Link><Link href="/issues">Issues</Link><Link href="/projetos">Projetos</Link></nav><main className="shell">{children}</main></IssueProvider>; }
