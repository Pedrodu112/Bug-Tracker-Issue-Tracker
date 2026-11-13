export const ISSUE_NOTIFICATION_TYPES = ['MENTION', 'STATUS_CHANGED', 'ASSIGNED'] as const;
export type IssueNotificationType = (typeof ISSUE_NOTIFICATION_TYPES)[number];

export interface IssueNotification {
  readonly id: number;
  readonly recipientId: string;
  readonly issueId: number;
  readonly type: IssueNotificationType;
  readonly message: string;
  readonly createdAt: string;
  readonly read: boolean;
}

export type NewIssueNotification = Omit<IssueNotification, 'id' | 'createdAt' | 'read'>;
