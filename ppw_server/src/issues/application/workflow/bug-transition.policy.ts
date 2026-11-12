import { IssueType } from '../../domain/issue';
import { IssueTransitionPolicy } from './issue-transition.policy';
import { IssueTransitionRule } from '../../domain/issue-transition';

const RULES: readonly IssueTransitionRule[] = [
  { action: 'INICIAR_TRIAGEM', label: 'Iniciar triagem', from: 'BACKLOG', to: 'TRIAGEM', roles: ['TRIAGER', 'ADMIN'] },
  { action: 'INICIAR_DESENVOLVIMENTO', label: 'Iniciar desenvolvimento', from: 'TRIAGEM', to: 'EM_DESENVOLVIMENTO', roles: ['DEVELOPER', 'ADMIN'] },
  { action: 'ENVIAR_PARA_REVISAO', label: 'Enviar para code review', from: 'EM_DESENVOLVIMENTO', to: 'CODE_REVIEW', roles: ['DEVELOPER', 'ADMIN'] },
  { action: 'SOLICITAR_AJUSTES', label: 'Solicitar ajustes', from: 'CODE_REVIEW', to: 'EM_DESENVOLVIMENTO', roles: ['REVIEWER', 'ADMIN'], requiresJustification: true },
  { action: 'APROVAR_REVISAO', label: 'Aprovar code review', from: 'CODE_REVIEW', to: 'QA', roles: ['REVIEWER', 'ADMIN'] },
  { action: 'REABRIR_DESENVOLVIMENTO', label: 'Reabrir desenvolvimento', from: 'QA', to: 'EM_DESENVOLVIMENTO', roles: ['QA', 'ADMIN'], requiresJustification: true },
  { action: 'APROVAR_QA', label: 'Aprovar QA', from: 'QA', to: 'PRONTO_PARA_DEPLOY', roles: ['QA', 'ADMIN'] },
  { action: 'LIBERAR_DEPLOY', label: 'Concluir deploy', from: 'PRONTO_PARA_DEPLOY', to: 'CONCLUIDO', roles: ['RELEASE_MANAGER', 'ADMIN'] },
];

export class BugTransitionPolicy implements IssueTransitionPolicy {
  readonly issueType: IssueType = 'BUG';

  getRules(): readonly IssueTransitionRule[] {
    return RULES;
  }
}
