import { IssueStatus } from '../../domain/issue';
import { IssueAction, IssueTransitionRule } from '../../domain/issue-transition';
import { IssueTransitionPolicy } from './issue-transition.policy';

/**
 * State do fluxo de trabalho: cada objeto representa um estado válido
 * e expõe somente as transições que podem sair dele.
 */
export abstract class IssueState {
  abstract readonly status: IssueStatus;

  getAvailableTransitions(policy: IssueTransitionPolicy): readonly IssueTransitionRule[] {
    return policy.getRules().filter((rule) => rule.from === this.status);
  }

  findTransition(
    action: IssueAction,
    policy: IssueTransitionPolicy,
  ): IssueTransitionRule | undefined {
    return this.getAvailableTransitions(policy).find((rule) => rule.action === action);
  }
}

class BacklogState extends IssueState { readonly status = 'BACKLOG' as const; }
class TriageState extends IssueState { readonly status = 'TRIAGEM' as const; }
class DevelopmentState extends IssueState { readonly status = 'EM_DESENVOLVIMENTO' as const; }
class CodeReviewState extends IssueState { readonly status = 'CODE_REVIEW' as const; }
class QaState extends IssueState { readonly status = 'QA' as const; }
class ReadyForDeployState extends IssueState { readonly status = 'PRONTO_PARA_DEPLOY' as const; }

class CompletedState extends IssueState {
  readonly status = 'CONCLUIDO' as const;

  getAvailableTransitions(): readonly IssueTransitionRule[] {
    return [];
  }
}

export class IssueStateRegistry {
  private readonly states: ReadonlyMap<IssueStatus, IssueState> = new Map([
    ['BACKLOG', new BacklogState()],
    ['TRIAGEM', new TriageState()],
    ['EM_DESENVOLVIMENTO', new DevelopmentState()],
    ['CODE_REVIEW', new CodeReviewState()],
    ['QA', new QaState()],
    ['PRONTO_PARA_DEPLOY', new ReadyForDeployState()],
    ['CONCLUIDO', new CompletedState()],
  ]);

  get(status: IssueStatus): IssueState {
    const state = this.states.get(status);
    if (!state) throw new Error('Estado de issue não registrado: ' + status);
    return state;
  }
}
