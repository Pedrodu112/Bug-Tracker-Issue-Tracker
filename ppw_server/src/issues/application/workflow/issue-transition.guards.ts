import { Issue } from '../../domain/issue';
import { IssueTransitionRule } from '../../domain/issue-transition';

export class IssueTransitionGuards {
  getFailure(
    issue: Issue,
    rule: IssueTransitionRule,
    justification?: string,
    validateJustification = true,
  ): string | undefined {
    if (
      issue.type === 'FEATURE' &&
      rule.action === 'INICIAR_DESENVOLVIMENTO' &&
      (issue.acceptanceCriteria?.trim().length ?? 0) < 20
    ) {
      return 'Uma FEATURE exige critérios de aceite com pelo menos 20 caracteres antes do desenvolvimento.';
    }

    if (validateJustification && rule.requiresJustification && (justification?.trim().length ?? 0) < 10) {
      return 'Esta ação exige uma justificativa com pelo menos 10 caracteres.';
    }

    return undefined;
  }
}
