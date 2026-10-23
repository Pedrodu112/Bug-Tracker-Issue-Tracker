import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { AppModule } from '../app/app.module';

describe('Issues HTTP API', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, reads, edits and deletes an issue through HTTP', async () => {
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
    const created = (await createdResponse.json()) as {
      id: number;
      title: string;
      status: string;
      projectId: number;
    };
    expect(created.id).toBeGreaterThan(0);
    expect(created.status).toBe('BACKLOG');
    expect(created.projectId).toBe(1);

    const readResponse = await fetch(`${baseUrl}/issues/${created.id}`);
    expect(readResponse.status).toBe(200);
    const read = (await readResponse.json()) as { title: string };
    expect(read.title).toBe('Issue de teste HTTP');

    const updateResponse = await fetch(`${baseUrl}/issues/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Título alterado pelo teste', status: 'QA' }),
    });
    expect(updateResponse.status).toBe(200);
    const updated = (await updateResponse.json()) as { title: string; status: string };
    expect(updated.title).toBe('Título alterado pelo teste');
    expect(updated.status).toBe('QA');

    const deleteResponse = await fetch(`${baseUrl}/issues/${created.id}`, {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(204);

    const missingResponse = await fetch(`${baseUrl}/issues/${created.id}`);
    expect(missingResponse.status).toBe(404);
  });

  it('rejects blank text, invalid enums, and attempts to set server-owned fields', async () => {
    const invalidPayloads = [
      {
        projectId: 1,
        title: '   ',
        description: 'Descrição válida',
        type: 'TASK',
        priority: 'BAIXA',
        assignee: 'Ana',
      },
      {
        projectId: 1,
        title: 'Issue válida',
        description: 'Descrição válida',
        type: 'UNKNOWN',
        priority: 'BAIXA',
        assignee: 'Ana',
      },
      {
        projectId: 1,
        title: 'Issue válida',
        description: 'Descrição válida',
        type: 'TASK',
        priority: 'BAIXA',
        assignee: 'Ana',
        id: 1,
      },
      {
        projectId: 1,
        title: 'Issue válida',
        description: 'Descrição válida',
        type: 'TASK',
        priority: 'BAIXA',
        assignee: 'Ana',
        createdAt: '2000-01-01T00:00:00.000Z',
      },
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

  it('rejects nonexistent projects and empty updates', async () => {
    const createResponse = await fetch(`${baseUrl}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 9999,
        title: 'Issue com projeto inexistente',
        description: 'Não deve ser salva.',
        type: 'TASK',
        priority: 'BAIXA',
        assignee: 'Ana',
      }),
    });
    expect(createResponse.status).toBe(404);

    const emptyPatch = await fetch(`${baseUrl}/issues/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(emptyPatch.status).toBe(400);
  });

  it('rejects malformed route IDs and missing resources', async () => {
    const malformedId = await fetch(`${baseUrl}/issues/abc`);
    expect(malformedId.status).toBe(400);

    const missingIssue = await fetch(`${baseUrl}/issues/999999`);
    expect(missingIssue.status).toBe(404);
  });
});
