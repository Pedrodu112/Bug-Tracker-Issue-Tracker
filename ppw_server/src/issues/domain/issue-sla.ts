import { Issue, IssuePriority } from './issue';

export const ISSUE_SLA_HOURS: Readonly<Record<IssuePriority, number>> = {
  CRITICA: 4,
  ALTA: 8,
  MEDIA: 72,
  BAIXA: 168,
};

export type IssueSlaStatus =
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'BREACHED'
  | 'COMPLETED_ON_TIME'
  | 'COMPLETED_LATE';

export interface IssueSlaReport {
  issueId: number;
  priority: IssuePriority;
  slaHours: number;
  status: IssueSlaStatus;
  createdAt: string;
  dueAt: string;
  evaluatedAt: string;
  elapsedHours: number;
  remainingHours: number;
  progressPercent: number;
}

export function calculateIssueSla(issue: Issue, evaluatedAt = new Date()): IssueSlaReport {
  const slaHours = ISSUE_SLA_HOURS[issue.priority];
  const createdAt = new Date(issue.createdAt);
  const dueAt = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
  const completionTime = new Date(issue.updatedAt);
  const elapsedMs = Math.max(0, evaluatedAt.getTime() - createdAt.getTime());
  const elapsedHours = elapsedMs / (60 * 60 * 1000);
  const remainingHours = Math.max(0, (dueAt.getTime() - evaluatedAt.getTime()) / (60 * 60 * 1000));
  const progressPercent = Math.min(100, Math.round((elapsedHours / slaHours) * 100));

  let status: IssueSlaStatus;
  if (issue.status === 'CONCLUIDO') {
    status = completionTime.getTime() <= dueAt.getTime() ? 'COMPLETED_ON_TIME' : 'COMPLETED_LATE';
  } else if (evaluatedAt.getTime() >= dueAt.getTime()) {
    status = 'BREACHED';
  } else if (progressPercent >= 80) {
    status = 'AT_RISK';
  } else {
    status = 'ON_TRACK';
  }

  return {
    issueId: issue.id,
    priority: issue.priority,
    slaHours,
    status,
    createdAt: issue.createdAt,
    dueAt: dueAt.toISOString(),
    evaluatedAt: evaluatedAt.toISOString(),
    elapsedHours: Number(elapsedHours.toFixed(2)),
    remainingHours: Number(remainingHours.toFixed(2)),
    progressPercent,
  };
}
