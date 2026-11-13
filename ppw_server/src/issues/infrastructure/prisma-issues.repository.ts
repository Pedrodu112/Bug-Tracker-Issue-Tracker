import { Injectable } from '@nestjs/common';
import type {
  Issue as PrismaIssueRecord,
  IssueHistory as PrismaHistoryRecord,
} from '../../generated/prisma/client';
import { Issue, IssueStatus } from '../domain/issue';
import { IssueHistoryEntry, NewIssueHistoryEntry } from '../domain/issue-history';
import { IssueHistoryRepository } from '../application/ports/issue-history.repository';
import { IssueUpdateResult, IssuesRepository } from '../application/ports/issues.repository';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrismaIssuesRepository implements IssuesRepository, IssueHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Issue[]> {
    const records = await this.prisma.issue.findMany({ orderBy: { id: 'asc' } });
    return records.map((record) => this.toDomainIssue(record));
  }

  async findById(id: number): Promise<Issue | undefined> {
    const record = await this.prisma.issue.findUnique({ where: { id } });
    return record ? this.toDomainIssue(record) : undefined;
  }

  async create(data: Omit<Issue, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<Issue> {
    const record = await this.prisma.issue.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        status: data.status,
        assignee: data.assignee,
        acceptanceCriteria: data.acceptanceCriteria ?? null,
      },
    });
    return this.toDomainIssue(record);
  }

  async update(
    id: number,
    expectedVersion: number,
    changes: Partial<Omit<Issue, 'id' | 'version' | 'createdAt' | 'updatedAt'>>,
  ): Promise<IssueUpdateResult> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.issue.updateMany({
        where: { id, version: expectedVersion },
        data: { ...changes, version: { increment: 1 } },
      });

      if (result.count === 0) {
        const current = await transaction.issue.findUnique({ where: { id }, select: { version: true } });
        return current
          ? { kind: 'version_conflict', currentVersion: current.version }
          : { kind: 'not_found' };
      }

      const updated = await transaction.issue.findUniqueOrThrow({ where: { id } });
      return { kind: 'updated', issue: this.toDomainIssue(updated) };
    });
  }

  async transitionWithHistory(
    id: number,
    expectedVersion: number,
    targetStatus: IssueStatus,
    history: NewIssueHistoryEntry,
  ): Promise<IssueUpdateResult> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.issue.updateMany({
        where: { id, version: expectedVersion },
        data: { status: targetStatus, version: { increment: 1 } },
      });

      if (result.count === 0) {
        const current = await transaction.issue.findUnique({ where: { id }, select: { version: true } });
        return current
          ? { kind: 'version_conflict', currentVersion: current.version }
          : { kind: 'not_found' };
      }

      const updated = await transaction.issue.findUniqueOrThrow({ where: { id } });
      await transaction.issueHistory.create({
        data: {
          issueId: history.issueId,
          action: history.action,
          previousStatus: history.previousStatus,
          newStatus: history.newStatus,
          actorId: history.actorId,
          actorRole: history.actorRole,
          justification: history.justification,
          version: updated.version,
        },
      });

      // A falha na inserção do histórico rejeita a transação e desfaz a mudança de status.
      return { kind: 'updated', issue: this.toDomainIssue(updated) };
    });
  }

  async findByIssueId(issueId: number): Promise<IssueHistoryEntry[]> {
    const records = await this.prisma.issueHistory.findMany({
      where: { issueId },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => this.toDomainHistory(record));
  }

  async findAllHistory(): Promise<IssueHistoryEntry[]> {
    const records = await this.prisma.issueHistory.findMany({
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => this.toDomainHistory(record));
  }

  async delete(id: number): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const historyCount = await transaction.issueHistory.count({ where: { issueId: id } });
      if (historyCount > 0) return false;

      const result = await transaction.issue.deleteMany({ where: { id } });
      return result.count > 0;
    });
  }

  private toDomainIssue(record: PrismaIssueRecord): Issue {
    return {
      id: record.id,
      version: record.version,
      projectId: record.projectId,
      title: record.title,
      description: record.description,
      type: record.type,
      priority: record.priority,
      status: record.status,
      assignee: record.assignee,
      acceptanceCriteria: record.acceptanceCriteria ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toDomainHistory(record: PrismaHistoryRecord): IssueHistoryEntry {
    return {
      id: record.id,
      issueId: record.issueId,
      action: record.action,
      previousStatus: record.previousStatus,
      newStatus: record.newStatus,
      actorId: record.actorId,
      actorRole: record.actorRole,
      justification: record.justification,
      timestamp: record.timestamp.toISOString(),
      version: record.version,
    };
  }
}
