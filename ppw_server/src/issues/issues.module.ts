import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { IssuesController } from './issues.controller';
import { NotificationsController } from './notifications.controller';
import { IssuesUseCases } from './application/issues.use-cases';
import { NotificationsUseCases } from './application/notifications.use-cases';
import { IssueEventBus } from './application/events/issue-event-bus';
import { IssueNotificationObserver } from './application/events/issue-notification.observer';
import { ISSUES_REPOSITORY } from './application/ports/issues.repository';
import { ISSUE_HISTORY_REPOSITORY } from './application/ports/issue-history.repository';
import { ISSUE_EVENT_PUBLISHER } from './domain/issue-event';
import { ISSUE_NOTIFICATION_REPOSITORY } from './application/ports/issue-notification.repository';
import { InMemoryIssuesRepository } from './infrastructure/in-memory-issues.repository';
import { InMemoryIssueNotificationsRepository } from './infrastructure/in-memory-issue-notifications.repository';

@Module({
  imports: [ProjectsModule],
  controllers: [IssuesController, NotificationsController],
  providers: [
    IssuesUseCases,
    InMemoryIssuesRepository,
    { provide: ISSUES_REPOSITORY, useExisting: InMemoryIssuesRepository },
    { provide: ISSUE_HISTORY_REPOSITORY, useExisting: InMemoryIssuesRepository },
    InMemoryIssueNotificationsRepository,
    { provide: ISSUE_NOTIFICATION_REPOSITORY, useExisting: InMemoryIssueNotificationsRepository },
    IssueEventBus,
    { provide: ISSUE_EVENT_PUBLISHER, useExisting: IssueEventBus },
    IssueNotificationObserver,
    NotificationsUseCases,
  ],
})
export class IssuesModule {}
