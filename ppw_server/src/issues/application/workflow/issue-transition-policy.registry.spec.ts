import { IssueTransitionPolicy } from './issue-transition.policy';
import { IssueTransitionPolicyRegistry } from './issue-transition-policy.registry';

describe('IssueTransitionPolicyRegistry', () => {
  it('uses the same policy contract for BUG, FEATURE and TASK', () => {
    const registry = new IssueTransitionPolicyRegistry();

    for (const issueType of ['BUG', 'FEATURE', 'TASK'] as const) {
      const policy = registry.get(issueType);
      expect(policy.issueType).toBe(issueType);
      expect(Array.isArray(policy.getRules())).toBe(true);
    }
  });

  it('allows an alternative policy to be registered without changing the use case', () => {
    const registry = new IssueTransitionPolicyRegistry();
    const replacement: IssueTransitionPolicy = {
      issueType: 'FEATURE',
      getRules: () => [],
    };

    registry.register(replacement);

    expect(registry.get('FEATURE')).toBe(replacement);
    expect(registry.get('FEATURE').getRules()).toEqual([]);
  });
});
