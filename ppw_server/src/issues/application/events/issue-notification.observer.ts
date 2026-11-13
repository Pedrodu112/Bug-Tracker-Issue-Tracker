import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Issue } from '../../domain/issue';
import { IssueEvent } from '../../domain/issue-event';
import {
  NewIssueNotification,
} from '../../domain/issue-notification';
import {
  ISSUE_NOTIFICATION_REPOSITORY,
  IssueNotificationRepository,
} from '../ports/issue-notification.repository';
import { IssueEventBus } from './issue-event-bus';

/**
 * Observador responsável por converter eventos de domínio em notificações.
 * O fluxo da FSM não contém regras de entrega nem conhece este observador.
 */
@Injectable()
export class IssueNotificationObserver implements OnModuleInit {
  constructor(
    private readonly eventBus: IssueEventBus,
    @Inject(ISSUE_NOTIFICATION_REPOSITORY)
    private readonly notifications: IssueNotificationRepository,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe((event) => this.handle(event));
  }

  private async handle(event: IssueEvent): Promise<void> {
    const pending: NewIssueNotification[] = [];

    if (event.type === 'ISSUE_CREATED') {
      for (const recipientId of this.extractMentions(event.issue)) {
        pending.push({
          recipientId,
          issueId: event.issue.id,
          type: 'MENTION',
          message: 'Você foi mencionado na issue #' + event.issue.id + ': ' + event.issue.title,
        });
      }
    }

    if (event.type === 'ISSUE_UPDATED') {
      const previousMentions = new Set(this.extractMentions(event.previousIssue));
      for (const recipientId of this.extractMentions(event.issue)) {
        if (!previousMentions.has(recipientId)) {
          pending.push({
            recipientId,
            issueId: event.issue.id,
            type: 'MENTION',
            message: 'Você foi mencionado na issue #' + event.issue.id + ': ' + event.issue.title,
          });
        }
      }

      const oldAssignee = this.normalizeRecipient(event.previousIssue.assignee);
      const newAssignee = this.normalizeRecipient(event.issue.assignee);
      if (newAssignee && newAssignee !== oldAssignee) {
        pending.push({
          recipientId: newAssignee,
          issueId: event.issue.id,
          type: 'ASSIGNED',
          message: 'A issue #' + event.issue.id + ' foi atribuída a você: ' + event.issue.title,
        });
      }
    }

    if (event.type === 'ISSUE_TRANSITIONED') {
      const recipientId = this.normalizeRecipient(event.issue.assignee);
      if (recipientId && recipientId !== this.normalizeRecipient(event.actorId)) {
        pending.push({
          recipientId,
          issueId: event.issue.id,
          type: 'STATUS_CHANGED',
          message:
            'A issue #' + event.issue.id + ' mudou de ' +
            event.previousStatus + ' para ' + event.issue.status + '.',
        });
      }
    }

    if (pending.length > 0) await this.notifications.createMany(pending);
  }

  private extractMentions(issue: Issue): string[] {
    const searchableText = [
      issue.title,
      issue.description,
      issue.acceptanceCriteria ?? '',
    ].join(' ');
    const recipients = new Set<string>();
    const pattern = /(^|[^A-Za-z0-9._%+-])@([A-Za-z0-9][A-Za-z0-9._-]{0,39})/g;

    for (const match of searchableText.matchAll(pattern)) {
      recipients.add(match[2].toLowerCase());
    }
    return [...recipients];
  }

  private normalizeRecipient(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
  }
}
