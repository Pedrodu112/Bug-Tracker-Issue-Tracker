'use client';

import Link from 'next/link';
import { useIssues } from '@/components/issues/issue-provider';

export default function ProjectsPage() {
  const { projects, issues, loading, error } = useIssues();

  if (loading) return <p className="loading">Carregando...</p>;

  return <>
    <div className="page-head">
      <div>
        <p className="eyebrow">Portfólio</p>
        <h1>Projetos</h1>
        <p className="muted">Selecione um projeto para visualizar suas issues.</p>
      </div>
    </div>
    {error && <p className="error">{error}</p>}
    <section className="project-grid">
      {projects.map((project) => <article className="card project-card" key={project.id}>
        <p className="eyebrow">Projeto #{project.id}</p>
        <h2>{project.name}</h2>
        <p className="muted">{project.description}</p>
        <p className="project-count"><strong>{issues.filter((issue) => issue.projectId === project.id).length}</strong> issues registradas</p>
        <Link className="button secondary" href={`/issues?project=${project.id}`}>Ver issues →</Link>
      </article>)}
    </section>
  </>;
}
