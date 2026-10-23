import { Issue } from '../../domain/issue';

export const ISSUES_REPOSITORY = Symbol('ISSUES_REPOSITORY');

export interface IssuesRepository {
  findAll(): Promise<Issue[]>;
  findById(id: number): Promise<Issue | undefined>;
  create(issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Promise<Issue>;
  update(id: number, changes: Partial<Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Issue | undefined>;
  delete(id: number): Promise<boolean>;
}
