import { IssueStatus } from './issue';

export const ISSUE_ACTIONS = [
  'INICIAR_TRIAGEM',
  'INICIAR_DESENVOLVIMENTO',
  'ENVIAR_PARA_REVISAO',
  'SOLICITAR_AJUSTES',
  'APROVAR_REVISAO',
  'ENVIAR_PARA_QA',
  'REABRIR_DESENVOLVIMENTO',
  'APROVAR_QA',
  'LIBERAR_DEPLOY',
] as const;

export const ISSUE_ROLES = [
  'REPORTER',
  'TRIAGER',
  'DEVELOPER',
  'REVIEWER',
  'QA',
  'RELEASE_MANAGER',
  'ADMIN',
] as const;

export type IssueAction = (typeof ISSUE_ACTIONS)[number];
export type IssueRole = (typeof ISSUE_ROLES)[number];

export interface IssueTransitionCommand {
  action: IssueAction;
  actorId: string;
  actorRole: IssueRole;
  justification?: string;
}

export interface IssueTransitionRule {
  action: IssueAction;
  label: string;
  from: IssueStatus;
  to: IssueStatus;
  roles: readonly IssueRole[];
  requiresJustification?: boolean;
}

export interface AvailableIssueAction {
  action: IssueAction;
  label: string;
  targetStatus: IssueStatus;
  requiresJustification: boolean;
}
