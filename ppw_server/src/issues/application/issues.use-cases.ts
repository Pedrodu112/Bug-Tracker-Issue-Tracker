import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Project } from '../../projects/domain/project';
import { PROJECTS_REPOSITORY, ProjectsRepository } from '../../projects/application/ports/projects.repository';
import { Issue, IssueType } from '../domain/issue';
import { IssueHistoryEntry } from '../domain/issue-history';
import { calculateIssueSla, IssueSlaReport } from '../domain/issue-sla';
import { ISSUE_EVENT_PUBLISHER, IssueEventPublisher } from '../domain/issue-event';
import {
  AvailableIssueAction,
  ISSUE_ROLES,
  IssueRole,
  IssueTransitionCommand,
  IssueTransitionRule,
} from '../domain/issue-transition';
import { IssueUpdateResult, ISSUES_REPOSITORY, IssuesRepository } from './ports/issues.repository';
import { ISSUE_HISTORY_REPOSITORY, IssueHistoryRepository } from './ports/issue-history.repository';
import { IssueTransitionPolicyRegistry } from './workflow/issue-transition-policy.registry';
import { IssueTransitionGuards } from './workflow/issue-transition.guards';
import { IssueStateRegistry } from './workflow/issue-state.registry';

export type CreateIssueInput = Omit<Issue, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'status'>;
export type UpdateIssueInput = Partial<Omit<CreateIssueInput, 'type'>>;

@Injectable()
export class IssuesUseCases {
  private readonly policyRegistry = new IssueTransitionPolicyRegistry();
  private readonly transitionGuards = new IssueTransitionGuards();
  private readonly stateRegistry = new IssueStateRegistry();

  constructor(
    @Inject(ISSUES_REPOSITORY) private readonly repository: IssuesRepository,
    @Inject(PROJECTS_REPOSITORY) private readonly projectsRepository: ProjectsRepository,
    @Inject(ISSUE_HISTORY_REPOSITORY) private readonly historyRepository: IssueHistoryRepository,
    @Optional() @Inject(ISSUE_EVENT_PUBLISHER) private readonly eventPublisher?: IssueEventPublisher,
  ) {}

  findAll(): Promise<Issue[]> {
    return this.repository.findAll();
  }

  async findOne(id: number): Promise<Issue> {
    const issue = await this.repository.findById(id);
    if (!issue) throw new NotFoundException('Issue não encontrada.');
    return issue;
  }

  async create(data: CreateIssueInput): Promise<Issue> {
    await this.ensureProjectExists(data.projectId);
    const issue = await this.repository.create({ ...data, status: 'BACKLOG' });
    await this.eventPublisher?.publish({
      type: 'ISSUE_CREATED',
      issue,
      occurredAt: new Date().toISOString(),
    });
    return issue;
  }

  async update(id: number, data: UpdateIssueInput, expectedVersion: number): Promise<Issue> {
    const current = await this.findOne(id);
    this.assertExpectedVersion(current, expectedVersion);

    if (Object.prototype.hasOwnProperty.call(data as object, 'status')) {
      throw new BadRequestException(
        'O status não pode ser alterado pelo PATCH genérico. Use uma ação explícita de transição.',
      );
    }
    if (Object.prototype.hasOwnProperty.call(data as object, 'type')) {
      throw new BadRequestException(
        'O tipo da issue é imutável após a criação para impedir desvios nas regras da FSM.',
      );
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Informe ao menos um campo para atualizar.');
    }
    if (data.projectId !== undefined) await this.ensureProjectExists(data.projectId);

    const result = await this.repository.update(id, expectedVersion, data);
    const updated = this.unwrapUpdateResult(result);
    await this.eventPublisher?.publish({
      type: 'ISSUE_UPDATED',
      issue: updated,
      previousIssue: current,
      occurredAt: new Date().toISOString(),
    });
    return updated;
  }

  async getAvailableActions(id: number, actorRole: string): Promise<AvailableIssueAction[]> {
    this.assertValidRole(actorRole);
    const issue = await this.findOne(id);
    const policy = this.policyRegistry.get(issue.type as IssueType);

    return this.stateRegistry.get(issue.status)
      .getAvailableTransitions(policy)
      .filter((rule) => rule.roles.includes(actorRole as IssueRole))
      .filter((rule) => !this.transitionGuards.getFailure(issue, rule, undefined, false))
      .map((rule) => this.toAvailableAction(rule));
  }

