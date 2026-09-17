'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IssueForm } from '@/components/issues/issue-form';
import { useIssues } from '@/components/issues/issue-provider';
import { IssueInput } from '@/types/issue';
export default function NewIssuePage() { const router = useRouter(); const { projects, addIssue, loading } = useIssues(); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); async function submit(data: IssueInput) { setSaving(true); setError(''); try { const issue = await addIssue({ ...data, status: 'BACKLOG' }); router.push(`/issues/${issue.id}`); } catch { setError('Não foi possível criar a issue. Verifique se a API está em execução.'); setSaving(false); } } if (loading) return <p className="loading">Carregando...</p>; return <><div className="page-head"><div><h1>Nova Issue</h1><p className="muted">O status inicial será BACKLOG.</p></div></div>{error && <p className="error">{error}</p>}<IssueForm projects={projects} onSubmit={submit} saving={saving} /></>; }
