import { Injectable } from '@nestjs/common';
import { Issue } from '../domain/issue';
import { IssuesRepository } from '../application/ports/issues.repository';

@Injectable()
export class InMemoryIssuesRepository implements IssuesRepository {
  private issues: Issue[] = [
    { id: 1, projectId: 1, title: 'Corrigir botão de acesso', description: 'O botão não responde em telas pequenas.', type: 'BUG', priority: 'ALTA', status: 'TRIAGEM', assignee: 'Ana', createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 2, projectId: 1, title: 'Adicionar tela de perfil', description: 'Criar a primeira versão da tela de perfil.', type: 'FEATURE', priority: 'MEDIA', status: 'EM_DESENVOLVIMENTO', assignee: 'Carlos', createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-12T10:00:00.000Z' },
    { id: 3, projectId: 2, title: 'Revisar notificações', description: 'Validar mensagens enviadas pelo aplicativo.', type: 'TASK', priority: 'BAIXA', status: 'QA', assignee: 'João', createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z' },
    { id: 4, projectId: 3, title: 'Erro na matrícula online', description: 'A matrícula falha para alguns cursos.', type: 'BUG', priority: 'CRITICA', status: 'CODE_REVIEW', assignee: 'Pedro', createdAt: '2026-09-12T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z' },
    { id: 5, projectId: 3, title: 'Publicar calendário acadêmico', description: 'Inserir o novo calendário no portal.', type: 'TASK', priority: 'MEDIA', status: 'CONCLUIDO', assignee: 'Ana', createdAt: '2026-09-09T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z' },
  ];
  private nextId = Math.max(0, ...this.issues.map((issue) => issue.id)) + 1;

  async findAll(): Promise<Issue[]> {
    return this.issues.map((issue) => ({ ...issue }));
  }

  async findById(id: number): Promise<Issue | undefined> {
    const issue = this.issues.find((item) => item.id === id);
    return issue ? { ...issue } : undefined;
  }

  async create(data: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Promise<Issue> {
    const now = new Date().toISOString();
    const issue: Issue = { ...data, id: this.nextId++, createdAt: now, updatedAt: now };
    this.issues.push(issue);
    return { ...issue };
  }

  async update(
    id: number,
    changes: Partial<Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Issue | undefined> {
    const index = this.issues.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    const updated: Issue = { ...this.issues[index], ...changes, updatedAt: new Date().toISOString() };
    this.issues[index] = updated;
    return { ...updated };
  }

  async delete(id: number): Promise<boolean> {
    const before = this.issues.length;
    this.issues = this.issues.filter((item) => item.id !== id);
    return this.issues.length !== before;
  }
}
