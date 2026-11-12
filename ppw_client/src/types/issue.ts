export const ISSUE_TYPES = ['BUG', 'FEATURE', 'TASK'] as const;
export const ISSUE_PRIORITIES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
export const ISSUE_STATUSES = [
  'BACKLOG',
  'TRIAGEM',
  'EM_DESENVOLVIMENTO',
  'CODE_REVIEW',
  'QA',
  'PRONTO_PARA_DEPLOY',
  'CONCLUIDO',
] as const;
export const ISSUE_ROLES = [
  'REPORTER',
  'TRIAGER',
  'DEVELOPER',
  'REVIEWER',
  'QA',
  'RELEASE_MANAGER',
  'ADMIN',
] as const;

export const DEVELOPERS = ['Não atribuído', 'Ana', 'Carlos', 'João', 'Pedro'];
export type IssueType = (typeof ISSUE_TYPES)[number];
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type IssueRole = (typeof ISSUE_ROLES)[number];
export type IssueAction =
  | 'INICIAR_TRIAGEM'
  | 'INICIAR_DESENVOLVIMENTO'
  | 'ENVIAR_PARA_REVISAO'
  | 'SOLICITAR_AJUSTES'
  | 'APROVAR_REVISAO'
  | 'ENVIAR_PARA_QA'
  | 'REABRIR_DESENVOLVIMENTO'
  | 'APROVAR_QA'
  | 'LIBERAR_DEPLOY';

export interface Project {
  id: number;
  name: string;
  description: string;
}

export interface Issue {
  id: number;
  version: number;
  projectId: number;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  assignee: string;
  acceptanceCriteria?: string;
  createdAt: string;
  updatedAt: string;
}

// Status é controlado exclusivamente pelas ações da FSM, nunca pelo CRUD genérico.
export type IssueInput = Omit<Issue, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'status'>;

export interface AvailableIssueAction {
  action: IssueAction;
  label: string;
  targetStatus: IssueStatus;
  requiresJustification: boolean;
}

export interface IssueTransitionCommand {
  action: IssueAction;
  actorId: string;
  actorRole: IssueRole;
  justification?: string;
}


export interface IssueHistoryEntry {
  id: number;
  issueId: number;
  action: IssueAction;
  previousStatus: IssueStatus;
  newStatus: IssueStatus;
  actorId: string;
  actorRole: IssueRole;
  justification: string;
  timestamp: string;
  version: number;
}

export type IssueNotificationType = 'MENTION' | 'STATUS_CHANGED' | 'ASSIGNED';

export interface IssueNotification {
  id: number;
  recipientId: string;
  issueId: number;
  type: IssueNotificationType;
  message: string;
  createdAt: string;
  read: boolean;
}
