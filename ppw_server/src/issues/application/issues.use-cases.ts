import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Project } from '../../projects/domain/project';
import { PROJECTS_REPOSITORY, ProjectsRepository } from '../../projects/application/ports/projects.repository';
import { Issue, IssueType } from '../domain/issue';
import {
  AvailableIssueAction,
  ISSUE_ROLES,
  IssueRole,
  IssueTransitionCommand,
  IssueTransitionRule,
} from '../domain/issue-transition';
import { ISSUES_REPOSITORY, IssuesRepository } from './ports/issues.repository';
import { IssueTransitionPolicyRegistry } from './workflow/issue-transition-policy.registry';
import { IssueTransitionGuards } from './workflow/issue-transition.guards';

export type CreateIssueInput = Omit<Issue, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
export type UpdateIssueInput = Partial<CreateIssueInput>;

@Injectable()
export class IssuesUseCases {
  private readonly policyRegistry = new IssueTransitionPolicyRegistry();
  private readonly transitionGuards = new IssueTransitionGuards();

  constructor(
    @Inject(ISSUES_REPOSITORY)
    private readonly repository: IssuesRepository,
    @Inject(PROJECTS_REPOSITORY)
    private readonly projectsRepository: ProjectsRepository,
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
    return this.repository.create({
      ...data,
      status: 'BACKLOG',
    });
  }

  async update(id: number, data: UpdateIssueInput): Promise<Issue> {
    await this.findOne(id);

    if (Object.prototype.hasOwnProperty.call(data as object, 'status')) {
      throw new BadRequestException(
        'O status não pode ser alterado pelo PATCH genérico. Use uma ação explícita de transição.',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Informe ao menos um campo para atualizar.');
    }

    if (data.projectId !== undefined) {
      await this.ensureProjectExists(data.projectId);
    }

    const updated = await this.repository.update(id, data);
    if (!updated) throw new NotFoundException('Issue não encontrada.');
    return updated;
  }

  async getAvailableActions(id: number, actorRole: string): Promise<AvailableIssueAction[]> {
    this.assertValidRole(actorRole);
    const issue = await this.findOne(id);
    const policy = this.policyRegistry.get(issue.type as IssueType);

    return policy
      .getRules()
      .filter((rule) => rule.from === issue.status && rule.roles.includes(actorRole as IssueRole))
      .filter((rule) => !this.transitionGuards.getFailure(issue, rule))
      .map((rule) => this.toAvailableAction(rule));
  }

  async transition(id: number, command: IssueTransitionCommand): Promise<Issue> {
    const issue = await this.findOne(id);
    this.assertValidRole(command.actorRole);

    if (!command.actorId?.trim()) {
      throw new BadRequestException('O identificador do autor é obrigatório.');
    }

    const policy = this.policyRegistry.get(issue.type);
    const rule = policy.getRules().find((candidate) => candidate.action === command.action);

    if (!rule || rule.from !== issue.status) {
      throw new UnprocessableEntityException(
        `A ação ${command.action} não é permitida quando a issue está em ${issue.status}.`,
      );
    }

    if (!rule.roles.includes(command.actorRole)) {
      throw new ForbiddenException('Seu perfil não possui permissão para executar esta transição.');
    }

    const guardFailure = this.transitionGuards.getFailure(issue, rule, command.justification);
    if (guardFailure) throw new BadRequestException(guardFailure);

    const updated = await this.repository.update(id, { status: rule.to });
    if (!updated) throw new NotFoundException('Issue não encontrada.');
    return updated;
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundException('Issue não encontrada.');
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
