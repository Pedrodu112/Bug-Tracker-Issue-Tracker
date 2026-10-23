import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

  findAll(): Promise<Issue[]> {
    return this.repository.findAll();
  }

  async findOne(id: number): Promise<Issue> {
    const issue = await this.repository.findById(id);
    if (!issue) throw new NotFoundException('Issue não encontrada.');
    return issue;
  }

  create(data: CreateIssueInput): Promise<Issue> {
    return this.repository.create({
      ...data,
      status: data.status ?? 'BACKLOG',
    });
  }

  async update(id: number, data: UpdateIssueInput): Promise<Issue> {
    await this.findOne(id);
    const updated = await this.repository.update(id, data);
    if (!updated) throw new NotFoundException('Issue não encontrada.');
    return updated;
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundException('Issue não encontrada.');
  }
}
