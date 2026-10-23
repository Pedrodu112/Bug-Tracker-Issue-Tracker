'use client';

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { createIssue, deleteIssue, getIssues, getProjects, updateIssue } from '@/lib/api';
import { loadIssues, loadProjects, saveIssues, saveProjects } from '@/lib/storage';
import { Issue, IssueInput, Project } from '@/types/issue';

type Context = {
  issues: Issue[];
  projects: Project[];
  loading: boolean;
  error: string;
  addIssue: (data: IssueInput) => Promise<Issue>;
  editIssue: (id: number, data: Partial<IssueInput>) => Promise<Issue>;
  removeIssue: (id: number) => Promise<void>;
};

const IssueContext = createContext<Context | null>(null);

export function IssueProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const issuesRef = useRef<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function replaceIssues(nextIssues: Issue[]) {
    issuesRef.current = nextIssues;
    setIssues(nextIssues);
    saveIssues(nextIssues);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        // A API é a fonte principal; o cache local não deve substituir dados atuais do servidor.
        const [apiIssues, apiProjects] = await Promise.all([getIssues(), getProjects()]);
        if (!active) return;

        replaceIssues(apiIssues);
        setProjects(apiProjects);
        saveProjects(apiProjects);
      } catch {
        if (!active) return;

        // Se a API estiver indisponível, preserva o último cache apenas para consulta.
        try {
          const localIssues = loadIssues();
          const localProjects = loadProjects();

          if (localIssues && localProjects) {
            replaceIssues(localIssues);
            setProjects(localProjects);
            setError('API indisponível. Exibindo dados locais; alterações exigem que o backend esteja ativo.');
          } else {
            setError('Não foi possível carregar os dados. Inicie o backend na porta 8000.');
          }
        } catch {
          setError('Não foi possível carregar os dados. Inicie o backend na porta 8000.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, []);

  async function addIssue(data: IssueInput) {
    const issue = await createIssue(data);
    replaceIssues([...issuesRef.current, issue]);
    return issue;
  }

  async function editIssue(id: number, data: Partial<IssueInput>) {
    const issue = await updateIssue(id, data);
    const updated = issuesRef.current.map((item) => (item.id === id ? issue : item));
    replaceIssues(updated);
    return issue;
  }

  async function removeIssue(id: number) {
    await deleteIssue(id);
    replaceIssues(issuesRef.current.filter((item) => item.id !== id));
  }

  return (
    <IssueContext.Provider value={{ issues, projects, loading, error, addIssue, editIssue, removeIssue }}>
      {children}
    </IssueContext.Provider>
  );
}

export function useIssues() {
  const context = useContext(IssueContext);
  if (!context) throw new Error('useIssues deve ser usado dentro de IssueProvider');
  return context;
}
