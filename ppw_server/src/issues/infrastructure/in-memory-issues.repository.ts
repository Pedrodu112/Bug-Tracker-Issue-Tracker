import { Injectable } from '@nestjs/common';
import { Issue, IssueStatus } from '../domain/issue';
import { IssueHistoryEntry, NewIssueHistoryEntry } from '../domain/issue-history';
import { IssueHistoryRepository } from '../application/ports/issue-history.repository';
import { IssueUpdateResult, IssuesRepository } from '../application/ports/issues.repository';

@Injectable()
export class InMemoryIssuesRepository implements IssuesRepository, IssueHistoryRepository {
  private issues: Issue[] = [
    { id: 1, projectId: 1, title: 'Corrigir botão de acesso', description: 'O botão não responde em telas pequenas.', type: 'BUG', priority: 'ALTA', status: 'TRIAGEM', assignee: 'Ana', createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z', version: 1 },
    { id: 2, projectId: 1, title: 'Adicionar tela de perfil', description: 'Criar a primeira versão da tela de perfil.', type: 'FEATURE', priority: 'MEDIA', status: 'EM_DESENVOLVIMENTO', assignee: 'Carlos', acceptanceCriteria: 'O usuário deve conseguir criar e consultar o próprio perfil.', createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-12T10:00:00.000Z', version: 1 },
    { id: 3, projectId: 2, title: 'Revisar notificações', description: 'Validar mensagens enviadas pelo aplicativo.', type: 'TASK', priority: 'BAIXA', status: 'QA', assignee: 'João', createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z', version: 1 },
    { id: 4, projectId: 3, title: 'Erro na matrícula online', description: 'A matrícula falha para alguns cursos.', type: 'BUG', priority: 'CRITICA', status: 'CODE_REVIEW', assignee: 'Pedro', createdAt: '2026-09-12T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z', version: 1 },
    { id: 5, projectId: 3, title: 'Publicar calendário acadêmico', description: 'Inserir o novo calendário no portal.', type: 'TASK', priority: 'MEDIA', status: 'CONCLUIDO', assignee: 'Ana', createdAt: '2026-09-09T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z', version: 1 },
  ];
  private nextId = Math.max(0, ...this.issues.map((issue) => issue.id)) + 1;
  private history: IssueHistoryEntry[] = [];
  private nextHistoryId = 1;

  async findAll(): Promise<Issue[]> {
    return this.issues.map((issue) => ({ ...issue }));
  }

  async findById(id: number): Promise<Issue | undefined> {
    const issue = this.issues.find((item) => item.id === id);
    return issue ? { ...issue } : undefined;
  }

  async create(data: Omit<Issue, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<Issue> {
    const now = new Date().toISOString();
    const issue: Issue = { ...data, id: this.nextId++, version: 1, createdAt: now, updatedAt: now };
    this.issues.push(issue);
    return { ...issue };
  }

  async update(
    id: number,
    expectedVersion: number,
    changes: Partial<Omit<Issue, 'id' | 'version' | 'createdAt' | 'updatedAt'>>,
  ): Promise<IssueUpdateResult> {
    const index = this.issues.findIndex((item) => item.id === id);
    if (index === -1) return { kind: 'not_found' };

    const current = this.issues[index];
    if (current.version !== expectedVersion) {
      return { kind: 'version_conflict', currentVersion: current.version };
    }

    const updated: Issue = {
      ...current,
      ...changes,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.issues[index] = updated;
    return { kind: 'updated', issue: { ...updated } };
  }


  /**
   * Escreve o evento de auditoria e a nova versão no mesmo trecho síncrono
   * do adaptador em memória. Isso evita interleaving dentro deste processo,
   * mas não equivale a uma transação ACID de banco de dados.
   */
  async transitionWithHistory(
    id: number,
    expectedVersion: number,
    targetStatus: IssueStatus,
    history: NewIssueHistoryEntry,
  ): Promise<IssueUpdateResult> {
    const index = this.issues.findIndex((item) => item.id === id);
    if (index === -1) return { kind: 'not_found' };

    const current = this.issues[index];
    if (current.version !== expectedVersion) {
      return { kind: 'version_conflict', currentVersion: current.version };
    }

    const now = new Date().toISOString();
    const updated: Issue = {
      ...current,
      status: targetStatus,
      version: current.version + 1,
      updatedAt: now,
    };
    const entry: IssueHistoryEntry = {
      ...history,
      id: this.nextHistoryId,
      timestamp: now,
      version: updated.version,
    };

    // O hook permite simular falha de escrita; antes dele nada é mutado.
    this.beforeAppendHistory();
    this.history.push(entry);
    this.nextHistoryId += 1;
    this.issues[index] = updated;

    return { kind: 'updated', issue: { ...updated } };
  }

  protected beforeAppendHistory(): void {
    // Ponto de extensão para adaptadores especializados e testes de falha.
  }

  async findByIssueId(issueId: number): Promise<IssueHistoryEntry[]> {
    return this.history
      .filter((entry) => entry.issueId === issueId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id - b.id)
      .map((entry) => ({ ...entry }));
  }

  async findAllHistory(): Promise<IssueHistoryEntry[]> {
    return [...this.history]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id - b.id)
      .map((entry) => ({ ...entry }));
  }

  async delete(id: number): Promise<boolean> {
    const before = this.issues.length;
    this.issues = this.issues.filter((item) => item.id !== id);
    return this.issues.length !== before;
  }
}
