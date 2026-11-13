import { IssueType } from '../../domain/issue';
import { IssueTransitionPolicy } from './issue-transition.policy';
import { IssueTransitionRule } from '../../domain/issue-transition';

// TASK representa trabalho operacional que não exige revisão de código.
// BUG e FEATURE seguem o fluxo completo com CODE_REVIEW.
const RULES: readonly IssueTransitionRule[] = [
  { action: 'INICIAR_TRIAGEM', label: 'Iniciar triagem', from: 'BACKLOG', to: 'TRIAGEM', roles: ['TRIAGER', 'ADMIN'] },
  { action: 'INICIAR_DESENVOLVIMENTO', label: 'Iniciar execução', from: 'TRIAGEM', to: 'EM_DESENVOLVIMENTO', roles: ['DEVELOPER', 'ADMIN'] },
  { action: 'ENVIAR_PARA_QA', label: 'Enviar para validação', from: 'EM_DESENVOLVIMENTO', to: 'QA', roles: ['DEVELOPER', 'ADMIN'] },
  { action: 'APROVAR_QA', label: 'Aprovar validação', from: 'QA', to: 'PRONTO_PARA_DEPLOY', roles: ['QA', 'ADMIN'] },
  { action: 'LIBERAR_DEPLOY', label: 'Concluir entrega', from: 'PRONTO_PARA_DEPLOY', to: 'CONCLUIDO', roles: ['RELEASE_MANAGER', 'ADMIN'] },
];

export class TaskTransitionPolicy implements IssueTransitionPolicy {
  readonly issueType: IssueType = 'TASK';

  getRules(): readonly IssueTransitionRule[] {
    return RULES;
  }
}
