import { IssueHistoryEntry } from '../../domain/issue-history';

export const ISSUE_HISTORY_REPOSITORY = Symbol('ISSUE_HISTORY_REPOSITORY');

export interface IssueHistoryRepository {
  findByIssueId(issueId: number): Promise<IssueHistoryEntry[]>;
  findAll(): Promise<IssueHistoryEntry[]>;
}
