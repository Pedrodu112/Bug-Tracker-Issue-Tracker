import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ISSUE_NOTIFICATION_REPOSITORY,
  IssueNotificationRepository,
} from './ports/issue-notification.repository';
import { IssueNotification } from '../domain/issue-notification';

@Injectable()
export class NotificationsUseCases {
  constructor(
    @Inject(ISSUE_NOTIFICATION_REPOSITORY)
    private readonly repository: IssueNotificationRepository,
  ) {}

  findByRecipient(recipientId: string): Promise<IssueNotification[]> {
    const normalized = recipientId.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(normalized)) {
      throw new BadRequestException('Identificador de destinatário inválido.');
    }
    return this.repository.findByRecipient(normalized);
  }
}
