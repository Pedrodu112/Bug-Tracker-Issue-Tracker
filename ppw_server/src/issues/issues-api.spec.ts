import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { AppModule } from '../app/app.module';

describe('Issues HTTP API', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, reads, edits and transitions an issue through HTTP', async () => {
    const createdResponse = await fetch(`${baseUrl}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 1,
        title: 'Issue de teste HTTP',
        description: 'Testando o fluxo completo de CRUD.',
        type: 'TASK',
        priority: 'BAIXA',
        assignee: 'Ana',
      }),
    });
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as { id: number; title: string; status: string; projectId: number };
    expect(created.id).toBeGreaterThan(0);
    expect(created.status).toBe('BACKLOG');
    expect(created.projectId).toBe(1);

    const readResponse = await fetch(`${baseUrl}/issues/${created.id}`);
    expect(readResponse.status).toBe(200);
    expect(((await readResponse.json()) as { title: string }).title).toBe('Issue de teste HTTP');

    const updateResponse = await fetch(`${baseUrl}/issues/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Título alterado pelo teste' }),
    });
    expect(updateResponse.status).toBe(200);
    const updated = (await updateResponse.json()) as { title: string; status: string };
    expect(updated.title).toBe('Título alterado pelo teste');
    expect(updated.status).toBe('BACKLOG');

    const arbitraryStatusResponse = await fetch(`${baseUrl}/issues/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'QA' }),
    });
    expect(arbitraryStatusResponse.status).toBe(400);

    const actions = [
      { action: 'INICIAR_TRIAGEM', actorId: 'triager-01', actorRole: 'TRIAGER', expected: 'TRIAGEM' },
      { action: 'INICIAR_DESENVOLVIMENTO', actorId: 'dev-01', actorRole: 'DEVELOPER', expected: 'EM_DESENVOLVIMENTO' },
      { action: 'ENVIAR_PARA_QA', actorId: 'dev-01', actorRole: 'DEVELOPER', expected: 'QA' },
      { action: 'APROVAR_QA', actorId: 'qa-01', actorRole: 'QA', expected: 'PRONTO_PARA_DEPLOY' },
      { action: 'LIBERAR_DEPLOY', actorId: 'release-01', actorRole: 'RELEASE_MANAGER', expected: 'CONCLUIDO' },
    ];
    for (const action of actions) {
      const response = await fetch(`${baseUrl}/issues/${created.id}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.action, actorId: action.actorId, actorRole: action.actorRole }),
      });
      expect(response.status).toBe(201);
      expect(((await response.json()) as { status: string }).status).toBe(action.expected);
    }

    const deleteResponse = await fetch(`${baseUrl}/issues/${created.id}`, { method: 'DELETE' });
    expect(deleteResponse.status).toBe(204);
    expect((await fetch(`${baseUrl}/issues/${created.id}`)).status).toBe(404);
  });

  it('rejects blank text, invalid enums, and attempts to set server-owned fields', async () => {
    const invalidPayloads = [
      { projectId: 1, title: '   ', description: 'Descrição válida', type: 'TASK', priority: 'BAIXA', assignee: 'Ana' },
      { projectId: 1, title: 'Issue válida', description: 'Descrição válida', type: 'UNKNOWN', priority: 'BAIXA', assignee: 'Ana' },
      { projectId: 0, title: 'Projeto inválido', description: 'O identificador do projeto deve ser positivo.', type: 'TASK', priority: 'BAIXA', assignee: 'Ana' },
      { projectId: 1, title: 'Issue válida', description: 'Descrição válida', type: 'TASK', priority: 'BAIXA', status: 'UNKNOWN', assignee: 'Ana' },
      { projectId: 1, title: 'Issue válida', description: 'Descrição válida', type: 'TASK', priority: 'BAIXA', assignee: '   ' },
      { projectId: 1, title: 'Issue válida', description: 'Descrição válida', type: 'TASK', priority: 'BAIXA', assignee: 'Ana', id: 1 },
      { projectId: 1, title: 'Issue válida', description: 'Descrição válida', type: 'TASK', priority: 'BAIXA', assignee: 'Ana', createdAt: '2000-01-01T00:00:00.000Z' },
    ];
    for (const payload of invalidPayloads) {
      const response = await fetch(`${baseUrl}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(response.status).toBe(400);
    }
  });

  it('enforces RBAC and rejects transitions from the wrong state', async () => {
    const createResponse = await fetch(`${baseUrl}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 1, title: 'Issue para testar permissões',
        description: 'Issue criada para testar regras RBAC.',
        type: 'TASK', priority: 'MEDIA', assignee: 'Ana',
      }),
    });
    const issue = (await createResponse.json()) as { id: number };

    const forbidden = await fetch(`${baseUrl}/issues/${issue.id}/transitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'INICIAR_TRIAGEM', actorId: 'dev-01', actorRole: 'DEVELOPER' }),
    });
    expect(forbidden.status).toBe(403);

    const invalidState = await fetch(`${baseUrl}/issues/${issue.id}/transitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'LIBERAR_DEPLOY', actorId: 'release-01', actorRole: 'RELEASE_MANAGER' }),
    });
    expect(invalidState.status).toBe(422);

    const actionsResponse = await fetch(`${baseUrl}/issues/${issue.id}/actions?actorRole=DEVELOPER`);
    expect(actionsResponse.status).toBe(200);
    expect(await actionsResponse.json()).toEqual([]);
  });

  it('rejects nonexistent projects and empty updates', async () => {
    const createResponse = await fetch(`${baseUrl}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 9999, title: 'Issue com projeto inexistente',
        description: 'Não deve ser salva.', type: 'TASK', priority: 'BAIXA', assignee: 'Ana',
      }),
    });
    expect(createResponse.status).toBe(404);

    const invalidProjectUpdate = await fetch(`${baseUrl}/issues/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 9999 }),
    });
    expect(invalidProjectUpdate.status).toBe(404);

    const originalIssue = await fetch(`${baseUrl}/issues/1`);
    const original = (await originalIssue.json()) as { projectId: number };
    expect(original.projectId).toBe(1);

    const tamperedId = await fetch(`${baseUrl}/issues/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 999 }),
    });
    expect(tamperedId.status).toBe(400);

    const emptyPatch = await fetch(`${baseUrl}/issues/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(emptyPatch.status).toBe(400);
  });

  it('rejects malformed route IDs and missing resources', async () => {
    expect((await fetch(`${baseUrl}/issues/abc`)).status).toBe(400);
    expect((await fetch(`${baseUrl}/issues/999999`)).status).toBe(404);
  });
});
