import { IssueAction, IssueRole } from './issue-transition';
import { IssueStatus } from './issue';

export interface IssueHistoryEntry {
  readonly id: number;
  readonly issueId: number;
  readonly action: IssueAction;
  readonly previousStatus: IssueStatus;
  readonly newStatus: IssueStatus;
  readonly actorId: string;
  readonly actorRole: IssueRole;
  readonly justification: string;
  readonly timestamp: string;
  readonly version: number;
}

export type NewIssueHistoryEntry = Omit<
  IssueHistoryEntry,
  'id' | 'timestamp' | 'version'
>;
