import { IssueNotification, NewIssueNotification } from '../../domain/issue-notification';

export const ISSUE_NOTIFICATION_REPOSITORY = Symbol('ISSUE_NOTIFICATION_REPOSITORY');

export interface IssueNotificationRepository {
  createMany(notifications: NewIssueNotification[]): Promise<IssueNotification[]>;
  findByRecipient(recipientId: string): Promise<IssueNotification[]>;
}
