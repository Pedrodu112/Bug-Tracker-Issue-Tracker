import {
  AvailableIssueAction,
  Issue,
  IssueInput,
  IssueHistoryEntry,
  IssueNotification,
  IssueRole,
  IssueTransitionCommand,
  Project,
} from '@/types/issue';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Não foi possível concluir a operação.');
  }

  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export const getIssues = () => request<Issue[]>('/issues');
export const getIssueById = (id: number) => request<Issue>(`/issues/${id}`);
export const getIssueHistory = (id: number) =>
  request<IssueHistoryEntry[]>(`/issues/${id}/history`);
export const getAuditLog = () => request<IssueHistoryEntry[]>('/issues/audit');
export const getIssueNotifications = (recipientId: string) =>
  request<IssueNotification[]>(`/notifications/${encodeURIComponent(recipientId)}`);
export const createIssue = (issue: IssueInput) =>
  request<Issue>('/issues', { method: 'POST', body: JSON.stringify(issue) });
export const updateIssue = (id: number, issue: Partial<IssueInput>, expectedVersion: number) =>
  request<Issue>('/issues/' + id, {
    method: 'PATCH',
    headers: { 'If-Match': '"' + expectedVersion + '"' },
    body: JSON.stringify(issue),
  });
export const deleteIssue = (id: number) => request<void>(`/issues/${id}`);
export const getProjects = () => request<Project[]>('/projetos');
export const getProjectById = (id: number) => request<Project>(`/projetos/${id}`);

export const getAvailableIssueActions = (id: number, actorRole: IssueRole) =>
  request<AvailableIssueAction[]>(
    `/issues/${id}/actions?actorRole=${encodeURIComponent(actorRole)}`,
  );

export const transitionIssue = (id: number, command: IssueTransitionCommand, expectedVersion: number) =>
  request<Issue>('/issues/' + id + '/transitions', {
    method: 'POST',
    headers: { 'If-Match': '"' + expectedVersion + '"' },
    body: JSON.stringify(command),
  });
