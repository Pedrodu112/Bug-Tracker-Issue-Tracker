'use client';
import { FormEvent, useState } from 'react';
import { DEVELOPERS, ISSUE_PRIORITIES, ISSUE_TYPES, Issue, IssueInput, Project } from '@/types/issue';

const initial: IssueInput = {
  projectId: 0,
  title: '',
  description: '',
  type: 'BUG',
  priority: 'MEDIA',
  assignee: 'Não atribuído',
  acceptanceCriteria: '',
};

export function IssueForm({
  projects,
  issue,
  onSubmit,
  saving,
}: {
  projects: Project[];
  issue?: Issue;
  onSubmit: (data: IssueInput) => Promise<void>;
  saving: boolean;
}) {
  const [data, setData] = useState<IssueInput>(
    issue
      ? {
          projectId: issue.projectId,
          title: issue.title,
          description: issue.description,
          type: issue.type,
          priority: issue.priority,
          assignee: issue.assignee,
          acceptanceCriteria: issue.acceptanceCriteria ?? '',
        }
      : { ...initial, projectId: projects[0]?.id ?? 0 },
  );
  const [error, setError] = useState('');

  function change(field: keyof IssueInput, value: string) {
    setData((current) => ({ ...current, [field]: field === 'projectId' ? Number(value) : value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!data.projectId || !data.title.trim() || !data.description.trim()) {
      setError('Preencha projeto, título e descrição.');
      return;
    }
    setError('');
    await onSubmit(data);
  }

  return (
    <form id="editar" className="card form-grid" onSubmit={submit}>
      <div className="full">
        <p className="eyebrow">Dados da issue</p>
        <p className="muted">
          O status é alterado somente pelas ações do fluxo, nunca por este formulário.
        </p>
      </div>
      <label>
        Projeto
        <select value={data.projectId} onChange={(event) => change('projectId', event.target.value)} required>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <label>
        Título
        <input value={data.title} onChange={(event) => change('title', event.target.value)} required />
      </label>
      <label>
        {issue ? 'Tipo (fixo após criação)' : 'Tipo'}
        {issue ? (
          <input value={issue.type} readOnly disabled />
        ) : (
          <select value={data.type} onChange={(event) => change('type', event.target.value)}>
            {ISSUE_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        )}
      </label>
      <label>
        Prioridade
        <select value={data.priority} onChange={(event) => change('priority', event.target.value)}>
          {ISSUE_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
        </select>
      </label>
      <label>
        Responsável
        <select value={data.assignee} onChange={(event) => change('assignee', event.target.value)}>
          {DEVELOPERS.map((developer) => <option key={developer}>{developer}</option>)}
        </select>
      </label>
      {data.type === 'FEATURE' && (
        <label className="full">
          Critérios de aceite
          <textarea
            value={data.acceptanceCriteria ?? ''}
            onChange={(event) => change('acceptanceCriteria', event.target.value)}
            placeholder="Descreva como será validado que a funcionalidade atende ao pedido."
          />
          <span className="muted">Obrigatório (mínimo de 20 caracteres) antes de iniciar o desenvolvimento.</span>
        </label>
      )}
      <label className="full">
        Descrição
        <textarea value={data.description} onChange={(event) => change('description', event.target.value)} required />
      </label>
      {error && <p className="error full">{error}</p>}
      <div className="actions full">
        <button className="button" disabled={saving}>
          {saving ? 'Salvando...' : issue ? 'Salvar alterações' : 'Criar issue'}
        </button>
      </div>
    </form>
  );
}
