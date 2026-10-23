import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Issue } from '../domain/issue';
import { CreateIssueDto } from '../dto/create-issue.dto';
import { UpdateIssueDto } from '../dto/update-issue.dto';
import { ISSUES_REPOSITORY, IssuesRepository } from './ports/issues.repository';

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

  create(data: CreateIssueDto): Promise<Issue> {
    return this.repository.create({
      ...data,
      status: data.status ?? 'BACKLOG',
    });
  }

  async update(id: number, data: UpdateIssueDto): Promise<Issue> {
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
