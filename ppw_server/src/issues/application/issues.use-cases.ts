import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Project } from '../../projects/domain/project';
import { PROJECTS_REPOSITORY, ProjectsRepository } from '../../projects/application/ports/projects.repository';
import { Issue } from '../domain/issue';
import { ISSUES_REPOSITORY, IssuesRepository } from './ports/issues.repository';

export type CreateIssueInput = Omit<Issue, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: Issue['status'];
};
export type UpdateIssueInput = Partial<CreateIssueInput>;

@Injectable()
export class IssuesUseCases {
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
      status: data.status ?? 'BACKLOG',
    });
  }

  async update(id: number, data: UpdateIssueInput): Promise<Issue> {
    await this.findOne(id);

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

  async remove(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundException('Issue não encontrada.');
  }

  private async ensureProjectExists(projectId: number): Promise<Project> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }
}
