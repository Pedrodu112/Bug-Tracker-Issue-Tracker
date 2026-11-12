import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { IssuesUseCases } from './application/issues.use-cases';
import { InMemoryIssuesRepository } from './infrastructure/in-memory-issues.repository';
import { InMemoryProjectsRepository } from '../projects/infrastructure/in-memory-projects.repository';
import { IssueTransitionCommand } from './domain/issue-transition';
import { IssueHistoryEntry } from './domain/issue-history';

describe('IssuesUseCases', () => {
  let useCases: IssuesUseCases;
  let repository: InMemoryIssuesRepository;

  beforeEach(() => {
    repository = new InMemoryIssuesRepository();
    useCases = new IssuesUseCases(
      repository,
      new InMemoryProjectsRepository(),
      repository,
    );
  });

  async function updateIssue(id: number, data: Parameters<IssuesUseCases['update']>[1]) {
    const current = await useCases.findOne(id);
    return useCases.update(id, data, current.version);
  }

  async function transitionIssue(id: number, command: IssueTransitionCommand) {
    const current = await useCases.findOne(id);
    return useCases.transition(id, command, current.version);
  }

  async function createIssue(title = 'Nova issue', type: 'BUG' | 'FEATURE' | 'TASK' = 'TASK') {
    return useCases.create({
      projectId: 1,
      title,
      description: 'Descrição válida para a issue.',
      type,
      priority: 'BAIXA',
      assignee: 'Ana',
    });
  }

  it('creates an issue with an id and default BACKLOG status', async () => {
    const issue = await createIssue();
    expect(issue.id).toBeGreaterThan(0);
    expect(issue.status).toBe('BACKLOG');
    expect(issue.title).toBe('Nova issue');
    expect(issue.createdAt).toBeTruthy();
    expect(issue.updatedAt).toBeTruthy();
  });

  it('updates editable fields without allowing a status change', async () => {
    const created = await createIssue();
    const updated = await updateIssue(created.id, { title: 'Título alterado' });
    expect(updated.title).toBe('Título alterado');
    expect(updated.status).toBe('BACKLOG');
    expect(updated.updatedAt).toBeTruthy();

    await expect(useCases.update(created.id, { status: 'QA' } as never, updated.version))
      .rejects.toBeInstanceOf(BadRequestException);
    expect((await useCases.findOne(created.id)).status).toBe('BACKLOG');
  });

  it('executes the TASK flow without a code review stage', async () => {
    const issue = await createIssue();
    const triaged = await transitionIssue(issue.id, {
      action: 'INICIAR_TRIAGEM', actorId: 'triager-01', actorRole: 'TRIAGER',
    });
    expect(triaged.status).toBe('TRIAGEM');

    const started = await transitionIssue(issue.id, {
      action: 'INICIAR_DESENVOLVIMENTO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });
    expect(started.status).toBe('EM_DESENVOLVIMENTO');

    const sentToQa = await transitionIssue(issue.id, {
      action: 'ENVIAR_PARA_QA', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });
    expect(sentToQa.status).toBe('QA');

    await expect(transitionIssue(issue.id, {
      action: 'ENVIAR_PARA_REVISAO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('blocks a transition when the actor role is not authorized', async () => {
    const issue = await createIssue();
    await expect(transitionIssue(issue.id, {
      action: 'INICIAR_TRIAGEM', actorId: 'developer-01', actorRole: 'DEVELOPER',
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks FEATURE development until acceptance criteria are provided', async () => {
    const issue = await createIssue('Nova funcionalidade', 'FEATURE');
    await transitionIssue(issue.id, {
      action: 'INICIAR_TRIAGEM', actorId: 'triager-01', actorRole: 'TRIAGER',
    });

    await expect(transitionIssue(issue.id, {
      action: 'INICIAR_DESENVOLVIMENTO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    })).rejects.toThrow('critérios de aceite');

    await updateIssue(issue.id, {
      acceptanceCriteria: 'O usuário deve conseguir salvar e consultar seus dados.',
    });
    const started = await transitionIssue(issue.id, {
      action: 'INICIAR_DESENVOLVIMENTO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });
    expect(started.status).toBe('EM_DESENVOLVIMENTO');
  });

  it('requires a justification when a reviewer requests changes', async () => {
    const issue = await createIssue('Correção de erro', 'BUG');
    await transitionIssue(issue.id, {
      action: 'INICIAR_TRIAGEM', actorId: 'triager-01', actorRole: 'TRIAGER',
    });
    await transitionIssue(issue.id, {
      action: 'INICIAR_DESENVOLVIMENTO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });
    await transitionIssue(issue.id, {
      action: 'ENVIAR_PARA_REVISAO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });

    await expect(transitionIssue(issue.id, {
      action: 'SOLICITAR_AJUSTES', actorId: 'reviewer-01', actorRole: 'REVIEWER',
    })).rejects.toThrow('justificativa');

    const returned = await transitionIssue(issue.id, {
      action: 'SOLICITAR_AJUSTES',
      actorId: 'reviewer-01',
      actorRole: 'REVIEWER',
      justification: 'O tratamento de erro ainda não cobre o caso de timeout.',
    });
    expect(returned.status).toBe('EM_DESENVOLVIMENTO');
  });

  it('deletes an issue and then reports it as missing', async () => {
    const created = await createIssue();
    await expect(useCases.remove(created.id)).resolves.toBeUndefined();
    await expect(useCases.findOne(created.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a project that does not exist', async () => {
    await expect(useCases.create({
      projectId: 9999, title: 'Projeto inválido',
      description: 'Este projeto não existe.', type: 'TASK', priority: 'BAIXA', assignee: 'Ana',
    })).rejects.toThrow('Projeto não encontrado.');
  });

  it('rejects updates without any fields', async () => {
    const created = await createIssue();
    await expect(updateIssue(created.id, {})).rejects.toThrow(
      'Informe ao menos um campo para atualizar.',
    );
  });

  it('does not reuse an id after deleting the newest issue', async () => {
    const created = await createIssue();
    await useCases.remove(created.id);
    const next = await createIssue('Outra issue');
    expect(next.id).toBeGreaterThan(created.id);
  });

  it('rejects concurrent updates that use the same stale version', async () => {
    const issue = await createIssue();
    const results = await Promise.allSettled([
      useCases.update(issue.id, { title: 'Edição A' }, issue.version),
      useCases.update(issue.id, { description: 'Edição B' }, issue.version),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') expect(rejected.reason).toBeInstanceOf(ConflictException);
    expect((await useCases.findOne(issue.id)).version).toBe(2);
  });

  it('rejects duplicate concurrent transitions using the same version', async () => {
    const issue = await createIssue();
    const command: IssueTransitionCommand = {
      action: 'INICIAR_TRIAGEM', actorId: 'triager-01', actorRole: 'TRIAGER',
    };
    const results = await Promise.allSettled([
      useCases.transition(issue.id, command, issue.version),
      useCases.transition(issue.id, command, issue.version),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') expect(rejected.reason).toBeInstanceOf(ConflictException);
    const current = await useCases.findOne(issue.id);
    expect(current.status).toBe('TRIAGEM');
    expect(current.version).toBe(2);
  });

  it('lists justification-required actions, leaving text validation to execution', async () => {
    const issue = await createIssue('Correção de erro', 'BUG');
    await transitionIssue(issue.id, { action: 'INICIAR_TRIAGEM', actorId: 'triager-01', actorRole: 'TRIAGER' });
    await transitionIssue(issue.id, { action: 'INICIAR_DESENVOLVIMENTO', actorId: 'developer-01', actorRole: 'DEVELOPER' });
    await transitionIssue(issue.id, { action: 'ENVIAR_PARA_REVISAO', actorId: 'developer-01', actorRole: 'DEVELOPER' });
    const actions = await useCases.getAvailableActions(issue.id, 'REVIEWER');
    expect(actions.some((action) =>
      action.action === 'SOLICITAR_AJUSTES' && action.requiresJustification,
    )).toBe(true);
  });

  it('records append-only history with actor, action, justification and version', async () => {
    const issue = await createIssue('Issue auditável', 'BUG');
    await transitionIssue(issue.id, {
      action: 'INICIAR_TRIAGEM',
      actorId: 'triager-01',
      actorRole: 'TRIAGER',
      justification: 'Triagem iniciada após análise inicial.',
    });
    await transitionIssue(issue.id, {
      action: 'INICIAR_DESENVOLVIMENTO',
      actorId: 'developer-01',
      actorRole: 'DEVELOPER',
    });

    const history = await useCases.getHistory(issue.id);
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      issueId: issue.id,
      action: 'INICIAR_TRIAGEM',
      previousStatus: 'BACKLOG',
      newStatus: 'TRIAGEM',
      actorId: 'triager-01',
      actorRole: 'TRIAGER',
      justification: 'Triagem iniciada após análise inicial.',
      version: 2,
    });
    expect(history[0].timestamp).toBeTruthy();
    expect(history[1].previousStatus).toBe('TRIAGEM');
    expect(history[1].newStatus).toBe('EM_DESENVOLVIMENTO');
    expect(history[1].version).toBe(3);
    expect(await useCases.getAuditLog()).toHaveLength(2);
  });

  it('does not change the status or append history when audit writing fails', async () => {
    class FailingAuditRepository extends InMemoryIssuesRepository {
      protected beforeAppendHistory(_entry: IssueHistoryEntry): void {
        throw new Error('Falha simulada ao gravar auditoria.');
      }
    }

    const failingRepository = new FailingAuditRepository();
    const failingUseCases = new IssuesUseCases(
      failingRepository,
      new InMemoryProjectsRepository(),
      failingRepository,
    );
    const issue = await failingUseCases.create({
      projectId: 1,
      title: 'Issue com falha de auditoria',
      description: 'A transição deve ser cancelada se o log falhar.',
      type: 'TASK',
      priority: 'BAIXA',
      assignee: 'Ana',
    });

    await expect(failingUseCases.transition(issue.id, {
      action: 'INICIAR_TRIAGEM',
      actorId: 'triager-01',
      actorRole: 'TRIAGER',
    }, issue.version)).rejects.toThrow('Falha simulada');

    expect((await failingUseCases.findOne(issue.id)).status).toBe('BACKLOG');
    expect(await failingUseCases.getHistory(issue.id)).toEqual([]);
  });

  it('reports missing issues when updating or deleting', async () => {
    await expect(updateIssue(9999, { title: 'Não existe' }))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(useCases.remove(9999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
