import { NotFoundException } from '@nestjs/common';
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

  async function createIssue(title = 'Nova issue') {
    return useCases.create({
      projectId: 1,
      title,
      description: 'Descrição válida',
      type: 'TASK',
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

  it('updates an existing issue', async () => {
    const created = await createIssue();
    const updated = await useCases.update(created.id, {
      title: 'Título alterado',
      status: 'QA',
    });

    expect(updated.title).toBe('Título alterado');
    expect(updated.status).toBe('QA');
    expect(updated.updatedAt).toBeTruthy();
  });

  it('deletes an issue and then reports it as missing', async () => {
    const created = await createIssue();

    await expect(useCases.remove(created.id)).resolves.toBeUndefined();
    await expect(useCases.findOne(created.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a project that does not exist', async () => {
    await expect(
      useCases.create({
        projectId: 9999,
        title: 'Projeto inválido',
        description: 'Este projeto não existe.',
        type: 'TASK',
        priority: 'BAIXA',
        assignee: 'Ana',
      }),
    ).rejects.toThrow('Projeto não encontrado.');
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
    await expect(useCases.update(9999, { title: 'Não existe' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(useCases.remove(9999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
