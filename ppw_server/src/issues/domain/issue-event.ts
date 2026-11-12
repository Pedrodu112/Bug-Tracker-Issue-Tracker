import { Issue, IssueStatus } from './issue';

export type IssueEvent =
  | {
      type: 'ISSUE_CREATED';
      issue: Issue;
      occurredAt: string;
    }
  | {
      type: 'ISSUE_UPDATED';
      issue: Issue;
      previousIssue: Issue;
      occurredAt: string;
    }
  | {
      type: 'ISSUE_TRANSITIONED';
      issue: Issue;
      previousStatus: IssueStatus;
      actorId: string;
      occurredAt: string;
    };

export const ISSUE_EVENT_PUBLISHER = Symbol('ISSUE_EVENT_PUBLISHER');

export interface IssueEventPublisher {
  publish(event: IssueEvent): Promise<void>;
}

export type IssueEventHandler = (event: IssueEvent) => Promise<void> | void;
