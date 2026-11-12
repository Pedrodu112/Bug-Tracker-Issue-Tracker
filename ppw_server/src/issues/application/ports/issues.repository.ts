import { Issue } from '../../domain/issue';

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
  delete(id: number): Promise<boolean>;
}
