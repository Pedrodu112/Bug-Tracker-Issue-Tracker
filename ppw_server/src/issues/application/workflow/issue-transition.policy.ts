import { IssueType } from '../../domain/issue';
import { IssueTransitionRule } from '../../domain/issue-transition';

export interface IssueTransitionPolicy {
  readonly issueType: IssueType;
  getRules(): readonly IssueTransitionRule[];
}