  async transition(id: number, command: IssueTransitionCommand, expectedVersion: number): Promise<Issue> {
    const issue = await this.findOne(id);
    this.assertExpectedVersion(issue, expectedVersion);
    this.assertValidRole(command.actorRole);

    if (!command.actorId?.trim()) {
      throw new BadRequestException('O identificador do autor é obrigatório.');
    }

    const policy = this.policyRegistry.get(issue.type);
    const currentState = this.stateRegistry.get(issue.status);
    const rule = currentState.findTransition(command.action, policy);

    if (!rule || rule.from !== issue.status) {
      throw new UnprocessableEntityException(
        'A ação ' + command.action + ' não é permitida quando a issue está em ' + issue.status + '.',
      );
    }
    if (!rule.roles.includes(command.actorRole)) {
      throw new ForbiddenException('Seu perfil não possui permissão para executar esta transição.');
    }

    const guardFailure = this.transitionGuards.getFailure(issue, rule, command.justification);
    if (guardFailure) throw new BadRequestException(guardFailure);

    const result = await this.repository.transitionWithHistory(id, expectedVersion, rule.to, {
      issueId: id,
      action: rule.action,
      previousStatus: issue.status,
      newStatus: rule.to,
      actorId: command.actorId.trim(),
      actorRole: command.actorRole,
      justification: command.justification?.trim() || 'Ação ' + rule.label + ' executada pelo fluxo de trabalho.',
    });
    const updated = this.unwrapUpdateResult(result);
    await this.eventPublisher?.publish({
      type: 'ISSUE_TRANSITIONED',
      issue: updated,
      previousStatus: issue.status,
      actorId: command.actorId.trim(),
      occurredAt: new Date().toISOString(),
    });
    return updated;
  }

  async getSla(id: number, evaluatedAt = new Date()): Promise<IssueSlaReport> {
    const issue = await this.findOne(id);
    if (issue.status !== 'CONCLUIDO') return calculateIssueSla(issue, evaluatedAt);

    const history = await this.historyRepository.findByIssueId(id);
    const completion = [...history].reverse().find((entry) => entry.newStatus === 'CONCLUIDO');
    return calculateIssueSla(issue, evaluatedAt, completion?.timestamp);
  }

  async getHistory(id: number): Promise<IssueHistoryEntry[]> {
    await this.findOne(id);
    return this.historyRepository.findByIssueId(id);
  }

  getAuditLog(): Promise<IssueHistoryEntry[]> {
    return this.historyRepository.findAllHistory();
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    const history = await this.historyRepository.findByIssueId(id);
    if (history.length > 0) {
      throw new ConflictException(
        'Esta issue possui histórico de auditoria e não pode ser excluída.',
      );
    }
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundException('Issue não encontrada.');
  }

  private assertExpectedVersion(issue: Issue, expectedVersion: number): void {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException('A versão esperada da issue é obrigatória.');
    }
    if (issue.version !== expectedVersion) {
      throw new ConflictException(
        'A issue foi modificada por outra operação. Versão atual: ' + issue.version + '. Recarregue os dados.',
      );
    }
  }

  private unwrapUpdateResult(result: IssueUpdateResult): Issue {
    if (result.kind === 'not_found') throw new NotFoundException('Issue não encontrada.');
    if (result.kind === 'version_conflict') {
      throw new ConflictException(
        'Conflito de edição: a versão atual é ' + result.currentVersion + '. Recarregue a issue antes de tentar novamente.',
      );
    }
    return result.issue;
  }

  private assertValidRole(role: string): asserts role is IssueRole {
    if (!ISSUE_ROLES.some((candidate) => candidate === role)) {
      throw new BadRequestException('Perfil de usuário inválido.');
    }
  }

  private toAvailableAction(rule: IssueTransitionRule): AvailableIssueAction {
    return {
      action: rule.action,
      label: rule.label,
      targetStatus: rule.to,
      requiresJustification: Boolean(rule.requiresJustification),
    };
  }

  private async ensureProjectExists(projectId: number): Promise<Project> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }
}
