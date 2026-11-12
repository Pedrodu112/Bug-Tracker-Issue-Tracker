import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { IssuesController } from './issues.controller';
import { IssuesUseCases } from './application/issues.use-cases';
import { ISSUES_REPOSITORY } from './application/ports/issues.repository';
import { ISSUE_HISTORY_REPOSITORY } from './application/ports/issue-history.repository';
import { InMemoryIssuesRepository } from './infrastructure/in-memory-issues.repository';

@Module({
  imports: [ProjectsModule],
  controllers: [IssuesController],
  providers: [
    IssuesUseCases,
    InMemoryIssuesRepository,
    { provide: ISSUES_REPOSITORY, useExisting: InMemoryIssuesRepository },
    { provide: ISSUE_HISTORY_REPOSITORY, useExisting: InMemoryIssuesRepository },
  ],
})
export class IssuesModule {}
