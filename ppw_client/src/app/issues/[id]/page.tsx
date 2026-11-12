'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IssueForm } from '@/components/issues/issue-form';
import { useIssues } from '@/components/issues/issue-provider';
import { getAvailableIssueActions } from '@/lib/api';
import {
  AvailableIssueAction,
  ISSUE_ROLES,
  IssueInput,
  IssueRole,
} from '@/types/issue';

const roleLabels: Record<IssueRole, string> = {
  REPORTER: 'Solicitante',
  TRIAGER: 'Triagem',
  DEVELOPER: 'Desenvolvedor',
  REVIEWER: 'Revisor',
  QA: 'Qualidade (QA)',
  RELEASE_MANAGER: 'Responsável pelo deploy',
  ADMIN: 'Administrador',
};

export default function IssueDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { issues, projects, loading, editIssue, transitionIssue, removeIssue } = useIssues();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const [actorRole, setActorRole] = useState<IssueRole>('DEVELOPER');
  const [availableActions, setAvailableActions] = useState<AvailableIssueAction[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [justification, setJustification] = useState('');
  const issue = issues.find((item) => item.id === Number(params.id));

  useEffect(() => {
    let active = true;
    setAvailableActions([]);
    setWorkflowError('');
    if (!issue) return;

    void getAvailableIssueActions(issue.id, actorRole)
      .then((actions) => {
        if (active) setAvailableActions(actions);
      })
      .catch(() => {
        if (active) setWorkflowError('Não foi possível consultar as ações disponíveis na API.');
      });

    return () => {
      active = false;
    };
  }, [issue?.id, issue?.status, actorRole]);

  async function submit(data: IssueInput) {
    if (!issue) return;
    setSaving(true);
    setError('');
    try {
      await editIssue(issue.id, data);
      router.push('/issues');
    } catch {
      setError('Não foi possível salvar as alterações.');
      setSaving(false);
    }
  }

  async function executeAction(action: AvailableIssueAction) {
    if (!issue) return;
    if (action.requiresJustification && justification.trim().length < 10) {
      setWorkflowError('Esta ação exige uma justificativa de pelo menos 10 caracteres.');
      return;
    }

    setTransitioning(true);
    setWorkflowError('');
    try {
      await transitionIssue(issue.id, {
        action: action.action,
        actorId: `demo-${actorRole.toLowerCase()}`,
        actorRole,
        justification: justification.trim() || undefined,
      });
      setJustification('');
    } catch (cause) {
      setWorkflowError(cause instanceof Error ? cause.message : 'A transição foi rejeitada pela API.');
    } finally {
      setTransitioning(false);
    }
  }

  async function remove() {
    if (!issue || !window.confirm('Excluir esta issue permanentemente?')) return;
    setSaving(true);
    try {
      await removeIssue(issue.id);
      router.push('/issues');
    } catch {
      setError('Não foi possível excluir a issue.');
      setSaving(false);
    }
  }

  if (loading) return <p className="loading">Carregando...</p>;
  if (!issue)
    return (
      <div className="card empty">
        <h1>Issue não encontrada</h1>
        <Link href="/issues">Voltar para issues</Link>
      </div>
    );

  const project = projects.find((item) => item.id === issue.projectId);
  const requiresJustification = availableActions.some((action) => action.requiresJustification);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            Issue #{issue.id} · {issue.type}
          </p>
          <h1>{issue.title}</h1>
          <p className="muted">Inspecione os detalhes e execute somente transições válidas.</p>
        </div>
        <button className="button danger" disabled={saving} onClick={() => void remove()}>
          {saving ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>

      <div className="card issue-overview">
        <div className="details">
          <strong>Status atual</strong>
          <span><span className={`badge status-${issue.status}`}>{issue.status}</span></span>
          <strong>Prioridade</strong>
          <span><span className={`badge priority-${issue.priority}`}>{issue.priority}</span></span>
          <strong>Responsável</strong>
          <span>{issue.assignee}</span>
          <strong>Projeto</strong>
          <span>{project?.name ?? `Projeto ${issue.projectId}`}</span>
          {issue.acceptanceCriteria && (
            <>
              <strong>Critérios de aceite</strong>
              <span className="issue-description">{issue.acceptanceCriteria}</span>
            </>
          )}
          <strong>Descrição</strong>
          <span className="issue-description">{issue.description}</span>
          <strong>Criada em</strong>
          <span>{new Date(issue.createdAt).toLocaleString('pt-BR')}</span>
          <strong>Atualizada em</strong>
          <span>{new Date(issue.updatedAt).toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <section className="card workflow-panel">
        <div className="workflow-heading">
          <div>
            <p className="eyebrow">Máquina de estados finitos</p>
            <h2>Ações disponíveis</h2>
            <p className="muted">A API valida novamente o estado, o perfil e as guardas antes de alterar a issue.</p>
          </div>
          <label className="role-picker">
            Perfil de demonstração
            <select
              value={actorRole}
              onChange={(event) => setActorRole(event.target.value as IssueRole)}
            >
              {ISSUE_ROLES.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
          </label>
        </div>

        <p className="workflow-note">
          Protótipo acadêmico: o papel é enviado pelo cliente apenas para simular RBAC. Sem autenticação,
          ainda não existe identidade confiável nem proteção contra falsificação do perfil.
        </p>

        {requiresJustification && (
          <label className="justification-field">
            Justificativa da ação
            <textarea
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Informe o motivo da solicitação de ajustes ou reabertura."
            />
          </label>
        )}

        {workflowError && <p className="error">{workflowError}</p>}
        {availableActions.length > 0 ? (
          <div className="actions workflow-actions">
            {availableActions.map((action) => (
              <button
                key={action.action}
                className="button"
                disabled={transitioning || saving}
                onClick={() => void executeAction(action)}
              >
                {transitioning ? 'Processando...' : action.label}
                <span className="target-status">→ {action.targetStatus}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted workflow-empty">
            Nenhuma ação liberada para este perfil e estado. Troque o perfil de demonstração ou verifique as guardas.
          </p>
        )}
      </section>

      {error && <p className="error">{error}</p>}
      <IssueForm projects={projects} issue={issue} onSubmit={submit} saving={saving} />
    </>
  );
}
