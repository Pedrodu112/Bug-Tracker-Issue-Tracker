import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Issue } from './issue.interface';

@Injectable()
export class IssuesService {
  private issues: Issue[] = [
    { id: 1, projectId: 1, title: 'Corrigir botão de acesso', description: 'O botão não responde em telas pequenas.', type: 'BUG', priority: 'ALTA', status: 'TRIAGEM', assignee: 'Ana', createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 2, projectId: 1, title: 'Adicionar tela de perfil', description: 'Criar a primeira versão da tela de perfil.', type: 'FEATURE', priority: 'MEDIA', status: 'EM_DESENVOLVIMENTO', assignee: 'Carlos', createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-12T10:00:00.000Z' },
    { id: 3, projectId: 2, title: 'Revisar notificações', description: 'Validar mensagens enviadas pelo aplicativo.', type: 'TASK', priority: 'BAIXA', status: 'QA', assignee: 'João', createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z' },
    { id: 4, projectId: 3, title: 'Erro na matrícula online', description: 'A matrícula falha para alguns cursos.', type: 'BUG', priority: 'CRITICA', status: 'CODE_REVIEW', assignee: 'Pedro', createdAt: '2026-09-12T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z' },
    { id: 5, projectId: 3, title: 'Publicar calendário acadêmico', description: 'Inserir o novo calendário no portal.', type: 'TASK', priority: 'MEDIA', status: 'CONCLUIDO', assignee: 'Ana', createdAt: '2026-09-09T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z' },
  ];
  findAll() { return this.issues; }
  findOne(id: number) { const issue = this.issues.find((item) => item.id === id); if (!issue) throw new NotFoundException('Issue não encontrada.'); return issue; }
  create(data: CreateIssueDto) { const now = new Date().toISOString(); const id = Math.max(0, ...this.issues.map((issue) => issue.id)) + 1; const issue: Issue = { ...data, id, status: data.status ?? 'BACKLOG', createdAt: now, updatedAt: now }; this.issues.push(issue); return issue; }
  update(id: number, data: UpdateIssueDto) { const issue = this.findOne(id); Object.assign(issue, data, { updatedAt: new Date().toISOString() }); return issue; }
  remove(id: number) { const issue = this.findOne(id); this.issues = this.issues.filter((item) => item.id !== id); return issue; }
}
