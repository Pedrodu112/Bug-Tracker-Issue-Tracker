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
    const created = (await createdResponse.json()) as { id: number; title: string; status: string; projectId: number; version: number };
    expect(created.id).toBeGreaterThan(0);
    expect(created.status).toBe('BACKLOG');
    expect(created.projectId).toBe(1);

    const slaResponse = await fetch(`${baseUrl}/issues/${created.id}/sla`);
    expect(slaResponse.status).toBe(200);
    const sla = (await slaResponse.json()) as { slaHours: number; status: string };
    expect(sla.slaHours).toBe(168);
    expect(sla.status).toBe('ON_TRACK');

    const readResponse = await fetch(`${baseUrl}/issues/${created.id}`);
    expect(readResponse.status).toBe(200);
    expect(((await readResponse.json()) as { title: string }).title).toBe('Issue de teste HTTP');

    const updateResponse = await fetch(`${baseUrl}/issues/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"' + created.version + '"' },
      body: JSON.stringify({ title: 'Título alterado pelo teste' }),
    });
    expect(updateResponse.status).toBe(200);
    const updated = (await updateResponse.json()) as { title: string; status: string; version: number };
    expect(updated.title).toBe('Título alterado pelo teste');
    expect(updated.status).toBe('BACKLOG');

    const typeChangeResponse = await fetch(`${baseUrl}/issues/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"' + updated.version + '"' },
      body: JSON.stringify({ type: 'BUG' }),
    });
    expect(typeChangeResponse.status).toBe(400);

    const arbitraryStatusResponse = await fetch(`${baseUrl}/issues/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"' + updated.version + '"' },
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
    let currentVersion = updated.version;
    for (const action of actions) {
      const response = await fetch(`${baseUrl}/issues/${created.id}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'If-Match': '"' + currentVersion + '"' },
        body: JSON.stringify({ action: action.action, actorId: action.actorId, actorRole: action.actorRole }),
      });
      expect(response.status).toBe(201);
      const transitioned = (await response.json()) as { status: string; version: number };
      expect(transitioned.status).toBe(action.expected);
      currentVersion = transitioned.version;
    }

    const historyResponse = await fetch(`${baseUrl}/issues/${created.id}/history`);
    expect(historyResponse.status).toBe(200);
    const history = (await historyResponse.json()) as Array<{
      action: string;
      previousStatus: string;
      newStatus: string;
      actorId: string;
      actorRole: string;
      version: number;
      timestamp: string;
      justification: string;
    }>;
    expect(history).toHaveLength(actions.length);
    expect(history[0]).toMatchObject({
      action: 'INICIAR_TRIAGEM',
      previousStatus: 'BACKLOG',
      newStatus: 'TRIAGEM',
      actorId: 'triager-01',
      actorRole: 'TRIAGER',
      version: 3,
    });
    expect(history[0].timestamp).toBeTruthy();
    expect(history[4].newStatus).toBe('CONCLUIDO');

    const globalAuditResponse = await fetch(`${baseUrl}/issues/audit`);
    expect(globalAuditResponse.status).toBe(200);
    const globalAudit = (await globalAuditResponse.json()) as Array<{ issueId: number }>;
    expect(globalAudit.some((entry) => entry.issueId === created.id)).toBe(true);

    const deleteResponse = await fetch(`${baseUrl}/issues/${created.id}`, { method: 'DELETE' });
    expect(deleteResponse.status).toBe(204);
    expect((await fetch(`${baseUrl}/issues/${created.id}`)).status).toBe(404);
  });

  it('notifies mentioned users and the assignee through Observer events', async () => {
    const createResponse = await fetch(`${baseUrl}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 1,
        title: 'Issue com menções',
        description: 'Validar a correção com @qa-tester e @pedro.',
        type: 'TASK',
        priority: 'MEDIA',
        assignee: 'Ana',
      }),
    });
    expect(createResponse.status).toBe(201);
    const issue = (await createResponse.json()) as { id: number; version: number };

    const mentionResponse = await fetch(`${baseUrl}/notifications/qa-tester`);
    expect(mentionResponse.status).toBe(200);
    const mentionNotifications = (await mentionResponse.json()) as Array<{
      issueId: number; type: string; message: string;
    }>;
    expect(mentionNotifications.some((item) =>
      item.issueId === issue.id && item.type === 'MENTION',
    )).toBe(true);

    const transitionResponse = await fetch(`${baseUrl}/issues/${issue.id}/transitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
      body: JSON.stringify({
        action: 'INICIAR_TRIAGEM',
        actorId: 'triager-01',
        actorRole: 'TRIAGER',
      }),
    });
    expect(transitionResponse.status).toBe(201);

    const updateResponse = await fetch(`${baseUrl}/issues/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"2"' },
      body: JSON.stringify({
        description: 'Revisar com @new-reviewer antes da entrega.',
        assignee: 'Carlos',
      }),
    });
    expect(updateResponse.status).toBe(200);

    const newMentionResponse = await fetch(`${baseUrl}/notifications/new-reviewer`);
    const newMentionNotifications = (await newMentionResponse.json()) as Array<{
      issueId: number; type: string;
    }>;
    expect(newMentionNotifications.some((item) =>
      item.issueId === issue.id && item.type === 'MENTION',
    )).toBe(true);

    const reassignmentResponse = await fetch(`${baseUrl}/notifications/carlos`);
    const reassignmentNotifications = (await reassignmentResponse.json()) as Array<{
      issueId: number; type: string;
    }>;
    expect(reassignmentNotifications.some((item) =>
      item.issueId === issue.id && item.type === 'ASSIGNED',
    )).toBe(true);

    const assigneeNotificationsResponse = await fetch(`${baseUrl}/notifications/ana`);
    expect(assigneeNotificationsResponse.status).toBe(200);
    const assigneeNotifications = (await assigneeNotificationsResponse.json()) as Array<{
      issueId: number; type: string; message: string;
    }>;
    expect(assigneeNotifications.some((item) =>
      item.issueId === issue.id &&
      item.type === 'STATUS_CHANGED' &&
      item.message.includes('BACKLOG para TRIAGEM'),
    )).toBe(true);
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
      headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
      body: JSON.stringify({ action: 'INICIAR_TRIAGEM', actorId: 'dev-01', actorRole: 'DEVELOPER' }),
    });
    expect(forbidden.status).toBe(403);

    const invalidState = await fetch(`${baseUrl}/issues/${issue.id}/transitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
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
      headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
      body: JSON.stringify({ projectId: 9999 }),
    });
    expect(invalidProjectUpdate.status).toBe(404);

    const originalIssue = await fetch(`${baseUrl}/issues/1`);
    const original = (await originalIssue.json()) as { projectId: number };
    expect(original.projectId).toBe(1);

    const tamperedId = await fetch(`${baseUrl}/issues/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
      body: JSON.stringify({ id: 999 }),
    });
    expect(tamperedId.status).toBe(400);

    const emptyPatch = await fetch(`${baseUrl}/issues/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
      body: JSON.stringify({}),
    });
    expect(emptyPatch.status).toBe(400);
  });

  it('requires If-Match and rejects stale HTTP updates', async () => {
    const createdResponse = await fetch(baseUrl + '/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 1, title: 'Issue para concorrência HTTP',
        description: 'Testando versões concorrentes.', type: 'TASK',
        priority: 'BAIXA', assignee: 'Ana',
      }),
    });
    const created = (await createdResponse.json()) as { id: number };

    const missingVersion = await fetch(baseUrl + '/issues/' + created.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Sem versão' }),
    });
    expect(missingVersion.status).toBe(428);

    const firstUpdate = await fetch(baseUrl + '/issues/' + created.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
      body: JSON.stringify({ title: 'Primeira edição' }),
    });
    expect(firstUpdate.status).toBe(200);

    const staleUpdate = await fetch(baseUrl + '/issues/' + created.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
      body: JSON.stringify({ description: 'Edição baseada em versão antiga.' }),
    });
    expect(staleUpdate.status).toBe(409);
  });

  it('allows only one concurrent HTTP edit or transition using the same version', async () => {
    const createResponse = await fetch(baseUrl + '/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 1,
        title: 'Issue para disputa HTTP',
        description: 'Edição e transição não podem sobrescrever a mesma versão.',
        type: 'TASK',
        priority: 'MEDIA',
        assignee: 'Ana',
      }),
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: number; version: number };

    const [editResponse, transitionResponse] = await Promise.all([
      fetch(baseUrl + '/issues/' + created.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
        body: JSON.stringify({ title: 'Edição concorrente HTTP' }),
      }),
      fetch(baseUrl + '/issues/' + created.id + '/transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'If-Match': '"1"' },
        body: JSON.stringify({
          action: 'INICIAR_TRIAGEM',
          actorId: 'triager-http',
          actorRole: 'TRIAGER',
        }),
      }),
    ]);

    const responseStatuses = [editResponse.status, transitionResponse.status];
    expect(responseStatuses.filter((status) => status === 409)).toHaveLength(1);
    expect(responseStatuses.filter((status) => status === 200 || status === 201)).toHaveLength(1);

    const issueResponse = await fetch(baseUrl + '/issues/' + created.id);
    const issue = (await issueResponse.json()) as { status: string; title: string; version: number };
    const historyResponse = await fetch(baseUrl + '/issues/' + created.id + '/history');
    const history = (await historyResponse.json()) as Array<{ newStatus: string; version: number }>;

    expect(issue.version).toBe(2);
    if (transitionResponse.status === 201) {
      expect(issue.status).toBe('TRIAGEM');
      expect(issue.title).toBe('Issue para disputa HTTP');
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ newStatus: 'TRIAGEM', version: 2 });
    } else {
      expect(editResponse.status).toBe(200);
      expect(issue.status).toBe('BACKLOG');
      expect(issue.title).toBe('Edição concorrente HTTP');
      expect(history).toHaveLength(0);
    }
  });

  it('rejects malformed route IDs and missing resources', async () => {
    expect((await fetch(`${baseUrl}/issues/abc`)).status).toBe(400);
    expect((await fetch(`${baseUrl}/issues/999999`)).status).toBe(404);
  });
});
