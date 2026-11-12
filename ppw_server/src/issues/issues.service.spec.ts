import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { IssuesUseCases } from './application/issues.use-cases';
import { InMemoryIssuesRepository } from './infrastructure/in-memory-issues.repository';
import { InMemoryProjectsRepository } from '../projects/infrastructure/in-memory-projects.repository';

describe('IssuesUseCases', () => {
  let useCases: IssuesUseCases;

  beforeEach(() => {
    useCases = new IssuesUseCases(
      new InMemoryIssuesRepository(),
      new InMemoryProjectsRepository(),
    );
  });

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
    const updated = await useCases.update(created.id, { title: 'Título alterado' });
    expect(updated.title).toBe('Título alterado');
    expect(updated.status).toBe('BACKLOG');
    expect(updated.updatedAt).toBeTruthy();

    await expect(useCases.update(created.id, { status: 'QA' } as never))
      .rejects.toBeInstanceOf(BadRequestException);
    expect((await useCases.findOne(created.id)).status).toBe('BACKLOG');
  });

  it('executes the TASK flow without a code review stage', async () => {
    const issue = await createIssue();
    const triaged = await useCases.transition(issue.id, {
      action: 'INICIAR_TRIAGEM', actorId: 'triager-01', actorRole: 'TRIAGER',
    });
    expect(triaged.status).toBe('TRIAGEM');

    const started = await useCases.transition(issue.id, {
      action: 'INICIAR_DESENVOLVIMENTO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });
    expect(started.status).toBe('EM_DESENVOLVIMENTO');

    const sentToQa = await useCases.transition(issue.id, {
      action: 'ENVIAR_PARA_QA', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });
    expect(sentToQa.status).toBe('QA');

    await expect(useCases.transition(issue.id, {
      action: 'ENVIAR_PARA_REVISAO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('blocks a transition when the actor role is not authorized', async () => {
    const issue = await createIssue();
    await expect(useCases.transition(issue.id, {
      action: 'INICIAR_TRIAGEM', actorId: 'developer-01', actorRole: 'DEVELOPER',
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks FEATURE development until acceptance criteria are provided', async () => {
    const issue = await createIssue('Nova funcionalidade', 'FEATURE');
    await useCases.transition(issue.id, {
      action: 'INICIAR_TRIAGEM', actorId: 'triager-01', actorRole: 'TRIAGER',
    });

    await expect(useCases.transition(issue.id, {
      action: 'INICIAR_DESENVOLVIMENTO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    })).rejects.toThrow('critérios de aceite');

    await useCases.update(issue.id, {
      acceptanceCriteria: 'O usuário deve conseguir salvar e consultar seus dados.',
    });
    const started = await useCases.transition(issue.id, {
      action: 'INICIAR_DESENVOLVIMENTO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });
    expect(started.status).toBe('EM_DESENVOLVIMENTO');
  });

  it('requires a justification when a reviewer requests changes', async () => {
    const issue = await createIssue('Correção de erro', 'BUG');
    await useCases.transition(issue.id, {
      action: 'INICIAR_TRIAGEM', actorId: 'triager-01', actorRole: 'TRIAGER',
    });
    await useCases.transition(issue.id, {
      action: 'INICIAR_DESENVOLVIMENTO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });
    await useCases.transition(issue.id, {
      action: 'ENVIAR_PARA_REVISAO', actorId: 'developer-01', actorRole: 'DEVELOPER',
    });

    await expect(useCases.transition(issue.id, {
      action: 'SOLICITAR_AJUSTES', actorId: 'reviewer-01', actorRole: 'REVIEWER',
    })).rejects.toThrow('justificativa');

    const returned = await useCases.transition(issue.id, {
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
    await expect(useCases.update(created.id, {})).rejects.toThrow(
      'Informe ao menos um campo para atualizar.',
    );
  });

  it('does not reuse an id after deleting the newest issue', async () => {
    const created = await createIssue();
    await useCases.remove(created.id);
    const next = await createIssue('Outra issue');
    expect(next.id).toBeGreaterThan(created.id);
  });

  it('reports missing issues when updating or deleting', async () => {
    await expect(useCases.update(9999, { title: 'Não existe' }))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(useCases.remove(9999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
