import { NotFoundException } from '@nestjs/common';
import { IssuesUseCases } from './application/issues.use-cases';
import { InMemoryIssuesRepository } from './infrastructure/in-memory-issues.repository';

describe('IssuesUseCases', () => {
  let useCases: IssuesUseCases;

  beforeEach(() => {
    useCases = new IssuesUseCases(new InMemoryIssuesRepository());
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

  it('reports a missing issue when updating or deleting', async () => {
    await expect(useCases.update(9999, { title: 'Não existe' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(useCases.remove(9999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
