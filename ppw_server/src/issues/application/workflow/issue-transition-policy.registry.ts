import { IssueType } from '../../domain/issue';
import { IssueTransitionPolicy } from './issue-transition.policy';
import { BugTransitionPolicy } from './bug-transition.policy';
import { FeatureTransitionPolicy } from './feature-transition.policy';
import { TaskTransitionPolicy } from './task-transition.policy';

/**
 * Registro de estratégias por tipo. Novas políticas podem ser registradas
 * sem alterar o caso de uso que executa as transições.
 */
export class IssueTransitionPolicyRegistry {
  private readonly policies = new Map<IssueType, IssueTransitionPolicy>();

  constructor() {
    this.register(new BugTransitionPolicy());
    this.register(new FeatureTransitionPolicy());
    this.register(new TaskTransitionPolicy());
  }

  register(policy: IssueTransitionPolicy): void {
    this.policies.set(policy.issueType, policy);
  }

  get(issueType: IssueType): IssueTransitionPolicy {
    const policy = this.policies.get(issueType);
    if (!policy) throw new Error(`Não existe política de transição para o tipo ${issueType}.`);
    return policy;
  }
}
