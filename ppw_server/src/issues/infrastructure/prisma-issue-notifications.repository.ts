import { Injectable } from '@nestjs/common';
import type { IssueNotification as PrismaNotificationRecord } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { IssueNotification, NewIssueNotification } from '../domain/issue-notification';
import { IssueNotificationRepository } from '../application/ports/issue-notification.repository';

@Injectable()
export class PrismaIssueNotificationsRepository implements IssueNotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(items: NewIssueNotification[]): Promise<IssueNotification[]> {
    if (items.length === 0) return [];
    const records = await this.prisma.$transaction(
      items.map((item) => this.prisma.issueNotification.create({ data: item })),
    );
    return records.map((record) => this.toDomain(record));
  }

  async findByRecipient(recipientId: string): Promise<IssueNotification[]> {
    const records = await this.prisma.issueNotification.findMany({
      where: { recipientId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaNotificationRecord): IssueNotification {
    return {
      id: record.id,
      recipientId: record.recipientId,
      issueId: record.issueId,
      type: record.type,
      message: record.message,
      createdAt: record.createdAt.toISOString(),
      read: record.read,
    };
  }
}
