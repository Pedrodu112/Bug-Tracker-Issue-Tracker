import { Injectable } from '@nestjs/common';
import { IssueNotification, NewIssueNotification } from '../domain/issue-notification';
import { IssueNotificationRepository } from '../application/ports/issue-notification.repository';

@Injectable()
export class InMemoryIssueNotificationsRepository implements IssueNotificationRepository {
  private notifications: IssueNotification[] = [];
  private nextId = 1;

  async createMany(items: NewIssueNotification[]): Promise<IssueNotification[]> {
    const created = items.map((item) => ({
      ...item,
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      read: false,
    }));
    this.notifications.push(...created);
    return created.map((notification) => ({ ...notification }));
  }

  async findByRecipient(recipientId: string): Promise<IssueNotification[]> {
    return this.notifications
      .filter((notification) => notification.recipientId === recipientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map((notification) => ({ ...notification }));
  }
}
