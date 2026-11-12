import { IssueType } from '../../domain/issue';
import { BugTransitionPolicy } from './bug-transition.policy';
import { FeatureTransitionPolicy } from './feature-transition.policy';
import { IssueTransitionPolicy } from './issue-transition.policy';
import { TaskTransitionPolicy } from './task-transition.policy';

export class IssueTransitionPolicyRegistry {
  private readonly policies: ReadonlyMap<IssueType, IssueTransitionPolicy> = new Map([
    ['BUG', new BugTransitionPolicy()],
    ['FEATURE', new FeatureTransitionPolicy()],
    ['TASK', new TaskTransitionPolicy()],
  ]);

  get(issueType: IssueType): IssueTransitionPolicy {
    const policy = this.policies.get(issueType);
    if (!policy) throw new Error(`Não existe política de transição para o tipo ${issueType}.`);
    return policy;
  }
}
