import { Issue } from '../../domain/issue';
import { IssueStatus } from '../../domain/issue';
import { NewIssueHistoryEntry } from '../../domain/issue-history';

export const ISSUES_REPOSITORY = Symbol('ISSUES_REPOSITORY');

export type IssueUpdateResult =
  | { kind: 'updated'; issue: Issue }
  | { kind: 'not_found' }
  | { kind: 'version_conflict'; currentVersion: number };

export interface IssuesRepository {
  findAll(): Promise<Issue[]>;
  findById(id: number): Promise<Issue | undefined>;
  create(issue: Omit<Issue, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<Issue>;
  update(
    id: number,
    expectedVersion: number,
    changes: Partial<Omit<Issue, 'id' | 'version' | 'createdAt' | 'updatedAt'>>,
  ): Promise<IssueUpdateResult>;
  transitionWithHistory(
    id: number,
    expectedVersion: number,
    targetStatus: IssueStatus,
    history: NewIssueHistoryEntry,
  ): Promise<IssueUpdateResult>;
  delete(id: number): Promise<boolean>;
}
