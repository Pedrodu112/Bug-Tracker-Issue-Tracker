export const ISSUE_TYPES = ['BUG', 'FEATURE', 'TASK'] as const;
export const ISSUE_PRIORITIES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
export const ISSUE_STATUSES = ['BACKLOG', 'TRIAGEM', 'EM_DESENVOLVIMENTO', 'CODE_REVIEW', 'QA', 'PRONTO_PARA_DEPLOY', 'CONCLUIDO'] as const;
export const DEVELOPERS = ['Não atribuído', 'Ana', 'Carlos', 'João', 'Pedro'];
export type IssueType = (typeof ISSUE_TYPES)[number]; export type IssuePriority = (typeof ISSUE_PRIORITIES)[number]; export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export interface Project { id: number; name: string; description: string; }
export interface Issue { id: number; projectId: number; title: string; description: string; type: IssueType; priority: IssuePriority; status: IssueStatus; assignee: string; createdAt: string; updatedAt: string; }
export type IssueInput = Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>;
